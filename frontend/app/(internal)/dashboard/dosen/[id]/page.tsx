import DosenDetail from "@/components/dashboard/dosen-detail";

export default async function DosenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DosenDetail id={id} />;
}
