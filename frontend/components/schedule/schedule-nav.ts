export type ScheduleNavItem = {
  label: string;
  href: string;
  description: string;
  requiresAccess: boolean;
};

export const scheduleNavItems: readonly ScheduleNavItem[] = [
  {
    label: "Dashboard",
    href: "/schedule",
    description: "Public activities and upcoming sessions",
    requiresAccess: false,
  },
  {
    label: "Calendar",
    href: "/schedule/calendar",
    description: "Month view of public schedules",
    requiresAccess: false,
  },
  {
    label: "My Schedules",
    href: "/schedule/mine",
    description: "Schedules you created or joined",
    requiresAccess: true,
  },
  {
    label: "Create",
    href: "/schedule/new",
    description: "Create an official meeting",
    requiresAccess: true,
  },
];

function normalizePath(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

export function isScheduleNavItemActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  if (href === "/schedule") return current === href;
  return current === href || current.startsWith(`${href}/`);
}

export function visibleScheduleNavItems(canManage: boolean) {
  return scheduleNavItems.filter(
    (item) => !item.requiresAccess || canManage,
  );
}
