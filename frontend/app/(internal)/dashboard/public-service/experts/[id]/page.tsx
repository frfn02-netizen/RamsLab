import ExpertForm from "@/components/dashboard/public-service/expert-form";

export default async function PublicServiceExpertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExpertForm id={id} />;
}
