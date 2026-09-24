"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import AlumniProfile from "@/components/profile/alumni-profile";

export default function AlumniDashboardPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/alumni/login");
    } else if (status === "authenticated" && user?.role !== "ALUMNI") {
      router.replace("/dashboard");
    }
  }, [status, user, router]);

  if (status === "loading" || !user || user.role !== "ALUMNI") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <p className="text-sm text-[var(--gray)]" role="status">
          Checking your session…
        </p>
      </div>
    );
  }

  return <AlumniProfile />;
}
