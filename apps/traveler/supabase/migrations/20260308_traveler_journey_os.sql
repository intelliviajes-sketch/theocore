-- Traveler Journey OS persistence layer
-- Safe to run multiple times.

create table if not exists public.traveler_journeys (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references public.travelers(id) on delete cascade,
  agency_id uuid not null references public.agencies(id) on delete cascade,
  stage text not null default 'explore',
  selected_product_id uuid null references public.catalog_global(id) on delete set null,
  selected_destination text null,
  intent_level text not null default 'low',
  intent_confidence numeric(5,2) not null default 0.20,
  context jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_traveler_journeys_traveler
  on public.traveler_journeys (traveler_id);

create index if not exists idx_traveler_journeys_agency
  on public.traveler_journeys (agency_id);

create index if not exists idx_traveler_journeys_stage
  on public.traveler_journeys (stage);

create table if not exists public.traveler_journey_collaborators (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.traveler_journeys(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'companion',
  created_at timestamptz not null default now()
);

create index if not exists idx_traveler_journey_collaborators_journey
  on public.traveler_journey_collaborators (journey_id);

create unique index if not exists ux_traveler_journey_collaborators_email
  on public.traveler_journey_collaborators (journey_id, lower(email));

create table if not exists public.traveler_journey_quotes (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.traveler_journeys(id) on delete cascade,
  status text not null default 'draft',
  subtotal numeric(12,2) not null default 0,
  currency_code text not null default 'EUR',
  payment_link text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_traveler_journey_quotes_journey
  on public.traveler_journey_quotes (journey_id);

create index if not exists idx_traveler_journey_quotes_status
  on public.traveler_journey_quotes (status);

create table if not exists public.traveler_journey_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.traveler_journey_quotes(id) on delete cascade,
  catalog_product_id uuid null references public.catalog_global(id) on delete set null,
  title text not null,
  price numeric(12,2) not null default 0,
  currency_code text not null default 'EUR',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_traveler_journey_quote_items_quote
  on public.traveler_journey_quote_items (quote_id);

create table if not exists public.traveler_support_cases (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.traveler_journeys(id) on delete cascade,
  type text not null default 'general',
  status text not null default 'open',
  message text not null,
  resolution text null,
  created_by uuid null references public.travelers(id) on delete set null,
  assigned_to uuid null references public.core_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_traveler_support_cases_journey
  on public.traveler_support_cases (journey_id);

create index if not exists idx_traveler_support_cases_status
  on public.traveler_support_cases (status);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_traveler_journeys_updated_at on public.traveler_journeys;
create trigger trg_traveler_journeys_updated_at
before update on public.traveler_journeys
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_traveler_journey_quotes_updated_at on public.traveler_journey_quotes;
create trigger trg_traveler_journey_quotes_updated_at
before update on public.traveler_journey_quotes
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_traveler_support_cases_updated_at on public.traveler_support_cases;
create trigger trg_traveler_support_cases_updated_at
before update on public.traveler_support_cases
for each row execute function public.set_updated_at_timestamp();
