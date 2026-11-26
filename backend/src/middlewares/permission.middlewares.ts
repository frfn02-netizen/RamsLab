import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../modules/users/user.types.js";

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

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  ALUMNI: [],
  DOSEN: [
    PERMISSIONS.MEETINGS_ACCESS,
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.MEETINGS_MANAGE_OWN,
    PERMISSIONS.MEETINGS_DIRECTORY_READ,
  ],
};

export function hasPermission(
  role: UserRole,
  permission: Permission,
  grantedPermissions: readonly string[] = [],
) {
  return (
    grantedPermissions.includes(permission) ||
    ROLE_PERMISSIONS[role]?.includes(permission) === true
  );
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      !permissions.some((permission) =>
        hasPermission(req.user!.role, permission, req.user!.permissions ?? []),
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    return next();
  };
}
