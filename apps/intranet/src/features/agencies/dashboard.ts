import { supabaseBrowser as supabase } from "@/lib/supabase/client";

export type AgencyDashboardData = {
  legalName: string | null;
  countryCode: string | null;
  emailContact: string | null;
  whatsapp: string | null;
  teamCount: number;
  travelersCount: number;
  brainsCount: number;
  toolsCount: number;
  activeTools: string[];
  risks: string[];
};

export const INITIAL_AGENCY_DASHBOARD: AgencyDashboardData = {
  legalName: null,
  countryCode: null,
  emailContact: null,
  whatsapp: null,
  teamCount: 0,
  travelersCount: 0,
  brainsCount: 0,
  toolsCount: 0,
  activeTools: [],
  risks: [],
};

export async function loadAgencyDashboardData(agencyId: string): Promise<AgencyDashboardData> {
  const [agencyRes, teamRes, travelersRes, brainsRes, toolsRes] = await Promise.all([
    supabase
      .from("agencies")
      .select("legal_name, country_code, email_contact, whatsapp")
      .eq("id", agencyId)
      .maybeSingle(),
    supabase.from("agency_team").select("user_id", { count: "exact" }).eq("agency_id", agencyId).eq("active", true),
    supabase.from("agency_travelers").select("traveler_id", { count: "exact" }).eq("agency_id", agencyId).eq("status", "active"),
    supabase.from("agencies_ai_assistants").select("ai_assistant_id", { count: "exact" }).eq("agency_id", agencyId),
    supabase.from("agency_tools").select("tool_key, label", { count: "exact" }).eq("active", true).order("label", { ascending: true }),
  ]);

  if (agencyRes.error) throw agencyRes.error;
  if (teamRes.error) throw teamRes.error;
  if (travelersRes.error) throw travelersRes.error;
  if (brainsRes.error) throw brainsRes.error;
  if (toolsRes.error) throw toolsRes.error;

  const activeTools = ((toolsRes.data as { tool_key?: string | null; label?: string | null }[]) || [])
    .map((tool) => tool.label || tool.tool_key)
    .filter((label): label is string => Boolean(label));

  const risks: string[] = [];
  if ((teamRes.count ?? 0) === 0) risks.push("La agencia no tiene equipo activo.");
  if ((travelersRes.count ?? 0) === 0) risks.push("La agencia aun no tiene viajeros vinculados.");
  if ((brainsRes.count ?? 0) === 0) risks.push("La agencia no tiene brains asignados.");
  if ((toolsRes.count ?? 0) === 0) risks.push("La agencia no tiene herramientas activas visibles.");

  return {
    legalName: agencyRes.data?.legal_name ?? null,
    countryCode: agencyRes.data?.country_code ?? null,
    emailContact: agencyRes.data?.email_contact ?? null,
    whatsapp: agencyRes.data?.whatsapp ?? null,
    teamCount: teamRes.count ?? 0,
    travelersCount: travelersRes.count ?? 0,
    brainsCount: brainsRes.count ?? 0,
    toolsCount: toolsRes.count ?? 0,
    activeTools,
    risks,
  };
}
