import type { User } from "@supabase/supabase-js";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";
import {
  getRequestIp,
  resolveSafeRedirectUrl,
} from "@intelliviajes/lib/api/auth";

const CORE_ADMIN_ROLES = new Set(["TheoCoreOwner", "CoreAdmin"]);

export type RequestUserResult = {
  user: User | null;
  error: string | null;
};

export async function resolveRequestUser(request: Request): Promise<RequestUserResult> {
  const supabaseServer = await createSupabaseServer();
  const serverUserResult = await supabaseServer.auth.getUser();
  if (serverUserResult.data.user) {
    return { user: serverUserResult.data.user, error: null };
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!token) {
    return { user: null, error: serverUserResult.error?.message ?? "No autorizado." };
  }

  const admin = createSupabaseAdmin();
  const tokenUserResult = await admin.auth.getUser(token);
  if (tokenUserResult.error || !tokenUserResult.data.user) {
    return {
      user: null,
      error: tokenUserResult.error?.message ?? "No autorizado.",
    };
  }

  return { user: tokenUserResult.data.user, error: null };
}

export async function isCoreAdmin(userId: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("core_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error verificando rol core admin:", error);
    return false;
  }

  return CORE_ADMIN_ROLES.has(String(data?.role ?? ""));
}

export async function canAccessAgency(userId: string, agencyId: string) {
  if (!agencyId) return false;
  if (await isCoreAdmin(userId)) return true;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("agency_team")
    .select("user_id")
    .eq("user_id", userId)
    .eq("agency_id", agencyId)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Error validando acceso a agencia:", error);
    return false;
  }

  return Boolean(data);
}

export { getRequestIp, resolveSafeRedirectUrl };
