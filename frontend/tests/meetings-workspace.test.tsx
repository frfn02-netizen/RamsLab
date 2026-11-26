import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MeetingsCalendarPage from "@/app/(internal)/meetings/calendar/page";
import MeetingsMinePage from "@/app/(internal)/meetings/mine/page";
import DashboardMeetingsPage from "@/app/(internal)/dashboard/meetings/page";
import MeetingsOverview from "@/components/meetings-workspace/overview";
import MyMeetings from "@/components/meetings-workspace/my-meetings";
import MeetingsWorkspaceGuard from "@/components/meetings-workspace/workspace-guard";
import MeetingsWorkspaceShell from "@/components/meetings-workspace/workspace-shell";
import { meetingGreeting } from "@/lib/meetings/greeting";
import type { Meeting, MeetingCalendarEvent } from "@/types/meetings";

const state = vi.hoisted(() => ({
  pathname: "/meetings",
  status: "authenticated" as "loading" | "authenticated" | "unauthenticated",
  user: {
    id: "user-1",
    email: "dosen@example.com",
    role: "DOSEN",
    isActive: true,
  } as {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    fullName?: string;
    mustChangePassword?: boolean;
    permissions?: string[];
  } | null,
  replace: vi.fn(),
  getMeetings: vi.fn(),
  getMeetingAgenda: vi.fn(),
  getMeetingCalendar: vi.fn(),
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
  getMeetingAgenda: state.getMeetingAgenda,
  getMeetingCalendar: state.getMeetingCalendar,
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
    clientName: "RAMS Test Client",
    mode: "OFFLINE",
    location: "RAMS Meeting Room",
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
    fullName: "Budi Santoso",
  };
  state.getMeetings.mockResolvedValue([]);
  state.getMeetingAgenda.mockResolvedValue({
    items: [],
    pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
  });
  state.getMeetingCalendar.mockResolvedValue([]);
});

function makeCalendarEvent(
  overrides: Partial<MeetingCalendarEvent> = {},
): MeetingCalendarEvent {
  return {
    _id: "calendar-1",
    title: "Internal schedule",
    startAt: "2031-03-01T09:00:00.000Z",
    endAt: "2031-03-01T10:00:00.000Z",
    createdBy: {
      id: "user-2",
      displayName: "Other lecturer",
      role: "DOSEN",
    },
    canViewDetails: false,
    ...overrides,
  };
}

