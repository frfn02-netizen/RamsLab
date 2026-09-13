"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import AlumniProfile from "@/components/profile/alumni-profile";

export default function AlumniDashboardPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--navy)]"
            >
              RAMS Platform
            </Link>
            <span className="text-sm font-semibold text-[var(--rams-red)]">
              Alumni Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/alumni/history"
              className="text-sm font-semibold text-[var(--gray)] hover:text-[var(--navy)]"
            >
              Change History
            </Link>
            <span className="text-sm text-[var(--gray)]">{user.email}</span>
            <button
              onClick={() => void logout()}
              className="text-sm font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      <AlumniProfile />
    </div>
  );
}
