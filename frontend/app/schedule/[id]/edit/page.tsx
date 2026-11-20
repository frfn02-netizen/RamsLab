import type { Metadata } from "next";

import MeetingForm from "@/components/dashboard/meetings/meeting-form";
import ScheduleGuard from "@/components/schedule/schedule-guard";

export const metadata: Metadata = {
  title: "Edit Schedule",
  robots: { index: false, follow: false },
};

export default async function ScheduleEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ScheduleGuard>
      <MeetingForm id={id} basePath="/schedule" />
    </ScheduleGuard>
  );
}
