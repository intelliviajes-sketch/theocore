import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { THEOCORE_HOME } from "@/lib/routes";

export default async function IntranetIndex() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(THEOCORE_HOME);
  redirect("/intranet/login");
}
