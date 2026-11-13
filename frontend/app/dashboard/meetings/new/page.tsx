import MeetingForm from "@/components/dashboard/meetings/meeting-form";

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <MeetingForm initialDate={date} />;
}
