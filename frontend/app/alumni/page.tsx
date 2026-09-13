"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";

export default function AlumniPortalPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "authenticated" && user) {
      if (user.role === "ALUMNI") {
        router.replace("/alumni/dashboard");
      } else if (user.role === "ADMIN") {
        router.replace("/dashboard");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [status, user, router]);

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <p className="text-sm text-[var(--gray)]" role="status">
          Loading…
        </p>
      </main>
    );
  }

  if (status === "authenticated") return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--paper)] px-5">
      <div className="w-full max-w-lg text-center">
        <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
          Alumni
        </p>
        <h1 className="mt-5 font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-5xl">
          Join the RAMS Laboratory Alumni Network
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[var(--slate)]">
          Create your alumni account and keep your academic and professional
          profile up to date.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/alumni/register"
            className="inline-flex h-12 items-center rounded bg-[var(--rams-red)] px-8 text-sm font-bold text-white transition-colors hover:bg-[var(--rams-red-dark)]"
          >
            Create Alumni Account
          </Link>
          <p className="text-sm text-[var(--gray)]">
            Already have an account?{" "}
            <Link
              href="/alumni/login"
              className="font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
