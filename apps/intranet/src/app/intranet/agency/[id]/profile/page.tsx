import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AgencyProfile from "./AgencyProfile";

type AgencyBranding = {
  logo_url: string | null;
  hero_config: Record<string, unknown> | null;
};

function asJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const supabase = await createSupabaseServer();
  const { data: agency, error } = await supabase.from("agencies").select("*").eq("id", id).single();
  const { data: branding } = await supabase
    .from("agency_branding")
    .select("logo_url, hero_config")
    .eq("agency_id", id)
    .maybeSingle();

  if (error) {
    console.error("ERROR AGENCY:", error.message);
    return <p>Error cargando agencia</p>;
  }

  if (!agency) {
    return <p>No existe la agencia</p>;
  }

  const { data: links } = await supabase
    .from("agencies_ai_assistants")
    .select("ai_assistant_id")
    .eq("agency_id", id);

  const assignedBrainIds = new Set(
    (links ?? []).map((row) => String(row.ai_assistant_id || "").trim()).filter(Boolean),
  );

  const heroConfig = asJsonObject((branding as AgencyBranding | null)?.hero_config);
  const persistedMascotBrainId = String(heroConfig.mascot_brain_id || "").trim();
  if (persistedMascotBrainId) {
    assignedBrainIds.add(persistedMascotBrainId);
  }

  let mascotBrainOptions: Array<{ id: string; name: string; logo_url: string | null }> = [];
  if (assignedBrainIds.size > 0) {
    const { data: brainsData } = await supabase
      .from("ai_assistants")
      .select("id, name, logo_url, active, execution_layer, brain_category")
      .in("id", Array.from(assignedBrainIds));

    mascotBrainOptions = (brainsData ?? [])
      .filter((row) => {
        const brainId = String(row.id || "");
        if (brainId === persistedMascotBrainId) return true;
        return Boolean(row.active) && row.execution_layer === "frontend" && row.brain_category === "traveler";
      })
      .map((row) => ({
        id: String(row.id || ""),
        name: String(row.name || "Brain"),
        logo_url: typeof row.logo_url === "string" ? row.logo_url : null,
      }));
  }

  return (
    <AgencyProfile
      agency={agency}
      branding={(branding as AgencyBranding | null) ?? null}
      mascotBrainOptions={mascotBrainOptions}
    />
  );
}
