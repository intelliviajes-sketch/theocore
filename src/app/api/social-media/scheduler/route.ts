import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { publishSocialPostToChannel } from "@/features/social-media/providers";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado para scheduler." }, { status: 401 });
}

function isSchedulerAuthorized(request: NextRequest) {
  const token = request.headers.get("x-scheduler-token") || "";
  const expected = process.env.SOCIAL_SCHEDULER_SECRET || "";
  if (!expected) return false;
  return token === expected;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSchedulerAuthorized(request)) return unauthorized();

    const admin = createSupabaseAdmin();
    const now = new Date().toISOString();
    const { data: posts, error } = await admin
      .from("agency_social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .eq("active", true)
      .order("scheduled_at", { ascending: true })
      .limit(30);
    if (error) throw error;

    let published = 0;
    let failed = 0;

    for (const post of posts ?? []) {
      const channels = Array.isArray(post.channels) ? (post.channels as string[]) : [];
      if (channels.length === 0) {
        failed += 1;
        await admin
          .from("agency_social_posts")
          .update({
            status: "review",
            sync_status: "failed",
            last_sync_error: "Sin canales configurados.",
            last_sync_at: new Date().toISOString(),
          })
          .eq("id", post.id);
        continue;
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
      if (hasFailure) failed += 1;
      else published += 1;

      await admin
        .from("agency_social_posts")
        .update({
          status: hasFailure ? "review" : "published",
          sync_status: hasFailure ? "failed" : "synced",
          published_at: hasFailure ? post.published_at : new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          last_sync_error: hasFailure ? results.find((item) => !item.ok)?.message || null : null,
        })
        .eq("id", post.id);

      const logs = results.map((item) => ({
        agency_id: post.agency_id,
        post_id: post.id,
        status: item.ok ? "published" : "failed",
        provider: item.provider,
        message: item.message,
        payload: { externalId: item.externalId, scheduler: true },
      }));
      await admin.from("agency_social_publish_logs").insert(logs);
    }

    return NextResponse.json({
      ok: true,
      processed: (posts ?? []).length,
      published,
      failed,
    });
  } catch (error) {
    console.error("scheduler error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en scheduler social." },
      { status: 500 },
    );
  }
}
