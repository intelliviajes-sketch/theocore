import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import type {
  CatalogAgency,
  CatalogAmenityDefinition,
  CatalogCountry,
  CatalogDefinition,
  CatalogField,
  CatalogItemRow,
  CatalogListItem,
  CatalogProductType,
  CatalogSavePayload,
} from "./types";

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pickString(data: Record<string, unknown> | null, keys: string[]) {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readImages(data: Record<string, unknown> | null) {
  if (!data) return [] as string[];
  const value = data.images;
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }

  const legacyKeys = ["image", "image_url", "cover", "coverImage", "thumbnail"];
  const fallback = pickString(data, legacyKeys);
  return fallback ? [fallback] : [];
}

function normalizeCatalogItem(
  row: CatalogItemRow,
  agencyMap: Map<string, string>,
  typeMap: Map<string, string>,
): CatalogListItem {
  const titleLabel = row.title || pickString(row.data, ["title", "name", "nombre"]) || row.source_name || "Producto sin titulo";
  const summaryLabel = row.summary || pickString(row.data, ["summary", "description", "descripcion"]) || "Sin resumen";
  const images = readImages(row.data);

  return {
    ...row,
    agencyName: agencyMap.get(row.agency_id) ?? null,
    productTypeName: typeMap.get(row.product_type_id) ?? null,
    titleLabel,
    summaryLabel,
    createdLabel: new Date(row.created_at).toLocaleDateString(),
    images,
    coverImage: images[0] ?? null,
  };
}

function isMissingRelationError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String((error as { message?: string }).message || "") : "";
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code || "") : "";
  return code === "PGRST205" || message.toLowerCase().includes("product_type_version_amenities") || message.toLowerCase().includes("relation") && message.toLowerCase().includes("does not exist");
}

type ProductTypeAmenityLink = {
  amenity_type_id: string;
  required: boolean;
  order: number;
};

type AmenityTypeRow = {
  id: string;
  name: string;
  description: string | null;
  current_version: number;
};

type AmenityVersionRow = {
  id: string;
  amenity_type_id: string;
  version_number: number;
};

