"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-providers";
import { AuthLoadingSkeleton } from "@/components/skeletons";
import {
  canAccessDashboardPath,
  defaultAuthenticatedDestination,
} from "@/lib/authz";

export default function DashboardGuard({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = canAccessDashboardPath(user?.role, pathname);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user?.mustChangePassword) {
      router.replace("/change-password");
    } else if (status === "authenticated" && user && !allowed) {
      router.replace(defaultAuthenticatedDestination(user));
    }
  }, [allowed, pathname, router, status, user]);

  if (
    status === "loading" ||
    !user ||
    user.mustChangePassword ||
    !allowed
  ) {
    return (
      <AuthLoadingSkeleton
        label="Checking your session"
        className="bg-[var(--rams-gray-light)]"
      />
    );
  }
  return <>{children}</>;
}
