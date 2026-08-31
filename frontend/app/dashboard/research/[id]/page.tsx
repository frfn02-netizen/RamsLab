import ResearchAreaDetail from "@/components/dashboard/research-area-detail";

export default async function ResearchAreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResearchAreaDetail id={id} />;
}
