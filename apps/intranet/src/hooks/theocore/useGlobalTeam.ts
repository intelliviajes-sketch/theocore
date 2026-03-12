"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";

export type TeamRow = {
  user_id: string;
  full_name: string;
  email: string;
  role: "AgencyOwner" | "TeamAgency";
  agency_id: string | null;
  permissions: string[] | null;
  active: boolean | null;
  email_confirmed_at: string | null;
  status_display?: "pendiente" | "activo" | "desactivado";
};

export type AgencyOption = {
  id: string;
  commercial_name: string | null;
  legal_name: string | null;
};

export function useGlobalTeam() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamRow[]>([]);
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);

  const loadAgencies = useCallback(async () => {
    const { data, error } = await supabase
      .from("agencies")
      .select("id, commercial_name, legal_name")
      .order("commercial_name", { ascending: true });
    if (error) throw error;
    setAgencies((data as AgencyOption[]) || []);
  }, []);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_global_users");
      if (error) throw error;

      const mapped = ((data as TeamRow[]) || []).map((user) => {
        let status: "pendiente" | "activo" | "desactivado";
        if (!user.email_confirmed_at) status = "pendiente";
        else if (user.active === false) status = "desactivado";
        else status = "activo";
        return { ...user, status_display: status };
      });

      setTeam(mapped);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([loadTeam(), loadAgencies()]);
  }, [loadAgencies, loadTeam]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleUser = useCallback(async (user: Pick<TeamRow, "user_id" | "agency_id" | "active">) => {
    const { error } = await supabase
      .from("agency_team")
      .update({ active: !user.active })
      .eq("user_id", user.user_id)
      .eq("agency_id", user.agency_id);
    if (error) throw error;
  }, []);

  const deleteUser = useCallback(async (user: Pick<TeamRow, "user_id" | "agency_id">) => {
    const { error } = await supabase
      .from("agency_team")
      .update({ active: false })
      .eq("user_id", user.user_id)
      .eq("agency_id", user.agency_id);
    if (error) throw error;
  }, []);

  const resendInvite = useCallback(async (user: Pick<TeamRow, "full_name" | "role" | "agency_id" | "email">) => {
    const meta: Record<string, unknown> = {
      full_name: user.full_name,
      role: user.role,
      agency_id: user.agency_id,
    };

    const inviteRes = await fetch("/api/admin/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        meta,
        redirectTo: `${window.location.origin}/intranet/auth/activate`,
      }),
    });

    if (!inviteRes.ok) {
      throw new Error("No se pudo reenviar la invitacion.");
    }
  }, []);

  return {
    loading,
    team,
    agencies,
    reload,
    loadTeam,
    toggleUser,
    deleteUser,
    resendInvite,
  };
}
