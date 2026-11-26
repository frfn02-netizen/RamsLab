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
import { meetingCopy } from "@/lib/meeting-copy";

export default function MeetingsWorkspaceGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user, status } = useAuth();
  const copy = meetingCopy();
  const router = useRouter();
  const pathname = usePathname();
  const canAccessWorkspace = canAccessMeetingsWorkspace(user?.role);
  const canViewAgenda = canViewMeetingsAgenda(user?.role);
  const isAgendaPath =
    pathname === "/meetings" || pathname.startsWith("/meetings/calendar");
  const isMinePath = pathname.startsWith("/meetings/mine");
  const isCreatePath = pathname === "/meetings/new";
  const isEditPath = /^\/meetings\/[^/]+\/edit$/.test(pathname);
  const canCreate = canCreateMeetings(user?.role);
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
    } else if (status === "authenticated" && user?.role === "ALUMNI") {
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

  if (status === "loading" || !user || user.mustChangePassword) {
    return (
      <AuthLoadingSkeleton
        label="Checking your session"
        className="bg-[var(--rams-gray-light)]"
      />
    );
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--rams-gray-light)] px-6 py-16">
        <section className="max-w-md border border-[#E7E2D8] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--rams-charcoal)]">
            {copy.accessTitle}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6B6A64]">
            {copy.accessRestricted}
          </p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
