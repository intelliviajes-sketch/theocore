import { NextRequest, NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { publishSocialPostToChannel } from "@/features/social-media/providers";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agencyId: string; postId: string }> },
) {
  try {
    const { user, error } = await resolveRequestUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || "No autorizado." }, { status: 401 });
    }

    const { agencyId, postId } = await context.params;
    const allowed = await canAccessAgency(user.id, agencyId);
    if (!allowed) {
      return NextResponse.json({ error: "No tienes acceso a esta agencia." }, { status: 403 });
    }

    const admin = createSupabaseAdmin();
    const { data: post, error: postError } = await admin
      .from("agency_social_posts")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("id", postId)
      .single();
    if (postError || !post) {
      return NextResponse.json({ error: "Post no encontrado." }, { status: 404 });
    }

    const channels = Array.isArray(post.channels) ? (post.channels as string[]) : [];
    if (channels.length === 0) {
      return NextResponse.json({ error: "El post no tiene canales configurados." }, { status: 400 });
    }

    const results = await Promise.all(
      channels.map((channel) =>
        publishSocialPostToChannel({
          channel: channel as any,
          title: String(post.title || ""),
          caption: String(post.caption || ""),
          assetUrl: Array.isArray(post.asset_urls) ? (post.asset_urls[0] as string | undefined) : null,
          ctaUrl: typeof post.cta_url === "string" ? post.cta_url : null,
        }),
      ),
    );

    const hasFailure = results.some((item) => !item.ok);
    const status = hasFailure ? "review" : "published";
    const syncStatus = hasFailure ? "failed" : "synced";

    const { error: updateError } = await admin
      .from("agency_social_posts")
      .update({
        status,
        sync_status: syncStatus,
        published_at: hasFailure ? post.published_at : new Date().toISOString(),
        last_sync_at: new Date().toISOString(),
        last_sync_error: hasFailure ? results.find((item) => !item.ok)?.message || null : null,
      })
      .eq("agency_id", agencyId)
      .eq("id", postId);
    if (updateError) throw updateError;

    const logs = results.map((item) => ({
      agency_id: agencyId,
      post_id: postId,
      status: item.ok ? "published" : "failed",
      provider: item.provider,
      message: item.message,
      payload: { externalId: item.externalId, channelCount: channels.length },
    }));
    const { error: logError } = await admin.from("agency_social_publish_logs").insert(logs);
    if (logError) throw logError;

    return NextResponse.json({
      ok: !hasFailure,
      status,
      results,
    });
  } catch (error) {
    console.error("publish post error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error publicando post." },
      { status: 500 },
    );
  }
}
