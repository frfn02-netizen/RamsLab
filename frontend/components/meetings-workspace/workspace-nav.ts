import type { UserRole } from "@/types/auth";

export type MeetingsNavItem = {
  label: string;
  href: string;
  description: string;
};

export const meetingsNavItems: readonly MeetingsNavItem[] = [
  {
    label: "Overview",
    href: "/meetings",
    description: "Workspace home and upcoming agenda",
  },
  {
    label: "Calendar",
    href: "/meetings/calendar",
    description: "Month view of scheduled meetings",
  },
  {
    label: "My Meetings",
    href: "/meetings/mine",
    description: "Meetings you organize or attend",
  },
];

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isMeetingsNavItemActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  if (href === "/meetings") return current === "/meetings";
  return current === href || current.startsWith(`${href}/`);
}

export function meetingsPageTitle(pathname: string) {
  const current = normalizePath(pathname);
  const item = meetingsNavItems.find((candidate) =>
    isMeetingsNavItemActive(current, candidate.href),
  );
  return item?.label ?? "Meetings workspace";
}

export function canAccessMeetingsWorkspace(role: UserRole | undefined) {
  return role === "ADMIN" || role === "DOSEN";
}
