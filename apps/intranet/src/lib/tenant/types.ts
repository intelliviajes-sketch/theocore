export type TenantKind = "platform" | "agency";

export interface TenantAgency {
  id: string;
  commercialName: string;
  legalName: string;
  countryCode: string;
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

export interface ResolvedTenant {
  kind: TenantKind;
  host: string;
  normalizedHost: string;
  isLocalhost: boolean;
  isPlatformHost: boolean;
  resolvedFromDomain: boolean;
  agency: TenantAgency | null;
  domain: TenantDomain | null;
  branding: TenantBranding | null;
  market: TenantMarket | null;
}
