import type { Metadata } from "next";

import LabMembershipsPage from "@/components/dashboard/lab-memberships/lab-memberships-page";

export const metadata: Metadata = {
  title: "Lab members",
  robots: { index: false, follow: false },
};

export default function DashboardLabMembershipsPage() {
  return <LabMembershipsPage />;
}
