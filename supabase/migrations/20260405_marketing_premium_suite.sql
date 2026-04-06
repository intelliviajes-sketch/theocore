-- Premium marketing suite:
-- - onboarding checklist
-- - playbooks library
-- - approval workflow
-- - smart alerts
-- - report snapshots
-- - maturity score helper
-- Includes 3 runnable examples at the end.

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

create table if not exists public.agency_marketing_onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  step_key text not null,
  title text not null,
  description text null,
  is_required boolean not null default true,
  completed boolean not null default false,
  completed_at timestamptz null,
  completed_by text null,
  order_index integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agency_marketing_onboarding_steps_uniq
  on public.agency_marketing_onboarding_steps (agency_id, market_code, step_key);

create index if not exists agency_marketing_onboarding_steps_scope_idx
  on public.agency_marketing_onboarding_steps (agency_id, market_code, active, completed);

drop trigger if exists trg_agency_marketing_onboarding_steps_updated_at on public.agency_marketing_onboarding_steps;
create trigger trg_agency_marketing_onboarding_steps_updated_at
before update on public.agency_marketing_onboarding_steps
for each row execute function public.trg_set_updated_at();

create table if not exists public.agency_marketing_playbook_templates (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid null references public.agencies(id) on delete cascade,
  market_code text null,
  name text not null,
  objective text null,
  channels jsonb not null default '[]'::jsonb,
  kpi_targets jsonb not null default '{}'::jsonb,
  blueprint jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_marketing_playbook_templates_scope_idx
  on public.agency_marketing_playbook_templates (agency_id, market_code, active, is_system);

drop trigger if exists trg_agency_marketing_playbook_templates_updated_at on public.agency_marketing_playbook_templates;
create trigger trg_agency_marketing_playbook_templates_updated_at
before update on public.agency_marketing_playbook_templates
for each row execute function public.trg_set_updated_at();

create table if not exists public.agency_marketing_campaign_approvals (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  campaign_id uuid not null references public.agency_marketing_campaigns(id) on delete cascade,
  market_code text not null,
  status text not null default 'pending',
  requested_by text null,
  requested_at timestamptz not null default now(),
  reviewed_by text null,
  reviewed_at timestamptz null,
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
    where conname = 'agency_marketing_campaign_approvals_status_chk'
  ) then
    alter table public.agency_marketing_campaign_approvals
      add constraint agency_marketing_campaign_approvals_status_chk
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

create index if not exists agency_marketing_campaign_approvals_scope_idx
  on public.agency_marketing_campaign_approvals (agency_id, market_code, active, status);

drop trigger if exists trg_agency_marketing_campaign_approvals_updated_at on public.agency_marketing_campaign_approvals;
create trigger trg_agency_marketing_campaign_approvals_updated_at
before update on public.agency_marketing_campaign_approvals
for each row execute function public.trg_set_updated_at();

create table if not exists public.agency_marketing_alert_rules (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  domain text null,
  name text not null,
  metric_key text not null,
  operator text not null default 'gt',
  threshold numeric(12,4) not null,
  window_hours integer not null default 24,
  channel text not null default 'dashboard',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_alert_rules_operator_chk'
  ) then
    alter table public.agency_marketing_alert_rules
      add constraint agency_marketing_alert_rules_operator_chk
      check (operator in ('gt', 'gte', 'lt', 'lte', 'eq', 'neq'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_alert_rules_channel_chk'
  ) then
    alter table public.agency_marketing_alert_rules
      add constraint agency_marketing_alert_rules_channel_chk
      check (channel in ('dashboard', 'email', 'whatsapp'));
  end if;
end
$$;

create index if not exists agency_marketing_alert_rules_scope_idx
  on public.agency_marketing_alert_rules (agency_id, market_code, active);

drop trigger if exists trg_agency_marketing_alert_rules_updated_at on public.agency_marketing_alert_rules;
create trigger trg_agency_marketing_alert_rules_updated_at
before update on public.agency_marketing_alert_rules
for each row execute function public.trg_set_updated_at();

create table if not exists public.agency_marketing_alert_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  rule_id uuid null references public.agency_marketing_alert_rules(id) on delete set null,
  market_code text not null,
  domain text null,
  metric_key text not null,
  metric_value numeric(12,4) not null,
  threshold numeric(12,4) not null,
  status text not null default 'open',
  message text not null,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_marketing_alert_events_status_chk'
  ) then
    alter table public.agency_marketing_alert_events
      add constraint agency_marketing_alert_events_status_chk
      check (status in ('open', 'acknowledged', 'resolved'));
  end if;
end
$$;

create index if not exists agency_marketing_alert_events_scope_idx
  on public.agency_marketing_alert_events (agency_id, market_code, status, triggered_at desc);

create table if not exists public.agency_marketing_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  market_code text not null,
  domain text null,
  name text not null,
  period_start date not null,
  period_end date not null,
  kpis jsonb not null default '{}'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  share_token text not null default encode(gen_random_bytes(12), 'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agency_marketing_report_snapshots_share_token_uniq
  on public.agency_marketing_report_snapshots (share_token);

create index if not exists agency_marketing_report_snapshots_scope_idx
  on public.agency_marketing_report_snapshots (agency_id, market_code, created_at desc);

drop trigger if exists trg_agency_marketing_report_snapshots_updated_at on public.agency_marketing_report_snapshots;
create trigger trg_agency_marketing_report_snapshots_updated_at
before update on public.agency_marketing_report_snapshots
for each row execute function public.trg_set_updated_at();

create or replace function public.get_agency_marketing_maturity_score(
  p_agency_id uuid,
  p_market_code text
)
returns table(
  score integer,
  completed_steps integer,
  total_steps integer,
  active_campaigns integer,
  tracking_ready boolean,
  alert_rules integer,
  pending_approvals integer
)
language plpgsql
as $$
declare
  v_completed_steps integer := 0;
  v_total_steps integer := 0;
  v_active_campaigns integer := 0;
  v_tracking_ready boolean := false;
  v_alert_rules integer := 0;
  v_pending_approvals integer := 0;
  v_score integer := 0;
begin
  select
    count(*) filter (where completed = true),
    count(*)
  into v_completed_steps, v_total_steps
  from public.agency_marketing_onboarding_steps
  where agency_id = p_agency_id
    and market_code = upper(p_market_code)
    and active = true;

  select count(*)
  into v_active_campaigns
  from public.agency_marketing_campaigns
  where agency_id = p_agency_id
    and market_code = upper(p_market_code)
    and active = true
    and status in ('planned', 'active');

  select exists (
    select 1
    from public.agency_marketing_tracking t
    where t.agency_id = p_agency_id
      and t.market_code = upper(p_market_code)
      and t.active = true
      and (
        coalesce(nullif(trim(t.ga4_measurement_id), ''), null) is not null
        or coalesce(nullif(trim(t.meta_pixel_id), ''), null) is not null
      )
  ) into v_tracking_ready;

  select count(*)
  into v_alert_rules
  from public.agency_marketing_alert_rules
  where agency_id = p_agency_id
    and market_code = upper(p_market_code)
    and active = true;

  select count(*)
  into v_pending_approvals
  from public.agency_marketing_campaign_approvals
  where agency_id = p_agency_id
    and market_code = upper(p_market_code)
    and active = true
    and status = 'pending';

  if v_total_steps > 0 then
    v_score := v_score + round((v_completed_steps::numeric / v_total_steps::numeric) * 40)::integer;
  end if;
  v_score := v_score + least(v_active_campaigns * 8, 24);
  if v_tracking_ready then v_score := v_score + 16; end if;
  v_score := v_score + least(v_alert_rules * 4, 12);
  if v_pending_approvals = 0 then v_score := v_score + 8; end if;
  v_score := greatest(0, least(v_score, 100));

  return query
  select
    v_score,
    v_completed_steps,
    v_total_steps,
    v_active_campaigns,
    v_tracking_ready,
    v_alert_rules,
    v_pending_approvals;
end;
$$;

insert into public.agency_marketing_playbook_templates (
  agency_id,
  market_code,
  name,
  objective,
  channels,
  kpi_targets,
  blueprint,
  is_system,
  active
)
select
  null,
  null,
  t.name,
  t.objective,
  t.channels::jsonb,
  t.kpis::jsonb,
  t.blueprint::jsonb,
  true,
  true
from (
  values
    (
      'Lanzamiento Mercado',
      'Activar awareness y primeros leads en un nuevo mercado',
      '["meta_ads","google_ads","social"]',
      '{"target_ctr":0.06,"target_cpl":35,"target_leads":50}',
      '{"phase1":"awareness","phase2":"consideration","phase3":"conversion"}'
    ),
    (
      'Retargeting Conversion',
      'Recuperar usuarios con alta intencion',
      '["meta_ads","google_ads","email"]',
      '{"target_ctr":0.09,"target_cpl":28,"target_bookings":20}',
      '{"audience":"abandoned_funnel","cadence":"7_days"}'
    ),
    (
      'Always On Performance',
      'Mantener captacion estable todo el mes',
      '["google_ads","meta_ads","social","whatsapp"]',
      '{"target_ctr":0.07,"target_cpl":32,"target_roas":3.2}',
      '{"budget_split":{"prospecting":0.6,"retargeting":0.4}}'
    )
) as t(name, objective, channels, kpis, blueprint)
where not exists (
  select 1
  from public.agency_marketing_playbook_templates p
  where p.is_system = true
    and p.name = t.name
);

-- ============================================================================
-- EXAMPLES (3)
-- These are runnable examples for quick validation in a real environment.
-- They target Colla (if domain exists) or fallback to first active agency.
-- ============================================================================

do $$
declare
  v_agency_id uuid;
  v_campaign_id uuid;
  v_rule_id uuid;
begin
  select d.agency_id
    into v_agency_id
  from public.agency_domains d
  where d.active = true
    and d.domain in ('collaviajes.com', 'www.collaviajes.com')
  limit 1;

  if v_agency_id is null then
    select a.id
      into v_agency_id
    from public.agencies a
    where a.active = true
    order by a.created_at asc
    limit 1;
  end if;

  if v_agency_id is null then
    raise notice 'No active agency found, skipping premium examples.';
    return;
  end if;

  -- Example 1: Onboarding checklist for market ES
  insert into public.agency_marketing_onboarding_steps (
    agency_id, market_code, step_key, title, description, order_index, completed
  ) values
    (v_agency_id, 'ES', 'domain_verified', 'Dominio verificado', 'Dominio principal validado en Vercel + DNS', 10, true),
    (v_agency_id, 'ES', 'tracking_ready', 'Tracking operativo', 'GA4 y Pixel configurados con eventos base', 20, false),
    (v_agency_id, 'ES', 'first_campaign_live', 'Primera campaña activa', 'Campaña de captación publicada y monitoreada', 30, false)
  on conflict (agency_id, market_code, step_key)
  do update set
    title = excluded.title,
    description = excluded.description,
    order_index = excluded.order_index,
    completed = excluded.completed,
    updated_at = now();

  -- Example 2: Campaign + approval workflow
  insert into public.agency_marketing_campaigns (
    agency_id, market_code, domain, name, objective, budget_monthly, currency_code, channels, status, active
  ) values (
    v_agency_id,
    'ES',
    'collaviajes.com',
    'Premium Escapadas Primavera',
    'Generar leads cualificados y reservas directas',
    3500,
    'EUR',
    '["google_ads","meta_ads","social"]'::jsonb,
    'planned',
    true
  )
  on conflict do nothing
  returning id into v_campaign_id;

  if v_campaign_id is null then
    select c.id
      into v_campaign_id
    from public.agency_marketing_campaigns c
    where c.agency_id = v_agency_id
      and c.market_code = 'ES'
      and c.name = 'Premium Escapadas Primavera'
    limit 1;
  end if;

  if v_campaign_id is not null then
    insert into public.agency_marketing_campaign_approvals (
      agency_id, campaign_id, market_code, status, requested_by, notes, active
    ) values (
      v_agency_id,
      v_campaign_id,
      'ES',
      'pending',
      'owner@agency.local',
      'Pendiente de aprobacion para activar pauta',
      true
    )
    on conflict do nothing;
  end if;

  -- Example 3: Alert rule + triggered event + report snapshot
  insert into public.agency_marketing_alert_rules (
    agency_id, market_code, domain, name, metric_key, operator, threshold, window_hours, channel, active
  ) values (
    v_agency_id,
    'ES',
    'collaviajes.com',
    'CPL alto ES',
    'cpl',
    'gt',
    45,
    24,
    'dashboard',
    true
  )
  on conflict do nothing
  returning id into v_rule_id;

  if v_rule_id is null then
    select r.id
      into v_rule_id
    from public.agency_marketing_alert_rules r
    where r.agency_id = v_agency_id
      and r.market_code = 'ES'
      and r.name = 'CPL alto ES'
    limit 1;
  end if;

  insert into public.agency_marketing_alert_events (
    agency_id, rule_id, market_code, domain, metric_key, metric_value, threshold, status, message
  ) values (
    v_agency_id,
    v_rule_id,
    'ES',
    'collaviajes.com',
    'cpl',
    52.40,
    45.00,
    'open',
    'CPL de las ultimas 24h por encima del objetivo en mercado ES.'
  );

  insert into public.agency_marketing_report_snapshots (
    agency_id, market_code, domain, name, period_start, period_end, kpis, highlights, active
  ) values (
    v_agency_id,
    'ES',
    'collaviajes.com',
    'Reporte Premium Semanal ES',
    current_date - 7,
    current_date - 1,
    '{"leads":63,"bookings":11,"ctr":0.071,"cpl":38.2,"roas":3.4}'::jsonb,
    '["Incrementar presupuesto en retargeting","Escalar creatividades con mayor CTR"]'::jsonb,
    true
  );
end
$$;

commit;

