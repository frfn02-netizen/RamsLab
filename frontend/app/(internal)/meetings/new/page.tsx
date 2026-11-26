import type { Metadata } from "next";

import MeetingForm from "@/components/dashboard/meetings/meeting-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule meeting",
  robots: { index: false, follow: false },
};

export default async function MeetingsNewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <MeetingForm initialDate={date} basePath="/meetings" />;
}
