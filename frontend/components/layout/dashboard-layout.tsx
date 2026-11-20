import type { ReactNode } from "react";

import Sidebar from "./sidebar";
import Header from "./header";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-shell flex h-[100dvh] overflow-hidden bg-[var(--rams-gray-light)] text-[var(--rams-charcoal)]">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
