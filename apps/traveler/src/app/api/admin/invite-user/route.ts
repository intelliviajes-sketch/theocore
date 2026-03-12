import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new NextResponse("Supabase env vars missing", { status: 500 });
    }

    const body = await req.json();
    const { email, meta, redirectTo } = body || {};

    if (!email) {
      return new NextResponse("Email requerido", { status: 400 });
    }

    const supaAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supaAdmin.auth.admin.inviteUserByEmail(email, {
      data: meta || {},
      redirectTo:
        redirectTo ||
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/intranet/auth/activate`,
    });

    if (error) return new NextResponse(error.message, { status: 400 });
    if (!data?.user?.id) return new NextResponse("No se obtuvo user_id", { status: 400 });

    return NextResponse.json({ user_id: data.user.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error invitando usuario";
    return new NextResponse(message, { status: 500 });
  }
}
