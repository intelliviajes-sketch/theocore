begin;

alter table if exists public.agency_travelers
  add column if not exists market_country_code text,
  add column if not exists market_language_code text,
  add column if not exists market_currency_code text,
  add column if not exists signup_domain text,
  add column if not exists signup_provider text,
  add column if not exists onboarding_source text,
  add column if not exists onboarding_completed_at timestamptz;

update public.agency_travelers
set onboarding_source = coalesce(onboarding_source, 'manual_intranet')
where onboarding_source is null;

alter table if exists public.agency_travelers
  alter column onboarding_source set default 'manual_intranet';

create index if not exists agency_travelers_agency_market_idx
  on public.agency_travelers (agency_id, market_country_code, status);

create index if not exists agency_travelers_signup_domain_idx
  on public.agency_travelers (signup_domain);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_travelers_signup_provider_chk'
  ) then
    alter table public.agency_travelers
      add constraint agency_travelers_signup_provider_chk
      check (
        signup_provider is null
        or signup_provider in ('email', 'google', 'apple', 'unknown')
      );
  end if;
end
$$;

do $$
begin
  with ranked as (
    select
      id,
      row_number() over (
        partition by agency_id, traveler_id
        order by id desc
      ) as rn
    from public.agency_travelers
  )
  delete from public.agency_travelers at
  using ranked r
  where at.id = r.id
    and r.rn > 1;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_travelers_unique_agency_traveler'
  ) then
    alter table public.agency_travelers
      add constraint agency_travelers_unique_agency_traveler
      unique (agency_id, traveler_id);
  end if;
end
$$;

commit;
