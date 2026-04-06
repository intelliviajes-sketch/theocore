import type { User } from "@supabase/supabase-js";
import { createSupabaseAdmin, createSupabaseServer } from "@/lib/supabase/server";

type ResolveRequestUserResult = {
  user: User | null;
  error: string | null;
};

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return "";
  return authorization.slice(7).trim();
}

export async function resolveRequestUser(request: Request): Promise<ResolveRequestUserResult> {
  try {
    const supabaseServer = await createSupabaseServer();
    const serverUserResult = await supabaseServer.auth.getUser();
    if (serverUserResult.data.user) {
      return { user: serverUserResult.data.user, error: null };
    }

    const token = extractBearerToken(request);
    if (!token) {
      return {
        user: null,
        error: serverUserResult.error?.message || "No autorizado.",
      };
    }

    const admin = createSupabaseAdmin();
    const tokenUserResult = await admin.auth.getUser(token);
    if (tokenUserResult.error || !tokenUserResult.data.user) {
      return {
        user: null,
        error: tokenUserResult.error?.message || "No autorizado.",
      };
    }

    return { user: tokenUserResult.data.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : "No autorizado.",
    };
  }
}

export async function canAccessAgency(userId: string, agencyId: string): Promise<boolean> {
  if (!userId || !agencyId) return false;

  const admin = createSupabaseAdmin();

  try {
    const { data: coreUser } = await admin
      .from("core_users")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (coreUser?.role === "TheoCoreOwner" || coreUser?.role === "CoreAdmin") {
      return true;
    }

    const [{ data: teamMember }, { data: travelerLink }] = await Promise.all([
      admin
        .from("agency_team")
        .select("user_id")
        .eq("user_id", userId)
        .eq("agency_id", agencyId)
        .eq("active", true)
        .maybeSingle(),
      admin
        .from("agency_travelers")
        .select("traveler_id, status")
        .eq("traveler_id", userId)
        .eq("agency_id", agencyId)
        .maybeSingle(),
    ]);

    if (teamMember?.user_id) {
      return true;
    }

    if (travelerLink?.traveler_id && (!travelerLink.status || travelerLink.status === "active")) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("canAccessAgency error", error);
    return false;
  }
}
