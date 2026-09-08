import ServiceForm from "@/components/dashboard/public-service/service-form";

export default async function PublicServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceForm id={id} />;
}
