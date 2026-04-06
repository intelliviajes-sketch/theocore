"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import { useTenant } from "@/contexts/tenant";
import { normalizeCatalogProduct, type CatalogProduct } from "@/lib/catalog/travelers";

type CatalogContextValue = {
  items: CatalogProduct[];
  featured: CatalogProduct[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

type CatalogRow = {
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
  active: boolean;
  review_status: string;
};

const TravelerCatalogContext = createContext<CatalogContextValue | null>(null);

async function loadCatalogRows(agencyId: string, countryCode: string | null) {
  let query = supabase
    .from("catalog_global")
    .select("id, agency_id, country_code, status, product_type_id, source_name, source_ai_brain_id, created_at, data, creation_source, created_via_tool, active, review_status")
    .eq("agency_id", agencyId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (countryCode) {
    query = query.eq("country_code", countryCode);
  }

  let { data, error } = await query;
  if (error) throw error;

  if ((!data || data.length === 0) && countryCode) {
    const fallback = await supabase
      .from("catalog_global")
      .select("id, agency_id, country_code, status, product_type_id, source_name, source_ai_brain_id, created_at, data, creation_source, created_via_tool, active, review_status")
      .eq("agency_id", agencyId)
      .eq("active", true)
      .is("country_code", null)
      .order("created_at", { ascending: false });

    data = fallback.data;
    error = fallback.error;
    if (error) throw error;
  }

  const rows = (data ?? []) as CatalogRow[];
  const visibleRows = rows.filter((row) => row.review_status !== "archived");
  const published = visibleRows.filter((row) => row.review_status === "published");
  if (published.length > 0) return published;

  const reviewed = visibleRows.filter((row) => row.review_status === "reviewed");
  if (reviewed.length > 0) return reviewed;

  return visibleRows;
}

async function loadProductTypeNames(productTypeIds: string[]) {
  if (productTypeIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("product_types").select("id, name").in("id", productTypeIds);
  if (error) throw error;

  return new Map((data ?? []).map((item) => [item.id, item.name]));
}

export function TravelerCatalogProvider({ children }: { children: ReactNode }) {
  const tenant = useTenant();
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (tenant.kind !== "agency" || !tenant.agency?.id || !tenant.travelerEnabled) {
      setItems([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await loadCatalogRows(tenant.agency.id, tenant.market?.countryCode ?? null);
      const productTypeIds = Array.from(new Set(rows.map((row) => row.product_type_id).filter(Boolean)));
      const productTypeNames = await loadProductTypeNames(productTypeIds);
      const normalized = rows.map((row) => normalizeCatalogProduct(row, productTypeNames.get(row.product_type_id) ?? null));
      setItems(normalized);
    } catch (loadError) {
      console.error("Error cargando catalogo traveler:", loadError);
      setItems([]);
      setError("No se pudo cargar el catalogo disponible.");
    } finally {
      setLoading(false);
    }
  }, [tenant.kind, tenant.agency?.id, tenant.market?.countryCode, tenant.travelerEnabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<CatalogContextValue>(() => ({
    items,
    featured: items.slice(0, 3),
    loading,
    error,
    reload,
  }), [items, loading, error, reload]);

  return <TravelerCatalogContext.Provider value={value}>{children}</TravelerCatalogContext.Provider>;
}

export function useTravelerCatalog() {
  const context = useContext(TravelerCatalogContext);
  if (!context) {
    throw new Error("useTravelerCatalog debe usarse dentro de <TravelerCatalogProvider>");
  }
  return context;
}
