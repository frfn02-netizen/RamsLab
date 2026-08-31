import type { ReactNode } from "react";

import Sidebar from "./sidebar";
import Header from "./header";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-shell flex h-screen overflow-hidden bg-[var(--rams-gray-light)] text-[var(--rams-charcoal)]">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header />

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
