import { NextRequest, NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import {
  generateBriefFromCatalog,
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
      catalogId: string;
      catalogTitle: string;
      catalogSummary: string;
    };

    const socialContext = await loadAgencySocialContext(agencyId);
    const id = await generateBriefFromCatalog({
      agencyId,
      context: socialContext,
      campaignId: body.campaignId || null,
      catalogId: body.catalogId,
      catalogTitle: body.catalogTitle,
      catalogSummary: body.catalogSummary,
    });

    return NextResponse.json({ ok: true, briefId: id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generando brief." },
      { status: 500 },
    );
  }
}
