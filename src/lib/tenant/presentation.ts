import type { ResolvedTenant } from "./types";

const DEFAULT_PRIMARY = "#2563eb";
const DEFAULT_SECONDARY = "#0f172a";
const DEFAULT_ACCENT = "#06b6d4";
const DEFAULT_STICKY_BG = "#ffffff";
const DEFAULT_STICKY_TEXT = "#0f172a";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function getTenantBrandName(tenant: ResolvedTenant) {
  if (tenant.kind === "agency") {
    return (
      tenant.marketContent?.brandName ||
      tenant.branding?.brandName ||
      tenant.agency?.commercialName ||
      "Travel Portal"
    );
  }

  return "TheoCore";
}

export function getTenantLocaleLabel(tenant: ResolvedTenant) {
  if (tenant.kind !== "agency" || !tenant.market) {
    return "Plataforma global";
  }

  const base = `${tenant.market.countryCode} · ${tenant.market.languageCode.toUpperCase()} · ${tenant.market.currencyCode}`;
  if (!tenant.travelerEnabled) return `${base} · inactivo`;
  return base;
}

export function getTenantTheme(tenant: ResolvedTenant) {
  return {
    primary: tenant.branding?.primaryColor || DEFAULT_PRIMARY,
    secondary: tenant.branding?.secondaryColor || DEFAULT_SECONDARY,
    accent: tenant.branding?.accentColor || DEFAULT_ACCENT,
  };
}

export function getTravelerTenantConfig(tenant: ResolvedTenant) {
  const heroConfig = asRecord(tenant.branding?.heroConfig);
  const travelerHome = asRecord(heroConfig.traveler_home);
  const stickyBgColor =
    typeof tenant.marketContent?.stickyBgColor === "string"
      ? tenant.marketContent.stickyBgColor
      : typeof travelerHome.sticky_bg_color === "string"
        ? travelerHome.sticky_bg_color
      : DEFAULT_STICKY_BG;
  const stickyTextColor =
    typeof tenant.marketContent?.stickyTextColor === "string"
      ? tenant.marketContent.stickyTextColor
      : typeof travelerHome.sticky_text_color === "string"
        ? travelerHome.sticky_text_color
      : DEFAULT_STICKY_TEXT;

  return {
    brandName: getTenantBrandName(tenant),
    logoUrl: tenant.marketContent?.logoUrl || tenant.branding?.logoUrl || null,
    primaryColor: tenant.branding?.primaryColor || DEFAULT_PRIMARY,
    secondaryColor: tenant.branding?.secondaryColor || DEFAULT_SECONDARY,
    accentColor: tenant.branding?.accentColor || DEFAULT_ACCENT,
    stickyBgColor,
    stickyTextColor,
    footerAddress: tenant.marketContent?.footerAddress || tenant.agency?.address || null,
    footerContactEmail: tenant.marketContent?.footerEmail || tenant.agency?.emailContact || null,
    footerPhone: tenant.marketContent?.footerPhone || tenant.agency?.whatsapp || null,
  };
}

export function getTenantAvailabilityMessage(tenant: ResolvedTenant) {
  if (tenant.kind !== "agency") return null;
  if (tenant.travelerEnabled) return null;
  if (tenant.disabledReason === "agency_inactive") {
    return "Esta agencia esta desactivada temporalmente.";
  }
  if (tenant.disabledReason === "market_inactive") {
    return "Este mercado/subdominio esta desactivado temporalmente.";
  }
  return "Este portal no esta disponible temporalmente.";
}
