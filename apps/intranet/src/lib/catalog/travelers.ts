export type CatalogProduct = {
  id: string;
  agencyId: string;
  countryCode: string | null;
  status: string;
  productTypeId: string;
  productTypeName: string | null;
  sourceName: string | null;
  title: string;
  summary: string;
  destination: string | null;
  tags: string[];
  images: string[];
  coverImage: string | null;
  createdAt: string;
  creationSource: "manual" | "ai" | "imported" | "unknown";
  createdViaTool: string | null;
  sourceAiBrainId: string | null;
  monetizationTier: "own" | "adapted" | "sponsored";
  data: Record<string, unknown>;
};

const TITLE_KEYS = ["title", "name", "nombre", "product_name", "productTitle"];
const SUMMARY_KEYS = ["summary", "description", "descripcion", "overview", "excerpt"];
const DESTINATION_KEYS = ["destination", "destino", "city", "location", "market_destination"];
const TAG_KEYS = ["tags", "categories", "highlights"];
const IMAGE_KEYS = ["image", "image_url", "cover_image", "coverImage", "hero_image", "heroImage"];
const SPONSORED_KEYS = ["sponsored", "is_sponsored", "promoted", "is_promoted", "affiliate", "is_affiliate"];

function readBooleanField(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "si") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
  }
  return null;
}

function normalizeCreationSource(
  value: unknown,
): "manual" | "ai" | "imported" | "unknown" {
  if (value === "manual" || value === "ai" || value === "imported") return value;
  return "unknown";
}

function resolveMonetizationTier({
  data,
  creationSource,
  createdViaTool,
  sourceAiBrainId,
}: {
  data: Record<string, unknown>;
  creationSource: "manual" | "ai" | "imported" | "unknown";
  createdViaTool: string | null;
  sourceAiBrainId: string | null;
}) {
  const via = (createdViaTool || "").toLowerCase();
  const explicitSponsored = readBooleanField(data, SPONSORED_KEYS) === true;

  if (
    explicitSponsored ||
    creationSource === "imported" ||
    via.includes("sponsor") ||
    via.includes("ads") ||
    via.includes("affiliate") ||
    via.includes("partner")
  ) {
    return "sponsored" as const;
  }

  if (
    creationSource === "ai" ||
    Boolean(sourceAiBrainId) ||
    via.includes("ai") ||
    via.includes("catologia")
  ) {
    return "adapted" as const;
  }

  return "own" as const;
}

function readStringField(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readStringList(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 4);
    }
    if (typeof value === "string" && value.trim()) {
      return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4);
    }
  }
  return [] as string[];
}

function readImages(data: Record<string, unknown>) {
  const value = data.images;
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
    if (items.length > 0) return items;
  }

  const single = readStringField(data, IMAGE_KEYS);
  return single ? [single] : [];
}

export function normalizeCatalogProduct(
  row: {
    id: string;
    agency_id: string;
    country_code: string | null;
    status: string;
    product_type_id: string;
    source_name: string | null;
    source_ai_brain_id: string | null;
    created_at: string;
    data: Record<string, unknown> | null;
    creation_source: "manual" | "ai" | "imported" | null;
    created_via_tool: string | null;
  },
  productTypeName: string | null,
): CatalogProduct {
  const data = row.data ?? {};
  const creationSource = normalizeCreationSource(row.creation_source);
  const monetizationTier = resolveMonetizationTier({
    data,
    creationSource,
    createdViaTool: row.created_via_tool,
    sourceAiBrainId: row.source_ai_brain_id,
  });
  const title = readStringField(data, TITLE_KEYS) || row.source_name || productTypeName || "Producto sin titulo";
  const summary = readStringField(data, SUMMARY_KEYS) || `Experiencia disponible en ${productTypeName || "catalogo"}.`;
  const destination = readStringField(data, DESTINATION_KEYS);
  const tags = readStringList(data, TAG_KEYS);
  const images = readImages(data);

  return {
    id: row.id,
    agencyId: row.agency_id,
    countryCode: row.country_code,
    status: row.status,
    productTypeId: row.product_type_id,
    productTypeName,
    sourceName: row.source_name,
    title,
    summary,
    destination,
    tags,
    images,
    coverImage: images[0] ?? null,
    createdAt: row.created_at,
    creationSource,
    createdViaTool: row.created_via_tool,
    sourceAiBrainId: row.source_ai_brain_id,
    monetizationTier,
    data,
  };
}
