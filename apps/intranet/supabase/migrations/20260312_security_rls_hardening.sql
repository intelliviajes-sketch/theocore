-- Security hardening for core multi-tenant tables.
-- Safe to run multiple times.

create or replace function public.is_core_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.core_users cu
    where cu.user_id = p_user_id
      and cu.role in ('TheoCoreOwner', 'CoreAdmin')
  );
$$;

create or replace function public.is_active_agency_team_member(p_user_id uuid, p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_team at
    where at.user_id = p_user_id
      and at.agency_id = p_agency_id
      and coalesce(at.active, true) = true
  );
$$;

create or replace function public.is_agency_owner(p_user_id uuid, p_agency_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_team at
    where at.user_id = p_user_id
      and at.agency_id = p_agency_id
      and coalesce(at.active, true) = true
      and at.role = 'AgencyOwner'
  );
$$;

grant execute on function public.is_core_admin(uuid) to authenticated, service_role;
grant execute on function public.is_active_agency_team_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_agency_owner(uuid, uuid) to authenticated, service_role;

alter table if exists public.core_users enable row level security;
alter table if exists public.agency_team enable row level security;
alter table if exists public.agency_travelers enable row level security;
alter table if exists public.catalog_global enable row level security;
alter table if exists public.product_types enable row level security;
alter table if exists public.chat_sessions enable row level security;
alter table if exists public.chat_messages enable row level security;

drop policy if exists core_users_select on public.core_users;
create policy core_users_select
on public.core_users
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);

drop policy if exists core_users_modify on public.core_users;
create policy core_users_modify
on public.core_users
for all
to authenticated
using (public.is_core_admin(auth.uid()))
with check (public.is_core_admin(auth.uid()));

drop policy if exists agency_team_select on public.agency_team;
create policy agency_team_select
on public.agency_team
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
);

drop policy if exists agency_team_insert on public.agency_team;
create policy agency_team_insert
on public.agency_team
for insert
to authenticated
with check (
  public.is_core_admin(auth.uid())
  or public.is_agency_owner(auth.uid(), agency_id)
);

drop policy if exists agency_team_update on public.agency_team;
create policy agency_team_update
on public.agency_team
for update
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_agency_owner(auth.uid(), agency_id)
)
with check (
  public.is_core_admin(auth.uid())
  or public.is_agency_owner(auth.uid(), agency_id)
);

drop policy if exists agency_team_delete on public.agency_team;
create policy agency_team_delete
on public.agency_team
for delete
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_agency_owner(auth.uid(), agency_id)
);

drop policy if exists agency_travelers_select on public.agency_travelers;
create policy agency_travelers_select
on public.agency_travelers
for select
to authenticated
using (
  traveler_id = auth.uid()
  or public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
);

drop policy if exists agency_travelers_insert on public.agency_travelers;
create policy agency_travelers_insert
on public.agency_travelers
for insert
to authenticated
with check (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
);

drop policy if exists agency_travelers_update on public.agency_travelers;
create policy agency_travelers_update
on public.agency_travelers
for update
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
)
with check (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
);

drop policy if exists agency_travelers_delete on public.agency_travelers;
create policy agency_travelers_delete
on public.agency_travelers
for delete
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_agency_owner(auth.uid(), agency_id)
);

drop policy if exists catalog_global_select on public.catalog_global;
create policy catalog_global_select
on public.catalog_global
for select
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
  or exists (
    select 1
    from public.agency_travelers at
    where at.agency_id = catalog_global.agency_id
      and at.traveler_id = auth.uid()
      and at.status = 'active'
  )
);

drop policy if exists catalog_global_insert on public.catalog_global;
create policy catalog_global_insert
on public.catalog_global
for insert
to authenticated
with check (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
);

drop policy if exists catalog_global_update on public.catalog_global;
create policy catalog_global_update
on public.catalog_global
for update
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
)
with check (
  public.is_core_admin(auth.uid())
  or public.is_active_agency_team_member(auth.uid(), agency_id)
);

drop policy if exists catalog_global_delete on public.catalog_global;
create policy catalog_global_delete
on public.catalog_global
for delete
to authenticated
using (
  public.is_core_admin(auth.uid())
  or public.is_agency_owner(auth.uid(), agency_id)
);

drop policy if exists product_types_select on public.product_types;
create policy product_types_select
on public.product_types
for select
to authenticated
using (
  public.is_core_admin(auth.uid())
  or scope = 'global'
  or (
    owner_agency_id is not null
    and public.is_active_agency_team_member(auth.uid(), owner_agency_id)
  )
);

drop policy if exists product_types_insert on public.product_types;
create policy product_types_insert
on public.product_types
for insert
to authenticated
with check (
  public.is_core_admin(auth.uid())
  or (
    owner_agency_id is not null
    and public.is_agency_owner(auth.uid(), owner_agency_id)
  )
);

drop policy if exists product_types_update on public.product_types;
create policy product_types_update
on public.product_types
for update
to authenticated
using (
  public.is_core_admin(auth.uid())
  or (
    owner_agency_id is not null
    and public.is_agency_owner(auth.uid(), owner_agency_id)
  )
)
with check (
  public.is_core_admin(auth.uid())
  or (
    owner_agency_id is not null
    and public.is_agency_owner(auth.uid(), owner_agency_id)
  )
);

drop policy if exists product_types_delete on public.product_types;
create policy product_types_delete
on public.product_types
for delete
to authenticated
using (
  public.is_core_admin(auth.uid())
  or (
    owner_agency_id is not null
    and public.is_agency_owner(auth.uid(), owner_agency_id)
  )
);

drop policy if exists chat_sessions_select on public.chat_sessions;
create policy chat_sessions_select
on public.chat_sessions
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);

drop policy if exists chat_sessions_insert on public.chat_sessions;
create policy chat_sessions_insert
on public.chat_sessions
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);

drop policy if exists chat_sessions_update on public.chat_sessions;
create policy chat_sessions_update
on public.chat_sessions
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);

drop policy if exists chat_sessions_delete on public.chat_sessions;
create policy chat_sessions_delete
on public.chat_sessions
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select
on public.chat_messages
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
  or exists (
    select 1
    from public.chat_sessions s
    where s.id = chat_messages.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert
on public.chat_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
  or exists (
    select 1
    from public.chat_sessions s
    where s.id = chat_messages.session_id
      and s.user_id = auth.uid()
  )
);

drop policy if exists chat_messages_update on public.chat_messages;
create policy chat_messages_update
on public.chat_messages
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
)
with check (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);

drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete
on public.chat_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_core_admin(auth.uid())
);
