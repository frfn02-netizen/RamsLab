"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-providers";
import { AuthLoadingSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui";
import { canAccessSchedulePortal } from "@/lib/authz";

export default function ScheduleGuard({ children }: { children: ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = canAccessSchedulePortal(
    user?.role,
    user?.permissions ?? [],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user?.mustChangePassword) {
      router.replace("/change-password");
    }
  }, [pathname, router, status, user]);

  if (status === "loading" || !user || user.mustChangePassword) {
    return (
      <AuthLoadingSkeleton
        label="Checking schedule access"
        className="bg-[var(--rams-gray-light)]"
      />
    );
  }

  if (!allowed) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-[#F7F5F1] px-5 py-12">
        <section className="w-full max-w-lg border border-[#E3DED7] bg-white px-6 py-7 shadow-[0_16px_40px_rgba(31,35,40,0.07)] sm:px-8">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
            Schedule portal
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-[var(--rams-charcoal)]">
            Schedule access is required
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5F5A54]">
            Your account is active, but it has not been granted Schedule Portal
            access. Ask a RAMS administrator to enable it for this account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={() => void logout()}>
              Sign out
            </Button>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:bg-[var(--rams-gray-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
            >
              RAMS home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
