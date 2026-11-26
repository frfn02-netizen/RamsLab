import { canAccessMeetingsWorkspace, canViewMeetingsAgenda } from "@/lib/authz";
import type { UserRole } from "@/types/auth";

export { canAccessMeetingsWorkspace, canViewMeetingsAgenda };

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
    description: "Meetings you created",
  },
];

export function visibleMeetingsNavItems(
  role: UserRole | undefined,
): readonly MeetingsNavItem[] {
  if (!canAccessMeetingsWorkspace(role)) {
    return [];
  }

  const canViewAgenda = canViewMeetingsAgenda(role);
  const canViewMine = role === "ADMIN" || role === "DOSEN";

  return meetingsNavItems.filter((item) => {
    if (item.href === "/meetings/mine") return canViewMine;
    if (item.href === "/meetings" || item.href === "/meetings/calendar") {
      return canViewAgenda;
    }
    return true;
  });
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isMeetingsNavItemActive(pathname: string, href: string) {
  const current = normalizePath(pathname);
  if (href === "/meetings") {
    if (current === "/meetings") return true;
    if (!current.startsWith("/meetings/")) return false;
    const section = current.split("/")[2];
    return section !== "calendar" && section !== "mine";
  }
  return current === href || current.startsWith(`${href}/`);
}

export function meetingsPageTitle(pathname: string) {
  const current = normalizePath(pathname);
  const item = meetingsNavItems.find((candidate) =>
    isMeetingsNavItemActive(current, candidate.href),
  );
  if (item) return item.label;
  if (current === "/meetings/new") return "Schedule meeting";
  if (/^\/meetings\/[^/]+\/edit$/.test(current)) return "Edit meeting";
  if (/^\/meetings\/[^/]+$/.test(current)) return "Meeting details";
  return "Meetings workspace";
}

export function meetingsPageDescription(pathname: string) {
  const current = normalizePath(pathname);
  const item = meetingsNavItems.find((candidate) =>
    isMeetingsNavItemActive(current, candidate.href),
  );
  if (item) return item.description;
  if (current === "/meetings/new") {
    return "Set the agenda, invite registered accounts, and attach documents.";
  }
  if (/^\/meetings\/[^/]+\/edit$/.test(current)) {
    return "Update the schedule, participants, or supporting documents.";
  }
  if (/^\/meetings\/[^/]+$/.test(current)) {
    return "Agenda, participants, and supporting documents.";
  }
  return "";
}
