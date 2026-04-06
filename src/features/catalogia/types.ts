import type {
  CatalogAmenityDefinition,
  CatalogCountry,
  CatalogField,
  CatalogProductType,
  CatalogReviewStatus,
} from "@/features/catalog/types";

export type CatalogIaSourceType = "text" | "email" | "pdf" | "image";

export type CatalogIaMarketConfig = {
  id: string;
  country_code: string;
  language_code: string;
  currency_code: string;
  timezone: string;
  active: boolean;
};

export type CatalogIaOfferDayPlan = {
  day: number | null;
  title: string;
  meals: string | null;
  transport: string | null;
  guide: string | null;
  description: string | null;
};

export type CatalogIaOfferHotel = {
  city: string;
  hotel: string;
};

export type CatalogIaOfferPriceTier = {
  pax_label: string;
  price: number | null;
  currency: string | null;
};

export type CatalogIaOfferProfile = {
  product_kind: string | null;
  destination: string | null;
  route: string[];
  duration_nights: number | null;
  duration_days: number | null;
  max_altitude: string | null;
  best_season: string | null;
  highlights: string[];
  day_by_day: CatalogIaOfferDayPlan[];
  included: string[];
  excluded: string[];
  hotels: CatalogIaOfferHotel[];
  price_tiers: CatalogIaOfferPriceTier[];
  valid_until: string | null;
};

export type CatalogIaSeasonInfo = {
  raw: string | null;
  normalized_label: string | null;
  from_year: number | null;
  to_year: number | null;
  season_codes: string[];
};

export type CatalogIaPriceInsight = {
  currency: string | null;
  current_price: number | null;
  old_price: number | null;
  from_price: number | null;
  discount_percent: number | null;
  per_person: boolean | null;
  raw_labels: string[];
};

export type CatalogIaCommercialCopy = {
  title: string;
  summary: string;
  selling_points: string[];
};

export type CatalogIaLocalizedCopy = {
  language_code: string;
  title: string;
  summary: string;
};

export type CatalogIaDuplicateCandidate = {
  catalog_id: string;
  title: string;
  similarity: number;
  reason: string;
  review_status: string | null;
  active: boolean;
};

export type CatalogIaOfferCandidate = {
  candidate_id: string;
  title: string;
  summary: string;
  country_code: string | null;
  suggested_product_type_name: string | null;
  suggested_confidence: number | null;
  field_suggestions: Record<string, unknown>;
  amenity_suggestions: Record<string, Record<string, unknown>>;
  field_confidence: Record<string, number>;
  offer_profile: CatalogIaOfferProfile | null;
  season_info: CatalogIaSeasonInfo | null;
  price_insight: CatalogIaPriceInsight | null;
  commercial_copy: CatalogIaCommercialCopy | null;
  localized_copies: CatalogIaLocalizedCopy[];
  duplicates: CatalogIaDuplicateCandidate[];
  missing_data: string[];
  warnings: string[];
};

export type CatalogIaExtraction = {
  run_id: string | null;
  model: string | null;
  source_language: string | null;
  extracted_text: string;
  title: string;
  summary: string;
  country_code: string | null;
  suggested_product_type_name: string | null;
  suggested_confidence: number | null;
  alternatives: string[];
  reason: string | null;
  field_suggestions: Record<string, unknown>;
  amenity_suggestions: Record<string, Record<string, unknown>>;
  field_confidence: Record<string, number>;
  offer_profile: CatalogIaOfferProfile | null;
  season_info: CatalogIaSeasonInfo | null;
  price_insight: CatalogIaPriceInsight | null;
  commercial_copy: CatalogIaCommercialCopy | null;
  localized_copies: CatalogIaLocalizedCopy[];
  duplicates: CatalogIaDuplicateCandidate[];
  detected_offers: CatalogIaOfferCandidate[];
  missing_data: string[];
  warnings: string[];
};

export type CatalogIaWizardOptions = {
  productTypes: CatalogProductType[];
  countries: CatalogCountry[];
  markets: CatalogIaMarketConfig[];
};

export type CatalogIaFormState = {
  title: string;
  summary: string;
  countryCode: string;
  reviewStatus: CatalogReviewStatus;
  active: boolean;
  images: string[];
  fields: Record<string, unknown>;
  amenities: Record<string, Record<string, unknown>>;
};

export type CatalogIaDefinition = {
  versionId: string;
  fields: CatalogField[];
  amenities: CatalogAmenityDefinition[];
};
