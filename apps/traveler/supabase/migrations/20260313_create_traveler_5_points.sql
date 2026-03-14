-- Punto 1: Memoria de Contexto (Stateful Chat)
create table
  public.traveler_preferences (
    id uuid not null default gen_random_uuid (),
    user_id uuid not null,
    tenant_id uuid not null,
    preferences_json jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint traveler_preferences_pkey primary key (id),
    constraint traveler_preferences_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  );

-- Habilitar RLS
alter table public.traveler_preferences enable row level security;

-- Politicas para traveler_preferences (Solo el usuario lee/escribe sus preferencias)
create policy "Users can view own preferences" on public.traveler_preferences for
select
  using (
    (
      select
        auth.uid () as uid
    ) = user_id
  );

create policy "Users can insert own preferences" on public.traveler_preferences for insert
with
  check (
    (
      select
        auth.uid () as uid
    ) = user_id
  );

create policy "Users can update own preferences" on public.traveler_preferences for
update
  using (
    (
      select
        auth.uid () as uid
    ) = user_id
  );


-- Punto 5: Link de Exportación (Public Share Link)
create table
  public.shared_itineraries (
    id uuid not null default gen_random_uuid (),
    owner_id uuid not null,
    tenant_id uuid not null,
    title text null,
    data_json jsonb not null default '{}'::jsonb,
    is_public boolean not null default true,
    expires_at timestamp with time zone null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint shared_itineraries_pkey primary key (id),
    constraint shared_itineraries_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete cascade
  );

-- Habilitar RLS
alter table public.shared_itineraries enable row level security;

-- Politicas para shared_itineraries
-- Permitir lectura publica a cualquier itinerary con is_public = true, aunque no esten logueados.
create policy "Anyone can view public itineraries" on public.shared_itineraries for
select
  using (is_public = true);

-- Solo el owner puede insertar/actualizar
create policy "Users can insert own itineraries" on public.shared_itineraries for insert
with
  check (
    (
      select
        auth.uid () as uid
    ) = owner_id
  );

create policy "Users can update own itineraries" on public.shared_itineraries for
update
  using (
    (
      select
        auth.uid () as uid
    ) = owner_id
  );
