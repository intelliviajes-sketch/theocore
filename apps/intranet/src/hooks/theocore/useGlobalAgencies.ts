"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";

export type Agency = {
  id: string;
  commercial_name: string;
  legal_name: string;
  country_code: string;
  address: string | null;
  whatsapp: string | null;
  email_contact: string;
  email_emergency: string | null;
  tax_id: string | null;
  bank_information: Record<string, unknown> | null;
  active: boolean;
  created_at: string | null;
};

export type Country = {
  code: string;
  name: string;
  phone_prefix: string;
  emoji_flag: string;
};

export type Brain = {
  id: string;
  name: string;
  active: boolean;
  target_lang: string | null;
  scope: "global" | "agency" | null;
  owner_agency_id: string | null;
  created_for_agency_id: string | null;
};

export type AgencySavePayload = {
  id?: string;
  commercial_name: string;
  legal_name: string;
  country_code: string;
  address: string | null;
  whatsapp: string | null;
  email_contact: string;
  email_emergency: string | null;
  tax_id: string | null;
  bank_information: Record<string, unknown>;
  active: boolean;
  brain_ids: string[];
};

type TeamRelation = {
  agency_id: string;
  full_name: string;
  email: string;
  role: "AgencyOwner" | "TeamAgency";
  active: boolean | null;
};

type TravelerRelation = {
  agency_id: string;
  traveler_id: string;
  status: string | null;
};

export function useGlobalAgencies() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [brains, setBrains] = useState<Brain[]>([]);
  const [brainAssignments, setBrainAssignments] = useState<Record<string, string[]>>({});
  const [teamCountByAgency, setTeamCountByAgency] = useState<Record<string, number>>({});
  const [travelerCountByAgency, setTravelerCountByAgency] = useState<Record<string, number>>({});
  const [ownerByAgency, setOwnerByAgency] = useState<Record<string, { full_name: string; email: string } | null>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: agenciesData, error: agenciesError },
        { data: countriesData, error: countriesError },
        { data: brainsData, error: brainsError },
        { data: assignmentsData, error: assignmentsError },
        { data: teamData, error: teamError },
        { data: travelersData, error: travelersError },
      ] = await Promise.all([
        supabase.from("agencies").select("*").order("created_at", { ascending: false }),
        supabase.from("countries").select("code, name, phone_prefix, emoji_flag").order("name", { ascending: true }),
        supabase
          .from("ai_assistants")
          .select("id, name, active, target_lang, scope, owner_agency_id, created_for_agency_id")
          .order("name", { ascending: true }),
        supabase.from("agencies_ai_assistants").select("agency_id, ai_assistant_id"),
        supabase.from("agency_team").select("agency_id, full_name, email, role, active"),
        supabase.from("agency_travelers").select("agency_id, traveler_id, status"),
      ]);

      if (agenciesError) throw agenciesError;
      if (countriesError) throw countriesError;
      if (brainsError) throw brainsError;
      if (assignmentsError) throw assignmentsError;
      if (teamError) throw teamError;
      if (travelersError) throw travelersError;

      const nextAssignments: Record<string, string[]> = {};
      for (const row of assignmentsData || []) {
        const agencyId = row.agency_id as string;
        const brainId = row.ai_assistant_id as string;
        nextAssignments[agencyId] = nextAssignments[agencyId] || [];
        nextAssignments[agencyId].push(brainId);
      }

      const nextTeamCount: Record<string, number> = {};
      const nextOwnerByAgency: Record<string, { full_name: string; email: string } | null> = {};
      for (const row of (teamData as TeamRelation[]) || []) {
        if (!row.active) continue;
        nextTeamCount[row.agency_id] = (nextTeamCount[row.agency_id] || 0) + 1;
        if (row.role === "AgencyOwner" && !nextOwnerByAgency[row.agency_id]) {
          nextOwnerByAgency[row.agency_id] = { full_name: row.full_name, email: row.email };
        }
      }

      const nextTravelerCount: Record<string, number> = {};
      for (const row of (travelersData as TravelerRelation[]) || []) {
        if (row.status !== "active") continue;
        nextTravelerCount[row.agency_id] = (nextTravelerCount[row.agency_id] || 0) + 1;
      }

      setAgencies((agenciesData as Agency[]) || []);
      setCountries((countriesData as Country[]) || []);
      setBrains((brainsData as Brain[]) || []);
      setBrainAssignments(nextAssignments);
      setTeamCountByAgency(nextTeamCount);
      setTravelerCountByAgency(nextTravelerCount);
      setOwnerByAgency(nextOwnerByAgency);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveAgency = useCallback(async (payload: AgencySavePayload) => {
    const { brain_ids, id, ...agencyPayload } = payload;

    let agencyId = id;
    if (agencyId) {
      const { error } = await supabase.from("agencies").update(agencyPayload).eq("id", agencyId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("agencies").insert(agencyPayload).select("id").single();
      if (error) throw error;
      agencyId = data.id;
    }

    if (!agencyId) {
      throw new Error("No se pudo resolver la agencia guardada.");
    }

    const { error: deleteError } = await supabase.from("agencies_ai_assistants").delete().eq("agency_id", agencyId);
    if (deleteError) throw deleteError;

    if (brain_ids.length > 0) {
      const { error: insertRelationError } = await supabase
        .from("agencies_ai_assistants")
        .insert(brain_ids.map((brainId) => ({ agency_id: agencyId, ai_assistant_id: brainId })));
      if (insertRelationError) throw insertRelationError;
    }
  }, []);

  const deleteAgency = useCallback(async (agencyId: string) => {
    const { error } = await supabase.from("agencies").update({ active: false }).eq("id", agencyId);
    if (error) throw error;
  }, []);

  const toggleAgency = useCallback(async (agency: Pick<Agency, "id" | "active">) => {
    const { error } = await supabase.from("agencies").update({ active: !agency.active }).eq("id", agency.id);
    if (error) throw error;
  }, []);

  return {
    loading,
    agencies,
    countries,
    brains,
    brainAssignments,
    teamCountByAgency,
    travelerCountByAgency,
    ownerByAgency,
    reload,
    saveAgency,
    deleteAgency,
    toggleAgency,
  };
}
