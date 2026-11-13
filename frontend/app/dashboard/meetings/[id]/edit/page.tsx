import MeetingForm from "@/components/dashboard/meetings/meeting-form";

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingForm id={id} />;
}
