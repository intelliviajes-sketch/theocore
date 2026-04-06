import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import {
  buildEmptyAmenityState,
  buildEmptyFieldState,
  loadCatalogDefinition,
  loadCatalogOptions,
  saveCatalogItem,
} from "@/features/catalog/api";
import type { CatalogSavePayload } from "@/features/catalog/types";
import type {
  CatalogIaDefinition,
  CatalogIaExtraction,
  CatalogIaMarketConfig,
  CatalogIaSourceType,
  CatalogIaWizardOptions,
} from "./types";

export async function loadCatalogIaOptions(agencyId: string): Promise<CatalogIaWizardOptions> {
  const [options, marketConfigResult] = await Promise.all([
    loadCatalogOptions({ agencyId }),
    supabase
      .from("agency_market_config")
      .select("id, country_code, language_code, currency_code, timezone, active")
      .eq("agency_id", agencyId)
      .order("country_code", { ascending: true }),
  ]);

  if (marketConfigResult.error) {
    throw marketConfigResult.error;
  }

  return {
    productTypes: options.productTypes,
    countries: options.countries,
    markets: ((marketConfigResult.data ?? []) as CatalogIaMarketConfig[]).filter((item) => item.active),
  };
}

export async function loadCatalogIaDefinition(productTypeId: string): Promise<CatalogIaDefinition> {
  return loadCatalogDefinition(productTypeId);
}

export async function runCatalogIaExtraction(payload: {
  agencyId: string;
  sourceType: CatalogIaSourceType;
  rawText?: string;
  files?: File[];
  file?: File | null;
}) {
  const body = new FormData();
  body.append("agencyId", payload.agencyId);
  body.append("sourceType", payload.sourceType);
  if (payload.rawText?.trim()) {
    body.append("rawText", payload.rawText.trim());
  }
  if (payload.files?.length) {
    payload.files.forEach((file) => body.append("files", file));
  }
  if (payload.file) {
    body.append("file", payload.file);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const response = await fetch("/api/catalogia/extract", {
    method: "POST",
    body,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || "No se pudo ejecutar CatalogIA.");
  }

  return json as CatalogIaExtraction;
}

export function normalizeFieldStateForDefinition(definition: CatalogIaDefinition) {
  return {
    fields: buildEmptyFieldState(definition.fields),
    amenities: buildEmptyAmenityState(definition.amenities),
  };
}

export async function createCatalogItemFromIa(payload: Omit<CatalogSavePayload, "creation_source" | "created_via_tool">) {
  return saveCatalogItem({
    ...payload,
    creation_source: "ai",
    created_via_tool: "catalogia",
  });
}

export async function createCatalogItemsFromIa(
  payloads: Array<Omit<CatalogSavePayload, "creation_source" | "created_via_tool">>,
) {
  const ids: string[] = [];
  for (const payload of payloads) {
    const id = await createCatalogItemFromIa(payload);
    ids.push(id);
  }
  return ids;
}
