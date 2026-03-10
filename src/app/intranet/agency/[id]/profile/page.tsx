import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AgencyProfile from "./AgencyProfile";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const supabase = await createSupabaseServer();
  const { data: agency, error } = await supabase.from("agencies").select("*").eq("id", id).single();

  if (error) {
    console.error("ERROR AGENCY:", error.message);
    return <p>Error cargando agencia</p>;
  }

  if (!agency) {
    return <p>No existe la agencia</p>;
  }

  return <AgencyProfile agency={agency} />;
}
