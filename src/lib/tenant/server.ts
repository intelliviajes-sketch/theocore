import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  ResolvedTenant,
  TenantBranding,
  TenantDomain,
  TenantMarket,
  TenantMarketContent,
} from "./types";

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
  address: string | null;
  email_contact: string | null;
  whatsapp: string | null;
  active: boolean;
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
  active: boolean;
};

type MarketContentRow = {
  market_code: string;
  domain: string | null;
  language_code: string;
  brand_name: string | null;
  logo_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  cta_primary: string | null;
  cta_secondary: string | null;
  footer_address: string | null;
  footer_email: string | null;
  footer_phone: string | null;
  legal_notice: string | null;
  sticky_bg_color: string | null;
  sticky_text_color: string | null;
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
    agencyActive: true,
    marketActive: true,
    travelerEnabled: true,
    disabledReason: null,
    agency: null,
    domain: null,
    branding: null,
    market: null,
    marketContent: null,
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

function mapMarketContent(row: MarketContentRow | null): TenantMarketContent | null {
  if (!row) return null;
  return {
    marketCode: row.market_code,
    domain: row.domain,
    languageCode: row.language_code,
    brandName: row.brand_name,
    logoUrl: row.logo_url,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    ctaPrimary: row.cta_primary,
    ctaSecondary: row.cta_secondary,
    footerAddress: row.footer_address,
    footerEmail: row.footer_email,
    footerPhone: row.footer_phone,
    legalNotice: row.legal_notice,
    stickyBgColor: row.sticky_bg_color,
    stickyTextColor: row.sticky_text_color,
  };
}

async function loadMarketContent(
  agencyId: string,
  marketCode: string | null,
  domain: string | null,
  languageCode: string | null,
) {
  if (!marketCode) return null;

  const normalizedMarketCode = marketCode.toUpperCase();
  const normalizedDomain = domain ? domain.toLowerCase() : null;
  const normalizedLanguage = (languageCode || "es").toLowerCase();

  let exactQuery = supabaseAdmin
    .from("agency_market_content")
    .select(
      "market_code, domain, language_code, brand_name, logo_url, hero_title, hero_subtitle, cta_primary, cta_secondary, footer_address, footer_email, footer_phone, legal_notice, sticky_bg_color, sticky_text_color",
    )
    .eq("agency_id", agencyId)
    .eq("market_code", normalizedMarketCode)
    .eq("language_code", normalizedLanguage)
    .eq("active", true);

  exactQuery =
    normalizedDomain === null ? exactQuery.is("domain", null) : exactQuery.eq("domain", normalizedDomain);

  const { data: exact, error: exactError } = await exactQuery.maybeSingle();
  if (exactError) {
    console.error("Error cargando market content exacto:", exactError);
  }
  if (exact) return mapMarketContent(exact as MarketContentRow);

  const { data: fallbackLanguage, error: fallbackLanguageError } = await supabaseAdmin
    .from("agency_market_content")
    .select(
      "market_code, domain, language_code, brand_name, logo_url, hero_title, hero_subtitle, cta_primary, cta_secondary, footer_address, footer_email, footer_phone, legal_notice, sticky_bg_color, sticky_text_color",
    )
    .eq("agency_id", agencyId)
    .eq("market_code", normalizedMarketCode)
    .eq("language_code", normalizedLanguage)
    .is("domain", null)
    .eq("active", true)
    .maybeSingle();
  if (fallbackLanguageError) {
    console.error("Error cargando market content fallback idioma:", fallbackLanguageError);
  }
  if (fallbackLanguage) return mapMarketContent(fallbackLanguage as MarketContentRow);

  const { data: generic, error: genericError } = await supabaseAdmin
    .from("agency_market_content")
    .select(
      "market_code, domain, language_code, brand_name, logo_url, hero_title, hero_subtitle, cta_primary, cta_secondary, footer_address, footer_email, footer_phone, legal_notice, sticky_bg_color, sticky_text_color",
    )
    .eq("agency_id", agencyId)
    .eq("market_code", normalizedMarketCode)
    .is("domain", null)
    .eq("active", true)
    .order("language_code", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (genericError) {
    console.error("Error cargando market content generico:", genericError);
  }
  return mapMarketContent((generic as MarketContentRow | null) ?? null);
}

async function loadMarketConfig(
  agencyId: string,
  preferredCountryCode: string | null,
  agencyCountryCode: string,
) {
  const targetCountryCode = preferredCountryCode ?? agencyCountryCode;

  const { data: exactMarket, error: exactError } = await supabaseAdmin
    .from("agency_market_config")
    .select("country_code, language_code, currency_code, timezone, default_brain_id, active")
    .eq("agency_id", agencyId)
    .eq("country_code", targetCountryCode)
    .maybeSingle();

  if (exactError) {
    console.error("Error cargando market config exacto del tenant:", exactError);
  }

  if (exactMarket) {
    const resolved = exactMarket as MarketRow;
    return {
      market: resolved,
      marketActive: resolved.active !== false,
    };
  }

  const { data: fallbackMarket, error: fallbackError } = await supabaseAdmin
    .from("agency_market_config")
    .select("country_code, language_code, currency_code, timezone, default_brain_id, active")
    .eq("agency_id", agencyId)
    .eq("country_code", agencyCountryCode)
    .eq("active", true)
    .maybeSingle();

  if (fallbackError) {
    console.error("Error cargando market config fallback del tenant:", fallbackError);
  }

  if (fallbackMarket) {
    return {
      market: fallbackMarket as MarketRow,
      marketActive: true,
    };
  }

  const { data: firstActiveMarket, error: firstActiveError } = await supabaseAdmin
    .from("agency_market_config")
    .select("country_code, language_code, currency_code, timezone, default_brain_id, active")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("country_code", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstActiveError) {
    console.error("Error cargando primer market activo del tenant:", firstActiveError);
  }

  return {
    market: (firstActiveMarket as MarketRow | null) ?? null,
    marketActive: Boolean(firstActiveMarket),
  };
}

async function resolveLocalhostAgencyFallback(host: string, normalizedHost: string): Promise<ResolvedTenant | null> {
  if (!LOCAL_HOSTS.has(normalizedHost)) return null;

  const localAgencyId = process.env.LOCAL_TENANT_AGENCY_ID ?? process.env.NEXT_PUBLIC_LOCAL_TENANT_AGENCY_ID ?? null;

  let agencyQuery = supabaseAdmin
    .from("agencies")
    .select("id, commercial_name, legal_name, country_code, address, email_contact, whatsapp, active")
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
      .select("country_code, language_code, currency_code, timezone, default_brain_id, active")
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
    agencyActive: true,
    marketActive: true,
    travelerEnabled: true,
    disabledReason: null,
    agency: {
      id: agency.id,
      commercialName: agency.commercial_name,
      legalName: agency.legal_name,
      countryCode: agency.country_code,
      address: agency.address,
      emailContact: agency.email_contact,
      whatsapp: agency.whatsapp,
    },
    domain: null,
    branding: mapBranding((branding as BrandingRow | null) ?? null),
    market: mapMarket((market as MarketRow | null) ?? null, fallbackCountryCode),
    marketContent: null,
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
    .eq("active", true)
    .order("is_primary", { ascending: false })
    .order("domain", { ascending: true });

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
      .select("id, commercial_name, legal_name, country_code, address, email_contact, whatsapp, active")
      .eq("id", domainRow.agency_id)
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

  const marketResolution = await loadMarketConfig(
    domainRow.agency_id,
    domainRow.country_code,
    agency.country_code,
  );
  const market = marketResolution.market;
  const agencyActive = agency.active !== false;
  const marketActive = marketResolution.marketActive;
  const travelerEnabled = agencyActive && marketActive;
  const disabledReason = !agencyActive
    ? "agency_inactive"
    : !marketActive
      ? "market_inactive"
      : null;
  const fallbackCountryCode = domainRow.country_code ?? agency.country_code;
  const marketContent = await loadMarketContent(
    domainRow.agency_id,
    market?.country_code ?? fallbackCountryCode,
    domainRow.domain,
    market?.language_code ?? null,
  );
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
    agencyActive,
    marketActive,
    travelerEnabled,
    disabledReason,
    agency: {
      id: agency.id,
      commercialName: agency.commercial_name,
      legalName: agency.legal_name,
      countryCode: agency.country_code,
      address: agency.address,
      emailContact: agency.email_contact,
      whatsapp: agency.whatsapp,
    },
    domain: mappedDomain,
    branding: mapBranding((branding as BrandingRow | null) ?? null),
    market: mapMarket(market, fallbackCountryCode),
    marketContent,
  };
}

export async function resolveTenantFromRequest() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return resolveTenantFromHost(host);
}
