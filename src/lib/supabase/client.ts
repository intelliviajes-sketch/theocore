import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

declare global {
  var __supabaseBrowser__: ReturnType<typeof createSupabaseBrowserClient> | undefined;
}

export const supabaseBrowser =
  globalThis.__supabaseBrowser__ ?? createSupabaseBrowserClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__supabaseBrowser__ = supabaseBrowser;
}
