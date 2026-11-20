import { describe, expect, it } from "vitest";

import {
  authorizedLoginDestination,
  canAccessAuthenticatedPath,
  canAccessDashboardPath,
  canAccessMeetingsWorkspace,
  canAccessSchedulePortal,
  canCreateMeetings,
  canViewMeetingsAgenda,
  defaultAuthenticatedDestination,
  hasPermission,
  PERMISSIONS,
} from "@/lib/authz";
import type { AuthUser } from "@/types/auth";

function account(
  role: AuthUser["role"],
  mustChangePassword = false,
  permissions: string[] = [],
): AuthUser {
  return {
    id: `${role.toLowerCase()}-1`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    isActive: true,
    permissions,
    mustChangePassword,
  };
}

describe("RAMS access policy", () => {
  it("gives administrators both dashboard and Meetings access", () => {
    expect(canAccessDashboardPath("ADMIN", "/dashboard/content/homepage")).toBe(
      true,
    );
    expect(canAccessAuthenticatedPath("ADMIN", "/meetings/calendar")).toBe(
      true,
    );
    expect(defaultAuthenticatedDestination(account("ADMIN"))).toBe(
      "/dashboard",
    );
  });

  it("limits DOSEN to Meetings paths and future-proofed Meetings permissions", () => {
    expect(canAccessMeetingsWorkspace("DOSEN")).toBe(true);
    expect(canAccessMeetingsWorkspace("STUDENT")).toBe(true);
    expect(canAccessAuthenticatedPath("DOSEN", "/meetings/mine")).toBe(true);
    expect(canAccessDashboardPath("DOSEN", "/dashboard")).toBe(false);
    expect(canAccessAuthenticatedPath("DOSEN", "/dashboard/dosen")).toBe(
      false,
    );
    expect(defaultAuthenticatedDestination(account("DOSEN"))).toBe(
      "/meetings",
    );
    expect(hasPermission("DOSEN", PERMISSIONS.MEETINGS_ACCESS)).toBe(true);
    expect(hasPermission("DOSEN", PERMISSIONS.MEETINGS_CREATE)).toBe(true);
    expect(hasPermission("DOSEN", PERMISSIONS.DASHBOARD_READ)).toBe(false);
    expect(hasPermission("DOSEN", PERMISSIONS.PUBLICATION_READ)).toBe(false);
  });

  it("keeps alumni on the existing profile portal without Meetings access", () => {
    expect(canAccessAuthenticatedPath("ALUMNI", "/profile")).toBe(true);
    expect(
      canAccessDashboardPath("ALUMNI", "/dashboard/alumni/profile"),
    ).toBe(true);
    expect(canAccessMeetingsWorkspace("ALUMNI")).toBe(false);
    expect(canAccessAuthenticatedPath("ALUMNI", "/meetings")).toBe(false);
    expect(defaultAuthenticatedDestination(account("ALUMNI"))).toBe(
      "/dashboard/alumni/profile",
    );
  });

  it("opens the shared agenda to active internal roles without lab membership", () => {
    expect(canViewMeetingsAgenda("ADMIN")).toBe(true);
    expect(canViewMeetingsAgenda("DOSEN")).toBe(true);
    expect(canViewMeetingsAgenda("STUDENT")).toBe(true);
    expect(canAccessMeetingsWorkspace("STUDENT")).toBe(true);
    expect(
      canAccessAuthenticatedPath("STUDENT", "/meetings/calendar"),
    ).toBe(true);
    expect(canCreateMeetings("STUDENT")).toBe(false);

    expect(canViewMeetingsAgenda("ALUMNI")).toBe(false);
    expect(canAccessMeetingsWorkspace("ALUMNI")).toBe(false);
    expect(canAccessAuthenticatedPath("ALUMNI", "/meetings/calendar")).toBe(
      false,
    );
    expect(canCreateMeetings("ALUMNI")).toBe(false);
  });

  it("keeps next redirects only when the destination is authorized", () => {
    expect(
      authorizedLoginDestination(account("ADMIN"), "/meetings/calendar"),
    ).toBe("/meetings/calendar");
    expect(authorizedLoginDestination(account("DOSEN"), "/meetings/mine")).toBe(
      "/meetings/mine",
    );
    expect(authorizedLoginDestination(account("DOSEN"), "/dashboard")).toBe(
      "/meetings",
    );
    expect(authorizedLoginDestination(account("DOSEN"), "//external.test")).toBe(
      "/meetings",
    );
    expect(
      authorizedLoginDestination(account("DOSEN", true), "/meetings"),
    ).toBe("/change-password");
  });
});

describe("Schedule Portal access", () => {
  const scheduleAccess = [PERMISSIONS.SCHEDULE_PORTAL_ACCESS];

  it("is grant-only for every role", () => {
    expect(canAccessSchedulePortal("ADMIN")).toBe(false);
    expect(canAccessSchedulePortal("DOSEN")).toBe(false);
    expect(canAccessSchedulePortal("STUDENT")).toBe(false);
    expect(canAccessSchedulePortal("STUDENT", scheduleAccess)).toBe(true);
    expect(hasPermission("STUDENT", PERMISSIONS.SCHEDULE_PORTAL_ACCESS)).toBe(
      false,
    );
    expect(
      hasPermission("STUDENT", PERMISSIONS.SCHEDULE_PORTAL_ACCESS, scheduleAccess),
    ).toBe(true);
  });

  it("allows only granted users into schedule routes and the default destination", () => {
    expect(canAccessAuthenticatedPath("STUDENT", "/schedule")).toBe(false);
    expect(
      canAccessAuthenticatedPath("STUDENT", "/schedule/calendar", scheduleAccess),
    ).toBe(true);
    expect(defaultAuthenticatedDestination(account("STUDENT"))).toBe(
      "/meetings",
    );
    expect(
      authorizedLoginDestination(
        account("STUDENT", false, scheduleAccess),
        "/schedule/mine",
      ),
    ).toBe("/schedule/mine");
  });

  it("keeps shared agenda read-only until agenda.manage is granted", () => {
    expect(canViewMeetingsAgenda("STUDENT")).toBe(true);
    expect(canAccessMeetingsWorkspace("STUDENT")).toBe(true);
    expect(
      canAccessAuthenticatedPath("STUDENT", "/meetings/calendar"),
    ).toBe(true);
    expect(canCreateMeetings("STUDENT")).toBe(false);
    expect(
      canCreateMeetings("STUDENT", [PERMISSIONS.AGENDA_MANAGE]),
    ).toBe(true);
  });
});
