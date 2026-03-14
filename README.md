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

Chequeo de texto/codificacion (opcional individual):

```bash
npm run check:text
```

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

## Deploy automatico a Vercel

Se anadio el workflow:

- `.github/workflows/vercel-deploy.yml`

Comportamiento:

1. En push a cualquier rama que no sea `main/master`, crea deploy de preview para:
   - `apps/intranet`
   - `apps/traveler`
2. En push a `main` o `master`, hace deploy de produccion para ambas apps.

### Secrets requeridos en GitHub

Configura estos secrets en el repo (`Settings > Secrets and variables > Actions`):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_INTR` (project id de la app Intranet en Vercel)
- `VERCEL_PROJECT_ID_TRAVELER` (project id de la app Traveler en Vercel)

### Como obtener los IDs de proyecto

En local, una vez logueado en Vercel:

```bash
cd apps/intranet
npx vercel link

cd ../traveler
npx vercel link
```

Cada comando crea `apps/<app>/.vercel/project.json`; de ahi puedes copiar `projectId` y `orgId` para los secrets.
