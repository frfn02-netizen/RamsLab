"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import AlumniProfile from "@/components/profile/alumni-profile";
import { AuthLoadingSkeleton } from "@/components/skeletons";

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
      <AuthLoadingSkeleton
        label="Checking your session"
        className="bg-[var(--paper)]"
      />
    );
  }

  return <AlumniProfile />;
}
