import { supabaseBrowser as supabase } from "@/lib/supabase/client";

type BrainRow = {
  id: string;
  name: string;
  active: boolean;
  scope: string | null;
  owner_agency_id: string | null;
  created_for_agency_id: string | null;
  brain_type?: string | null;
};

function normalizeAgencyId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function dedupeBrains(rows: BrainRow[]) {
  const seen = new Set<string>();
  const output: BrainRow[] = [];
  for (const row of rows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    output.push(row);
  }
  return output;
}

function sortBrains(rows: BrainRow[], agencyId: string | null) {
  const scopedAgencyId = normalizeAgencyId(agencyId);
  const priority = (row: BrainRow) => {
    if (scopedAgencyId && row.created_for_agency_id === scopedAgencyId) return 0;
    if (scopedAgencyId && row.owner_agency_id === scopedAgencyId) return 1;
    if (row.scope === "global" || row.scope === null) return 2;
    return 3;
  };

  return [...rows].sort((a, b) => {
    const delta = priority(a) - priority(b);
    if (delta !== 0) return delta;
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
}

function isBrainEligibleForAgency(brain: BrainRow, agencyId: string | null) {
  if (!brain?.active) return false;

  const scopedAgencyId = normalizeAgencyId(agencyId);
  if (!scopedAgencyId) {
    return brain.scope === "global" || brain.scope === null;
  }

  if (brain.scope === "global" || brain.scope === null) return true;
  if (brain.owner_agency_id === scopedAgencyId) return true;
  if (brain.created_for_agency_id === scopedAgencyId) return true;
  return false;
}

async function loadGlobalBrains() {
  const { data, error } = await supabase
    .from("ai_assistants")
    .select("*")
    .eq("active", true)
    .or("scope.eq.global,scope.is.null")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error cargando brains globales:", error);
    return [] as BrainRow[];
  }

  return (data ?? []) as BrainRow[];
}

export async function loadBrainsForTenant(agencyId: string | null) {
  const scopedAgencyId = normalizeAgencyId(agencyId);

  if (!scopedAgencyId) {
    const globals = await loadGlobalBrains();
    return sortBrains(dedupeBrains(globals), null);
  }

  const { data: links, error: linksError } = await supabase
    .from("agencies_ai_assistants")
    .select("ai_assistant_id")
    .eq("agency_id", scopedAgencyId);

  if (linksError) {
    console.error("Error cargando links de brains:", linksError);
  }

  const linkedBrainIds = Array.from(
    new Set((links ?? []).map((item) => String(item.ai_assistant_id || "").trim()).filter(Boolean)),
  );

  if (linkedBrainIds.length > 0) {
    const { data: linkedBrains, error: linkedBrainsError } = await supabase
      .from("ai_assistants")
      .select("*")
      .in("id", linkedBrainIds)
      .eq("active", true);

    if (linkedBrainsError) {
      console.error("Error cargando brains asignados:", linkedBrainsError);
    } else {
      const filtered = ((linkedBrains ?? []) as BrainRow[]).filter((brain) =>
        isBrainEligibleForAgency(brain, scopedAgencyId),
      );
      if (filtered.length > 0) {
        return sortBrains(dedupeBrains(filtered), scopedAgencyId);
      }
    }
  }

  const [{ data: agencyBrains, error: agencyBrainsError }, globalBrains] = await Promise.all([
    supabase
      .from("ai_assistants")
      .select("*")
      .eq("active", true)
      .eq("scope", "agency")
      .or(`owner_agency_id.eq.${scopedAgencyId},created_for_agency_id.eq.${scopedAgencyId}`)
      .order("name", { ascending: true }),
    loadGlobalBrains(),
  ]);

  if (agencyBrainsError) {
    console.error("Error cargando brains propios de agencia:", agencyBrainsError);
  }

  const combined = dedupeBrains([
    ...((agencyBrains ?? []) as BrainRow[]),
    ...globalBrains,
  ]).filter((brain) => isBrainEligibleForAgency(brain, scopedAgencyId));

  return sortBrains(combined, scopedAgencyId);
}
