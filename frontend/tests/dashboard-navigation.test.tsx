import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Sidebar from "@/components/layout/sidebar";
import {
  dashboardNavigationGroups,
  isDashboardNavItemActive,
} from "@/components/layout/dashboard-navigation";

const state = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    <span role="img" aria-label={alt} />
  ),
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
    status: "authenticated",
  }),
}));

function meetingsHref() {
  const workspace = dashboardNavigationGroups.find(
    (group) => group.label === "Workspace",
  );
  return workspace?.items.find(([label]) => label === "Meetings")?.[1];
}

beforeEach(() => {
  state.pathname = "/dashboard";
});

describe("dashboard navigation", () => {
  it("links the sidebar Meetings item to the dashboard workspace", () => {
    expect(meetingsHref()).toBe("/dashboard/meetings");
  });

  it("matches Dashboard exactly and other items by prefix", () => {
    expect(isDashboardNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isDashboardNavItemActive("/dashboard/", "/dashboard")).toBe(true);
    expect(isDashboardNavItemActive("/dashboard/meetings", "/dashboard")).toBe(
      false,
    );

    expect(
      isDashboardNavItemActive("/dashboard/meetings", "/dashboard/meetings"),
    ).toBe(true);
    expect(
      isDashboardNavItemActive(
        "/dashboard/meetings/calendar",
        "/dashboard/meetings",
      ),
    ).toBe(true);
    expect(
      isDashboardNavItemActive("/dashboard/meetings", "/dashboard/meetings/new"),
    ).toBe(false);
  });

  it("highlights Meetings, not Dashboard, on a meetings sub-route", () => {
    state.pathname = "/dashboard/meetings/calendar";

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Meetings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("highlights only Dashboard on the dashboard root", () => {
    state.pathname = "/dashboard";

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Meetings" }),
    ).not.toHaveAttribute("aria-current");
  });
});
