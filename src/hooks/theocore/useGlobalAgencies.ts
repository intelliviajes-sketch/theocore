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
};

export type AgencyBranding = {
  agency_id: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  hero_config: Record<string, unknown> | null;
};

export type AgencyDomain = {
  id: string;
  agency_id: string;
  domain: string;
  country_code: string | null;
  is_primary: boolean;
  active: boolean;
};

export type AgencyDomainInput = {
  id?: string;
  domain: string;
  country_code?: string | null;
  is_primary?: boolean;
  active?: boolean;
};

export type AgencyMarketConfig = {
  id: string;
  agency_id: string;
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  default_brain_id: string | null;
  active: boolean;
};

export type AgencyMarketInput = {
  id?: string;
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  default_brain_id?: string | null;
  active?: boolean;
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
  domains: AgencyDomainInput[];
  markets: AgencyMarketInput[];
  branding: {
    brand_name: string | null;
    logo_url: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    accent_color: string | null;
    sticky_bg_color: string | null;
    sticky_text_color: string | null;
  };
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

function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toNullableString(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDomain(rawDomain: string | null | undefined) {
  const value = (rawDomain ?? "").trim().toLowerCase();
  if (!value) return "";

  const withoutProtocol = value.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  const [hostname] = withoutPath.split(":");
  if (!hostname) return "";
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

export function useGlobalAgencies() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [brains, setBrains] = useState<Brain[]>([]);
  const [brandingByAgency, setBrandingByAgency] = useState<Record<string, AgencyBranding>>({});
  const [domainsByAgency, setDomainsByAgency] = useState<Record<string, AgencyDomain[]>>({});
  const [marketConfigsByAgency, setMarketConfigsByAgency] = useState<Record<string, AgencyMarketConfig[]>>({});
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
        { data: brandingData, error: brandingError },
        { data: assignmentsData, error: assignmentsError },
        { data: domainsData, error: domainsError },
        { data: marketConfigsData, error: marketConfigsError },
        { data: teamData, error: teamError },
        { data: travelersData, error: travelersError },
      ] = await Promise.all([
        supabase.from("agencies").select("*").order("created_at", { ascending: false }),
        supabase.from("countries").select("code, name, phone_prefix, emoji_flag").order("name", { ascending: true }),
        supabase.from("ai_assistants").select("id, name, active, target_lang").order("name", { ascending: true }),
        supabase
          .from("agency_branding")
          .select("agency_id, brand_name, logo_url, primary_color, secondary_color, accent_color, hero_config"),
        supabase.from("agencies_ai_assistants").select("agency_id, ai_assistant_id"),
        supabase
          .from("agency_domains")
          .select("id, agency_id, domain, country_code, is_primary, active")
          .eq("active", true),
        supabase
          .from("agency_market_config")
          .select("id, agency_id, country_code, language_code, currency_code, timezone, default_brain_id, active"),
        supabase.from("agency_team").select("agency_id, full_name, email, role, active"),
        supabase.from("agency_travelers").select("agency_id, traveler_id, status"),
      ]);

      if (agenciesError) throw agenciesError;
      if (countriesError) throw countriesError;
      if (brainsError) throw brainsError;
      if (brandingError) throw brandingError;
      if (assignmentsError) throw assignmentsError;
      if (domainsError) throw domainsError;
      if (marketConfigsError) throw marketConfigsError;
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

      const nextBrandingByAgency: Record<string, AgencyBranding> = {};
      for (const row of (brandingData as AgencyBranding[]) || []) {
        nextBrandingByAgency[row.agency_id] = {
          ...row,
          hero_config: normalizeObject(row.hero_config),
        };
      }

      const nextDomainsByAgency: Record<string, AgencyDomain[]> = {};
      for (const row of (domainsData as AgencyDomain[]) || []) {
        const domain = normalizeDomain(row.domain);
        if (!domain) continue;
        const agencyId = row.agency_id;
        nextDomainsByAgency[agencyId] = nextDomainsByAgency[agencyId] || [];
        nextDomainsByAgency[agencyId].push({
          ...row,
          domain,
        });
      }
      for (const agencyId of Object.keys(nextDomainsByAgency)) {
        nextDomainsByAgency[agencyId].sort((a, b) => {
          if (a.is_primary === b.is_primary) return a.domain.localeCompare(b.domain);
          return a.is_primary ? -1 : 1;
        });
      }

      const nextMarketConfigsByAgency: Record<string, AgencyMarketConfig[]> = {};
      for (const row of (marketConfigsData as AgencyMarketConfig[]) || []) {
        const agencyId = row.agency_id;
        nextMarketConfigsByAgency[agencyId] = nextMarketConfigsByAgency[agencyId] || [];
        nextMarketConfigsByAgency[agencyId].push({
          ...row,
          country_code: row.country_code?.toUpperCase() || "",
          language_code: row.language_code?.toLowerCase() || "es",
          currency_code: row.currency_code?.toUpperCase() || "EUR",
          timezone: row.timezone || "Europe/Madrid",
          default_brain_id: row.default_brain_id || null,
          active: Boolean(row.active),
        });
      }
      for (const agencyId of Object.keys(nextMarketConfigsByAgency)) {
        nextMarketConfigsByAgency[agencyId].sort((a, b) => a.country_code.localeCompare(b.country_code));
      }

      setAgencies((agenciesData as Agency[]) || []);
      setCountries((countriesData as Country[]) || []);
      setBrains((brainsData as Brain[]) || []);
      setBrandingByAgency(nextBrandingByAgency);
      setDomainsByAgency(nextDomainsByAgency);
      setMarketConfigsByAgency(nextMarketConfigsByAgency);
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
    const { brain_ids, domains, markets, id, branding, ...agencyPayload } = payload;

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

    const { data: existingBranding, error: existingBrandingError } = await supabase
      .from("agency_branding")
      .select("hero_config")
      .eq("agency_id", agencyId)
      .maybeSingle();

    if (existingBrandingError) throw existingBrandingError;

    const existingHeroConfig = normalizeObject(existingBranding?.hero_config);
    const existingTravelerHome = normalizeObject(existingHeroConfig.traveler_home);
    const travelerHome = {
      ...existingTravelerHome,
      sticky_bg_color: toNullableString(branding.sticky_bg_color),
      sticky_text_color: toNullableString(branding.sticky_text_color),
    };

    const { error: upsertBrandingError } = await supabase
      .from("agency_branding")
      .upsert(
        {
          agency_id: agencyId,
          brand_name: toNullableString(branding.brand_name),
          logo_url: toNullableString(branding.logo_url),
          primary_color: toNullableString(branding.primary_color),
          secondary_color: toNullableString(branding.secondary_color),
          accent_color: toNullableString(branding.accent_color),
          hero_config: {
            ...existingHeroConfig,
            traveler_home: travelerHome,
          },
        },
        { onConflict: "agency_id" }
      );

    if (upsertBrandingError) throw upsertBrandingError;

    const normalizedDomains = ((domains || [])
      .map((item) => ({
        id: item.id,
        domain: normalizeDomain(item.domain),
        country_code: toNullableString(item.country_code) ?? agencyPayload.country_code,
        is_primary: Boolean(item.is_primary),
      }))
      .filter((item) => item.domain.length > 0));

    const dedupedByDomain = new Map<string, {
      id?: string;
      domain: string;
      country_code: string;
      is_primary: boolean;
    }>();

    for (const item of normalizedDomains) {
      const current = dedupedByDomain.get(item.domain);
      if (!current) {
        dedupedByDomain.set(item.domain, {
          id: item.id,
          domain: item.domain,
          country_code: item.country_code,
          is_primary: item.is_primary,
        });
        continue;
      }

      dedupedByDomain.set(item.domain, {
        id: current.id || item.id,
        domain: item.domain,
        country_code: current.country_code || item.country_code,
        is_primary: current.is_primary || item.is_primary,
      });
    }

    const preparedDomains = Array.from(dedupedByDomain.values());
    if (payload.active && preparedDomains.length === 0) {
      throw new Error("Una agencia activa debe tener un dominio principal.");
    }

    if (preparedDomains.length > 0) {
      const primaryIndex = preparedDomains.findIndex((item) => item.is_primary);
      const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
      for (let index = 0; index < preparedDomains.length; index += 1) {
        preparedDomains[index] = {
          ...preparedDomains[index],
          is_primary: index === resolvedPrimaryIndex,
        };
      }
    }

    preparedDomains.sort((a, b) => {
      if (a.is_primary === b.is_primary) return a.domain.localeCompare(b.domain);
      return a.is_primary ? -1 : 1;
    });

    const { data: existingDomains, error: existingDomainsError } = await supabase
      .from("agency_domains")
      .select("id, domain")
      .eq("agency_id", agencyId);

    if (existingDomainsError) throw existingDomainsError;

    const existingByDomain = new Map(
      ((existingDomains as Array<{ id: string; domain: string }> | null) || []).map((item) => [
        normalizeDomain(item.domain),
        item,
      ])
    );

    const keepIds = new Set<string>();
    for (const item of preparedDomains) {
      const domain = item.domain;
      const existing = existingByDomain.get(domain);
      const isPrimary = item.is_primary;
      const countryCode = item.country_code;

      if (existing) {
        keepIds.add(existing.id);
        const { error: updateDomainError } = await supabase
          .from("agency_domains")
          .update({
            domain,
            country_code: countryCode,
            is_primary: isPrimary,
            active: true,
          })
          .eq("id", existing.id);
        if (updateDomainError) throw updateDomainError;
      } else {
        const { error: insertDomainError } = await supabase
          .from("agency_domains")
          .insert({
            agency_id: agencyId,
            domain,
            country_code: countryCode,
            is_primary: isPrimary,
            active: true,
          });
        if (insertDomainError) {
          if (insertDomainError.message?.toLowerCase().includes("duplicate")) {
            throw new Error(`El dominio ${domain} ya esta asignado a otra agencia.`);
          }
          throw insertDomainError;
        }
      }
    }

    const idsToDisable = ((existingDomains as Array<{ id: string; domain: string }> | null) || [])
      .map((item) => item.id)
      .filter((itemId) => !keepIds.has(itemId));

    if (idsToDisable.length > 0) {
      const { error: disableError } = await supabase
        .from("agency_domains")
        .update({ active: false, is_primary: false })
        .in("id", idsToDisable);
      if (disableError) throw disableError;
    }

    const preparedMarkets = Array.from(
      (markets || []).reduce((acc, item) => {
        const countryCode = (item.country_code || "").trim().toUpperCase();
        if (!countryCode) return acc;
        if (!acc.has(countryCode)) {
          acc.set(countryCode, {
            id: item.id,
            country_code: countryCode,
            language_code: (item.language_code || "es").trim().toLowerCase(),
            currency_code: (item.currency_code || "EUR").trim().toUpperCase(),
            timezone: (item.timezone || "Europe/Madrid").trim(),
            default_brain_id: toNullableString(item.default_brain_id),
            active: item.active !== false,
          });
        }
        return acc;
      }, new Map<string, {
        id?: string;
        country_code: string;
        language_code: string;
        currency_code: string;
        timezone: string;
        default_brain_id: string | null;
        active: boolean;
      }>())
      .values()
    );

    const { data: existingMarkets, error: existingMarketsError } = await supabase
      .from("agency_market_config")
      .select("id, country_code")
      .eq("agency_id", agencyId);
    if (existingMarketsError) throw existingMarketsError;

    const existingMarketByCountry = new Map(
      ((existingMarkets as Array<{ id: string; country_code: string }> | null) || []).map((item) => [
        (item.country_code || "").toUpperCase(),
        item,
      ])
    );

    const keepMarketIds = new Set<string>();
    for (const market of preparedMarkets) {
      const existingMarket = existingMarketByCountry.get(market.country_code);
      if (existingMarket) {
        keepMarketIds.add(existingMarket.id);
        const { error: updateMarketError } = await supabase
          .from("agency_market_config")
          .update({
            country_code: market.country_code,
            language_code: market.language_code,
            currency_code: market.currency_code,
            timezone: market.timezone,
            default_brain_id: market.default_brain_id,
            active: market.active,
          })
          .eq("id", existingMarket.id);
        if (updateMarketError) throw updateMarketError;
      } else {
        const { error: insertMarketError } = await supabase
          .from("agency_market_config")
          .insert({
            agency_id: agencyId,
            country_code: market.country_code,
            language_code: market.language_code,
            currency_code: market.currency_code,
            timezone: market.timezone,
            default_brain_id: market.default_brain_id,
            active: market.active,
          });
        if (insertMarketError) throw insertMarketError;
      }
    }

    const marketIdsToDeactivate = ((existingMarkets as Array<{ id: string; country_code: string }> | null) || [])
      .map((item) => item.id)
      .filter((itemId) => !keepMarketIds.has(itemId));

    if (marketIdsToDeactivate.length > 0) {
      const { error: deactivateMarketError } = await supabase
        .from("agency_market_config")
        .update({ active: false })
        .in("id", marketIdsToDeactivate);
      if (deactivateMarketError) throw deactivateMarketError;
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
    brandingByAgency,
    domainsByAgency,
    marketConfigsByAgency,
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
