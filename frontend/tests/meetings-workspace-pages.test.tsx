import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MeetingsNewPage from "@/app/meetings/new/page";
import MeetingsDetailPage from "@/app/meetings/[id]/page";
import MeetingsEditPage from "@/app/meetings/[id]/edit/page";
import DashboardMeetingDetailPage from "@/app/dashboard/meetings/[id]/page";
import DashboardNewMeetingPage from "@/app/dashboard/meetings/new/page";
import type { Meeting } from "@/types/meetings";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getMeeting: vi.fn(),
  getUserDirectory: vi.fn(),
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  checkMeetingConflicts: vi.fn(),
  uploadMeetingAttachment: vi.fn(),
  removeMeetingAttachment: vi.fn(),
  success: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings",
  useRouter: () => ({
    push: state.push,
    replace: state.replace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "dosen@example.com",
      role: "DOSEN",
      isActive: true,
    },
    status: "authenticated",
    isAuthenticated: true,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: state.success, error: state.notifyError }),
}));

vi.mock("@/lib/api/meetings", () => ({
  getMeetings: vi.fn().mockResolvedValue([]),
  getMeeting: state.getMeeting,
  getUserDirectory: state.getUserDirectory,
  createMeeting: state.createMeeting,
  updateMeeting: state.updateMeeting,
  deleteMeeting: state.deleteMeeting,
  checkMeetingConflicts: state.checkMeetingConflicts,
  uploadMeetingAttachment: state.uploadMeetingAttachment,
  removeMeetingAttachment: state.removeMeetingAttachment,
}));

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    _id: "m1",
    title: "Weekly sync",
    description: "Agenda",
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

const attachment = {
  id: "att-1",
  url: "https://res.cloudinary.com/test/agenda.pdf",
  filename: "agenda.pdf",
  mimeType: "application/pdf",
  size: 2048,
  uploadedAt: "2031-02-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  state.getUserDirectory.mockResolvedValue([]);
  state.checkMeetingConflicts.mockResolvedValue([]);
  state.getMeeting.mockResolvedValue(makeMeeting());
});

describe("workspace create meeting page", () => {
  it("keeps the calendar date query parameter when opening the workspace form", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Schedule meeting" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2031-03-04");
    expect(screen.getByRole("link", { name: "← Meetings" })).toHaveAttribute(
      "href",
      "/meetings",
    );
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/meetings",
    );
  });

  it("creates the meeting, uploads the attachment, and lands on the workspace detail route", async () => {
    state.createMeeting.mockResolvedValue({
      meeting: makeMeeting({ _id: "new-1" }),
      conflicts: [],
    });
    state.uploadMeetingAttachment.mockResolvedValue(
      makeMeeting({ _id: "new-1" }),
    );

    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Planning sync" },
    });
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });

    const file = new File(["%PDF-1.4"], "agenda.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("Add documents"), {
      target: { files: [file] },
    });
    expect(screen.getByText("agenda.pdf")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Schedule meeting" }),
    );

    await waitFor(() =>
      expect(state.createMeeting).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(state.uploadMeetingAttachment).toHaveBeenCalledWith(
        "new-1",
        file,
      ),
    );
    expect(state.push).toHaveBeenCalledWith("/meetings/new-1");
  });

  it("shows detected conflicts without blocking the save", async () => {
    state.checkMeetingConflicts.mockResolvedValue([
      {
        _id: "other",
        title: "Overlapping sync",
        startAt: "2031-03-04T09:30:00.000Z",
        endAt: "2031-03-04T10:30:00.000Z",
        participants: [],
      },
    ]);

    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });

    expect(
      await screen.findByText("Overlapping sync"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You can still save if this is intentional/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Schedule meeting" }),
    ).toBeEnabled();
  });
});

