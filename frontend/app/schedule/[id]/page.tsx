import type { Metadata } from "next";

import PublicScheduleDetail from "@/components/schedule/public-schedule-detail";

export const metadata: Metadata = {
  title: "Public Schedule Detail",
  description: "Public RAMS Laboratory schedule information.",
  robots: { index: true, follow: true },
};

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicScheduleDetail id={id} />;
}
