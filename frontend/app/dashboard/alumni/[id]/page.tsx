import AlumniDetail from "@/components/dashboard/alumni-detail";

export default async function AlumniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AlumniDetail id={id} />;
}
