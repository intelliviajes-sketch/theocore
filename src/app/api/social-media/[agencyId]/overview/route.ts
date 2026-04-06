import { NextRequest, NextResponse } from "next/server";
import { canAccessAgency, resolveRequestUser } from "@/lib/api/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

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
    const allowed = await canAccessAgency(user.id, agencyId);
    if (!allowed) {
      return NextResponse.json({ error: "No tienes acceso a esta agencia." }, { status: 403 });
    }

    const admin = createSupabaseAdmin();
    const [campaigns, posts, leads, comments] = await Promise.all([
      admin.from("agency_social_campaigns").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(30),
      admin.from("agency_social_posts").select("*").eq("agency_id", agencyId).eq("active", true).order("created_at", { ascending: false }).limit(40),
      admin.from("agency_social_leads").select("*").eq("agency_id", agencyId).order("score", { ascending: false }).limit(40),
      admin.from("agency_social_comments_inbox").select("*").eq("agency_id", agencyId).order("created_at", { ascending: false }).limit(40),
    ]);

    if (campaigns.error) throw campaigns.error;
    if (posts.error) throw posts.error;
    if (leads.error) throw leads.error;
    if (comments.error) throw comments.error;

    const postsData = posts.data ?? [];
    const leadsData = leads.data ?? [];
    const totalImpressions = postsData.reduce((acc, item) => acc + Number(item.impressions || 0), 0);
    const totalClicks = postsData.reduce((acc, item) => acc + Number(item.clicks || 0), 0);
    const summary = {
      pipeline: postsData.length,
      published: postsData.filter((item) => item.status === "published").length,
      leads: leadsData.length,
      hot_leads: leadsData.filter((item) => item.temperature === "hot").length,
      bookings: postsData.reduce((acc, item) => acc + Number(item.bookings || 0), 0),
      avg_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      recommendation:
        leadsData.length < 10
          ? "Aumentar volumen de contenido de conversion."
          : "Escalar campana y mercados con mejor CTR.",
    };

    return NextResponse.json({
      campaigns: campaigns.data ?? [],
      posts: postsData,
      leads: leadsData,
      comments: comments.data ?? [],
      summary,
    });
  } catch (error) {
    console.error("social-media overview error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error cargando overview." },
      { status: 500 },
    );
  }
}
