import { hasPermission } from "@/lib/authz";
import type { UserRole } from "@/types/auth";

export type DashboardNavItem = readonly [string, string, string];

export type DashboardNavGroup = {
  label: string;
  items: readonly DashboardNavItem[];
};

export const dashboardNavigationGroups: readonly DashboardNavGroup[] = [
  { label: "Overview", items: [["Dashboard", "/dashboard", "dashboard"]] },
  {
    label: "Content",
    items: [
      ["Homepage", "/dashboard/content/homepage", "homepage"],
      ["About", "/dashboard/content/about", "about"],
      ["Contact", "/dashboard/content/contact", "contact"],
      ["Footer", "/dashboard/content/footer", "footer"],
    ],
  },
  {
    label: "Research & Work",
    items: [
      ["Research Areas", "/dashboard/research", "research"],
      ["Research Highlights", "/dashboard/research-highlights", "highlights"],
      ["Publications", "/dashboard/publications", "publications"],
      ["Events", "/dashboard/events", "events"],
      ["Videos", "/dashboard/videos", "videos"],
    ],
  },
  {
    label: "People",
    items: [
      ["Lecturers", "/dashboard/dosen", "lecturers"],
      ["Experts", "/dashboard/experts", "experts"],
      ["Students", "/dashboard/students", "students"],
      ["Alumni", "/dashboard/alumni", "alumni"],
    ],
  },
  {
    label: "Ecosystem",
    items: [
      ["Public Service", "/dashboard/public-service", "public-service"],
      ["Partners", "/dashboard/partners", "partners"],
    ],
  },
  {
    label: "System",
    items: [["Tracking", "/dashboard/tracking", "tracking"]],
  },
];

export function isDashboardNavItemVisible(
  role: UserRole | undefined,
  href: string,
): boolean {
  if (href === "/dashboard") return hasPermission(role, "dashboard.read");
  if (href === "/dashboard/publications")
    return hasPermission(role, "publication.read");
  if (href === "/dashboard/research-highlights") return role === "ADMIN";
  return role === "ADMIN" || role === "DOSEN";
}

export function visibleDashboardNavigation(
  role: UserRole | undefined,
): DashboardNavGroup[] {
  return dashboardNavigationGroups
    .map((group) => ({
      label: group.label,
      items: group.items.filter(([, href]) =>
        isDashboardNavItemVisible(role, href),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function visibleDashboardNavigationItems(role: UserRole | undefined): {
  label: string;
  href: string;
}[] {
  return visibleDashboardNavigation(role).flatMap((group) =>
    group.items.map(([label, href]) => ({ label, href })),
  );
}
