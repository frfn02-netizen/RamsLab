import type { Metadata } from "next";

import MeetingDetail from "@/components/dashboard/meetings/meeting-detail";

export const metadata: Metadata = {
  title: "Meeting details",
  robots: { index: false, follow: false },
};

export default async function MeetingsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingDetail id={id} basePath="/meetings" />;
}
