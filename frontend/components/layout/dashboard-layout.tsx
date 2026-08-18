import type { ReactNode } from "react";

import Sidebar from "./sidebar";
import Header from "./header";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-shell flex min-h-screen bg-[var(--rams-gray-light)] text-[var(--rams-charcoal)]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
