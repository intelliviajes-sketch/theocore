begin;

alter table if exists public.agency_catalogia_runs
  drop constraint if exists agency_catalogia_runs_source_type_chk;

alter table if exists public.agency_catalogia_runs
  add constraint agency_catalogia_runs_source_type_chk
  check (source_type in ('text', 'email', 'pdf', 'image'));

commit;
