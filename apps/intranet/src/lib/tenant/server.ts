import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ResolvedTenant, TenantBranding, TenantDomain, TenantMarket } from "./types";

type AgencyDomainRow = {
  id: string;
  domain: string;
  country_code: string | null;
  is_primary: boolean;
  agency_id: string;
};

type AgencyRow = {
  id: string;
  commercial_name: string;
  legal_name: string;
  country_code: string;
};

type BrandingRow = {
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_heading: string | null;
  font_body: string | null;
  hero_config: Record<string, unknown> | null;
};

type MarketRow = {
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  default_brain_id: string | null;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function normalizeHost(rawHost: string | null | undefined) {
  const value = (rawHost ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (!value) return "";

  const withoutProtocol = value.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? "";
  const [hostname] = withoutPath.split(":");
  return hostname;
}

function hostCandidates(host: string) {
  const values = new Set<string>();
  if (!host) return [];

  values.add(host);
  if (host.startsWith("www.")) {
    values.add(host.slice(4));
  } else {
    values.add(`www.${host}`);
  }

  return Array.from(values);
}

function getPlatformHosts() {
  const values = new Set<string>();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    let parsedHost = "";
    try {
      parsedHost = new URL(siteUrl).hostname.toLowerCase();
    } catch {
      parsedHost = normalizeHost(siteUrl);
    }

    for (const candidate of hostCandidates(parsedHost)) {
      values.add(candidate);
    }
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    const parsedHost = normalizeHost(vercelUrl);
    for (const candidate of hostCandidates(parsedHost)) {
      values.add(candidate);
    }
  }

  values.add("localhost");
  values.add("127.0.0.1");
  values.add("0.0.0.0");

  return values;
}

function buildPlatformTenant(host: string, normalizedHost: string): ResolvedTenant {
  const isLocalhost = LOCAL_HOSTS.has(normalizedHost);

  return {
    kind: "platform",
    host,
    normalizedHost,
    isLocalhost,
    isPlatformHost: true,
    resolvedFromDomain: false,
    agency: null,
    domain: null,
    branding: null,
    market: null,
  };
}

function mapBranding(row: BrandingRow | null): TenantBranding | null {
  if (!row) return null;

  return {
    brandName: row.brand_name,
    logoUrl: row.logo_url,
    faviconUrl: row.favicon_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    fontHeading: row.font_heading,
    fontBody: row.font_body,
    heroConfig: row.hero_config ?? {},
  };
}

function mapMarket(row: MarketRow | null, fallbackCountryCode: string): TenantMarket {
  return {
    countryCode: row?.country_code ?? fallbackCountryCode,
    languageCode: row?.language_code ?? "es",
    currencyCode: row?.currency_code ?? "EUR",
    timezone: row?.timezone ?? "Europe/Madrid",
    defaultBrainId: row?.default_brain_id ?? null,
  };
}

async function loadMarketConfig(agencyId: string, preferredCountryCode: string | null, agencyCountryCode: string) {
  const targetCountryCode = preferredCountryCode ?? agencyCountryCode;

  const { data: market, error } = await supabaseAdmin
    .from("agency_market_config")
    .select("country_code, language_code, currency_code, timezone, default_brain_id")
    .eq("agency_id", agencyId)
    .eq("country_code", targetCountryCode)
    .eq("active", true)
    .maybeSingle();

  if (!error || market) {
    return market as MarketRow | null;
  }

  if (!preferredCountryCode || preferredCountryCode === agencyCountryCode) {
    console.error("Error cargando market config del tenant:", error);
    return null;
  }

  const { data: fallbackMarket, error: fallbackError } = await supabaseAdmin
    .from("agency_market_config")
    .select("country_code, language_code, currency_code, timezone, default_brain_id")
    .eq("agency_id", agencyId)
    .eq("country_code", agencyCountryCode)
    .eq("active", true)
    .maybeSingle();

  if (fallbackError) {
    console.error("Error cargando market config fallback del tenant:", fallbackError);
  }

  return (fallbackMarket as MarketRow | null) ?? null;
}

async function resolveLocalhostAgencyFallback(host: string, normalizedHost: string): Promise<ResolvedTenant | null> {
  if (!LOCAL_HOSTS.has(normalizedHost)) return null;

  const localAgencyId = process.env.LOCAL_TENANT_AGENCY_ID ?? process.env.NEXT_PUBLIC_LOCAL_TENANT_AGENCY_ID ?? null;

  let agencyQuery = supabaseAdmin
    .from("agencies")
    .select("id, commercial_name, legal_name, country_code")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (localAgencyId) {
    agencyQuery = agencyQuery.eq("id", localAgencyId);
  }

  const { data: agency, error: agencyError } = await agencyQuery.maybeSingle();

  if (agencyError || !agency) {
    if (agencyError) {
      console.error("Error resolviendo fallback localhost de agencia:", agencyError);
    }
    return null;
  }

  const [{ data: branding }, { data: market }] = await Promise.all([
    supabaseAdmin
      .from("agency_branding")
      .select("brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, font_heading, font_body, hero_config")
      .eq("agency_id", agency.id)
      .maybeSingle(),
    supabaseAdmin
      .from("agency_market_config")
      .select("country_code, language_code, currency_code, timezone, default_brain_id")
      .eq("agency_id", agency.id)
      .eq("active", true)
      .order("country_code", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const fallbackCountryCode = (market as MarketRow | null)?.country_code ?? agency.country_code;

  return {
    kind: "agency",
    host,
    normalizedHost,
    isLocalhost: true,
    isPlatformHost: false,
    resolvedFromDomain: false,
    agency: {
      id: agency.id,
      commercialName: agency.commercial_name,
      legalName: agency.legal_name,
      countryCode: agency.country_code,
    },
    domain: null,
    branding: mapBranding((branding as BrandingRow | null) ?? null),
    market: mapMarket((market as MarketRow | null) ?? null, fallbackCountryCode),
  };
}

export async function resolveTenantFromHost(rawHost: string | null | undefined): Promise<ResolvedTenant> {
  const normalizedHost = normalizeHost(rawHost);
  const host = rawHost?.trim() ?? "";
  const platformHosts = getPlatformHosts();

  if (!normalizedHost) {
    return buildPlatformTenant(host, normalizedHost);
  }

  // In local development we still allow resolving an agency if `localhost`
  // exists in `agency_domains`; otherwise we fall back to platform mode below.
  if (platformHosts.has(normalizedHost) && !LOCAL_HOSTS.has(normalizedHost)) {
    return buildPlatformTenant(host, normalizedHost);
  }

  const candidates = hostCandidates(normalizedHost);
  const { data: domains, error: domainError } = await supabaseAdmin
    .from("agency_domains")
    .select("id, domain, country_code, is_primary, agency_id")
    .in("domain", candidates)
    .eq("active", true);

  if (domainError) {
    console.error("Error resolviendo dominio de agencia:", domainError);
    return {
      ...buildPlatformTenant(host, normalizedHost),
      isPlatformHost: false,
    };
  }

  const domainRows = (domains ?? []) as AgencyDomainRow[];
  const domainRow = domainRows.find((item) => item.domain === normalizedHost)
    ?? domainRows.find((item) => item.domain === normalizedHost.replace(/^www\./, ""))
    ?? domainRows[0];

  if (!domainRow) {
    const localhostFallback = await resolveLocalhostAgencyFallback(host, normalizedHost);
    if (localhostFallback) {
      return localhostFallback;
    }

    return {
      ...buildPlatformTenant(host, normalizedHost),
      isPlatformHost: false,
    };
  }

  const [{ data: agency, error: agencyError }, { data: branding }] = await Promise.all([
    supabaseAdmin
      .from("agencies")
      .select("id, commercial_name, legal_name, country_code")
      .eq("id", domainRow.agency_id)
      .eq("active", true)
      .maybeSingle(),
    supabaseAdmin
      .from("agency_branding")
      .select("brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, font_heading, font_body, hero_config")
      .eq("agency_id", domainRow.agency_id)
      .maybeSingle(),
  ]);

  if (agencyError || !agency) {
    if (agencyError) {
      console.error("Error cargando agencia para tenant:", agencyError);
    }
    return {
      ...buildPlatformTenant(host, normalizedHost),
      isPlatformHost: false,
    };
  }

  const market = await loadMarketConfig(domainRow.agency_id, domainRow.country_code, agency.country_code);
  const fallbackCountryCode = domainRow.country_code ?? agency.country_code;
  const mappedDomain: TenantDomain = {
    id: domainRow.id,
    domain: domainRow.domain,
    countryCode: domainRow.country_code,
    isPrimary: domainRow.is_primary,
  };

  return {
    kind: "agency",
    host,
    normalizedHost,
    isLocalhost: LOCAL_HOSTS.has(normalizedHost),
    isPlatformHost: false,
    resolvedFromDomain: true,
    agency: {
      id: agency.id,
      commercialName: agency.commercial_name,
      legalName: agency.legal_name,
      countryCode: agency.country_code,
    },
    domain: mappedDomain,
    branding: mapBranding((branding as BrandingRow | null) ?? null),
    market: mapMarket(market, fallbackCountryCode),
  };
}

export async function resolveTenantFromRequest() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return resolveTenantFromHost(host);
}
