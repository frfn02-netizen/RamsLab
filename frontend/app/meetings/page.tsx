import type { Metadata } from "next";

import MeetingsOverview from "@/components/meetings-workspace/overview";

export const metadata: Metadata = {
  title: "Meetings overview",
  robots: { index: false, follow: false },
};

export default function MeetingsWorkspacePage() {
  return <MeetingsOverview />;
}
