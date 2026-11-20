import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicScheduleOverview from "@/components/schedule/public-schedule-overview";

const state = vi.hoisted(() => ({
  getPublicSchedule: vi.fn(),
}));

vi.mock("@/lib/api/public-schedule", () => ({
  getPublicSchedule: state.getPublicSchedule,
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: null, status: "unauthenticated" }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.getPublicSchedule.mockResolvedValue({
    items: [
      {
        id: "online-1",
        title: "Public online seminar",
        clientName: "RAMS Laboratory",
        startAt: "2032-04-01T09:00:00.000Z",
        endAt: "2032-04-01T10:00:00.000Z",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/public-online",
        status: "UPCOMING",
      },
      {
        id: "offline-1",
        title: "Public offline workshop",
        clientName: "RAMS Laboratory",
        startAt: "2032-04-02T09:00:00.000Z",
        endAt: "2032-04-02T10:00:00.000Z",
        mode: "OFFLINE",
        location: "RAMS Room",
        meetingLink: "https://meet.google.com/public-offline",
        status: "UPCOMING",
      },
    ],
    total: 2,
    page: 1,
    limit: 6,
    totalPages: 1,
    hasMore: false,
  });
});

describe("Public schedule overview meeting links", () => {
  it("shows label and secure new-tab behavior for public online and offline links", async () => {
    render(<PublicScheduleOverview />);

    expect(await screen.findByText("Public online seminar")).toBeInTheDocument();
    const online = screen.getByRole("link", { name: "Join Google Meet" });
    expect(online).toHaveAttribute(
      "href",
      "https://meet.google.com/public-online",
    );
    expect(online).toHaveAttribute("target", "_blank");
    expect(online).toHaveAttribute("rel", "noopener noreferrer");

    const offline = screen.getByRole("link", { name: "Open Meeting Link" });
    expect(offline).toHaveAttribute(
      "href",
      "https://meet.google.com/public-offline",
    );
    expect(offline).toHaveAttribute("target", "_blank");
    expect(offline).toHaveAttribute("rel", "noopener noreferrer");
  });
});
