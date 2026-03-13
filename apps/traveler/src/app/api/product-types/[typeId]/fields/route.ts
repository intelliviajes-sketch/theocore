import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ typeId: string }> },
) {
  const supabase = await createSupabaseServer();
  const { typeId } = await context.params;

  if (!typeId) {
    return bad("Falta el ID del tipo de producto.");
  }

  const { data: productType, error: productTypeError } = await supabase
    .from("product_types")
    .select("current_version")
    .eq("id", typeId)
    .maybeSingle();

  if (productTypeError || !productType) {
    return bad("Tipo de producto no encontrado.", 404);
  }

  const { data: version, error: versionError } = await supabase
    .from("product_type_versions")
    .select("id")
    .eq("product_type_id", typeId)
    .eq("version_number", productType.current_version)
    .maybeSingle();

  if (versionError || !version) {
    return bad("No se encontro la version activa del tipo de producto.", 404);
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("product_type_fields")
    .select("id, field_name, label, input_type, required, placeholder, options")
    .eq("product_type_version_id", version.id)
    .order("order", { ascending: true });

  if (fieldsError) {
    return bad("No se pudieron cargar los campos del tipo de producto.", 500);
  }

  return NextResponse.json({ fields: fields ?? [] });
}
