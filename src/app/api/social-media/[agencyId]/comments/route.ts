import { NextRequest, NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import {
  listSocialCommentsInbox,
  saveSocialCommentInboxItem,
} from "@/features/social-media/api";

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
    const comments = await listSocialCommentsInbox(agencyId);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error cargando comentarios." },
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
      channel: "instagram" | "facebook" | "tiktok" | "youtube_shorts";
      post_id?: string | null;
      author_handle?: string | null;
      content: string;
      sentiment?: "positive" | "neutral" | "negative";
      intent?: string | null;
      priority?: "low" | "normal" | "high" | "urgent";
      status?: "open" | "in_progress" | "resolved" | "ignored";
    };

    const id = await saveSocialCommentInboxItem(agencyId, body);
    return NextResponse.json({ id, ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error guardando comentario." },
      { status: 500 },
    );
  }
}
