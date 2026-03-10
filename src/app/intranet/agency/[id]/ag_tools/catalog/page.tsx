import CatalogManager from "@/features/catalog/CatalogManager";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CatalogManager mode="agency" agencyId={id} />;
}
