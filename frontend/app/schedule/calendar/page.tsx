import type { Metadata } from "next";

import MeetingsPage from "@/components/dashboard/meetings/meetings-page";

export const metadata: Metadata = {
  title: "Public Schedule Calendar",
  description: "Month view of public RAMS Laboratory schedule activities.",
  robots: { index: true, follow: true },
};

export default function ScheduleCalendarPage() {
  return (
    <MeetingsPage
      basePath="/schedule"
      source="public"
      canCreateOverride={false}
      title="Public calendar"
      description="Month view of public RAMS Laboratory activities. Private meetings are not shown."
    />
  );
}
