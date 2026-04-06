import CatalogIaWizard from "@/features/catalogia/CatalogIaWizard";

export default async function CatalogIaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CatalogIaWizard agencyId={id} />;
}
