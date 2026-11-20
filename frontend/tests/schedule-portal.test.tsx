import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ScheduleGuard from "@/components/schedule/schedule-guard";
import ScheduleShell from "@/components/schedule/schedule-shell";
import ScheduleDashboardPage from "@/app/schedule/page";
import ScheduleCalendarPage from "@/app/schedule/calendar/page";
import ScheduleMinePage from "@/app/schedule/mine/page";
import ScheduleNewPage from "@/app/schedule/new/page";
import ScheduleDetailPage from "@/app/schedule/[id]/page";
import ScheduleEditPage from "@/app/schedule/[id]/edit/page";

const state = vi.hoisted(() => ({
  pathname: "/schedule",
  replace: vi.fn(),
  logout: vi.fn(),
  status: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  user: {
    id: "student-1",
    email: "student@example.com",
    fullName: "Schedule Student",
    role: "STUDENT" as const,
    isActive: true,
    permissions: ["schedule.portal.access"],
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({
    replace: state.replace,
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: state.user,
    status: state.status,
    isAuthenticated: state.status === "authenticated",
    logout: state.logout,
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/schedule/public-schedule-overview", () => ({
  default: () => <div data-testid="public-overview" />,
}));

vi.mock("@/components/dashboard/meetings/meetings-page", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="calendar">
      {String(props.basePath)}|{String(props.source)}|
      {String(props.canCreateOverride)}
    </div>
  ),
}));

vi.mock("@/components/meetings-workspace/my-meetings", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="mine">
      {String(props.basePath)}|{String(props.scope)}|
      {String(props.canCreateOverride)}
    </div>
  ),
}));

vi.mock("@/components/dashboard/meetings/meeting-form", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="form">{String(props.basePath)}|{String(props.id)}</div>
  ),
}));

vi.mock("@/components/schedule/public-schedule-detail", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="public-detail">{String(props.id)}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.pathname = "/schedule";
  state.status = "authenticated";
  state.user = {
    id: "student-1",
    email: "student@example.com",
    fullName: "Schedule Student",
    role: "STUDENT",
    isActive: true,
    permissions: ["schedule.portal.access"],
  };
});

describe("Schedule Portal guard", () => {
  it("redirects unauthenticated visitors to login with the next route", async () => {
    state.status = "unauthenticated";
    state.user = null as never;
    state.pathname = "/schedule/mine";

    render(
      <ScheduleGuard>
        <div>Protected schedule</div>
      </ScheduleGuard>,
    );

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        "/login?next=%2Fschedule%2Fmine",
      ),
    );
    expect(screen.queryByText("Protected schedule")).not.toBeInTheDocument();
  });

  it("shows an access-required state for authenticated users without the grant", () => {
    state.user.permissions = [];

    render(
      <ScheduleGuard>
        <div>Protected schedule</div>
      </ScheduleGuard>,
    );

    expect(
      screen.getByRole("heading", { name: "Schedule access is required" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Protected schedule")).not.toBeInTheDocument();
  });

  it("renders the portal for students with explicit access", () => {
    render(
      <ScheduleGuard>
        <div>Protected schedule</div>
      </ScheduleGuard>,
    );

    expect(screen.getByText("Protected schedule")).toBeInTheDocument();
  });
});

describe("Schedule Portal shell", () => {
  it("renders separate schedule navigation", () => {
    render(
      <ScheduleShell>
        <div>Portal content</div>
      </ScheduleShell>,
    );

    const nav = screen.getByRole("navigation", {
      name: "Schedule portal navigation",
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/schedule",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/schedule/calendar",
    );
    expect(screen.getByRole("link", { name: "My Schedules" })).toHaveAttribute(
      "href",
      "/schedule/mine",
    );
    expect(screen.getByRole("link", { name: "Create" })).toHaveAttribute(
      "href",
      "/schedule/new",
    );
  });

  it("hides management navigation from public visitors", () => {
    state.status = "unauthenticated";
    state.user = null as never;

    render(
      <ScheduleShell>
        <div>Public content</div>
      </ScheduleShell>,
    );

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "My Schedules" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Sign in" }).length,
    ).toBeGreaterThan(0);
  });
});

describe("Schedule Portal pages", () => {
  it("wires the dashboard, calendar, and mine pages to the correct sources", async () => {
    render(<ScheduleDashboardPage />);
    expect(screen.getByTestId("public-overview")).toBeInTheDocument();
    cleanup();

    render(<ScheduleCalendarPage />);
    expect(screen.getByTestId("calendar")).toHaveTextContent(
      "/schedule|public|false",
    );
    cleanup();

    render(<ScheduleMinePage />);
    expect(screen.getByTestId("mine")).toHaveTextContent(
      "/schedule|accessibles|true",
    );
  });

  it("keeps create, detail, and edit routes inside the schedule portal", async () => {
    render(
      await ScheduleNewPage({ searchParams: Promise.resolve({}) }),
    );
    expect(screen.getByTestId("form")).toHaveTextContent("/schedule|undefined");
    cleanup();

    render(
      await ScheduleDetailPage({ params: Promise.resolve({ id: "schedule-1" }) }),
    );
    expect(screen.getByTestId("public-detail")).toHaveTextContent(
      "schedule-1",
    );
    cleanup();

    render(
      await ScheduleEditPage({ params: Promise.resolve({ id: "schedule-1" }) }),
    );
    expect(screen.getByTestId("form")).toHaveTextContent(
      "/schedule|schedule-1",
    );
  });
});
