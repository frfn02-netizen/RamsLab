import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicScheduleDetail from "@/components/schedule/public-schedule-detail";
import { ApiError } from "@/lib/api/errors";
import type { Meeting } from "@/types/meetings";
import type { PublicScheduleMeeting } from "@/types/public-schedule";

const state = vi.hoisted(() => ({
  status: "unauthenticated" as "loading" | "authenticated" | "unauthenticated",
  user: null as null | {
    id: string;
    email: string;
    role: "STUDENT";
    isActive: boolean;
    permissions: string[];
  },
  getPublicScheduleMeeting: vi.fn(),
  getMeeting: vi.fn(),
  cancelMeeting: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: state.push }),
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: state.user,
    status: state.status,
  }),
}));

vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: state.success, error: state.notifyError }),
}));

vi.mock("@/lib/api/public-schedule", () => ({
  getPublicScheduleMeeting: state.getPublicScheduleMeeting,
}));

vi.mock("@/lib/api/meetings", () => ({
  getMeeting: state.getMeeting,
  cancelMeeting: state.cancelMeeting,
}));

function publicMeeting(
  overrides: Partial<PublicScheduleMeeting> = {},
): PublicScheduleMeeting {
  return {
    id: "meeting-1",
    title: "Public research seminar",
    clientName: "RAMS Laboratory",
    startAt: "2032-04-01T09:00:00.000Z",
    endAt: "2032-04-01T10:00:00.000Z",
    mode: "ONLINE",
    location: null,
    status: "UPCOMING",
    meetingLink: "https://meet.google.com/public-secret",
    ...overrides,
  };
}

function internalMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    _id: "meeting-1",
    title: "Public research seminar",
    description: "Internal agenda",
    clientName: "RAMS Laboratory",
    mode: "ONLINE",
    location: null,
    startAt: "2032-04-01T09:00:00.000Z",
    endAt: "2032-04-01T10:00:00.000Z",
    createdBy: { id: "user-1", email: "student@example.com", role: "STUDENT" },
    participants: [],
    participantIds: [],
    meetingLink: "https://meet.google.com/secure-link",
    attachments: [],
    createdAt: "2032-03-01T00:00:00.000Z",
    updatedAt: "2032-03-01T00:00:00.000Z",
    canEdit: true,
    canCancel: true,
    canDelete: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.status = "unauthenticated";
  state.user = null;
  state.getPublicScheduleMeeting.mockResolvedValue(publicMeeting());
  state.getMeeting.mockResolvedValue(internalMeeting());
});

