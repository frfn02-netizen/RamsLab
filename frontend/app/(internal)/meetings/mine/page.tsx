import type { Metadata } from "next";

import MyMeetings from "@/components/meetings-workspace/my-meetings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Meetings",
  robots: { index: false, follow: false },
};

export default function MeetingsMinePage() {
  return <MyMeetings />;
}
