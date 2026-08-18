import type { Metadata } from "next";
import type { ReactNode } from "react";

import DashboardLayout from "@/components/layout/dashboard-layout";
import DashboardGuard from "@/components/providers/dashboard-guard";

type DashboardRootLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardRootLayout({
  children,
}: DashboardRootLayoutProps) {
  return (
    <DashboardGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </DashboardGuard>
  );
}
