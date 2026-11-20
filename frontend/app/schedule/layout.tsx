import type { Metadata } from "next";
import type { ReactNode } from "react";

import ScheduleShell from "@/components/schedule/schedule-shell";

export const metadata: Metadata = {
  title: "Public Schedule",
  description:
    "Public schedule of RAMS Laboratory meetings and activities.",
  robots: { index: true, follow: true },
};

export default function ScheduleLayout({ children }: { children: ReactNode }) {
  return <ScheduleShell>{children}</ScheduleShell>;
}
