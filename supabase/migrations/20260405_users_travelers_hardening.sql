begin;

create extension if not exists pgcrypto;

create or replace function public.is_core_admin_safe(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.core_users cu
    where cu.user_id = p_user_id
      and cu.role in ('TheoCoreOwner', 'CoreAdmin')
  )
$$;

create or replace function public.is_active_agency_team_member_safe(p_user_id uuid, p_agency_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.agency_team t
    where t.user_id = p_user_id
      and t.agency_id = p_agency_id
      and coalesce(t.active, true) = true
  )
$$;

alter table if exists public.travelers enable row level security;
alter table if exists public.agency_travelers enable row level security;
alter table if exists public.traveler_itineraries enable row level security;
alter table if exists public.chat_sessions enable row level security;
alter table if exists public.chat_messages enable row level security;

drop policy if exists "Users can insert their own traveler profile" on public.travelers;
drop policy if exists "Users can update their own traveler profile" on public.travelers;
drop policy if exists "Users can view their own traveler profile" on public.travelers;
drop policy if exists "theocoreowner_can_insert_travelers_anywhere" on public.travelers;
drop policy if exists "theocoreowner_can_read_travelers" on public.travelers;

create policy travelers_self_select
  on public.travelers
  for select
  to authenticated
  using (id = auth.uid());

create policy travelers_self_insert
  on public.travelers
  for insert
  to authenticated
  with check (id = auth.uid());

create policy travelers_self_update
  on public.travelers
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy travelers_core_admin_all
  on public.travelers
  for all
  to authenticated
  using (public.is_core_admin_safe(auth.uid()))
  with check (public.is_core_admin_safe(auth.uid()));

create policy travelers_team_member_select_linked
  on public.travelers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.agency_travelers at
      where at.traveler_id = travelers.id
        and public.is_active_agency_team_member_safe(auth.uid(), at.agency_id)
    )
  );

create policy travelers_team_member_insert
  on public.travelers
  for insert
  to authenticated
  with check (
    public.is_core_admin_safe(auth.uid())
    or exists (
      select 1
      from public.agency_team t
      where t.user_id = auth.uid()
        and coalesce(t.active, true) = true
    )
  );

drop policy if exists "agency_can_link_travelers" on public.agency_travelers;
drop policy if exists "agency_can_read_own_travelers" on public.agency_travelers;
drop policy if exists "agency_can_update_travelers" on public.agency_travelers;
drop policy if exists "agency_travelers_delete" on public.agency_travelers;
drop policy if exists "agency_travelers_insert" on public.agency_travelers;
drop policy if exists "agency_travelers_select" on public.agency_travelers;
drop policy if exists "agency_travelers_update" on public.agency_travelers;

create policy agency_travelers_select
  on public.agency_travelers
  for select
  to authenticated
  using (
    traveler_id = auth.uid()
    or public.is_core_admin_safe(auth.uid())
    or public.is_active_agency_team_member_safe(auth.uid(), agency_id)
  );

create policy agency_travelers_insert
  on public.agency_travelers
  for insert
  to authenticated
  with check (
    public.is_core_admin_safe(auth.uid())
    or public.is_active_agency_team_member_safe(auth.uid(), agency_id)
  );

create policy agency_travelers_update
  on public.agency_travelers
  for update
  to authenticated
  using (
    public.is_core_admin_safe(auth.uid())
    or public.is_active_agency_team_member_safe(auth.uid(), agency_id)
  )
  with check (
    public.is_core_admin_safe(auth.uid())
    or public.is_active_agency_team_member_safe(auth.uid(), agency_id)
  );

create policy agency_travelers_delete
  on public.agency_travelers
  for delete
  to authenticated
  using (
    public.is_core_admin_safe(auth.uid())
    or public.is_active_agency_team_member_safe(auth.uid(), agency_id)
  );

drop policy if exists "Users can insert their own itinerary" on public.traveler_itineraries;
drop policy if exists "Users can update their own itineraries" on public.traveler_itineraries;
drop policy if exists "Users can view their own itineraries" on public.traveler_itineraries;

