export type CatalogField = {
  id: string;
  field_name: string;
  label: string;
  input_type: string;
  required: boolean;
  placeholder: string | null;
  options: { label?: string; value?: string }[] | string[] | null;
};

export type CatalogAmenityDefinition = {
  amenity_type_id: string;
  name: string;
  description: string | null;
  required: boolean;
  fields: CatalogField[];
};

export type CatalogProductType = {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  owner_agency_id: string | null;
  current_version: number;
};

export type CatalogAgency = {
  id: string;
  commercial_name: string;
};

export type CatalogCountry = {
  code: string;
  name: string;
};

export type CatalogReviewStatus = "draft" | "reviewed" | "published" | "archived";
export type CatalogCreationSource = "manual" | "ai" | "imported";

export type CatalogItemRow = {
  id: string;
  agency_id: string;
  country_code: string | null;
  status: string;
  product_type_id: string;
  product_type_version_id: string;
  data: Record<string, unknown> | null;
  source_name: string | null;
  source_ai_brain_id: string | null;
  raw_ai_output: Record<string, unknown> | null;
  created_at: string;
  title: string | null;
  summary: string | null;
  creation_source: CatalogCreationSource;
  created_via_tool: string | null;
  review_status: CatalogReviewStatus;
  active: boolean;
};

export type CatalogListItem = CatalogItemRow & {
  agencyName: string | null;
  productTypeName: string | null;
  titleLabel: string;
  summaryLabel: string;
  createdLabel: string;
  images: string[];
  coverImage: string | null;
};

export type CatalogDefinition = {
  versionId: string;
  fields: CatalogField[];
  amenities: CatalogAmenityDefinition[];
};

export type CatalogSavePayload = {
  id?: string;
  agency_id: string;
  country_code: string | null;
  product_type_id: string;
  product_type_version_id: string;
  title: string;
  summary: string;
  images: string[];
  fields: Record<string, unknown>;
  amenities: Record<string, Record<string, unknown>>;
  review_status: CatalogReviewStatus;
  active: boolean;
  created_by: string;
  creation_source: CatalogCreationSource;
  created_via_tool: string;
};
