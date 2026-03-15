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
  updated_at?: string | null;
};

export type AgencyDomain = {
  id?: string;
  agency_id?: string;
  domain: string;
  country_code: string | null;
  is_primary: boolean;
  active: boolean;
};

export type AgencyMarketConfig = {
  id?: string;
  agency_id?: string;
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  default_brain_id: string | null;
  active: boolean;
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
  logo_url: string | null;
  active: boolean;
  target_lang: string | null;
  scope: "global" | "agency" | null;
  owner_agency_id: string | null;
  created_for_agency_id: string | null;
  execution_layer: string | null;
  brain_category: string | null;
  brain_type: string | null;
};

export type AgencyBrainAssignment = {
  ai_assistant_id: string;
  persona_profile: string | null;
  strategic_concept: string | null;
  market_segment: string | null;
  monetization_model: string | null;
  visibility_level: string | null;
  custom_business_rules: Record<string, unknown>;
  execution_overrides: Record<string, unknown>;
  language_overrides: string[] | null;
};

export type AgencyBranding = {
  logo_url: string | null;
  mascot_brain_id: string | null;
  mascot_name: string | null;
  mascot_brain_logo_url: string | null;
  hero_config: Record<string, unknown>;
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
  logo_url: string | null;
  mascot_brain_id: string | null;
  mascot_name: string | null;
  mascot_brain_logo_url: string | null;
  brain_ids: string[];
  brain_assignments: AgencyBrainAssignment[];
  domains: AgencyDomain[];
  market_configs: AgencyMarketConfig[];
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

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*/, "");
}

function asJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