create policy traveler_itineraries_self_select
  on public.traveler_itineraries
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create policy traveler_itineraries_self_insert
  on public.traveler_itineraries
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create policy traveler_itineraries_self_update
  on public.traveler_itineraries
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()))
  with check (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

drop policy if exists "Users can insert their own chat session" on public.chat_sessions;
drop policy if exists "Users can update their own chat session" on public.chat_sessions;
drop policy if exists "Users can view their own chat sessions" on public.chat_sessions;
drop policy if exists "chat_sessions_delete" on public.chat_sessions;
drop policy if exists "chat_sessions_insert" on public.chat_sessions;
drop policy if exists "chat_sessions_select" on public.chat_sessions;
drop policy if exists "chat_sessions_update" on public.chat_sessions;

create policy chat_sessions_select
  on public.chat_sessions
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create policy chat_sessions_insert
  on public.chat_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create policy chat_sessions_update
  on public.chat_sessions
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()))
  with check (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create policy chat_sessions_delete
  on public.chat_sessions
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

drop policy if exists "Users can insert their own chat message" on public.chat_messages;
drop policy if exists "Users can view their own chat messages" on public.chat_messages;
drop policy if exists "chat_messages_delete" on public.chat_messages;
drop policy if exists "chat_messages_insert" on public.chat_messages;
drop policy if exists "chat_messages_select" on public.chat_messages;
drop policy if exists "chat_messages_update" on public.chat_messages;

create policy chat_messages_select
  on public.chat_messages
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_core_admin_safe(auth.uid())
    or exists (
      select 1
      from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
    )
  );

create policy chat_messages_insert
  on public.chat_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or public.is_core_admin_safe(auth.uid())
    or exists (
      select 1
      from public.chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
    )
  );

create policy chat_messages_update
  on public.chat_messages
  for update
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()))
  with check (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create policy chat_messages_delete
  on public.chat_messages
  for delete
  to authenticated
  using (user_id = auth.uid() or public.is_core_admin_safe(auth.uid()));

create index if not exists agency_travelers_agency_status_idx
  on public.agency_travelers (agency_id, status, created_at desc);

create index if not exists agency_travelers_traveler_status_idx
  on public.agency_travelers (traveler_id, status, created_at desc);

create index if not exists travelers_email_lookup_idx
  on public.travelers (lower(email));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agency_travelers_status_chk'
  ) then
    alter table public.agency_travelers
      add constraint agency_travelers_status_chk
      check (status is null or status in ('active', 'inactive', 'archived', 'blocked'));
  end if;
end
$$;

create or replace function public.upsert_traveler_and_link(
  p_agency_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_notes text default null,
  p_segment text default null,
  p_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_email text;
  v_traveler_id uuid;
begin
  v_actor := auth.uid();
  if v_actor is null then
    raise exception 'No autorizado';
  end if;

  if p_agency_id is null then
    raise exception 'agency_id es obligatorio';
  end if;

  if not (public.is_core_admin_safe(v_actor) or public.is_active_agency_team_member_safe(v_actor, p_agency_id)) then
    raise exception 'Sin permisos para gestionar travelers de esta agencia';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if length(v_email) = 0 then
    raise exception 'email es obligatorio';
  end if;

  select t.id
    into v_traveler_id
  from public.travelers t
  where lower(t.email) = v_email
  order by t.created_at asc nulls last
  limit 1;

  if v_traveler_id is null then
    insert into public.travelers (
      full_name,
      email,
      phone,
      active
    )
    values (
      nullif(trim(coalesce(p_full_name, '')), ''),
      v_email,
      nullif(trim(coalesce(p_phone, '')), ''),
      true
    )
    returning id into v_traveler_id;
  else
    update public.travelers
    set
      full_name = coalesce(nullif(trim(coalesce(p_full_name, '')), ''), full_name),
      phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), phone),
      active = true
    where id = v_traveler_id;
  end if;

  if exists (
    select 1
    from public.agency_travelers at
    where at.agency_id = p_agency_id
      and at.traveler_id = v_traveler_id
  ) then
    update public.agency_travelers
    set
      status = 'active',
      priority = coalesce(nullif(trim(coalesce(p_priority, '')), ''), priority),
      segment = coalesce(nullif(trim(coalesce(p_segment, '')), ''), segment),
      phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), phone),
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      full_name = coalesce(nullif(trim(coalesce(p_full_name, '')), ''), full_name),
      email = v_email
    where agency_id = p_agency_id
      and traveler_id = v_traveler_id;
  else
    insert into public.agency_travelers (
      agency_id,
      traveler_id,
      status,
      priority,
      segment,
      phone,
      notes,
      full_name,
      email
    )
    values (
      p_agency_id,
      v_traveler_id,
      'active',
      coalesce(nullif(trim(coalesce(p_priority, '')), ''), 'normal'),
      nullif(trim(coalesce(p_segment, '')), ''),
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_notes, '')), ''),
      nullif(trim(coalesce(p_full_name, '')), ''),
      v_email
    );
  end if;

  return v_traveler_id;
end;
$$;

revoke all on function public.upsert_traveler_and_link(uuid, text, text, text, text, text, text) from public;
grant execute on function public.upsert_traveler_and_link(uuid, text, text, text, text, text, text) to authenticated;

commit;
