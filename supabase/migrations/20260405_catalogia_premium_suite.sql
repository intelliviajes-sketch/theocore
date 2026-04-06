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

create table if not exists public.agency_catalogia_review_queue (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  run_id uuid null references public.agency_catalogia_runs(id) on delete set null,
  offer_candidate_id text not null,
  title text not null,
  status text not null default 'pending',
  confidence numeric(5,2) null,
  duplicate_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  notes text null,
  created_by uuid null,
  resolved_by uuid null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_catalogia_review_queue_status_chk'
  ) then
    alter table public.agency_catalogia_review_queue
      add constraint agency_catalogia_review_queue_status_chk
      check (status in ('pending', 'approved', 'rejected', 'published'));
  end if;
end
$$;

create unique index if not exists agency_catalogia_review_queue_unique_offer
  on public.agency_catalogia_review_queue (agency_id, run_id, offer_candidate_id);

create index if not exists agency_catalogia_review_queue_status_idx
  on public.agency_catalogia_review_queue (agency_id, status, created_at desc);

drop trigger if exists trg_agency_catalogia_review_queue_updated_at on public.agency_catalogia_review_queue;
create trigger trg_agency_catalogia_review_queue_updated_at
before update on public.agency_catalogia_review_queue
for each row execute function public.trg_set_updated_at();

create table if not exists public.catalog_global_versions (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid null references public.catalog_global(id) on delete set null,
  agency_id uuid null references public.agencies(id) on delete set null,
  version_action text not null,
  snapshot jsonb not null,
  changed_by uuid null,
  changed_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_global_versions_action_chk'
  ) then
    alter table public.catalog_global_versions
      add constraint catalog_global_versions_action_chk
      check (version_action in ('insert', 'update', 'delete'));
  end if;
end
$$;

create index if not exists catalog_global_versions_catalog_idx
  on public.catalog_global_versions (catalog_id, changed_at desc);

create or replace function public.trg_catalog_global_versioning()
returns trigger
language plpgsql
as $$
declare
  action_name text;
  payload jsonb;
  target_catalog_id uuid;
  target_agency_id uuid;
begin
  if tg_op = 'INSERT' then
    action_name := 'insert';
    payload := to_jsonb(new);
    target_catalog_id := new.id;
    target_agency_id := new.agency_id;
  elsif tg_op = 'UPDATE' then
    action_name := 'update';
    payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    target_catalog_id := new.id;
    target_agency_id := new.agency_id;
  else
    action_name := 'delete';
    payload := to_jsonb(old);
    target_catalog_id := old.id;
    target_agency_id := old.agency_id;
  end if;

  insert into public.catalog_global_versions (catalog_id, agency_id, version_action, snapshot, changed_by)
  values (target_catalog_id, target_agency_id, action_name, payload, null);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_catalog_global_versioning on public.catalog_global;
create trigger trg_catalog_global_versioning
after insert or update or delete on public.catalog_global
for each row execute function public.trg_catalog_global_versioning();

create table if not exists public.catalog_market_variants (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.catalog_global(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_config_id uuid null references public.agency_market_config(id) on delete set null,
  country_code text null,
  language_code text null,
  currency_code text null,
  timezone text null,
  domain text null,
  path_prefix text null default '/traveler',
  localized_title text null,
  localized_summary text null,
  localized_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists catalog_market_variants_scope_uniq
  on public.catalog_market_variants (catalog_id, coalesce(country_code, ''), coalesce(language_code, ''), coalesce(domain, ''));

create index if not exists catalog_market_variants_lookup_idx
  on public.catalog_market_variants (agency_id, country_code, language_code, active);

drop trigger if exists trg_catalog_market_variants_updated_at on public.catalog_market_variants;
create trigger trg_catalog_market_variants_updated_at
before update on public.catalog_market_variants
for each row execute function public.trg_set_updated_at();

create or replace function public.trg_catalogia_mark_review_published()
returns trigger
language plpgsql
as $$
declare
  run_uuid uuid;
  candidate_id text;
begin
  if new.created_via_tool <> 'catalogia' then
    return new;
  end if;

  run_uuid := nullif(coalesce(new.raw_ai_output->>'run_id', ''), '')::uuid;
  candidate_id := nullif(coalesce(new.raw_ai_output->>'candidate_id', ''), '');

  if run_uuid is null or candidate_id is null then
    return new;
  end if;

  update public.agency_catalogia_review_queue
  set status = 'published',
      resolved_at = now(),
      updated_at = now()
  where run_id = run_uuid
    and offer_candidate_id = candidate_id
    and agency_id = new.agency_id;

  return new;
end;
$$;

drop trigger if exists trg_catalogia_mark_review_published on public.catalog_global;
create trigger trg_catalogia_mark_review_published
after insert on public.catalog_global
for each row execute function public.trg_catalogia_mark_review_published();

commit;
