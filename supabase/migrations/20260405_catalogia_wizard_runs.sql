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

create table if not exists public.agency_catalogia_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  created_by uuid null,
  source_type text not null,
  source_name text null,
  input_text text null,
  extracted_text text null,
  detected_product_type_name text null,
  detected_product_type_id uuid null references public.product_types(id) on delete set null,
  confidence numeric(5,2) null,
  model text null,
  status text not null default 'running',
  result_json jsonb not null default '{}'::jsonb,
  created_catalog_id uuid null references public.catalog_global(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_catalogia_runs_source_type_chk'
  ) then
    alter table public.agency_catalogia_runs
      add constraint agency_catalogia_runs_source_type_chk
      check (source_type in ('text', 'email', 'pdf'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_catalogia_runs_status_chk'
  ) then
    alter table public.agency_catalogia_runs
      add constraint agency_catalogia_runs_status_chk
      check (status in ('running', 'completed', 'failed'));
  end if;
end
$$;

create index if not exists agency_catalogia_runs_scope_idx
  on public.agency_catalogia_runs (agency_id, created_at desc);

create index if not exists agency_catalogia_runs_status_idx
  on public.agency_catalogia_runs (status, created_at desc);

drop trigger if exists trg_agency_catalogia_runs_updated_at on public.agency_catalogia_runs;
create trigger trg_agency_catalogia_runs_updated_at
before update on public.agency_catalogia_runs
for each row execute function public.trg_set_updated_at();

commit;
