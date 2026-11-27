import type { AuthUser, UserRole } from "@/types/auth";

/**
 * Keep authorization decisions named and centralized. Persisted grants are
 * additive to role defaults.
 */
export const PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  MEETINGS_ACCESS: "meetings.access",
  MEETINGS_READ: "meetings.read",
  MEETINGS_CREATE: "meetings.create",
  MEETINGS_MANAGE_OWN: "meetings.manage-own",
  MEETINGS_DIRECTORY_READ: "meetings.directory.read",
  PUBLICATION_READ: "publication.read",
  PUBLICATION_CREATE: "publication.create",
  PUBLICATION_UPDATE: "publication.update",
  PUBLICATION_DELETE: "publication.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type AdminPermission = Permission;

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  DOSEN: [
    PERMISSIONS.MEETINGS_ACCESS,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.MEETINGS_MANAGE_OWN,
    PERMISSIONS.MEETINGS_DIRECTORY_READ,
  ],
  ALUMNI: [],
};

export function hasPermission(
  role: UserRole | undefined,
  permission: Permission,
  grantedPermissions: readonly string[] = [],
) {
  if (!role) return false;
  if (grantedPermissions.includes(permission)) return true;
  return ROLE_PERMISSIONS[role]?.includes(permission) === true;
}

function isInternalRole(role: UserRole | undefined) {
  return role === "ADMIN" || role === "DOSEN";
}

export function canViewMeetingsAgenda(role: UserRole | undefined) {
  return isInternalRole(role);
}

export function canAccessMeetingsWorkspace(role: UserRole | undefined) {
  return isInternalRole(role);
}

export function canManageOwnMeetings(role: UserRole | undefined) {
  return role === "ADMIN" || role === "DOSEN";
}

export function canCreateMeetings(role: UserRole | undefined) {
  return role === "ADMIN" || role === "DOSEN";
}

function normalizePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function hasPathPrefix(pathname: string, prefix: string) {
  const path = normalizePath(pathname);
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isSafeInternalPath(pathname: string) {
  return (
    pathname.startsWith("/") &&
    !pathname.startsWith("//") &&
    !pathname.includes("\\")
  );
}

export function canAccessDashboardPath(
  role: UserRole | undefined,
  pathname: string,
  grantedPermissions: readonly string[] = [],
) {
  if (
    role === "ADMIN" &&
    hasPermission(role, PERMISSIONS.DASHBOARD_READ, grantedPermissions)
  ) {
    return hasPathPrefix(pathname, "/dashboard");
  }

  // Meetings moved under the dashboard, but remain available to lecturers.
  // Without this allowance the /meetings -> /dashboard/meetings redirect and
  // DashboardGuard's fallback would bounce DOSEN users in a loop.
  if (role === "DOSEN") {
    return hasPathPrefix(pathname, "/dashboard/meetings");
  }

  // The alumni self-portal is a separate, existing flow. Keep its supported
  // profile route available without granting alumni the staff dashboard.
  return (
    role === "ALUMNI" && hasPathPrefix(pathname, "/dashboard/alumni/profile")
  );
}

export function canAccessAuthenticatedPath(
  role: UserRole | undefined,
  pathname: string,
  grantedPermissions: readonly string[] = [],
) {
  if (canAccessDashboardPath(role, pathname, grantedPermissions)) return true;
  if (hasPathPrefix(pathname, "/meetings")) {
    return canAccessMeetingsWorkspace(role);
  }
  return role === "ALUMNI" && hasPathPrefix(pathname, "/profile");
}

export function defaultAuthenticatedDestination(account: AuthUser) {
  if (account.mustChangePassword) return "/change-password";
  if (account.role === "ADMIN") return "/dashboard";
  if (account.role === "DOSEN") return "/meetings";
  return "/dashboard/alumni/profile";
}

export function authorizedLoginDestination(
  account: AuthUser,
  next: string | null | undefined,
) {
  const fallback = defaultAuthenticatedDestination(account);
  if (
    account.mustChangePassword ||
    !next ||
    !isSafeInternalPath(next) ||
    !canAccessAuthenticatedPath(
      account.role,
      next,
      account.permissions ?? [],
    )
  ) {
    return fallback;
  }
  return next;
}

export function canManagePublication(user: AuthUser | null) {
  return user?.role === "ADMIN";
}
