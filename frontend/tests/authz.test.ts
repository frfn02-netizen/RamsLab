import { describe, expect, it } from "vitest";

import {
  authorizedLoginDestination,
  canAccessAuthenticatedPath,
  canAccessDashboardPath,
  canAccessMeetingsWorkspace,
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

  it("limits DOSEN to Meetings paths and Meetings permissions", () => {
    expect(canAccessMeetingsWorkspace("DOSEN")).toBe(true);
    expect(canAccessAuthenticatedPath("DOSEN", "/meetings/mine")).toBe(true);
    expect(canAccessDashboardPath("DOSEN", "/dashboard")).toBe(false);
    expect(canAccessAuthenticatedPath("DOSEN", "/dashboard/dosen")).toBe(false);
    expect(defaultAuthenticatedDestination(account("DOSEN"))).toBe("/meetings");
    expect(hasPermission("DOSEN", PERMISSIONS.MEETINGS_ACCESS)).toBe(true);
    expect(hasPermission("DOSEN", PERMISSIONS.MEETINGS_CREATE)).toBe(true);
    expect(hasPermission("DOSEN", PERMISSIONS.DASHBOARD_READ)).toBe(false);
    expect(hasPermission("DOSEN", PERMISSIONS.PUBLICATION_READ)).toBe(false);
  });

  it("keeps alumni on the existing profile portal without Meetings access", () => {
    expect(canAccessAuthenticatedPath("ALUMNI", "/profile")).toBe(true);
    expect(canAccessDashboardPath("ALUMNI", "/dashboard/alumni/profile")).toBe(
      true,
    );
    expect(canAccessMeetingsWorkspace("ALUMNI")).toBe(false);
    expect(canAccessAuthenticatedPath("ALUMNI", "/meetings")).toBe(false);
    expect(defaultAuthenticatedDestination(account("ALUMNI"))).toBe(
      "/dashboard/alumni/profile",
    );
  });

  it("restricts the Meetings workspace to ADMIN and DOSEN", () => {
    expect(canViewMeetingsAgenda("ADMIN")).toBe(true);
    expect(canViewMeetingsAgenda("DOSEN")).toBe(true);
    expect(canAccessMeetingsWorkspace("ADMIN")).toBe(true);
    expect(canAccessMeetingsWorkspace("DOSEN")).toBe(true);
    expect(canCreateMeetings("ADMIN")).toBe(true);
    expect(canCreateMeetings("DOSEN")).toBe(true);

    expect(canViewMeetingsAgenda("ALUMNI")).toBe(false);
    expect(canAccessMeetingsWorkspace("ALUMNI")).toBe(false);
    expect(canAccessAuthenticatedPath("ALUMNI", "/meetings/calendar")).toBe(
      false,
    );
    expect(canCreateMeetings("ALUMNI")).toBe(false);
  });

  it("allows only authorized meeting destinations after login", () => {
    expect(
      authorizedLoginDestination(account("ADMIN"), "/meetings/calendar"),
    ).toBe("/meetings/calendar");
    expect(authorizedLoginDestination(account("DOSEN"), "/meetings/mine")).toBe(
      "/meetings/mine",
    );
    expect(authorizedLoginDestination(account("DOSEN"), "/dashboard")).toBe(
      "/meetings",
    );
    expect(
      authorizedLoginDestination(account("DOSEN"), "//external.test"),
    ).toBe("/meetings");
    expect(
      authorizedLoginDestination(account("DOSEN", true), "/meetings"),
    ).toBe("/change-password");
  });
});
