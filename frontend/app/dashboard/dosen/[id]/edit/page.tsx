import EditDosen from "@/components/dashboard/edit-dosen";

export default async function EditDosenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditDosen id={id} />;
}
