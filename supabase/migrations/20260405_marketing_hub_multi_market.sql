-- Marketing Hub + multi-market/domain operating model for agencies.
-- This migration adds:
-- - Domain installation/verification metadata.
-- - Market-level traveler content overrides.
-- - Marketing planning, tracking, audiences, automations and A/B experiments.

begin;

create extension if not exists pgcrypto;

create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 1) Domain lifecycle metadata (for main domain + market subdomains)
alter table if exists public.agency_domains
  add column if not exists installation_status text not null default 'pending',
  add column if not exists ssl_status text not null default 'pending',
  add column if not exists dns_target text null,
  add column if not exists verified_at timestamptz null,
  add column if not exists notes text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_domains_installation_status_chk'
  ) then
    alter table public.agency_domains
      add constraint agency_domains_installation_status_chk
      check (installation_status in ('pending', 'verified', 'failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_domains_ssl_status_chk'
  ) then
    alter table public.agency_domains
      add constraint agency_domains_ssl_status_chk
      check (ssl_status in ('pending', 'issued', 'failed'));
  end if;
end
$$;

update public.agency_domains
set installation_status = case when active then 'verified' else installation_status end,
    ssl_status = case when active then 'issued' else ssl_status end,
    verified_at = case when active and verified_at is null then now() else verified_at end
where active = true;

create index if not exists agency_domains_agency_country_active_idx
  on public.agency_domains (agency_id, country_code, active);

-- 2) Market-level traveler content (localized copy/branding/footer by market/domain)
create table if not exists public.agency_market_content (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  domain text null,
  language_code text not null default 'es',
  brand_name text null,
  logo_url text null,
  hero_title text null,
  hero_subtitle text null,
  cta_primary text null,
  cta_secondary text null,
  footer_address text null,
  footer_email text null,
  footer_phone text null,
  legal_notice text null,
  sticky_bg_color text null,
  sticky_text_color text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agency_market_content_scope_uniq
  on public.agency_market_content (agency_id, market_code, coalesce(domain, ''), language_code);

create index if not exists agency_market_content_lookup_idx
  on public.agency_market_content (agency_id, market_code, active);

drop trigger if exists trg_agency_market_content_updated_at on public.agency_market_content;
create trigger trg_agency_market_content_updated_at
before update on public.agency_market_content
for each row execute function public.trg_set_updated_at();

-- 3) Marketing planner (cross-channel campaigns)
create table if not exists public.agency_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  domain text null,
  name text not null,
  objective text null,
  budget_monthly numeric(12,2) null,
  currency_code text null,
  start_date date null,
  end_date date null,
  channels jsonb not null default '[]'::jsonb,
  kpi_targets jsonb not null default '{}'::jsonb,
  status text not null default 'planned',
  notes text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_campaigns_status_chk'
  ) then
    alter table public.agency_marketing_campaigns
      add constraint agency_marketing_campaigns_status_chk
      check (status in ('planned', 'active', 'paused', 'completed'));
  end if;
end
$$;

create index if not exists agency_marketing_campaigns_scope_idx
  on public.agency_marketing_campaigns (agency_id, market_code, active, status);

drop trigger if exists trg_agency_marketing_campaigns_updated_at on public.agency_marketing_campaigns;
create trigger trg_agency_marketing_campaigns_updated_at
before update on public.agency_marketing_campaigns
for each row execute function public.trg_set_updated_at();

-- 4) Tracking & attribution config by market/domain
create table if not exists public.agency_marketing_tracking (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  domain text null,
  ga4_measurement_id text null,
  gtm_container_id text null,
  meta_pixel_id text null,
  google_ads_customer_id text null,
  google_ads_conversion_label text null,
  tiktok_pixel_id text null,
  consent_mode text not null default 'basic',
  conversion_events jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_tracking_consent_mode_chk'
  ) then
    alter table public.agency_marketing_tracking
      add constraint agency_marketing_tracking_consent_mode_chk
      check (consent_mode in ('basic', 'advanced', 'disabled'));
  end if;
