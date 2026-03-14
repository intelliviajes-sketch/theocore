import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenant/server";

type BrainRow = {
  id: string;
  name: string;
  active: boolean;
  execution_layer: string | null;
  brain_category: string | null;
};

function sortBrains(brains: BrainRow[], defaultBrainId: string | null) {
  return [...brains].sort((a, b) => {
    if (defaultBrainId) {
      if (a.id === defaultBrainId && b.id !== defaultBrainId) return -1;
      if (b.id === defaultBrainId && a.id !== defaultBrainId) return 1;
    }
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
}

export async function GET() {
  try {
    const tenant = await resolveTenantFromRequest();

    if (tenant.kind !== "agency" || !tenant.agency?.id) {
      const { data: globalBrains, error: globalError } = await supabaseAdmin
        .from("ai_assistants")
        .select("*")
        .eq("active", true)
        .eq("execution_layer", "frontend")
        .eq("brain_category", "traveler")
        .or("scope.eq.global,scope.is.null")
        .order("name", { ascending: true });

      if (globalError) {
        console.error("Error cargando brains globales:", globalError);
        return NextResponse.json({ brains: [] }, { status: 200 });
      }

      return NextResponse.json({ brains: globalBrains ?? [] }, { status: 200 });
    }

    const agencyId = tenant.agency.id;

    const { data: links, error: linksError } = await supabaseAdmin
      .from("agencies_ai_assistants")
      .select("ai_assistant_id")
      .eq("agency_id", agencyId);

    if (linksError) {
      console.error("Error cargando asignaciones de brains:", linksError);
      return NextResponse.json({ brains: [] }, { status: 200 });
    }

    const brainIds = Array.from(
      new Set((links ?? []).map((row) => String(row.ai_assistant_id || "").trim()).filter(Boolean)),
    );

    if (brainIds.length === 0) {
      return NextResponse.json({ brains: [] }, { status: 200 });
    }

    const { data: assignedBrains, error: brainsError } = await supabaseAdmin
      .from("ai_assistants")
      .select("*")
      .in("id", brainIds)
      .eq("active", true)
      .eq("execution_layer", "frontend")
      .eq("brain_category", "traveler");

    if (brainsError) {
      console.error("Error cargando brains asignados:", brainsError);
      return NextResponse.json({ brains: [] }, { status: 200 });
    }

    const sorted = sortBrains((assignedBrains ?? []) as BrainRow[], tenant.market?.defaultBrainId ?? null);
    return NextResponse.json({ brains: sorted }, { status: 200 });
  } catch (error) {
    console.error("Error en /api/traveler/brains:", error);
    return NextResponse.json({ brains: [] }, { status: 200 });
  }
}
