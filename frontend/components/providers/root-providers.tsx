import type { ReactNode } from "react";

import AnalyticsGate from "@/components/analytics-gate";
import { AuthProvider } from "./auth-providers";
import { ToastProvider } from "./toast-providers";

export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <AnalyticsGate />
      </ToastProvider>
    </AuthProvider>
  );
}
