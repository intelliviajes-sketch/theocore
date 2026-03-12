import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { AGENCY_TOOL_REGISTRY } from "@/lib/agency-tools-registry";

export type AgencyToolDefinition = {
  id: string;
  tool_key: string;
  label: string;
  path: string;
  icon: string | null;
  active: boolean;
  created_at: string | null;
};

type AgencyToolRow = {
  id: string;
  tool_key: string;
  label: string;
  path: string;
  icon: string | null;
  active: boolean | null;
  created_at: string | null;
};

export async function listLiveAgencyTools() {
  const { data, error } = await supabase
    .from("agency_tools")
    .select("id, tool_key, label, path, icon, active, created_at");

  if (error) throw error;

  const rows = ((data ?? []) as AgencyToolRow[]).reduce<Record<string, AgencyToolRow>>((acc, row) => {
    acc[row.tool_key] = row;
    return acc;
  }, {});

  return AGENCY_TOOL_REGISTRY.filter((item) => item.status === "live")
    .map<AgencyToolDefinition | null>((item) => {
      const row = rows[item.toolKey];
      const active = row?.active ?? true;
      if (!active) return null;
      return {
        id: row?.id ?? `registry:${item.toolKey}`,
        tool_key: item.toolKey,
        label: row?.label ?? item.label,
        path: row?.path ?? item.path,
        icon: row?.icon ?? item.icon ?? null,
        active,
        created_at: row?.created_at ?? null,
      };
    })
    .filter((item): item is AgencyToolDefinition => Boolean(item));
}
