import MarketingHub from "@/features/marketing/MarketingHub";

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MarketingHub agencyId={id} />;
}

