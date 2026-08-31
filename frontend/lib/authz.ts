import type { AuthUser, UserRole } from "@/types/auth";
import type { Publication } from "@/types/modules";

export type AdminPermission =
  | "dashboard.read"
  | "publication.read"
  | "publication.create"
  | "publication.update"
  | "publication.delete";

const publicationPermissions: AdminPermission[] = [
  "publication.read",
  "publication.create",
  "publication.update",
  "publication.delete",
];

export function hasPermission(
  role: UserRole | undefined,
  permission: AdminPermission,
) {
  if (role === "ADMIN") return true;
  if (role === "PUBLICATION_EDITOR")
    return (
      permission === "dashboard.read" ||
      publicationPermissions.includes(permission)
    );
  return (
    role === "DOSEN" &&
    (permission === "dashboard.read" || permission === "publication.read")
  );
}

export function canManagePublication(
  user: AuthUser | null,
  publication: Publication,
) {
  return (
    user?.role === "ADMIN" ||
    (user?.role === "PUBLICATION_EDITOR" && publication.createdBy === user.id)
  );
}

export function canAccessDashboardPath(
  role: UserRole | undefined,
  pathname: string,
) {
  if (role !== "PUBLICATION_EDITOR") return true;
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/publications/") ||
    pathname === "/dashboard/publications"
  );
}
