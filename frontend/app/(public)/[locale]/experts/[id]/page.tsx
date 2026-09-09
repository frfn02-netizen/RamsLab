import PublicExpertProfile from "@/components/public/public-expert-profile";

export default async function PublicExpertPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PublicExpertProfile id={id} />;
}
