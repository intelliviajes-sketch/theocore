import AgencyToolsPanel from "@/components/intracore/AgencyToolsPanel";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AgencyToolsPanel agencyId={id} showStandaloneTitle />;
}
