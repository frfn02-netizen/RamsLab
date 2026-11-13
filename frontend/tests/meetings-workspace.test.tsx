import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MeetingsWorkspaceLayout from "@/app/meetings/layout";
import MeetingsWorkspacePage from "@/app/meetings/page";
import MeetingsCalendarPage from "@/app/meetings/calendar/page";
import MeetingsMinePage from "@/app/meetings/mine/page";
import DashboardMeetingsPage from "@/app/dashboard/meetings/page";
import MeetingsOverview from "@/components/meetings-workspace/overview";
import MyMeetings from "@/components/meetings-workspace/my-meetings";
import MeetingsWorkspaceGuard from "@/components/meetings-workspace/workspace-guard";
import MeetingsWorkspaceShell from "@/components/meetings-workspace/workspace-shell";
import type { Meeting } from "@/types/meetings";

const state = vi.hoisted(() => ({
  pathname: "/meetings",
  status: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  user: {
    id: "user-1",
    email: "dosen@example.com",
    role: "DOSEN",
    isActive: true,
  } as
    | {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        mustChangePassword?: boolean;
      }
    | null,
  replace: vi.fn(),
  getMeetings: vi.fn(),
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

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <span data-testid="next-image" data-src={src} data-alt={alt} />
  ),
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: state.user,
    status: state.status,
    isAuthenticated: state.status === "authenticated",
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/api/meetings", () => ({
  getMeetings: state.getMeetings,
  getMeeting: vi.fn(),
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  checkMeetingConflicts: vi.fn(),
  uploadMeetingAttachment: vi.fn(),
  removeMeetingAttachment: vi.fn(),
  getUserDirectory: vi.fn(),
}));

function makeMeeting(overrides: Partial<Meeting>): Meeting {
  return {
    _id: "meeting-1",
    title: "Weekly sync",
    description: "",
    startAt: "2031-03-01T09:00:00.000Z",
    endAt: "2031-03-01T10:00:00.000Z",
    createdBy: { id: "user-1", email: "dosen@example.com", role: "DOSEN" },
    participants: [],
    participantIds: [],
    meetingLink: null,
    attachments: [],
    createdAt: "2031-02-01T00:00:00.000Z",
    updatedAt: "2031-02-01T00:00:00.000Z",
    canEdit: true,
    ...overrides,
  };
}

function navLinks() {
  return screen
    .getAllByRole("navigation", { name: "Meetings workspace navigation" })
    .flatMap((nav) => Array.from(nav.querySelectorAll("a")));
}

beforeEach(() => {
  vi.clearAllMocks();
  state.pathname = "/meetings";
  state.status = "authenticated";
  state.user = {
    id: "user-1",
    email: "dosen@example.com",
    role: "DOSEN",
    isActive: true,
  };
  state.getMeetings.mockResolvedValue([]);
});

