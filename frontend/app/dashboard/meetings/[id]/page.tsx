import MeetingDetail from "@/components/dashboard/meetings/meeting-detail";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetail id={id} />;
}
