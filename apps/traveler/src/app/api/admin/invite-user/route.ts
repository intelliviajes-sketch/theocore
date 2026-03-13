import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  isCoreAdmin,
  resolveRequestUser,
  resolveSafeRedirectUrl,
} from "@/lib/api/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeInviteMetadata(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }

  const sanitized: Record<string, string | number | boolean | null> = {};
  const entries = Object.entries(meta as Record<string, unknown>).slice(0, 20);

  for (const [key, value] of entries) {
    const normalizedKey = key.trim().slice(0, 64);
    if (!normalizedKey) continue;

    if (typeof value === "string") {
      sanitized[normalizedKey] = value.slice(0, 2000);
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[normalizedKey] = value;
    }
  }

  return sanitized;
}

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await resolveRequestUser(req);
    if (authError || !user) {
      return new NextResponse("No autorizado.", { status: 401 });
    }

    const canInvite = await isCoreAdmin(user.id);
    if (!canInvite) {
      return new NextResponse("Permisos insuficientes.", { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const { email, meta, redirectTo } = body || {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return new NextResponse("Email requerido", { status: 400 });
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return new NextResponse("Email invalido", { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const safeRedirectTo = resolveSafeRedirectUrl({
      siteUrl,
      redirectTo: typeof redirectTo === "string" ? redirectTo : null,
      fallbackPath: "/intranet/auth/activate",
      allowedPathPrefixes: ["/intranet/auth/activate"],
    });

    const supaAdmin = createSupabaseAdmin();

    const { data, error } = await supaAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: sanitizeInviteMetadata(meta),
      redirectTo: safeRedirectTo,
    });

    if (error) return new NextResponse(error.message, { status: 400 });
    if (!data?.user?.id) return new NextResponse("No se obtuvo user_id", { status: 400 });

    return NextResponse.json({ user_id: data.user.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error invitando usuario";
    return new NextResponse(message, { status: 500 });
  }
}
