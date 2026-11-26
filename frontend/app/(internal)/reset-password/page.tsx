"use client";

import { useEffect, useState } from "react";
import { AuthLoadingSkeleton } from "@/components/skeletons";
import ResetPasswordForm from "./reset-password-form";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(rawHash);
    const nextToken = params.get("token") ?? "";

    // Remove the token from the visible address bar and current history entry.
    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    const timer = window.setTimeout(() => setToken(nextToken), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (token === null) {
    return (
      <AuthLoadingSkeleton
        label="Reading reset link"
        className="bg-[var(--background-light)]"
      />
    );
  }

  return <ResetPasswordForm token={token} />;
}
