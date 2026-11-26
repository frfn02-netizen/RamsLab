import TrackingPage from "@/components/dashboard/tracking-page";

export default async function TrackingRoute({
  params,
}: {
  params: Promise<{ alumniId: string }>;
}) {
  const { alumniId } = await params;
  return <TrackingPage alumniId={alumniId} />;
}
