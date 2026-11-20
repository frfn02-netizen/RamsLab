"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-providers";
import { AuthLoadingSkeleton } from "@/components/skeletons";
import {
  canAccessMeetingsWorkspace,
  canCreateMeetings,
  canViewMeetingsAgenda,
  defaultAuthenticatedDestination,
} from "@/lib/authz";

export default function MeetingsWorkspaceGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const canAccessWorkspace = canAccessMeetingsWorkspace(user?.role);
  const canViewAgenda = canViewMeetingsAgenda(user?.role);
  const isAgendaPath =
    pathname === "/meetings" || pathname.startsWith("/meetings/calendar");
  const isMinePath = pathname.startsWith("/meetings/mine");
  const isCreatePath = pathname === "/meetings/new";
  const isEditPath = /^\/meetings\/[^/]+\/edit$/.test(pathname);
  const canCreate = canCreateMeetings(
    user?.role,
    user?.permissions ?? [],
  );
  const canViewMine = user?.role === "ADMIN" || user?.role === "DOSEN";
  const allowed =
    canAccessWorkspace &&
    (!isAgendaPath || canViewAgenda) &&
    (!isMinePath || canViewMine) &&
    (!isCreatePath || canCreate) &&
    (!isEditPath || canCreate);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === "authenticated" && user?.mustChangePassword) {
      router.replace("/change-password");
    } else if (status === "authenticated" && user && !canAccessWorkspace) {
      router.replace(defaultAuthenticatedDestination(user));
    } else if (
      status === "authenticated" &&
      user &&
      canAccessWorkspace &&
      !canViewAgenda &&
      isAgendaPath
    ) {
      router.replace("/meetings/mine");
    } else if (
      status === "authenticated" &&
      user &&
      isMinePath &&
      !canViewMine
    ) {
      router.replace("/meetings/calendar");
    } else if (
      status === "authenticated" &&
      user &&
      (isCreatePath || isEditPath) &&
      !canCreate
    ) {
      router.replace("/meetings/calendar");
    }
  }, [
    canAccessWorkspace,
    canCreate,
    canViewAgenda,
    canViewMine,
    isAgendaPath,
    isCreatePath,
    isEditPath,
    isMinePath,
    pathname,
    router,
    status,
    user,
  ]);

  if (status === "loading" || !user || user.mustChangePassword || !allowed) {
    return (
      <AuthLoadingSkeleton
        label="Checking your session"
        className="bg-[var(--rams-gray-light)]"
      />
    );
  }

  return <>{children}</>;
}