describe("workspace edit meeting page", () => {
  it("hydrates the form, participant selection, and attachments from the API", async () => {
    state.getUserDirectory.mockResolvedValue([
      { id: "user-2", email: "other@example.com", role: "DOSEN" },
    ]);
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        participantIds: ["user-2"],
        participants: [
          { id: "user-2", email: "other@example.com", role: "DOSEN" },
        ],
        attachments: [attachment],
      }),
    );

    render(
      await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }),
    );

    expect(
      await screen.findByRole("heading", { name: "Edit meeting" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Weekly sync");
    expect(
      screen.getByRole("checkbox", { name: /other@example.com/ }),
    ).toBeChecked();
    expect(screen.getByText("agenda.pdf")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "← Back to meeting" }),
    ).toHaveAttribute("href", "/meetings/m1");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/meetings/m1",
    );
  });

  it("updates the meeting with participant changes and routes back to the workspace detail", async () => {
    state.getUserDirectory.mockResolvedValue([
      { id: "user-2", email: "other@example.com", role: "DOSEN" },
    ]);
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        participantIds: ["user-2"],
        participants: [
          { id: "user-2", email: "other@example.com", role: "DOSEN" },
        ],
      }),
    );
    state.updateMeeting.mockResolvedValue({
      meeting: makeMeeting({ participantIds: [] }),
      conflicts: [],
    });

    render(
      await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }),
    );
    await screen.findByRole("heading", { name: "Edit meeting" });

    fireEvent.click(
      screen.getByRole("checkbox", { name: /other@example.com/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(state.updateMeeting).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({ participantIds: [] }),
      ),
    );
    expect(state.push).toHaveBeenCalledWith("/meetings/m1");
  });

  it("removes an existing attachment through the workspace form", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({ attachments: [attachment] }),
    );
    state.removeMeetingAttachment.mockResolvedValue(
      makeMeeting({ attachments: [] }),
    );

    render(
      await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }),
    );
    await screen.findByRole("heading", { name: "Edit meeting" });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(state.removeMeetingAttachment).toHaveBeenCalledWith(
        "m1",
        "att-1",
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText("agenda.pdf")).not.toBeInTheDocument(),
    );
  });
});

describe("workspace meeting detail page", () => {
  it("renders details, attachments, and workspace edit navigation", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({ attachments: [attachment] }),
    );

    render(
      await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }),
    );

    expect(
      await screen.findByRole("heading", { name: "Weekly sync" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Meetings" })).toHaveAttribute(
      "href",
      "/meetings",
    );
    expect(
      screen.getByRole("link", { name: "Edit meeting" }),
    ).toHaveAttribute("href", "/meetings/m1/edit");
    expect(
      screen.getByRole("link", { name: "agenda.pdf" }),
    ).toHaveAttribute("href", attachment.url);
  });

  it("deletes the meeting and returns to the workspace root", async () => {
    state.deleteMeeting.mockResolvedValue(undefined);

    render(
      await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }),
    );
    await screen.findByRole("heading", { name: "Weekly sync" });

    fireEvent.click(
      screen.getByRole("button", { name: "Delete meeting" }),
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(state.deleteMeeting).toHaveBeenCalledWith("m1"),
    );
    expect(state.push).toHaveBeenCalledWith("/meetings");
  });

  it("hides edit and delete actions when the viewer cannot modify the meeting", async () => {
    state.getMeeting.mockResolvedValue(makeMeeting({ canEdit: false }));

    render(
      await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }),
    );
    await screen.findByRole("heading", { name: "Weekly sync" });

    expect(
      screen.queryByRole("link", { name: "Edit meeting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete meeting" }),
    ).not.toBeInTheDocument();
  });

  it("surfaces read errors from the API", async () => {
    state.getMeeting.mockRejectedValue(new Error("network"));

    render(
      await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
  });
});

describe("legacy dashboard meeting routes", () => {
  it("keeps /dashboard/meetings/new on dashboard-relative navigation", async () => {
    render(
      await DashboardNewMeetingPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Schedule meeting" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveValue("2031-03-04");
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/dashboard/meetings",
    );
  });

  it("keeps /dashboard/meetings/[id] on dashboard-relative navigation", async () => {
    state.getMeeting.mockResolvedValue(makeMeeting());

    render(
      await DashboardMeetingDetailPage({
        params: Promise.resolve({ id: "m1" }),
      }),
    );

    await screen.findByRole("heading", { name: "Weekly sync" });
    expect(screen.getByRole("link", { name: "← Meetings" })).toHaveAttribute(
      "href",
      "/dashboard/meetings",
    );
    expect(
      screen.getByRole("link", { name: "Edit meeting" }),
    ).toHaveAttribute("href", "/dashboard/meetings/m1/edit");
  });
});
