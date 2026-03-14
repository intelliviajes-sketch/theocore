import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenant/server";

type ProductTypeRow = {
  id: string;
  name: string;
  description: string | null;
  scope: string | null;
  owner_agency_id: string | null;
  current_version: number;
  active: boolean;
};

function sortTypes(rows: ProductTypeRow[]) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

export async function GET() {
  try {
    const tenant = await resolveTenantFromRequest();

    if (tenant.kind === "agency" && tenant.agency?.id) {
      const agencyId = tenant.agency.id;
      const { data, error } = await supabaseAdmin
        .from("product_types")
        .select("id, name, description, scope, owner_agency_id, current_version, active")
        .eq("active", true)
        .or(`scope.eq.global,scope.is.null,owner_agency_id.eq.${agencyId}`)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error cargando product_types por agencia:", error);
        return NextResponse.json({ types: [] }, { status: 200 });
      }

      const filtered = (data ?? []) as ProductTypeRow[];
      if (filtered.length > 0) {
        return NextResponse.json({ types: sortTypes(filtered) }, { status: 200 });
      }

      const { data: fallbackTypes, error: fallbackError } = await supabaseAdmin
        .from("product_types")
        .select("id, name, description, scope, owner_agency_id, current_version, active")
        .eq("active", true)
        .order("name", { ascending: true });

      if (fallbackError) {
        console.error("Error cargando product_types fallback agencia:", fallbackError);
        return NextResponse.json({ types: [] }, { status: 200 });
      }

      return NextResponse.json({ types: sortTypes((fallbackTypes ?? []) as ProductTypeRow[]) }, { status: 200 });
    }

    const { data: globalTypes, error: globalError } = await supabaseAdmin
      .from("product_types")
      .select("id, name, description, scope, owner_agency_id, current_version, active")
      .eq("active", true)
      .or("scope.eq.global,scope.is.null")
      .order("name", { ascending: true });

    if (globalError) {
      console.error("Error cargando product_types globales:", globalError);
      return NextResponse.json({ types: [] }, { status: 200 });
    }

    const base = (globalTypes ?? []) as ProductTypeRow[];
    if (base.length > 0) {
      return NextResponse.json({ types: sortTypes(base) }, { status: 200 });
    }

    const { data: fallbackTypes, error: fallbackError } = await supabaseAdmin
      .from("product_types")
      .select("id, name, description, scope, owner_agency_id, current_version, active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (fallbackError) {
      console.error("Error cargando product_types fallback platform:", fallbackError);
      return NextResponse.json({ types: [] }, { status: 200 });
    }

    return NextResponse.json({ types: sortTypes((fallbackTypes ?? []) as ProductTypeRow[]) }, { status: 200 });
  } catch (error) {
    console.error("Error en /api/traveler/product-types:", error);
    return NextResponse.json({ types: [] }, { status: 200 });
  }
}
