create table if not exists public.product_type_version_amenities (
  id uuid primary key default gen_random_uuid(),
  product_type_version_id uuid not null references public.product_type_versions(id) on delete cascade,
  amenity_type_id uuid not null references public.amenity_types(id) on delete cascade,
  required boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists ux_product_type_version_amenities_unique
on public.product_type_version_amenities(product_type_version_id, amenity_type_id);

create index if not exists idx_product_type_version_amenities_version
on public.product_type_version_amenities(product_type_version_id);

create index if not exists idx_product_type_version_amenities_amenity
on public.product_type_version_amenities(amenity_type_id);
