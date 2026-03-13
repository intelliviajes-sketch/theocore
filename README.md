# IntelliViajes Workspace

Monorepo con dos aplicaciones Next.js:

- `apps/intranet` (TheoCore/TheCoocre): panel administrativo y operacion interna.
- `apps/traveler` (Traveer): experiencia del viajero.

## Requisitos

- Node.js 20+
- npm 10+

## Instalacion

```bash
npm ci
```

## Desarrollo

```bash
npm run dev
```

## Validacion local completa

```bash
npm run ci:check
```

Este comando ejecuta:

1. `lint` de todo el monorepo.
2. `build` de todo el monorepo.
3. `smoke tests` de rutas y endpoints criticos.

## Migraciones Supabase

Se anadieron migraciones de hardening RLS en ambas apps:

- `apps/intranet/supabase/migrations/20260312_security_rls_hardening.sql`
- `apps/traveler/supabase/migrations/20260312_security_rls_hardening.sql`

Para aplicarlas en cada app:

```bash
cd apps/intranet
npm run supabase:db:push

cd ../traveler
npm run supabase:db:push
```

O desde la raiz:

```bash
npm run db:push:all
```

Notas importantes:

- `db push` contra Supabase cloud requiere enlazar cada app con `supabase link --project-ref <tu_ref>`.
- Para enlazar y aplicar sin prompts con `npm run db:push:all`, exporta:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_DB_PASSWORD`
- `supabase start` y `db push --local` requieren Docker Desktop activo.

## CI

Hay pipeline en GitHub Actions:

- `.github/workflows/ci.yml`

Ejecuta `npm ci`, `lint`, `build` y `test:smoke` en PRs y pushes a `main/master`.