import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MeetingsNewPage from "@/app/(internal)/meetings/new/page";
import MeetingsDetailPage from "@/app/(internal)/meetings/[id]/page";
import MeetingsEditPage from "@/app/(internal)/meetings/[id]/edit/page";
import DashboardMeetingDetailPage from "@/app/(internal)/dashboard/meetings/[id]/page";
import DashboardNewMeetingPage from "@/app/(internal)/dashboard/meetings/new/page";
import { ApiError } from "@/lib/api/errors";
import type { Meeting } from "@/types/meetings";

const state = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getMeeting: vi.fn(),
  getMeetingAudit: vi.fn(),
  getUserDirectory: vi.fn(),
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  cancelMeeting: vi.fn(),
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
  getMeetingCalendar: vi.fn().mockResolvedValue([]),
  getMeeting: state.getMeeting,
  getMeetingAudit: state.getMeetingAudit,
  getUserDirectory: state.getUserDirectory,
  createMeeting: state.createMeeting,
  updateMeeting: state.updateMeeting,
  deleteMeeting: state.deleteMeeting,
  cancelMeeting: state.cancelMeeting,
  checkMeetingConflicts: state.checkMeetingConflicts,
  uploadMeetingAttachment: state.uploadMeetingAttachment,
  removeMeetingAttachment: state.removeMeetingAttachment,
}));

function makeMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    _id: "m1",
    title: "Weekly sync",
    description: "Agenda",
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

function selectOption(label: string, option: string | RegExp) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  fireEvent.click(screen.getByRole("option", { name: option }));
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
  state.getUserDirectory.mockResolvedValue([
    { id: "user-2", email: "other@example.com", role: "DOSEN" },
    { id: "user-3", email: "third@example.com", role: "DOSEN" },
    { id: "user-4", email: "fourth@example.com", role: "ADMIN" },
    { id: "user-5", email: "alumni@example.com", role: "ALUMNI" },
  ]);
  state.checkMeetingConflicts.mockResolvedValue([]);
  state.getMeeting.mockResolvedValue(makeMeeting());
  state.getMeetingAudit.mockResolvedValue([]);
});

