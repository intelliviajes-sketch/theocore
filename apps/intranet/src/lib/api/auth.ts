import type { User } from "@supabase/supabase-js";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

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

function normalizeIp(rawIp: string | null) {
  if (!rawIp) return "unknown";

  const trimmed = rawIp.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return "unknown";

  if (trimmed === "::1") return "127.0.0.1";

  // x-forwarded-for may contain IPv4 with port, ex: 203.0.113.1:43123
  if (trimmed.includes(".") && trimmed.includes(":")) {
    const [ipv4] = trimmed.split(":");
    return ipv4?.trim() || "unknown";
  }

  return trimmed.slice(0, 120);
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",")[0] ?? "";
    return normalizeIp(firstForwardedIp);
  }
  return normalizeIp(request.headers.get("x-real-ip"));
}

export function resolveSafeRedirectUrl({
  siteUrl,
  redirectTo,
  fallbackPath,
  allowedPathPrefixes,
}: {
  siteUrl: string;
  redirectTo?: string | null;
  fallbackPath: string;
  allowedPathPrefixes?: string[];
}) {
  const fallback = new URL(fallbackPath, siteUrl).toString();
  if (!redirectTo) return fallback;

  try {
    const parsed = new URL(redirectTo, siteUrl);
    const siteOrigin = new URL(siteUrl).origin;
    if (parsed.origin !== siteOrigin) {
      return fallback;
    }

    if (allowedPathPrefixes && allowedPathPrefixes.length > 0) {
      const allowed = allowedPathPrefixes.some((prefix) => {
        const normalizedPrefix = prefix.startsWith("/") ? prefix : `/${prefix}`;
        return (
          parsed.pathname === normalizedPrefix ||
          parsed.pathname.startsWith(`${normalizedPrefix}/`)
        );
      });
      if (!allowed) return fallback;
    }

    return parsed.toString();
  } catch {
    return fallback;
  }
}
