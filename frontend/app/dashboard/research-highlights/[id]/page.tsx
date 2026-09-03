import ResearchHighlightForm from "@/components/dashboard/research-highlight-form";

export default async function ResearchHighlightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResearchHighlightForm id={id} />;
}
