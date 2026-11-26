import EventForm from "@/components/dashboard/events/event-form";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventForm id={id} />;
}