describe("Public schedule detail meeting link", () => {
  it("shows the public meeting link to unauthenticated visitors", async () => {
    render(<PublicScheduleDetail id="meeting-1" />);

    expect(
      await screen.findByRole("heading", { name: "Public research seminar" }),
    ).toBeInTheDocument();
    expect(state.getMeeting).not.toHaveBeenCalled();
    const link = screen.getByRole("link", { name: "Join Google Meet" });
    expect(link).toHaveAttribute(
      "href",
      "https://meet.google.com/public-secret",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.queryByRole("link", { name: "Open Meeting Link" }),
    ).not.toBeInTheDocument();
  });

  it("shows a secure Join Google Meet link for authorized ONLINE users", async () => {
    state.status = "authenticated";
    state.user = {
      id: "user-1",
      email: "student@example.com",
      role: "STUDENT",
      isActive: true,
      permissions: ["schedule.portal.access"],
    };

    render(<PublicScheduleDetail id="meeting-1" />);

    const link = await screen.findByRole("link", { name: "Join Google Meet" });
    expect(link).toHaveAttribute(
      "href",
      "https://meet.google.com/public-secret",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.queryByRole("link", { name: "Open Meeting Link" }),
    ).not.toBeInTheDocument();
  });

  it("labels an authorized OFFLINE link as Open Meeting Link", async () => {
    state.status = "authenticated";
    state.user = {
      id: "user-1",
      email: "student@example.com",
      role: "STUDENT",
      isActive: true,
      permissions: ["schedule.portal.access"],
    };
    state.getPublicScheduleMeeting.mockResolvedValue(
      publicMeeting({ mode: "OFFLINE", location: "RAMS Room" }),
    );
    state.getMeeting.mockResolvedValue(
      internalMeeting({ mode: "OFFLINE", location: "RAMS Room" }),
    );

    render(<PublicScheduleDetail id="meeting-1" />);

    const link = await screen.findByRole("link", {
      name: "Open Meeting Link",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://meet.google.com/public-secret",
    );
    expect(
      screen.queryByRole("link", { name: "Join Google Meet" }),
    ).not.toBeInTheDocument();
  });

  it("uses Open Meeting Link for legacy mode without inventing a mode", async () => {
    state.status = "authenticated";
    state.user = {
      id: "user-1",
      email: "student@example.com",
      role: "STUDENT",
      isActive: true,
      permissions: ["schedule.portal.access"],
    };
    state.getPublicScheduleMeeting.mockResolvedValue(
      publicMeeting({ mode: null }),
    );
    state.getMeeting.mockResolvedValue(internalMeeting({ mode: null }));

    render(<PublicScheduleDetail id="meeting-1" />);

    const link = await screen.findByRole("link", {
      name: "Open Meeting Link",
    });
    expect(link).toHaveAttribute(
      "href",
      "https://meet.google.com/public-secret",
    );
    await waitFor(() => expect(state.getMeeting).toHaveBeenCalledWith("meeting-1"));
  });
});


describe("Public schedule cancellation guard", () => {
  const authUser = {
    id: "user-1",
    email: "student@example.com",
    role: "STUDENT" as const,
    isActive: true,
    permissions: ["schedule.portal.access"],
  };

  it("hides the cancel action for a PAST meeting", async () => {
    state.status = "authenticated";
    state.user = authUser;
    state.getPublicScheduleMeeting.mockResolvedValue(
      publicMeeting({
        status: "PAST",
        startAt: "2020-01-01T09:00:00.000Z",
        endAt: "2020-01-01T10:00:00.000Z",
      }),
    );
    state.getMeeting.mockResolvedValue(
      internalMeeting({
        canCancel: true,
        canEdit: true,
        startAt: "2020-01-01T09:00:00.000Z",
        endAt: "2020-01-01T10:00:00.000Z",
      }),
    );

    render(<PublicScheduleDetail id="meeting-1" />);

    await screen.findByRole("heading", { name: "Public research seminar" });
    await waitFor(() => expect(state.getMeeting).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Cancel schedule" }),
    ).not.toBeInTheDocument();
  });

  it("refreshes after MEETING_ALREADY_ENDED and removes the cancel action", async () => {
    state.status = "authenticated";
    state.user = authUser;
    state.getPublicScheduleMeeting
      .mockResolvedValueOnce(publicMeeting())
      .mockResolvedValueOnce(
        publicMeeting({
          status: "PAST",
          startAt: "2020-01-01T09:00:00.000Z",
          endAt: "2020-01-01T10:00:00.000Z",
        }),
      );
    state.getMeeting.mockResolvedValue(
      internalMeeting({
        canCancel: true,
        canEdit: true,
        startAt: "2020-01-01T09:00:00.000Z",
        endAt: "2020-01-01T10:00:00.000Z",
      }),
    );
    state.cancelMeeting.mockRejectedValue(
      new ApiError("Meeting has already ended and cannot be cancelled.", 409, {
        code: "MEETING_ALREADY_ENDED",
      }),
    );

    render(<PublicScheduleDetail id="meeting-1" />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel schedule" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );

    await waitFor(() =>
      expect(state.notifyError).toHaveBeenCalledWith(
        "Meeting has already ended and cannot be cancelled.",
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Cancel schedule" }),
      ).not.toBeInTheDocument(),
    );
  });
});
