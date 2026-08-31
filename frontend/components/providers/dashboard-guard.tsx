"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-providers";
import { canAccessDashboardPath } from "@/lib/authz";

export default function DashboardGuard({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user?.role === "ALUMNI") {
      router.replace("/profile");
    } else if (
      status === "authenticated" &&
      user &&
      !canAccessDashboardPath(user.role, pathname)
    ) {
      router.replace("/dashboard/publications");
    }
  }, [pathname, router, status, user]);

  if (status === "loading" || !user || user.role === "ALUMNI") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--rams-gray-light)]">
        <p className="text-sm text-[var(--rams-gray)]" role="status">
          Checking your session…
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
