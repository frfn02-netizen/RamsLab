import type { Metadata } from "next";

import PublicScheduleOverview from "@/components/schedule/public-schedule-overview";

export const metadata: Metadata = {
  title: "Public Schedule",
  description:
    "Upcoming public RAMS Laboratory activities and recent schedule history.",
  robots: { index: true, follow: true },
};

export default function ScheduleDashboardPage() {
  return <PublicScheduleOverview />;
}
