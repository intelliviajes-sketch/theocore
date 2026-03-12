# Supabase

Este proyecto ya queda preparado para que Codex trabaje con Supabase de dos maneras:

- Desde el codigo de la app con los helpers de `src/lib/supabase`.
- Desde terminal con la Supabase CLI instalada en `devDependencies`.

## Variables de entorno

Copia o completa estas variables en tu entorno local:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notas:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` alimentan el cliente web y el cliente SSR.
- `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse en servidor.
- `SUPABASE_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN` sirven para enlazar la CLI con el proyecto remoto.
- `SUPABASE_DB_PASSWORD` se usa si vas a enlazar y operar contra la base remota desde la CLI.

## Acceso desde codigo

Helpers disponibles:

- `src/lib/supabase/client.ts`: cliente de navegador con sesion persistente.
- `src/lib/supabase/server.ts`: cliente SSR con cookies y cliente admin para servidor.
- `src/lib/supabase/env.ts`: validacion comun de variables.

Ejemplos:

```ts
import { supabaseBrowser } from "@/lib/supabase/client";
import { createSupabaseServer, supabaseAdmin } from "@/lib/supabase/server";
```

## Supabase CLI

La CLI ya esta instalada localmente. Comandos utiles:

```bash
npm run supabase:start
npm run supabase:status
npm run supabase:db:reset
npm run supabase:db:push
npm run supabase:types:local
```

La carpeta `supabase/` ya esta inicializada. Si quieres trabajar con el proyecto remoto:

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>
npm run supabase:types:linked
```

Notas:

- `supabase start` necesita Docker.
- `supabase:types:linked` genera `src/types/supabase.ts` usando el proyecto remoto enlazado.
- Si vas a trabajar desde Codex con migraciones o generacion de tipos, conviene ejecutar primero `supabase link`.

## Flujo recomendado para Codex

1. Usar los helpers de `src/lib/supabase` para leer o escribir desde la app.
2. Usar la CLI para inspeccionar esquema, levantar stack local, crear migraciones y generar tipos.
3. Mantener la `service_role` fuera del cliente y reservarla para rutas o utilidades solo de servidor.
