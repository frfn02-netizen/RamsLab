import ExpertDetail from "@/components/dashboard/expert-detail";

export default async function ExpertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ExpertDetail id={id} />;
}
