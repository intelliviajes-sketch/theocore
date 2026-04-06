import { NextRequest, NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import { listSocialLeads, saveSocialLead } from "@/features/social-media/api";

export async function GET(
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
    const leads = await listSocialLeads(agencyId);
    return NextResponse.json({ leads });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error cargando leads." },
      { status: 500 },
    );
  }
}

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
      source_comment_id?: string | null;
      source_post_id?: string | null;
      traveler_id?: string | null;
      contact_name?: string | null;
      contact_email?: string | null;
      contact_phone?: string | null;
      destination_interest?: string | null;
      budget_estimate?: number | null;
      travelers_count?: number | null;
      status?: "new" | "qualified" | "proposal" | "won" | "lost";
      notes?: string | null;
    };
    const id = await saveSocialLead(agencyId, body);
    return NextResponse.json({ id, ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error guardando lead." },
      { status: 500 },
    );
  }
}
