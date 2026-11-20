import type { Metadata } from "next";

import MeetingForm from "@/components/dashboard/meetings/meeting-form";
import ScheduleGuard from "@/components/schedule/schedule-guard";

export const metadata: Metadata = {
  title: "Create Schedule",
  robots: { index: false, follow: false },
};

export default async function ScheduleNewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return (
    <ScheduleGuard>
      <MeetingForm initialDate={date} basePath="/schedule" />
    </ScheduleGuard>
  );
}