describe("meetings workspace shell", () => {
  it("renders the workspace identity, primary navigation, and dashboard exit", () => {
    render(
      <MeetingsWorkspaceShell>
        <div>Workspace content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(screen.getByText("RAMS")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
    expect(screen.getByText("dosen@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("DOSEN").length).toBeGreaterThan(0);

    const hrefs = navLinks().map((anchor) => anchor.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/meetings",
        "/meetings/calendar",
        "/meetings/mine",
        "/dashboard",
      ]),
    );
    expect(hrefs).not.toContain("/dashboard/meetings");
  });

  it("marks the active navigation item for the current route", () => {
    state.pathname = "/meetings/calendar";

    render(
      <MeetingsWorkspaceShell>
        <div>Calendar content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(
      screen.getByRole("link", { name: /^Calendar/ }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^Overview/ })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getAllByText("Calendar").length).toBeGreaterThan(0);
  });

  it("keeps the overview active only on the workspace root", () => {
    state.pathname = "/meetings/mine";

    render(
      <MeetingsWorkspaceShell>
        <div>Mine</div>
      </MeetingsWorkspaceShell>,
    );

    expect(screen.getByRole("link", { name: /^My Meetings/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /^Overview/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("opens and closes the responsive navigation drawer", () => {
    render(
      <MeetingsWorkspaceShell>
        <div>Content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Open meetings navigation" }),
    );

    const dialog = screen.getByRole("dialog", {
      name: "Meetings workspace navigation",
    });
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /^Overview/ }),
    ).toHaveAttribute("href", "/meetings");

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Close meetings navigation",
      }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the drawer after navigating", () => {
    render(
      <MeetingsWorkspaceShell>
        <div>Content</div>
      </MeetingsWorkspaceShell>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open meetings navigation" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Meetings workspace navigation",
    });

    fireEvent.click(within(dialog).getByRole("link", { name: /^Calendar/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("meetings workspace guard", () => {
  it("redirects unauthenticated visitors to login with the next route", async () => {
    state.status = "unauthenticated";
    state.user = null;
    state.pathname = "/meetings/mine";

    render(
      <MeetingsWorkspaceGuard>
        <div>Protected</div>
      </MeetingsWorkspaceGuard>,
    );

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        "/login?next=%2Fmeetings%2Fmine",
      ),
    );
    expect(
      screen.getByRole("status", { name: "Checking your session" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("keeps alumni and other roles out of the workspace", async () => {
    state.user = {
      id: "alumni-1",
      email: "alumni@example.com",
      role: "ALUMNI",
      isActive: true,
    };

    render(
      <MeetingsWorkspaceGuard>
        <div>Protected</div>
      </MeetingsWorkspaceGuard>,
    );

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/dashboard"),
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("sends accounts that must change their password to the password screen", async () => {
    state.user = {
      id: "user-1",
      email: "dosen@example.com",
      role: "DOSEN",
      isActive: true,
      mustChangePassword: true,
    };

    render(
      <MeetingsWorkspaceGuard>
        <div>Protected</div>
      </MeetingsWorkspaceGuard>,
    );

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/change-password"),
    );
  });

  it("admits staff roles and renders the workspace", () => {
    render(
      <MeetingsWorkspaceGuard>
        <div>Protected</div>
      </MeetingsWorkspaceGuard>,
    );

    expect(screen.getByText("Protected")).toBeInTheDocument();
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("admits administrators", () => {
    state.user = {
      id: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
      isActive: true,
    };

    render(
      <MeetingsWorkspaceGuard>
        <div>Protected</div>
      </MeetingsWorkspaceGuard>,
    );

    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});

describe("meetings workspace overview", () => {
  it("highlights the next upcoming meeting and lists later ones", async () => {
    state.getMeetings.mockResolvedValue([
      makeMeeting({
        _id: "past",
        title: "Kickoff",
        startAt: "2020-01-10T09:00:00.000Z",
        endAt: "2020-01-10T10:00:00.000Z",
      }),
      makeMeeting({
        _id: "later",
        title: "Design review",
        startAt: "2031-03-05T09:00:00.000Z",
        endAt: "2031-03-05T10:00:00.000Z",
      }),
      makeMeeting({ _id: "next", title: "Weekly sync" }),
    ]);

    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(screen.getByText("Weekly sync")).toBeInTheDocument(),
    );

    const nextSection = screen
      .getByRole("heading", { name: "Next meeting" })
      .closest("section");
    expect(nextSection).not.toBeNull();
    expect(within(nextSection as HTMLElement).getByText("Weekly sync")).toBeInTheDocument();
    expect(
      within(nextSection as HTMLElement).queryByText("Kickoff"),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Design review")).toBeInTheDocument();
    expect(screen.queryByText("Kickoff")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open meeting" }),
    ).toHaveAttribute("href", "/dashboard/meetings/next");
  });

  it("renders a clear empty state when nothing is scheduled", async () => {
    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(screen.getByText("No upcoming meetings")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("link", { name: "Open calendar" }),
    ).toHaveAttribute("href", "/meetings/calendar");
    expect(
      screen.getByRole("link", { name: "My Meetings" }),
    ).toHaveAttribute("href", "/meetings/mine");
  });

  it("shows an error state when the meetings API fails", async () => {
    state.getMeetings.mockRejectedValue(new Error("network"));

    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong",
      ),
    );
  });
});

describe("my meetings", () => {
  it("lists only meetings the signed-in user organizes or attends", async () => {
    state.user = {
      id: "user-1",
      email: "dosen@example.com",
      role: "ADMIN",
      isActive: true,
    };
    state.getMeetings.mockResolvedValue([
      makeMeeting({ _id: "owned", title: "Weekly sync" }),
      makeMeeting({
        _id: "joined",
        title: "Design review",
        startAt: "2031-03-02T09:00:00.000Z",
        endAt: "2031-03-02T10:00:00.000Z",
        createdBy: { id: "user-2", email: "other@example.com", role: "DOSEN" },
        participantIds: ["user-1"],
      }),
      makeMeeting({
        _id: "unrelated",
        title: "Unrelated planning",
        startAt: "2031-03-03T09:00:00.000Z",
        endAt: "2031-03-03T10:00:00.000Z",
        createdBy: { id: "user-2", email: "other@example.com", role: "DOSEN" },
      }),
    ]);

    render(<MyMeetings />);

    await waitFor(() =>
      expect(screen.getByText("Weekly sync")).toBeInTheDocument(),
    );
    expect(screen.getByText("Design review")).toBeInTheDocument();
    expect(screen.queryByText("Unrelated planning")).not.toBeInTheDocument();
    expect(screen.getByText("Organizer")).toBeInTheDocument();
    expect(screen.getByText("Participant")).toBeInTheDocument();
  });

  it("separates past meetings from the upcoming agenda", async () => {
    state.getMeetings.mockResolvedValue([
      makeMeeting({ _id: "old", title: "Old sync", startAt: "2020-01-10T09:00:00.000Z", endAt: "2020-01-10T10:00:00.000Z" }),
    ]);

    render(<MyMeetings />);

    await waitFor(() =>
      expect(screen.getByText("Old sync")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "Past" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No upcoming meetings/)).toBeInTheDocument();
  });
});

describe("workspace routes", () => {
  it("renders the workspace layout with shell and content", async () => {
    render(
      <MeetingsWorkspaceLayout>
        <div>Layout content</div>
      </MeetingsWorkspaceLayout>,
    );

    expect(screen.getByText("Layout content")).toBeInTheDocument();
    expect(screen.getByText("RAMS")).toBeInTheDocument();
  });

  it("serves the overview at the workspace root", async () => {
    render(<MeetingsWorkspacePage />);
    expect(
      await screen.findByText("No upcoming meetings"),
    ).toBeInTheDocument();
  });

  it("serves the existing calendar implementation at /meetings/calendar", async () => {
    render(<MeetingsCalendarPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Meetings" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("link", { name: "Schedule meeting" }),
    ).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/dashboard\/meetings\/new/),
    );
  });

  it("serves My Meetings at /meetings/mine", async () => {
    render(<MeetingsMinePage />);
    expect(
      await screen.findByText("No meetings yet"),
    ).toBeInTheDocument();
  });

  it("keeps the dashboard meetings route wired to the existing page", async () => {
    render(<DashboardMeetingsPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Meetings" }),
      ).toBeInTheDocument(),
    );
  });
});
