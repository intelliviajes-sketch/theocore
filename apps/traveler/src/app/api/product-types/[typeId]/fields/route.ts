import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenant/server";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ typeId: string }> },
) {
  const { typeId } = await context.params;

  if (!typeId) {
    return bad("Falta el ID del tipo de producto.");
  }

  const tenant = await resolveTenantFromRequest();
  const agencyId = tenant.kind === "agency" ? tenant.agency?.id ?? null : null;

  let productTypeQuery = supabaseAdmin
    .from("product_types")
    .select("id, current_version, scope, owner_agency_id")
    .eq("id", typeId)
    .eq("active", true);

  if (agencyId) {
    productTypeQuery = productTypeQuery.or(`scope.eq.global,scope.is.null,owner_agency_id.eq.${agencyId}`);
  } else {
    productTypeQuery = productTypeQuery.or("scope.eq.global,scope.is.null");
  }

  const { data: productType, error: productTypeError } = await productTypeQuery.maybeSingle();

  if (productTypeError || !productType) {
    const { data: fallbackType, error: fallbackError } = await supabaseAdmin
      .from("product_types")
      .select("id, current_version")
      .eq("id", typeId)
      .eq("active", true)
      .maybeSingle();

    if (fallbackError || !fallbackType) {
      return bad("Tipo de producto no encontrado.", 404);
    }

    const { data: fallbackVersion, error: fallbackVersionError } = await supabaseAdmin
      .from("product_type_versions")
      .select("id")
      .eq("product_type_id", typeId)
      .eq("version_number", fallbackType.current_version)
      .maybeSingle();

    if (fallbackVersionError || !fallbackVersion) {
      return bad("No se encontro la version activa del tipo de producto.", 404);
    }

    const { data: fallbackFields, error: fallbackFieldsError } = await supabaseAdmin
      .from("product_type_fields")
      .select("id, field_name, label, input_type, required, placeholder, options")
      .eq("product_type_version_id", fallbackVersion.id)
      .order("order", { ascending: true });

    if (fallbackFieldsError) {
      return bad("No se pudieron cargar los campos del tipo de producto.", 500);
    }

    return NextResponse.json({ fields: fallbackFields ?? [] });
  }

  const { data: version, error: versionError } = await supabaseAdmin
    .from("product_type_versions")
    .select("id")
    .eq("product_type_id", typeId)
    .eq("version_number", productType.current_version)
    .maybeSingle();

  if (versionError || !version) {
    return bad("No se encontro la version activa del tipo de producto.", 404);
  }

  const { data: fields, error: fieldsError } = await supabaseAdmin
    .from("product_type_fields")
    .select("id, field_name, label, input_type, required, placeholder, options")
    .eq("product_type_version_id", version.id)
    .order("order", { ascending: true });

  if (fieldsError) {
    return bad("No se pudieron cargar los campos del tipo de producto.", 500);
  }

  return NextResponse.json({ fields: fields ?? [] });
}