describe("workspace create meeting page", () => {
  it("excludes alumni from PIC and participant selectors", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );

    await screen.findByRole("heading", { name: "Schedule meeting" });
    expect(
      screen.queryByRole("option", { name: /alumni@example\.com/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", {
        name: "Additional PIC: alumni@example.com",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", {
        name: "Participant: alumni@example.com",
      }),
    ).not.toBeInTheDocument();
  });

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
    expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent(
      "Internal calendar",
    );
    selectOption("Primary PIC", /^other \(DOSEN\)$/);
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Additional PIC: third@example.com",
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Additional PIC: fourth@example.com",
      }),
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Planning sync" },
    });
    fireEvent.change(screen.getByLabelText("Client or organization"), {
      target: { value: "Planning Client" },
    });
    selectOption("Mode", "Offline");
    fireEvent.change(screen.getByLabelText("Physical location"), {
      target: { value: "Planning Room" },
    });
    fireEvent.change(screen.getByLabelText("Meeting Link (optional)"), {
      target: { value: "https://meet.google.com/planning-room" },
    });
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });
    selectOption("Visibility", "Private");

    const file = new File(["%PDF-1.4"], "agenda.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("Add documents"), {
      target: { files: [file] },
    });
    expect(screen.getByText("agenda.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    await waitFor(() => expect(state.createMeeting).toHaveBeenCalledTimes(1));
    expect(state.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        visibility: "PRIVATE",
        clientName: "Planning Client",
        mode: "OFFLINE",
        location: "Planning Room",
        meetingLink: "https://meet.google.com/planning-room",
        primaryPicId: "user-2",
        picIds: ["user-2", "user-3", "user-4"],
      }),
    );
    await waitFor(() =>
      expect(state.uploadMeetingAttachment).toHaveBeenCalledWith("new-1", file),
    );
    expect(state.push).toHaveBeenCalledWith("/meetings/new-1");
  });

  it("creates an online meeting with null location and a valid URL", async () => {
    state.createMeeting.mockResolvedValue({
      meeting: makeMeeting({ _id: "new-online" }),
      conflicts: [],
    });

    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });
    selectOption("Primary PIC", /^other \(DOSEN\)$/);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Online sync" },
    });
    fireEvent.change(screen.getByLabelText("Client or organization"), {
      target: { value: "Online Client" },
    });
    selectOption("Mode", "Online");
    fireEvent.change(screen.getByLabelText("Meeting Link"), {
      target: { value: "https://meet.google.com/online-sync" },
    });
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    await waitFor(() => expect(state.createMeeting).toHaveBeenCalledTimes(1));
    expect(state.createMeeting).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: "Online Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/online-sync",
      }),
    );
  });

  it("requires a client name before create", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Missing client" },
    });
    selectOption("Mode", "Offline");
    fireEvent.change(screen.getByLabelText("Physical location"), {
      target: { value: "Room" },
    });
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    expect(state.notifyError).toHaveBeenCalledWith(
      "Client or organization is required.",
    );
    expect(state.createMeeting).not.toHaveBeenCalled();
  });

  it("requires a location for offline meetings", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Offline without room" },
    });
    fireEvent.change(screen.getByLabelText("Client or organization"), {
      target: { value: "Client" },
    });
    selectOption("Mode", "Offline");
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    expect(state.notifyError).toHaveBeenCalledWith(
      "A physical location is required for offline meetings.",
    );
    expect(state.createMeeting).not.toHaveBeenCalled();
  });

  it("requires a URL for online meetings", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Online without URL" },
    });
    fireEvent.change(screen.getByLabelText("Client or organization"), {
      target: { value: "Client" },
    });
    selectOption("Mode", "Online");
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    expect(state.notifyError).toHaveBeenCalledWith(
      "A meeting link is required for online meetings.",
    );
    expect(state.createMeeting).not.toHaveBeenCalled();
  });

  it("rejects a non-HTTP meeting link", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Invalid URL" },
    });
    fireEvent.change(screen.getByLabelText("Client or organization"), {
      target: { value: "Client" },
    });
    selectOption("Mode", "Online");
    fireEvent.change(screen.getByLabelText("Meeting Link"), {
      target: { value: "ftp://example.com/meeting" },
    });
    fireEvent.change(screen.getByLabelText("Start time"), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText("End time"), {
      target: { value: "10:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Schedule meeting" }));

    expect(state.notifyError).toHaveBeenCalledWith(
      "Enter a valid HTTP(S) meeting link.",
    );
    expect(state.createMeeting).not.toHaveBeenCalled();
  });

  it("switches conditional fields immediately when mode changes", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    expect(
      screen.queryByLabelText("Physical location"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Meeting Link (optional)"),
    ).toBeInTheDocument();

    selectOption("Mode", "Offline");
    expect(screen.getByLabelText("Physical location")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Meeting Link (optional)"),
    ).toBeInTheDocument();

    selectOption("Mode", "Online");
    expect(
      screen.queryByLabelText("Physical location"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Meeting Link")).toBeInTheDocument();
  });

  it("does not render removed external participant controls", async () => {
    render(
      await MeetingsNewPage({
        searchParams: Promise.resolve({ date: "2031-03-04" }),
      }),
    );
    await screen.findByRole("heading", { name: "Schedule meeting" });

    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add external participant" }),
    ).not.toBeInTheDocument();
  });

  it("shows detected conflicts without blocking the save", async () => {
    state.checkMeetingConflicts.mockResolvedValue([
      {
        busy: false,
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
      await screen.findByText("Overlapping sync", {}, { timeout: 3000 }),
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
        isOrganizer: true,
        participantIds: ["user-2"],
        participants: [
          { id: "user-2", email: "other@example.com", role: "DOSEN" },
        ],
        attachments: [attachment],
      }),
    );

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));

    expect(
      await screen.findByRole("heading", { name: "Edit meeting" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Weekly sync");
    expect(screen.getByLabelText("Client or organization")).toHaveValue(
      "RAMS Test Client",
    );
    expect(screen.getByRole("combobox", { name: "Mode" })).toHaveTextContent(
      "Offline",
    );
    expect(screen.getByLabelText("Physical location")).toHaveValue(
      "RAMS Meeting Room",
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Participant: other@example.com",
      }),
    ).toBeChecked();
    expect(screen.getByText("agenda.pdf")).toBeInTheDocument();
    expect(screen.queryByText("Delegation")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Add internal delegate" }),
    ).not.toBeInTheDocument();
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

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Edit meeting" });

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Participant: other@example.com",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(state.updateMeeting).toHaveBeenCalledWith(
        "m1",
        expect.objectContaining({
          participantIds: [],
          expectedUpdatedAt: "2031-02-01T00:00:00.000Z",
        }),
      ),
    );
    expect(state.push).toHaveBeenCalledWith("/meetings/m1");
  });

  it("edits an existing offline meeting without losing conditional fields", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        title: "Offline meeting",
        clientName: "Offline Client",
        mode: "OFFLINE",
        location: "Offline Room",
        visibility: "PRIVATE",
        participantIds: ["user-2"],
      }),
    );
    state.updateMeeting.mockResolvedValue({
      meeting: makeMeeting({ title: "Offline meeting updated" }),
      conflicts: [],
    });

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Edit meeting" });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Offline meeting updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(state.updateMeeting).toHaveBeenCalledTimes(1));
    expect(state.updateMeeting).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({
        title: "Offline meeting updated",
        clientName: "Offline Client",
        mode: "OFFLINE",
        location: "Offline Room",
        meetingLink: null,
        visibility: "PRIVATE",
        participantIds: ["user-2"],
      }),
    );
  });

  it("edits an existing online meeting with null location", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        title: "Online meeting",
        clientName: "Online Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/existing-online",
      }),
    );
    state.updateMeeting.mockResolvedValue({
      meeting: makeMeeting({ title: "Online meeting updated" }),
      conflicts: [],
    });

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Edit meeting" });

    expect(
      screen.queryByLabelText("Physical location"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Meeting Link")).toHaveValue(
      "https://meet.google.com/existing-online",
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Online meeting updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(state.updateMeeting).toHaveBeenCalledTimes(1));
    expect(state.updateMeeting).toHaveBeenCalledWith(
      "m1",
      expect.objectContaining({
        title: "Online meeting updated",
        clientName: "Online Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/existing-online",
      }),
    );
  });

  it("preserves legacy meetings without inventing a mode", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        title: "Legacy meeting",
        clientName: null,
        mode: null,
        location: null,
        meetingLink: "https://meet.google.com/legacy-form",
        participantIds: ["user-2"],
      }),
    );
    state.updateMeeting.mockResolvedValue({
      meeting: makeMeeting({ title: "Legacy meeting updated" }),
      conflicts: [],
    });

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Edit meeting" });

    expect(screen.getByRole("combobox", { name: "Mode" })).toHaveTextContent(
      "Not specified (legacy)",
    );
    expect(screen.getByLabelText("Client or organization")).toHaveValue("");
    expect(
      screen.queryByLabelText("Physical location"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Meeting Link (optional)")).toHaveValue(
      "https://meet.google.com/legacy-form",
    );

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Legacy meeting updated" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(state.updateMeeting).toHaveBeenCalledTimes(1));
    const payload = state.updateMeeting.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(payload).toEqual(
      expect.objectContaining({
        title: "Legacy meeting updated",
        participantIds: ["user-2"],
      }),
    );
    expect(payload).not.toHaveProperty("mode");
    expect(payload).not.toHaveProperty("location");
    expect(payload).toHaveProperty(
      "meetingLink",
      "https://meet.google.com/legacy-form",
    );
    expect(payload).not.toHaveProperty("clientName");
  });

  it("requires conditional fields when a legacy meeting selects a mode", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        title: "Legacy mode selection",
        clientName: null,
        mode: null,
        location: null,
        meetingLink: "https://meet.google.com/legacy-mode",
      }),
    );

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Edit meeting" });

    selectOption("Mode", "Offline");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(state.notifyError).toHaveBeenCalledWith(
      "A physical location is required for offline meetings.",
    );
    expect(state.updateMeeting).not.toHaveBeenCalled();
  });

  it("removes an existing attachment through the workspace form", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({ attachments: [attachment] }),
    );
    state.removeMeetingAttachment.mockResolvedValue(
      makeMeeting({ attachments: [] }),
    );

    render(await MeetingsEditPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Edit meeting" });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() =>
      expect(state.removeMeetingAttachment).toHaveBeenCalledWith("m1", "att-1"),
    );
    await waitFor(() =>
      expect(screen.queryByText("agenda.pdf")).not.toBeInTheDocument(),
    );
  });
});

