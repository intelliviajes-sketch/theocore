import { NextRequest, NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  generateCampaign360Playbook,
  loadAgencySocialContext,
} from "@/features/social-media/api";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agencyId: string }> },
) {
  try {
    const { user, error } = await resolveRequestUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "No autorizado." }, { status: 401 });
    }
    const { agencyId } = await context.params;
    if (!(await canAccessAgency(user.id, agencyId))) {
      return NextResponse.json({ error: "Sin acceso a agencia." }, { status: 403 });
    }

    const body = (await request.json()) as {
      campaignId?: string | null;
      name: string;
      objective: string;
      audience: string;
    };

    const socialContext = await loadAgencySocialContext(agencyId);
    const id = await generateCampaign360Playbook({
      agencyId,
      context: socialContext,
      campaignId: body.campaignId || null,
      name: body.name,
      objective: body.objective,
      audience: body.audience,
    });

    const admin = createSupabaseAdmin();
    const { data, error: fetchError } = await admin
      .from("agency_social_playbooks")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    return NextResponse.json({ ok: true, playbook: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generando playbook." },
      { status: 500 },
    );
  }
}