end
$$;

create unique index if not exists agency_marketing_tracking_scope_uniq
  on public.agency_marketing_tracking (agency_id, market_code, coalesce(domain, ''));

drop trigger if exists trg_agency_marketing_tracking_updated_at on public.agency_marketing_tracking;
create trigger trg_agency_marketing_tracking_updated_at
before update on public.agency_marketing_tracking
for each row execute function public.trg_set_updated_at();

-- 5) Audiences (remarketing/lookalike/internal segments)
create table if not exists public.agency_marketing_audiences (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  name text not null,
  provider text not null default 'internal',
  rule_json jsonb not null default '{}'::jsonb,
  size_estimate integer null,
  status text not null default 'draft',
  last_sync_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_audiences_provider_chk'
  ) then
    alter table public.agency_marketing_audiences
      add constraint agency_marketing_audiences_provider_chk
      check (provider in ('internal', 'meta', 'google', 'both'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_audiences_status_chk'
  ) then
    alter table public.agency_marketing_audiences
      add constraint agency_marketing_audiences_status_chk
      check (status in ('draft', 'synced', 'error'));
  end if;
end
$$;

create index if not exists agency_marketing_audiences_scope_idx
  on public.agency_marketing_audiences (agency_id, market_code, active, status);

drop trigger if exists trg_agency_marketing_audiences_updated_at on public.agency_marketing_audiences;
create trigger trg_agency_marketing_audiences_updated_at
before update on public.agency_marketing_audiences
for each row execute function public.trg_set_updated_at();

-- 6) Automations (WhatsApp/email/ad audiences)
create table if not exists public.agency_marketing_automations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  name text not null,
  channel text not null default 'email',
  trigger_event text not null,
  template text not null,
  status text not null default 'draft',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_automations_channel_chk'
  ) then
    alter table public.agency_marketing_automations
      add constraint agency_marketing_automations_channel_chk
      check (channel in ('email', 'whatsapp', 'push', 'ads'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_automations_status_chk'
  ) then
    alter table public.agency_marketing_automations
      add constraint agency_marketing_automations_status_chk
      check (status in ('draft', 'active', 'paused'));
  end if;
end
$$;

create index if not exists agency_marketing_automations_scope_idx
  on public.agency_marketing_automations (agency_id, market_code, active, status);

drop trigger if exists trg_agency_marketing_automations_updated_at on public.agency_marketing_automations;
create trigger trg_agency_marketing_automations_updated_at
before update on public.agency_marketing_automations
for each row execute function public.trg_set_updated_at();

-- 7) A/B experiments for traveler CRO by market/domain
create table if not exists public.agency_marketing_experiments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  domain text null,
  name text not null,
  hypothesis text null,
  variant_a jsonb not null default '{}'::jsonb,
  variant_b jsonb not null default '{}'::jsonb,
  metric_primary text null,
  status text not null default 'draft',
  winner text null,
  started_at timestamptz null,
  ended_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_experiments_status_chk'
  ) then
    alter table public.agency_marketing_experiments
      add constraint agency_marketing_experiments_status_chk
      check (status in ('draft', 'running', 'completed', 'paused'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_experiments_winner_chk'
  ) then
    alter table public.agency_marketing_experiments
      add constraint agency_marketing_experiments_winner_chk
      check (winner is null or winner in ('A', 'B', 'none'));
  end if;
end
$$;

create index if not exists agency_marketing_experiments_scope_idx
  on public.agency_marketing_experiments (agency_id, market_code, active, status);

drop trigger if exists trg_agency_marketing_experiments_updated_at on public.agency_marketing_experiments;
create trigger trg_agency_marketing_experiments_updated_at
before update on public.agency_marketing_experiments
for each row execute function public.trg_set_updated_at();

commit;

