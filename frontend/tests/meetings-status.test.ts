import { describe, expect, it } from "vitest";

import { getMeetingStatus, meetingStatusLabel } from "@/lib/meetings/status";

describe("meeting status helpers", () => {
  const meeting = {
    startAt: "2030-01-01T10:00:00.000Z",
    endAt: "2030-01-01T11:00:00.000Z",
  };

  it("derives the three time-based statuses without calling Past Completed", () => {
    expect(getMeetingStatus(meeting, Date.parse("2030-01-01T09:59:59.000Z"))).toBe(
      "UPCOMING",
    );
    expect(getMeetingStatus(meeting, Date.parse("2030-01-01T10:00:00.000Z"))).toBe(
      "ONGOING",
    );
    expect(getMeetingStatus(meeting, Date.parse("2030-01-01T11:00:00.000Z"))).toBe(
      "PAST",
    );
    expect(meetingStatusLabel("PAST")).toBe("Past");
  });

  it("keeps cancellation as an explicit status", () => {
    expect(
      getMeetingStatus({
        ...meeting,
        cancelledAt: "2030-01-01T09:00:00.000Z",
      }),
    ).toBe("CANCELLED");
    expect(meetingStatusLabel("CANCELLED")).toBe("Cancelled");
  });

  it("recomputes time status instead of trusting a stale API status", () => {
    expect(
      getMeetingStatus(
        { ...meeting, status: "UPCOMING" },
        Date.parse("2030-01-01T11:00:00.000Z"),
      ),
    ).toBe("PAST");
  });
});
