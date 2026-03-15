import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenant/server";

type BrainRow = {
  id: string;
  name: string;
  active: boolean;
  execution_layer: string | null;
  brain_category: string | null;
  strategic_concept?: string | null;
  persona_profile?: string | null;
  market_segment?: string | null;
  monetization_model?: string | null;
  visibility_level?: string | null;
  business_rules?: Record<string, unknown> | null;
  language_priority?: string[] | null;
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

type AssignmentRow = {
  ai_assistant_id: string;
  persona_profile: string | null;
  strategic_concept: string | null;
  market_segment: string | null;
  monetization_model: string | null;
  visibility_level: string | null;
  custom_business_rules: Record<string, unknown> | null;
  execution_overrides: Record<string, unknown> | null;
  language_overrides: string[] | null;
};

function asJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mergeAssignmentIntoBrain(brain: BrainRow, assignment: AssignmentRow | undefined) {
  if (!assignment) return brain;

  const businessRules = {
    ...asJsonObject(brain.business_rules),
    ...asJsonObject(assignment.custom_business_rules),
  };

  return {
    ...brain,
    strategic_concept: assignment.strategic_concept || brain.strategic_concept || null,
    persona_profile: assignment.persona_profile || brain.persona_profile || null,
    market_segment: assignment.market_segment || brain.market_segment || null,
    monetization_model: assignment.monetization_model || brain.monetization_model || null,
    visibility_level: assignment.visibility_level || brain.visibility_level || null,
    business_rules: businessRules,
    language_priority:
      Array.isArray(assignment.language_overrides) && assignment.language_overrides.length > 0
        ? assignment.language_overrides
        : brain.language_priority || null,
    execution_overrides: asJsonObject(assignment.execution_overrides),
  };
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
      .select(
        "ai_assistant_id, persona_profile, strategic_concept, market_segment, monetization_model, visibility_level, custom_business_rules, execution_overrides, language_overrides",
      )
      .eq("agency_id", agencyId);

    if (linksError) {
      console.error("Error cargando asignaciones de brains:", linksError);
      return NextResponse.json({ brains: [] }, { status: 200 });
    }

    const assignments = (links ?? []) as AssignmentRow[];
    const brainIds = Array.from(
      new Set(assignments.map((row) => String(row.ai_assistant_id || "").trim()).filter(Boolean)),
    );

    let idsToLoad = brainIds;
    // Backward-compatible fallback: if there are no explicit links yet, try market default brain.
    if (idsToLoad.length === 0 && tenant.market?.defaultBrainId) {
      idsToLoad = [tenant.market.defaultBrainId];
    }

    if (idsToLoad.length === 0) {
      return NextResponse.json({ brains: [] }, { status: 200 });
    }

    const { data: assignedBrains, error: brainsError } = await supabaseAdmin
      .from("ai_assistants")
      .select("*")
      .in("id", idsToLoad)
      .eq("active", true)
      .eq("execution_layer", "frontend")
      .eq("brain_category", "traveler");

    if (brainsError) {
      console.error("Error cargando brains asignados:", brainsError);
      return NextResponse.json({ brains: [] }, { status: 200 });
    }

    const assignmentByBrainId = new Map(
      assignments.map((assignment) => [assignment.ai_assistant_id, assignment]),
    );
    const withOverrides = ((assignedBrains ?? []) as BrainRow[]).map((brain) =>
      mergeAssignmentIntoBrain(brain, assignmentByBrainId.get(brain.id)),
    );
    const sorted = sortBrains(withOverrides, tenant.market?.defaultBrainId ?? null);
    return NextResponse.json({ brains: sorted }, { status: 200 });
  } catch (error) {
    console.error("Error en /api/traveler/brains:", error);
    return NextResponse.json({ brains: [] }, { status: 200 });
  }
}
