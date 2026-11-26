import type { Metadata } from "next";

import MeetingForm from "@/components/dashboard/meetings/meeting-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit meeting",
  robots: { index: false, follow: false },
};

export default async function MeetingsEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingForm id={id} basePath="/meetings" />;
}
