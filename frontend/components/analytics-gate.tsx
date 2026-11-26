"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";

const DISABLED_PREFIXES = [
  "/forgot-password",
  "/reset-password",
  "/change-password",
];

export default function AnalyticsGate() {
  const pathname =
    usePathname() ??
    (typeof window === "undefined" ? "" : window.location.pathname);
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const disabled = DISABLED_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.includes(prefix),
  );

  if (disabled) return null;
  return <SpeedInsights />;
}