describe("workspace meeting detail page", () => {
  it("renders details, attachments, and workspace edit navigation", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        attachments: [attachment],
        participants: [
          {
            id: "user-2",
            displayName: "Internal colleague",
            email: "colleague@example.com",
            role: "DOSEN",
          },
        ],
        participantIds: ["user-2"],
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));

    expect(
      await screen.findByRole("heading", { name: "Weekly sync" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Meetings" })).toHaveAttribute(
      "href",
      "/meetings",
    );
    expect(screen.getByRole("link", { name: "Edit meeting" })).toHaveAttribute(
      "href",
      "/meetings/m1/edit",
    );
    expect(screen.getByRole("link", { name: "agenda.pdf" })).toHaveAttribute(
      "href",
      attachment.url,
    );
    expect(screen.getByText("Internal colleague")).toBeInTheDocument();
    expect(screen.queryByText("External participants")).not.toBeInTheDocument();
  });

  it("highlights the authorized detail title and shows the involvement badge", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({ involvesHighlightedUser: true }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));

    const heading = await screen.findByRole("heading", { name: "Weekly sync" });
    expect(heading).toHaveClass("text-[var(--rams-red)]");
    expect(screen.getByText("Involves Pak Dhimas")).toBeInTheDocument();
  });

  it("renders an offline meeting with client, mode, location, visibility, and no online link", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        mode: "OFFLINE",
        clientName: "Offline Client",
        location: "Meeting Room A",
        meetingLink: "https://meet.google.com/must-not-render",
        visibility: "INTERNAL",
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));

    expect(
      await screen.findByRole("heading", { name: "Weekly sync" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Offline Client")).toBeInTheDocument();
    expect(screen.getByLabelText("Offline meeting")).toBeInTheDocument();
    expect(screen.getByText("Meeting Room A")).toBeInTheDocument();
    expect(screen.getByText("Internal")).toBeInTheDocument();
    expect(screen.getByText("Meeting link")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /meet\.google\.com\/must-not-render/ }),
    ).toHaveAttribute("href", "https://meet.google.com/must-not-render");
    expect(
      screen.queryByRole("link", { name: "Join meeting" }),
    ).not.toBeInTheDocument();
  });

  it("renders an online meeting with a safe join link and no physical location", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        mode: "ONLINE",
        clientName: "Remote Client",
        location: "Ignored physical room",
        meetingLink: "https://meet.google.com/online-room",
        visibility: "PRIVATE",
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));

    await screen.findByRole("heading", { name: "Weekly sync" });
    expect(screen.getByLabelText("Online meeting")).toBeInTheDocument();
    expect(screen.getByText("Remote Client")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.queryByText("Physical location")).not.toBeInTheDocument();
    expect(screen.queryByText("Ignored physical room")).not.toBeInTheDocument();

    const joinLink = screen.getByRole("link", { name: "Join meeting" });
    expect(joinLink).toHaveAttribute(
      "href",
      "https://meet.google.com/online-room",
    );
    expect(joinLink).toHaveAttribute("target", "_blank");
    expect(joinLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(
      screen.getByRole("link", { name: /meet\.google\.com\/online-room/ }),
    ).toHaveAttribute("href", "https://meet.google.com/online-room");
  });

  it("renders a legacy meeting without inferring a mode from the meeting link", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        mode: null,
        clientName: null,
        location: null,
        meetingLink: "https://meet.google.com/legacy-link",
        visibility: "PRIVATE",
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));

    await screen.findByRole("heading", { name: "Weekly sync" });
    expect(
      screen.getByLabelText("Meeting mode not specified"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Online meeting")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Offline meeting")).not.toBeInTheDocument();
    expect(screen.getAllByText("Not specified").length).toBeGreaterThan(1);
    expect(
      screen.queryByRole("link", { name: "Join meeting" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /meet\.google\.com\/legacy-link/ }),
    ).toHaveAttribute("href", "https://meet.google.com/legacy-link");
  });

  it("labels client, mode, location, and meeting link changes in audit history", async () => {
    state.getMeeting.mockResolvedValue(makeMeeting());
    state.getMeetingAudit.mockResolvedValue([
      {
        id: "audit-fields",
        actorId: "user-1",
        actor: {
          id: "user-1",
          displayName: "Meeting organizer",
          email: "dosen@example.com",
          role: "DOSEN",
        },
        action: "UPDATE",
        changes: {
          clientName: { oldValue: null, newValue: "Audit Client" },
          mode: { oldValue: "OFFLINE", newValue: "ONLINE" },
          location: { oldValue: "Audit Room", newValue: null },
          meetingLink: {
            oldValue: null,
            newValue: "https://meet.google.com/audit-link",
          },
        },
        timestamp: "2031-02-01T00:00:00.000Z",
      },
    ]);

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    const auditSection = screen
      .getByText("Audit history")
      .closest("section") as HTMLElement;
    const audit = within(auditSection);
    expect(await audit.findByText("Client / organization")).toBeInTheDocument();
    expect(audit.getByText("Meeting mode")).toBeInTheDocument();
    expect(audit.getByText("Physical location")).toBeInTheDocument();
    expect(audit.getByText("Meeting link")).toBeInTheDocument();

    const clientRow = audit
      .getByText("Client / organization")
      .closest("li") as HTMLElement;
    expect(clientRow).toHaveTextContent("Not specified");
    expect(clientRow).toHaveTextContent("Audit Client");

    const modeRow = audit
      .getByText("Meeting mode")
      .closest("li") as HTMLElement;
    expect(modeRow).toHaveTextContent("Offline");
    expect(modeRow).toHaveTextContent("Online");

    const locationRow = audit
      .getByText("Physical location")
      .closest("li") as HTMLElement;
    expect(locationRow).toHaveTextContent("Audit Room");
    expect(locationRow).toHaveTextContent("Not specified");

    const linkRow = audit
      .getByText("Meeting link")
      .closest("li") as HTMLElement;
    expect(linkRow).toHaveTextContent("https://meet.google.com/audit-link");
    expect(linkRow).toHaveTextContent("Not specified");
  });

  it("renders old audit entries that do not include the new meeting fields", async () => {
    state.getMeeting.mockResolvedValue(makeMeeting());
    state.getMeetingAudit.mockResolvedValue([
      {
        id: "audit-legacy",
        actorId: "user-1",
        actor: {
          id: "user-1",
          displayName: "Meeting organizer",
          email: "dosen@example.com",
          role: "DOSEN",
        },
        action: "UPDATE",
        changes: {
          title: { oldValue: null, newValue: "Weekly sync" },
        },
        timestamp: "2031-02-01T00:00:00.000Z",
      },
    ]);

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    const auditSection = screen
      .getByText("Audit history")
      .closest("section") as HTMLElement;
    const audit = within(auditSection);
    expect(await audit.findByText("Title")).toBeInTheDocument();
    expect(
      audit.getByText("Title").closest("li") as HTMLElement,
    ).toHaveTextContent("Weekly sync");
    expect(audit.queryByText("Client / organization")).not.toBeInTheDocument();
    expect(audit.queryByText("Meeting mode")).not.toBeInTheDocument();
    expect(audit.queryByText("Physical location")).not.toBeInTheDocument();
  });

  it("refreshes the meeting when cancellation reports that it already ended", async () => {
    const now = Date.now();
    state.getMeeting
      .mockResolvedValueOnce(
        makeMeeting({
          canEdit: true,
          startAt: new Date(now + 60 * 60 * 1000).toISOString(),
          endAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
        }),
      )
      .mockResolvedValueOnce(
        makeMeeting({
          canEdit: true,
          startAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
          endAt: new Date(now - 60 * 60 * 1000).toISOString(),
        }),
      );
    state.cancelMeeting.mockRejectedValue(
      new ApiError("Meeting has already ended and cannot be cancelled.", 409, {
        code: "MEETING_ALREADY_ENDED",
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    fireEvent.click(screen.getByRole("button", { name: "Cancel meeting" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );

    await waitFor(() =>
      expect(state.notifyError).toHaveBeenCalledWith(
        "Meeting has already ended and cannot be cancelled.",
      ),
    );
    await waitFor(() => expect(state.getMeeting).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Cancel meeting" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("renders real audit history and allows the organizer to cancel explicitly", async () => {
    state.getMeeting.mockResolvedValue(
      makeMeeting({ status: "UPCOMING", canEdit: true }),
    );
    state.getMeetingAudit.mockResolvedValue([
      {
        id: "audit-1",
        actorId: "user-1",
        actor: {
          id: "user-1",
          displayName: "Meeting organizer",
          email: "dosen@example.com",
          role: "DOSEN",
        },
        action: "CREATE",
        changes: {
          title: { oldValue: null, newValue: "Weekly sync" },
        },
        timestamp: "2031-02-01T00:00:00.000Z",
      },
    ]);
    state.cancelMeeting.mockResolvedValue(
      makeMeeting({
        status: "CANCELLED",
        cancelledAt: "2031-02-02T00:00:00.000Z",
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    expect(screen.getByText("Audit history")).toBeInTheDocument();
    expect(screen.getByText("Meeting created")).toBeInTheDocument();
    expect(screen.getByText(/Meeting organizer/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel meeting" }));
    expect(
      screen.getByRole("dialog", { name: "Cancel this meeting?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );

    await waitFor(() =>
      expect(state.cancelMeeting).toHaveBeenCalledWith("m1", ""),
    );
    expect(state.success).toHaveBeenCalledWith("Meeting cancelled.");
  });

  it.each([
    {
      label: "UPCOMING",
      status: "UPCOMING" as const,
      startOffset: 60 * 60 * 1000,
      endOffset: 2 * 60 * 60 * 1000,
    },
    {
      label: "ONGOING",
      status: "ONGOING" as const,
      startOffset: -60 * 60 * 1000,
      endOffset: 60 * 60 * 1000,
    },
    {
      label: "PAST",
      status: "UPCOMING" as const,
      startOffset: -2 * 60 * 60 * 1000,
      endOffset: -60 * 60 * 1000,
    },
    {
      label: "CANCELLED",
      status: "CANCELLED" as const,
      startOffset: 60 * 60 * 1000,
      endOffset: 2 * 60 * 60 * 1000,
      cancelledAt: "2031-02-02T00:00:00.000Z",
    },
  ])("shows cancellation only for $label meetings", async (testCase) => {
    const now = Date.now();
    state.getMeeting.mockResolvedValue(
      makeMeeting({
        status: testCase.status,
        startAt: new Date(now + testCase.startOffset).toISOString(),
        endAt: new Date(now + testCase.endOffset).toISOString(),
        cancelledAt: testCase.cancelledAt ?? null,
      }),
    );

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    const cancelButton = screen.queryByRole("button", {
      name: "Cancel meeting",
    });
    if (testCase.label === "UPCOMING" || testCase.label === "ONGOING") {
      expect(cancelButton).toBeInTheDocument();
    } else {
      expect(cancelButton).not.toBeInTheDocument();
    }
  });

  it("does not render removed delegation or guest management controls", async () => {
    state.getMeeting.mockResolvedValue(makeMeeting({ isOrganizer: true }));

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    expect(screen.queryByText("Delegation")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Add internal delegate" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Guest invitations")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create guest invitation" }),
    ).not.toBeInTheDocument();
  });

  it("deletes the meeting and returns to the workspace root", async () => {
    state.deleteMeeting.mockResolvedValue(undefined);

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
    await screen.findByRole("heading", { name: "Weekly sync" });

    fireEvent.click(screen.getByRole("button", { name: "Delete meeting" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(state.deleteMeeting).toHaveBeenCalledWith("m1"));
    expect(state.push).toHaveBeenCalledWith("/meetings");
  });

  it("hides edit and delete actions when the viewer cannot modify the meeting", async () => {
    state.getMeeting.mockResolvedValue(makeMeeting({ canEdit: false }));

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));
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

    render(await MeetingsDetailPage({ params: Promise.resolve({ id: "m1" }) }));

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
    expect(screen.getByRole("link", { name: "Edit meeting" })).toHaveAttribute(
      "href",
      "/dashboard/meetings/m1/edit",
    );
  });
});
