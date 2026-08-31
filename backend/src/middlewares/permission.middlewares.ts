import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../modules/users/user.types.js";

export const PERMISSIONS = {
  PUBLICATION_READ: "publication.read",
  PUBLICATION_CREATE: "publication.create",
  PUBLICATION_UPDATE: "publication.update",
  PUBLICATION_DELETE: "publication.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PUBLICATION_PERMISSIONS: readonly Permission[] =
  Object.values(PERMISSIONS);

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: ALL_PUBLICATION_PERMISSIONS,
  PUBLICATION_EDITOR: ALL_PUBLICATION_PERMISSIONS,
  ALUMNI: [],
  DOSEN: [PERMISSIONS.PUBLICATION_READ],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
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
        hasPermission(req.user!.role, permission),
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