describe("meetings workspace shell", () => {
  it("renders the workspace identity and primary navigation without an admin exit for dosen", () => {
    render(
      <MeetingsWorkspaceShell>
        <div>Workspace content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(screen.getByText("RAMS")).toBeInTheDocument();
    expect(screen.getByText("Meetings")).toBeInTheDocument();
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
    expect(screen.getAllByText("dosen@example.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DOSEN").length).toBeGreaterThan(0);

    const hrefs = navLinks().map((anchor) => anchor.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/meetings",
        "/meetings/calendar",
        "/meetings/mine",
      ]),
    );
    expect(hrefs).not.toContain("/dashboard");
    expect(hrefs).not.toContain("/dashboard/meetings");
  });

  it("shows the shared agenda and My Meetings to lecturers", () => {
    state.user = {
      id: "user-1",
      email: "dosen@example.com",
      role: "DOSEN",
      isActive: true,
      };

    render(
      <MeetingsWorkspaceShell>
        <div>Workspace content</div>
      </MeetingsWorkspaceShell>,
    );

    const hrefs = navLinks().map((anchor) => anchor.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/meetings",
        "/meetings/calendar",
        "/meetings/mine",
      ]),
    );
  });

  it("shows the dashboard exit only for administrators", () => {
    state.user = {
      id: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
      isActive: true,
    };

    render(
      <MeetingsWorkspaceShell>
        <div>Workspace content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(navLinks().map((anchor) => anchor.getAttribute("href"))).toContain(
      "/dashboard",
    );
  });

  it("marks the active navigation item for the current route", () => {
    state.pathname = "/meetings/calendar";

    render(
      <MeetingsWorkspaceShell>
        <div>Calendar content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(screen.getByRole("link", { name: /^Calendar/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
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

  it("treats create, detail, and edit routes as part of the overview section", () => {
    for (const pathname of [
      "/meetings/new",
      "/meetings/m1",
      "/meetings/m1/edit",
    ]) {
      state.pathname = pathname;
      const view = render(
        <MeetingsWorkspaceShell>
          <div>Content</div>
        </MeetingsWorkspaceShell>,
      );

      expect(screen.getByRole("link", { name: /^Overview/ })).toHaveAttribute(
        "aria-current",
        "page",
      );
      view.unmount();
    }
  });

  it("links the workspace identity back to the overview", () => {
    render(
      <MeetingsWorkspaceShell>
        <div>Content</div>
      </MeetingsWorkspaceShell>,
    );

    expect(
      screen.getByRole("link", { name: "Meetings workspace home" }),
    ).toHaveAttribute("href", "/meetings");
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
    expect(
      within(dialog).getByRole("button", {
        name: "Close meetings navigation",
      }),
    ).toHaveFocus();

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
      expect(state.replace).toHaveBeenCalledWith("/dashboard/alumni/profile"),
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("denies alumni access to the meetings workspace", async () => {
    state.user = {
      id: "alumni-1",
      email: "alumni@example.com",
      role: "ALUMNI",
      isActive: true,
      };
    state.pathname = "/meetings/calendar";

    render(
      <MeetingsWorkspaceGuard>
        <div>Agenda</div>
      </MeetingsWorkspaceGuard>,
    );

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith("/dashboard/alumni/profile"),
    );
    expect(screen.queryByText("Agenda")).not.toBeInTheDocument();
  });

  it("sends accounts that must change their password to the password screen", async () => {
    state.user = {
      id: "user-1",
      email: "dosen@example.com",
      role: "DOSEN",
      isActive: true,
      fullName: "Budi Santoso",
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
  it("greets the authenticated lecturer using the local time and full name", async () => {
    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: meetingGreeting("Budi Santoso"),
        }),
      ).toBeInTheDocument(),
    );
  });

  it("highlights the next upcoming meeting and lists later ones", async () => {
    state.getMeetingAgenda.mockResolvedValue({
      items: [
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
      ],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });

    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(screen.getByText("Weekly sync")).toBeInTheDocument(),
    );

    expect(state.getMeetings).not.toHaveBeenCalled();
    const featured = screen
      .getByRole("link", { name: "Open meeting" })
      .closest("article");
    expect(featured).not.toBeNull();
    expect(
      within(featured as HTMLElement).getByText("Weekly sync"),
    ).toBeInTheDocument();
    expect(
      within(featured as HTMLElement).queryByText("Kickoff"),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Design review")).toBeInTheDocument();
    expect(screen.queryByText("Kickoff")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open meeting" })).toHaveAttribute(
      "href",
      "/meetings/next",
    );
  });

  it("renders a clear empty state when nothing is scheduled", async () => {
    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(screen.getByText("No upcoming meetings")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Open calendar" })).toHaveAttribute(
      "href",
      "/meetings/calendar",
    );
    expect(screen.getByRole("link", { name: "My Meetings" })).toHaveAttribute(
      "href",
      "/meetings/mine",
    );
  });

  it("shows an error state when the meetings API fails", async () => {
    state.getMeetingAgenda.mockRejectedValue(new Error("network"));

    render(<MeetingsOverview />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong",
      ),
    );
  });
});

describe("my meetings", () => {
  it("lists only meetings created by the signed-in user", async () => {
    state.user = {
      id: "user-1",
      email: "dosen@example.com",
      role: "ADMIN",
      isActive: true,
    };
    state.getMeetings.mockResolvedValue([
      makeMeeting({ _id: "owned", title: "Weekly sync" }),
      makeMeeting({
        _id: "owned-and-participant",
        title: "Design review created by me",
        startAt: "2031-03-02T09:00:00.000Z",
        endAt: "2031-03-02T10:00:00.000Z",
        participantIds: ["user-1", "user-2"],
      }),
      makeMeeting({
        _id: "participant-only",
        title: "Design review owned by someone else",
        startAt: "2031-03-03T09:00:00.000Z",
        endAt: "2031-03-03T10:00:00.000Z",
        createdBy: { id: "user-2", email: "other@example.com", role: "DOSEN" },
        participantIds: ["user-1"],
      }),
      makeMeeting({
        _id: "unrelated",
        title: "Unrelated planning",
        startAt: "2031-03-04T09:00:00.000Z",
        endAt: "2031-03-04T10:00:00.000Z",
        createdBy: { id: "user-2", email: "other@example.com", role: "DOSEN" },
      }),
    ]);

    render(<MyMeetings />);

    await waitFor(() =>
      expect(screen.getByText("Weekly sync")).toBeInTheDocument(),
    );
    expect(screen.getByText("Design review created by me")).toBeInTheDocument();
    expect(
      screen.queryByText("Design review owned by someone else"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Unrelated planning")).not.toBeInTheDocument();
    expect(screen.queryByText("Participant")).not.toBeInTheDocument();
  });

  it("highlights meetings that involve the configured user", async () => {
    state.getMeetings.mockResolvedValue([
      makeMeeting({
        _id: "highlighted",
        title: "Highlighted ownership sync",
        involvesHighlightedUser: true,
      }),
    ]);

    render(<MyMeetings />);

    const title = await screen.findByText("Highlighted ownership sync");
    expect(title).toHaveClass("text-[var(--rams-red)]");
    expect(screen.getByText("Involves Pak Dhimas")).toBeInTheDocument();
  });

  it("uses a creator-only empty state when the user has participant access only", async () => {
    state.getMeetings.mockResolvedValue([
      makeMeeting({
        title: "Participant-only meeting",
        createdBy: { id: "user-2", email: "other@example.com", role: "DOSEN" },
        participantIds: ["user-1"],
      }),
    ]);

    render(<MyMeetings />);

    expect(await screen.findByText("No meetings yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "When you create a meeting, it will appear here with its agenda and attachments.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Participant-only meeting"),
    ).not.toBeInTheDocument();
  });

  it("separates past meetings from the upcoming agenda", async () => {
    state.getMeetings.mockResolvedValue([
      makeMeeting({
        _id: "old",
        title: "Old sync",
        startAt: "2020-01-10T09:00:00.000Z",
        endAt: "2020-01-10T10:00:00.000Z",
      }),
    ]);

    render(<MyMeetings />);

    await waitFor(() =>
      expect(screen.getByText("Old sync")).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "Past" })).toBeInTheDocument();
    expect(screen.getByText(/No upcoming meetings/)).toBeInTheDocument();
  });

  it("shows client, mode, and physical location on offline meeting cards", async () => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    state.getMeetingAgenda.mockResolvedValue({
      items: [
        makeCalendarEvent({
          _id: "offline-card",
          title: "Offline card",
          canViewDetails: true,
          status: "UPCOMING",
          clientName: "Card Client",
          mode: "OFFLINE",
          location: "Room 4",
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      ],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });

    render(<MeetingsCalendarPage />);

    expect(await screen.findByText("Offline card")).toBeInTheDocument();
    expect(state.getMeetings).not.toHaveBeenCalled();
    expect(screen.getByText("Card Client")).toBeInTheDocument();
    expect(screen.getByText("Room 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Offline meeting")).toBeInTheDocument();
    expect(screen.getAllByText("Upcoming").length).toBeGreaterThan(0);
  });

  it("distinguishes offline and online calendar events and hides private Busy details", async () => {
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    const at = (hour: number) => {
      const value = new Date(base);
      value.setHours(hour, 0, 0, 0);
      return value.toISOString();
    };

    state.getMeetingAgenda.mockResolvedValue({
      items: [
        makeCalendarEvent({
          _id: "offline-1",
          title: "Offline sync",
          canViewDetails: true,
          status: "UPCOMING",
          clientName: "Offline Client",
          mode: "OFFLINE",
          location: "Room 4",
          startAt: at(9),
          endAt: at(10),
        }),
        makeCalendarEvent({
          _id: "online-1",
          title: "Online sync",
          canViewDetails: true,
          status: "UPCOMING",
          clientName: "Online Client",
          mode: "ONLINE",
          location: null,
          startAt: at(10),
          endAt: at(11),
        }),
        makeCalendarEvent({
          _id: "busy-1",
          title: "Busy",
          createdBy: null,
          canViewDetails: false,
          startAt: at(11),
          endAt: at(12),
        }),
      ],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });

    render(<MeetingsCalendarPage />);

    expect(await screen.findByText("Offline sync")).toBeInTheDocument();
    expect(state.getMeetings).not.toHaveBeenCalled();
    expect(screen.getByText("Offline Client")).toBeInTheDocument();
    expect(screen.getByText("Room 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Offline meeting")).toBeInTheDocument();
    expect(screen.getByText("Online Client")).toBeInTheDocument();
    expect(screen.getByLabelText("Online meeting")).toBeInTheDocument();
    expect(screen.getAllByText("Upcoming").length).toBeGreaterThan(0);

    const busyItem = screen.getByText("Busy").closest("li") as HTMLElement;
    expect(busyItem).not.toBeNull();
    expect(
      within(busyItem).queryByText("Private planning"),
    ).not.toBeInTheDocument();
    expect(
      within(busyItem).queryByText("Secret Client"),
    ).not.toBeInTheDocument();
    expect(
      within(busyItem).queryByLabelText(
        /Online meeting|Offline meeting|Meeting mode not specified/,
      ),
    ).not.toBeInTheDocument();
    expect(within(busyItem).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Secret Client")).not.toBeInTheDocument();
  });

  it("highlights authorized calendar events involving the configured user", async () => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    state.getMeetingAgenda.mockResolvedValue({
      items: [
        makeCalendarEvent({
          _id: "highlighted-calendar",
          title: "Highlighted calendar sync",
          canViewDetails: true,
          involvesHighlightedUser: true,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      ],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });

    render(<MeetingsCalendarPage />);

    const title = await screen.findByText("Highlighted calendar sync");
    expect(title).toHaveClass("text-[var(--rams-red)]");
    expect(screen.getByText("Involves Pak Dhimas")).toBeInTheDocument();
  });

  it("renders legacy calendar events with a neutral mode state", async () => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    state.getMeetingAgenda.mockResolvedValue({
      items: [
        makeCalendarEvent({
          _id: "legacy-1",
          title: "Legacy sync",
          canViewDetails: true,
          mode: null,
          clientName: null,
          location: null,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      ],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });

    render(<MeetingsCalendarPage />);

    expect(await screen.findByText("Legacy sync")).toBeInTheDocument();
    expect(state.getMeetings).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Meeting mode not specified"),
    ).toBeInTheDocument();
    expect(screen.getByText("Client not specified")).toBeInTheDocument();
    expect(screen.queryByLabelText("Online meeting")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Offline meeting")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /join/i }),
    ).not.toBeInTheDocument();
  });

  it("marks an authorized agenda event with missing mode as unavailable, not legacy", async () => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    state.getMeetingAgenda.mockResolvedValue({
      items: [
        makeCalendarEvent({
          _id: "missing-mode-1",
          title: "Missing mode sync",
          canViewDetails: true,
          status: "UPCOMING",
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      ],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });

    render(<MeetingsCalendarPage />);

    expect(await screen.findByText("Missing mode sync")).toBeInTheDocument();
    expect(state.getMeetings).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Meeting mode unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Meeting mode not specified"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Client not specified")).not.toBeInTheDocument();
  });

  it("shows a calendar error state when the agenda request fails", async () => {
    state.getMeetingAgenda.mockRejectedValue(new Error("network"));

    render(<MeetingsCalendarPage />);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Something went wrong",
      ),
    );
    expect(state.getMeetings).not.toHaveBeenCalled();
  });

  it("serves My Meetings at /meetings/mine", async () => {
    render(<MeetingsMinePage />);
    expect(await screen.findByText("No meetings yet")).toBeInTheDocument();
  });

  it("keeps the dashboard meetings route wired to the existing page", async () => {
    render(<DashboardMeetingsPage />);

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

});
