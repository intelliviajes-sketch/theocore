import type { ResolvedTenant } from "./types";

const DEFAULT_PRIMARY = "#2563eb";
const DEFAULT_SECONDARY = "#0f172a";
const DEFAULT_ACCENT = "#06b6d4";

export function getTenantBrandName(tenant: ResolvedTenant) {
  if (tenant.kind === "agency") {
    return tenant.branding?.brandName || tenant.agency?.commercialName || "Travel Portal";
  }

  return "TheoCore";
}

export function getTenantLocaleLabel(tenant: ResolvedTenant) {
  if (tenant.kind !== "agency" || !tenant.market) {
    return "Plataforma global";
  }

  return `${tenant.market.countryCode} · ${tenant.market.languageCode.toUpperCase()} · ${tenant.market.currencyCode}`;
}

export function getTenantTheme(tenant: ResolvedTenant) {
  return {
    primary: tenant.branding?.primaryColor || DEFAULT_PRIMARY,
    secondary: tenant.branding?.secondaryColor || DEFAULT_SECONDARY,
    accent: tenant.branding?.accentColor || DEFAULT_ACCENT,
  };
}
