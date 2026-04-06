-- Multi-market domain hardening for agencies/traveler tenant resolution.
-- - Normalizes host values in agency_domains.
-- - Enforces unique active domain globally.
-- - Enforces one active primary domain per agency.
-- - Prevents activating an agency without an active primary domain.

begin;

create or replace function public.normalize_host_domain(input text)
returns text
language sql
immutable
as $$
  select
    regexp_replace(
      split_part(
        split_part(
          regexp_replace(lower(trim(coalesce(input, ''))), '^https?://', ''),
          '/',
          1
        ),
        ':',
        1
      ),
      '^www\.',
      ''
    )
$$;

-- Normalize existing rows first.
update public.agency_domains
set domain = public.normalize_host_domain(domain)
where domain is not null;

-- Disable active duplicates by normalized domain, keeping the first "best" row.
with ranked as (
  select
    id,
    row_number() over (
      partition by public.normalize_host_domain(domain)
      order by is_primary desc, id asc
    ) as rn
  from public.agency_domains
  where active = true
)
update public.agency_domains d
set active = false,
    is_primary = false
from ranked r
where d.id = r.id
  and r.rn > 1;

-- Keep only one active primary per agency.
with ranked_primary as (
  select
    id,
    row_number() over (
      partition by agency_id
      order by id asc
    ) as rn
  from public.agency_domains
  where active = true
    and is_primary = true
)
update public.agency_domains d
set is_primary = false
from ranked_primary r
where d.id = r.id
  and r.rn > 1;

-- If an agency has active domains but none primary, set one.
with candidates as (
  select distinct on (agency_id)
    id,
    agency_id
  from public.agency_domains
  where active = true
  order by agency_id, id
)
update public.agency_domains d
set is_primary = true
from candidates c
where d.id = c.id
  and not exists (
    select 1
    from public.agency_domains x
    where x.agency_id = c.agency_id
      and x.active = true
      and x.is_primary = true
  );

-- Partial uniques for runtime guarantees.
create unique index if not exists agency_domains_active_domain_uniq
  on public.agency_domains (domain)
  where active = true;

create unique index if not exists agency_domains_one_primary_active_per_agency_uniq
  on public.agency_domains (agency_id)
  where active = true and is_primary = true;

-- Normalize/validate new writes.
create or replace function public.trg_agency_domains_normalize_validate()
returns trigger
language plpgsql
as $$
begin
  new.domain := public.normalize_host_domain(new.domain);

  if new.domain is null
     or length(new.domain) = 0
     or new.domain !~* '^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$' then
    raise exception 'Dominio invalido para agency_domains: %', coalesce(new.domain, 'NULL')
      using errcode = '23514';
  end if;

  if new.country_code is not null then
    new.country_code := upper(trim(new.country_code));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_agency_domains_normalize_validate on public.agency_domains;
create trigger trg_agency_domains_normalize_validate
before insert or update of domain, country_code, active, is_primary
on public.agency_domains
for each row
execute function public.trg_agency_domains_normalize_validate();

-- Shared check function.
create or replace function public.ensure_active_agency_has_primary_domain(p_agency_id uuid)
returns void
language plpgsql
as $$
declare
  agency_is_active boolean;
begin
  if p_agency_id is null then
    return;
  end if;

  select a.active
    into agency_is_active
  from public.agencies a
  where a.id = p_agency_id;

  if agency_is_active is distinct from true then
    return;
  end if;

  if not exists (
    select 1
    from public.agency_domains d
    where d.agency_id = p_agency_id
      and d.active = true
      and d.is_primary = true
  ) then
    raise exception 'La agencia activa % debe tener un dominio principal activo.', p_agency_id
      using errcode = '23514';
  end if;
end;
$$;

-- Block "activate agency" if there is no primary domain.
create or replace function public.trg_agencies_check_primary_on_activate()
returns trigger
language plpgsql
as $$
begin
  if new.active = true and coalesce(old.active, false) = false then
    perform public.ensure_active_agency_has_primary_domain(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agencies_check_primary_on_activate on public.agencies;
create trigger trg_agencies_check_primary_on_activate
before update of active
on public.agencies
for each row
execute function public.trg_agencies_check_primary_on_activate();

-- Prevent domain edits from leaving an active agency without a primary domain.
create or replace function public.trg_agency_domains_check_active_agency_primary()
returns trigger
language plpgsql
as $$
declare
  affected_agency_id uuid;
begin
  affected_agency_id := coalesce(new.agency_id, old.agency_id);
  perform public.ensure_active_agency_has_primary_domain(affected_agency_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_agency_domains_check_active_agency_primary on public.agency_domains;
create trigger trg_agency_domains_check_active_agency_primary
after insert or update or delete
on public.agency_domains
for each row
execute function public.trg_agency_domains_check_active_agency_primary();

commit;
