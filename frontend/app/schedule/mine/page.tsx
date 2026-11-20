import type { Metadata } from "next";

import MyMeetings from "@/components/meetings-workspace/my-meetings";
import ScheduleGuard from "@/components/schedule/schedule-guard";

export const metadata: Metadata = {
  title: "My Schedules",
  robots: { index: false, follow: false },
};

export default function ScheduleMinePage() {
  return (
    <ScheduleGuard>
      <MyMeetings
        basePath="/schedule"
        scope="accessibles"
        canCreateOverride
        eyebrow="Schedule"
        title="My Schedules"
        description="Schedules you created or joined through your Schedule Portal access."
        emptyDescription="When you create or join a schedule, it will appear here with its agenda and attachments."
      />
    </ScheduleGuard>
  );
}