export async function listCatalogItems({ agencyId }: { agencyId?: string | null } = {}) {
  let query = supabase
    .from("catalog_global")
    .select("id, agency_id, country_code, status, product_type_id, product_type_version_id, data, source_name, source_ai_brain_id, raw_ai_output, created_at, title, summary, creation_source, created_via_tool, review_status, active")
    .order("created_at", { ascending: false });

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as CatalogItemRow[];
  const agencyIds = Array.from(new Set(rows.map((item) => item.agency_id).filter(Boolean)));
  const productTypeIds = Array.from(new Set(rows.map((item) => item.product_type_id).filter(Boolean)));

  const [agenciesRes, productTypesRes] = await Promise.all([
    agencyIds.length > 0
      ? supabase.from("agencies").select("id, commercial_name").in("id", agencyIds)
      : Promise.resolve({ data: [], error: null }),
    productTypeIds.length > 0
      ? supabase.from("product_types").select("id, name").in("id", productTypeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (agenciesRes.error) throw agenciesRes.error;
  if (productTypesRes.error) throw productTypesRes.error;

  const agencyMap = new Map(((agenciesRes.data ?? []) as CatalogAgency[]).map((agency) => [agency.id, agency.commercial_name]));
  const typeMap = new Map(((productTypesRes.data ?? []) as Array<{ id: string; name: string }>).map((type) => [type.id, type.name]));

  return rows.map((row) => normalizeCatalogItem(row, agencyMap, typeMap));
}

export async function loadCatalogOptions({ agencyId }: { agencyId?: string | null } = {}) {
  const [agenciesRes, countriesRes, productTypesRes] = await Promise.all([
    supabase.from("agencies").select("id, commercial_name").eq("active", true).order("commercial_name", { ascending: true }),
    supabase.from("countries").select("code, name").order("name", { ascending: true }),
    supabase.from("product_types").select("id, name, description, scope, owner_agency_id, current_version").eq("active", true).order("name", { ascending: true }),
  ]);

  if (agenciesRes.error) throw agenciesRes.error;
  if (countriesRes.error) throw countriesRes.error;
  if (productTypesRes.error) throw productTypesRes.error;

  const productTypes = ((productTypesRes.data ?? []) as CatalogProductType[]).filter((item) => {
    if (item.scope === "global") return true;
    if (!agencyId) return true;
    return item.owner_agency_id === agencyId;
  });

  return {
    agencies: (agenciesRes.data ?? []) as CatalogAgency[],
    countries: (countriesRes.data ?? []) as CatalogCountry[],
    productTypes,
  };
}

async function loadCatalogAmenities(versionId: string): Promise<CatalogAmenityDefinition[]> {
  const { data: linksData, error: linksError } = await supabase
    .from("product_type_version_amenities")
    .select("amenity_type_id, required, order")
    .eq("product_type_version_id", versionId)
    .order("order", { ascending: true });

  if (linksError) {
    if (isMissingRelationError(linksError)) {
      return [];
    }
    throw linksError;
  }

  const links = (linksData ?? []) as ProductTypeAmenityLink[];
  if (links.length === 0) return [];

  const amenityIds = links.map((link) => link.amenity_type_id);
  const { data: amenityTypesData, error: amenityTypesError } = await supabase
    .from("amenity_types")
    .select("id, name, description, current_version")
    .in("id", amenityIds)
    .eq("active", true);
  if (amenityTypesError) throw amenityTypesError;

  const amenityTypes = (amenityTypesData ?? []) as AmenityTypeRow[];
  if (amenityTypes.length === 0) return [];

  const amenityTypeMap = new Map(amenityTypes.map((amenity) => [amenity.id, amenity]));
  const versionNumbers = amenityTypes.map((amenity) => amenity.current_version);

  const { data: amenityVersionsData, error: amenityVersionsError } = await supabase
    .from("amenity_type_versions")
    .select("id, amenity_type_id, version_number")
    .in("amenity_type_id", amenityIds)
    .in("version_number", versionNumbers);
  if (amenityVersionsError) throw amenityVersionsError;

  const amenityVersions = (amenityVersionsData ?? []) as AmenityVersionRow[];
  const amenityVersionMap = new Map<string, AmenityVersionRow>();
  amenityVersions.forEach((version) => {
    const amenity = amenityTypeMap.get(version.amenity_type_id);
    if (amenity && version.version_number === amenity.current_version) {
      amenityVersionMap.set(version.amenity_type_id, version);
    }
  });

  const versionIds = Array.from(new Set(Array.from(amenityVersionMap.values()).map((item) => item.id)));
  const { data: amenityFieldsData, error: amenityFieldsError } = versionIds.length > 0
    ? await supabase
        .from("amenity_type_fields")
        .select("id, amenity_type_version_id, field_name, label, input_type, required, placeholder, options")
        .in("amenity_type_version_id", versionIds)
        .order("order", { ascending: true })
    : { data: [], error: null };

  if (amenityFieldsError) throw amenityFieldsError;

  const amenityFieldsByVersion = new Map<string, CatalogField[]>();
  ((amenityFieldsData ?? []) as Array<CatalogField & { amenity_type_version_id: string }>).forEach((field) => {
    const current = amenityFieldsByVersion.get(field.amenity_type_version_id) ?? [];
    current.push({
      id: field.id,
      field_name: field.field_name,
      label: field.label,
      input_type: field.input_type,
      required: field.required,
      placeholder: field.placeholder,
      options: field.options,
    });
    amenityFieldsByVersion.set(field.amenity_type_version_id, current);
  });

  return links
    .map((link) => {
      const amenity = amenityTypeMap.get(link.amenity_type_id);
      const version = amenityVersionMap.get(link.amenity_type_id);
      if (!amenity || !version) return null;
      return {
        amenity_type_id: amenity.id,
        name: amenity.name,
        description: amenity.description,
        required: link.required,
        fields: amenityFieldsByVersion.get(version.id) ?? [],
      } satisfies CatalogAmenityDefinition;
    })
    .filter((item): item is CatalogAmenityDefinition => Boolean(item));
}

export async function loadCatalogDefinition(productTypeId: string): Promise<CatalogDefinition> {
  const { data: productTypeData, error: productTypeError } = await supabase
    .from("product_types")
    .select("current_version")
    .eq("id", productTypeId)
    .single();

  if (productTypeError || !productTypeData) {
    throw productTypeError || new Error("Tipo de producto no encontrado.");
  }

  const { data: versionData, error: versionError } = await supabase
    .from("product_type_versions")
    .select("id")
    .eq("product_type_id", productTypeId)
    .eq("version_number", productTypeData.current_version)
    .single();

  if (versionError || !versionData) {
    throw versionError || new Error("No se encontro la version activa del tipo de producto.");
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("product_type_fields")
    .select("id, field_name, label, input_type, required, placeholder, options")
    .eq("product_type_version_id", versionData.id)
    .order("order", { ascending: true });

  if (fieldsError) throw fieldsError;

  const amenities = await loadCatalogAmenities(versionData.id);

  return {
    versionId: versionData.id,
    fields: (fields ?? []) as CatalogDefinition["fields"],
    amenities,
  };
}

export async function saveCatalogItem(payload: CatalogSavePayload) {
  const data = {
    title: payload.title,
    summary: payload.summary,
    images: payload.images,
    fields: payload.fields,
    amenities: payload.amenities,
  };

  const basePayload = {
    agency_id: payload.agency_id,
    country_code: payload.country_code,
    status: payload.review_status,
    product_type_id: payload.product_type_id,
    product_type_version_id: payload.product_type_version_id,
    data,
    source_name: payload.title,
    source_ai_brain_id: null,
    raw_ai_output: null,
    title: payload.title,
    summary: payload.summary,
    creation_source: payload.creation_source,
    created_via_tool: payload.created_via_tool,
    review_status: payload.review_status,
    active: payload.active,
  };

  if (payload.id) {
    const { error } = await supabase.from("catalog_global").update(basePayload).eq("id", payload.id);
    if (error) throw error;
    return payload.id;
  }

  const { data: inserted, error } = await supabase
    .from("catalog_global")
    .insert({
      ...basePayload,
      created_by: payload.created_by,
    })
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id as string;
}

export async function setCatalogItemActive(itemId: string, active: boolean) {
  const { error } = await supabase.from("catalog_global").update({ active }).eq("id", itemId);
  if (error) throw error;
}

export async function archiveCatalogItem(itemId: string) {
  await setCatalogItemActive(itemId, false);
}

export function buildEmptyFieldState(fields: CatalogField[]) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    if (field.input_type === "multiselect") {
      acc[field.field_name] = [];
      return acc;
    }
    if (field.input_type === "boolean" || field.input_type === "checkbox") {
      acc[field.field_name] = false;
      return acc;
    }
    acc[field.field_name] = "";
    return acc;
  }, {});
}

export function buildEmptyAmenityState(amenities: CatalogAmenityDefinition[]) {
  return amenities.reduce<Record<string, Record<string, unknown>>>((acc, amenity) => {
    acc[amenity.amenity_type_id] = buildEmptyFieldState(amenity.fields);
    return acc;
  }, {});
}

export function normalizeFieldValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Si" : "No";
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function getDefaultTitle(typeName: string, fields: Record<string, unknown>) {
  return String(fields.title || fields.name || fields.nombre || typeName || "Producto manual").trim();
}

export function getDefaultSummary(fields: Record<string, unknown>) {
  return String(fields.summary || fields.description || fields.descripcion || "").trim();
}

export function toLabel(fieldName: string) {
  return toTitleCase(fieldName);
}