export function useGlobalAgencies() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [brains, setBrains] = useState<Brain[]>([]);
  const [brainAssignments, setBrainAssignments] = useState<Record<string, string[]>>({});
  const [brainAssignmentDetailsByAgency, setBrainAssignmentDetailsByAgency] = useState<Record<string, AgencyBrainAssignment[]>>({});
  const [brandingByAgency, setBrandingByAgency] = useState<Record<string, AgencyBranding>>({});
  const [domainByAgency, setDomainByAgency] = useState<Record<string, AgencyDomain[]>>({});
  const [marketConfigByAgency, setMarketConfigByAgency] = useState<Record<string, AgencyMarketConfig[]>>({});
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
        { data: brandingData, error: brandingError },
        { data: domainsData, error: domainsError },
        { data: marketConfigData, error: marketConfigError },
        { data: teamData, error: teamError },
        { data: travelersData, error: travelersError },
      ] = await Promise.all([
        supabase.from("agencies").select("*").order("created_at", { ascending: false }),
        supabase.from("countries").select("code, name, phone_prefix, emoji_flag").order("name", { ascending: true }),
        supabase
          .from("ai_assistants")
          .select("id, name, logo_url, active, target_lang, scope, owner_agency_id, created_for_agency_id, execution_layer, brain_category, brain_type")
          .order("name", { ascending: true }),
        supabase
          .from("agencies_ai_assistants")
          .select(
            "agency_id, ai_assistant_id, persona_profile, strategic_concept, market_segment, monetization_model, visibility_level, custom_business_rules, execution_overrides, language_overrides",
          ),
        supabase
          .from("agency_branding")
          .select("agency_id, logo_url, hero_config"),
        supabase
          .from("agency_domains")
          .select("id, agency_id, domain, country_code, is_primary, active")
          .order("is_primary", { ascending: false })
          .order("domain", { ascending: true }),
        supabase
          .from("agency_market_config")
          .select("id, agency_id, country_code, language_code, currency_code, timezone, default_brain_id, active")
          .order("country_code", { ascending: true }),
        supabase.from("agency_team").select("agency_id, full_name, email, role, active"),
        supabase.from("agency_travelers").select("agency_id, traveler_id, status"),
      ]);

      if (agenciesError) throw agenciesError;
      if (countriesError) throw countriesError;
      if (brainsError) throw brainsError;
      if (assignmentsError) throw assignmentsError;
      if (brandingError) throw brandingError;
      if (domainsError) throw domainsError;
      if (marketConfigError) throw marketConfigError;
      if (teamError) throw teamError;
      if (travelersError) throw travelersError;

      const nextAssignments: Record<string, string[]> = {};
      const nextAssignmentDetails: Record<string, AgencyBrainAssignment[]> = {};
      for (const row of assignmentsData || []) {
        const agencyId = String(row.agency_id || "");
        const brainId = String(row.ai_assistant_id || "");
        if (!agencyId || !brainId) continue;

        nextAssignments[agencyId] = nextAssignments[agencyId] || [];
        if (!nextAssignments[agencyId].includes(brainId)) {
          nextAssignments[agencyId].push(brainId);
        }

        nextAssignmentDetails[agencyId] = nextAssignmentDetails[agencyId] || [];
        nextAssignmentDetails[agencyId].push({
          ai_assistant_id: brainId,
          persona_profile: typeof row.persona_profile === "string" ? row.persona_profile : null,
          strategic_concept: typeof row.strategic_concept === "string" ? row.strategic_concept : null,
          market_segment: typeof row.market_segment === "string" ? row.market_segment : null,
          monetization_model: typeof row.monetization_model === "string" ? row.monetization_model : null,
          visibility_level: typeof row.visibility_level === "string" ? row.visibility_level : null,
          custom_business_rules: asJsonObject(row.custom_business_rules),
          execution_overrides: asJsonObject(row.execution_overrides),
          language_overrides: Array.isArray(row.language_overrides)
            ? row.language_overrides.map((item) => String(item))
            : null,
        });
      }

      const nextDomains: Record<string, AgencyDomain[]> = {};
      for (const row of domainsData || []) {
        const agencyId = String(row.agency_id || "");
        if (!agencyId) continue;

        nextDomains[agencyId] = nextDomains[agencyId] || [];
        nextDomains[agencyId].push({
          id: String(row.id || ""),
          agency_id: agencyId,
          domain: typeof row.domain === "string" ? row.domain : "",
          country_code: typeof row.country_code === "string" ? row.country_code : null,
          is_primary: Boolean(row.is_primary),
          active: Boolean(row.active),
        });
      }

      const nextBranding: Record<string, AgencyBranding> = {};
      for (const row of brandingData || []) {
        const agencyId = String(row.agency_id || "");
        if (!agencyId) continue;

        const heroConfig = asJsonObject(row.hero_config);
        const mascotBrainIdRaw = heroConfig.mascot_brain_id;
        const mascotNameRaw = heroConfig.mascot_name;
        const mascotBrainLogoRaw = heroConfig.mascot_brain_logo_url;

        nextBranding[agencyId] = {
          logo_url: typeof row.logo_url === "string" && row.logo_url.trim().length > 0 ? row.logo_url.trim() : null,
          mascot_brain_id:
            typeof mascotBrainIdRaw === "string" && mascotBrainIdRaw.trim().length > 0
              ? mascotBrainIdRaw.trim()
              : null,
          mascot_name:
            typeof mascotNameRaw === "string" && mascotNameRaw.trim().length > 0
              ? mascotNameRaw.trim()
              : null,
          mascot_brain_logo_url:
            typeof mascotBrainLogoRaw === "string" && mascotBrainLogoRaw.trim().length > 0
              ? mascotBrainLogoRaw.trim()
              : null,
          hero_config: heroConfig,
        };
      }

      const nextMarketConfigs: Record<string, AgencyMarketConfig[]> = {};
      for (const row of marketConfigData || []) {
        const agencyId = String(row.agency_id || "");
        if (!agencyId) continue;

        nextMarketConfigs[agencyId] = nextMarketConfigs[agencyId] || [];
        nextMarketConfigs[agencyId].push({
          id: String(row.id || ""),
          agency_id: agencyId,
          country_code: typeof row.country_code === "string" ? row.country_code : "",
          language_code: typeof row.language_code === "string" ? row.language_code : "es",
          currency_code: typeof row.currency_code === "string" ? row.currency_code : "EUR",
          timezone: typeof row.timezone === "string" ? row.timezone : "Europe/Madrid",
          default_brain_id: typeof row.default_brain_id === "string" ? row.default_brain_id : null,
          active: Boolean(row.active),
        });
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
      setBrainAssignmentDetailsByAgency(nextAssignmentDetails);
      setBrandingByAgency(nextBranding);
      setDomainByAgency(nextDomains);
      setMarketConfigByAgency(nextMarketConfigs);
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
    const {
      brain_ids,
      brain_assignments,
      domains,
      market_configs,
      logo_url,
      mascot_brain_id,
      mascot_name,
      mascot_brain_logo_url,
      id,
      ...agencyPayload
    } = payload;

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

    const normalizedDomains = domains
      .map((item) => ({
        agency_id: agencyId,
        domain: normalizeDomain(item.domain),
        country_code: item.country_code || null,
        is_primary: Boolean(item.is_primary),
        active: item.active !== false,
      }))
      .filter((item) => item.domain.length > 0)
      .filter((item, index, arr) => arr.findIndex((other) => other.domain === item.domain) === index);

    if (normalizedDomains.length > 0 && !normalizedDomains.some((item) => item.is_primary)) {
      normalizedDomains[0].is_primary = true;
    }

    const normalizedMarkets = market_configs
      .map((item) => ({
        agency_id: agencyId,
        country_code: item.country_code.trim().toUpperCase(),
        language_code: item.language_code.trim() || "es",
        currency_code: item.currency_code.trim().toUpperCase() || "EUR",
        timezone: item.timezone.trim() || "Europe/Madrid",
        default_brain_id: item.default_brain_id || null,
        active: item.active !== false,
      }))
      .filter((item) => item.country_code.length > 0)
      .filter((item, index, arr) => arr.findIndex((other) => other.country_code === item.country_code) === index);

    const relationRows = brain_assignments.length > 0
      ? brain_assignments
      : brain_ids.map((brainId) => ({
          ai_assistant_id: brainId,
          persona_profile: null,
          strategic_concept: null,
          market_segment: null,
          monetization_model: "commission",
          visibility_level: "agency_only",
          custom_business_rules: {},
          execution_overrides: {},
          language_overrides: null,
        }));

    const { error: deleteDomainsError } = await supabase.from("agency_domains").delete().eq("agency_id", agencyId);
    if (deleteDomainsError) throw deleteDomainsError;

    if (normalizedDomains.length > 0) {
      const { error: insertDomainsError } = await supabase.from("agency_domains").insert(normalizedDomains);
      if (insertDomainsError) throw insertDomainsError;
    }

    const { error: deleteMarketError } = await supabase.from("agency_market_config").delete().eq("agency_id", agencyId);
    if (deleteMarketError) throw deleteMarketError;

    if (normalizedMarkets.length > 0) {
      const { error: insertMarketError } = await supabase.from("agency_market_config").insert(normalizedMarkets);
      if (insertMarketError) throw insertMarketError;
    }

    const { error: deleteRelationError } = await supabase.from("agencies_ai_assistants").delete().eq("agency_id", agencyId);
    if (deleteRelationError) throw deleteRelationError;

    if (relationRows.length > 0) {
      const { error: insertRelationError } = await supabase.from("agencies_ai_assistants").insert(
        relationRows.map((item) => ({
          agency_id: agencyId,
          ai_assistant_id: item.ai_assistant_id,
          persona_profile: item.persona_profile,
          strategic_concept: item.strategic_concept,
          market_segment: item.market_segment,
          monetization_model: item.monetization_model || "commission",
          visibility_level: item.visibility_level || "agency_only",
          custom_business_rules: item.custom_business_rules || {},
          execution_overrides: item.execution_overrides || {},
          language_overrides: item.language_overrides,
        })),
      );
      if (insertRelationError) throw insertRelationError;
    }

    const { data: currentBranding } = await supabase
      .from("agency_branding")
      .select("hero_config")
      .eq("agency_id", agencyId)
      .maybeSingle();

    const nextHeroConfig = asJsonObject(currentBranding?.hero_config);
    if (mascot_brain_id) {
      nextHeroConfig.mascot_brain_id = mascot_brain_id;
    } else {
      delete nextHeroConfig.mascot_brain_id;
    }
    if (mascot_name) {
      nextHeroConfig.mascot_name = mascot_name;
    } else {
      delete nextHeroConfig.mascot_name;
    }
    if (mascot_brain_logo_url) {
      nextHeroConfig.mascot_brain_logo_url = mascot_brain_logo_url;
    } else {
      delete nextHeroConfig.mascot_brain_logo_url;
    }

    const { error: brandingUpsertError } = await supabase
      .from("agency_branding")
      .upsert(
        {
          agency_id: agencyId,
          logo_url: logo_url || null,
          hero_config: nextHeroConfig,
        },
        { onConflict: "agency_id" },
      );

    if (brandingUpsertError) throw brandingUpsertError;
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
    brainAssignmentDetailsByAgency,
    brandingByAgency,
    domainByAgency,
    marketConfigByAgency,
    teamCountByAgency,
    travelerCountByAgency,
    ownerByAgency,
    reload,
    saveAgency,
    deleteAgency,
    toggleAgency,
  };
}

