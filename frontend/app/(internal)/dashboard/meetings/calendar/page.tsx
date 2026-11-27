import type { Metadata } from "next";

import MeetingsPage from "@/components/dashboard/meetings/meetings-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meetings calendar",
  robots: { index: false, follow: false },
};

export default function DashboardMeetingsCalendarPage() {
  return (
    <MeetingsPage
      title="Calendar"
      description="Month view of scheduled meetings. Select a day to see its agenda."
    />
  );
}
