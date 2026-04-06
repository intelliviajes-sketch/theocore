import SocialMediaStudio from "@/features/social-media/SocialMediaStudio";

export default async function SocialMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SocialMediaStudio agencyId={id} />;
}
