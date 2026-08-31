import PublicationForm from "@/components/dashboard/publication-form";

export default async function EditPublicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicationForm id={id} />;
}
