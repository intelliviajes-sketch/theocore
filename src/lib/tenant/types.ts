export type TenantKind = "platform" | "agency";

export interface TenantAgency {
  id: string;
  commercialName: string;
  legalName: string;
  countryCode: string;
  address?: string | null;
  emailContact?: string | null;
  whatsapp?: string | null;
}

export interface TenantDomain {
  id: string;
  domain: string;
  countryCode: string | null;
  isPrimary: boolean;
}

export interface TenantBranding {
  brandName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontHeading: string | null;
  fontBody: string | null;
  heroConfig: Record<string, unknown>;
}

export interface TenantMarket {
  countryCode: string;
  languageCode: string;
  currencyCode: string;
  timezone: string;
  defaultBrainId: string | null;
}

export interface TenantMarketContent {
  marketCode: string;
  domain: string | null;
  languageCode: string;
  brandName: string | null;
  logoUrl: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  ctaPrimary: string | null;
  ctaSecondary: string | null;
  footerAddress: string | null;
  footerEmail: string | null;
  footerPhone: string | null;
  legalNotice: string | null;
  stickyBgColor: string | null;
  stickyTextColor: string | null;
}

export interface ResolvedTenant {
  kind: TenantKind;
  host: string;
  normalizedHost: string;
  isLocalhost: boolean;
  isPlatformHost: boolean;
  resolvedFromDomain: boolean;
  agencyActive: boolean;
  marketActive: boolean;
  travelerEnabled: boolean;
  disabledReason: "agency_inactive" | "market_inactive" | null;
  agency: TenantAgency | null;
  domain: TenantDomain | null;
  branding: TenantBranding | null;
  market: TenantMarket | null;
  marketContent: TenantMarketContent | null;
}
