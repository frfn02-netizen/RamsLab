import { describe, expect, it } from "vitest";
import {
  cancelMeetingSchema,
  conflictCheckSchema,
  createMeetingSchema,
  updateMeetingSchema,
} from "../src/modules/meetings/meeting.schema.js";
import {
  assertMeetingNotEnded,
  assertMeetingWindow,
  getMeetingStatus,
} from "../src/modules/meetings/meeting.service.js";

const USER_ID = "00000000000000000000a002";
const OTHER_ID = "00000000000000000000a001";
const BASE_CREATE = {
  clientName: "PT Test Client",
  mode: "OFFLINE" as const,
  location: "Meeting Room 1",
  startAt: "2030-01-01T09:00:00.000Z",
  endAt: "2030-01-01T10:00:00.000Z",
};

describe("meeting schema", () => {
  it("accepts a valid meeting payload", () => {
    const parsed = createMeetingSchema.parse({
      ...BASE_CREATE,
      title: "Weekly review",
      description: "Discuss progress",
      mode: "ONLINE",
      location: null,
      participantIds: [USER_ID, OTHER_ID, USER_ID],
      meetingLink: "https://meet.google.com/abc-defg-hij",
    });

    expect(parsed.title).toBe("Weekly review");
    expect(parsed.startAt).toBeInstanceOf(Date);
    expect(parsed.endAt).toBeInstanceOf(Date);
    expect(parsed.meetingLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(parsed.visibility).toBe("INTERNAL");
  });

  it("accepts the private visibility option", () => {
    const parsed = createMeetingSchema.parse({
      ...BASE_CREATE,
      title: "Private review",
      visibility: "PRIVATE",
    });

    expect(parsed.visibility).toBe("PRIVATE");
  });

  it("does not accept ownership fields through meeting create input", () => {
    const parsed = createMeetingSchema.parse({
      ...BASE_CREATE,
      title: "Ownership-safe meeting",
      createdBy: OTHER_ID,
      organizerId: OTHER_ID,
    });

    expect(parsed).not.toHaveProperty("createdBy");
    expect(parsed).not.toHaveProperty("organizerId");
  });

  it("rejects an empty title", () => {
    expect(
      createMeetingSchema.safeParse({
        ...BASE_CREATE,
        title: "   ",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate-invalid participant ids", () => {
    expect(
      createMeetingSchema.safeParse({
        ...BASE_CREATE,
        title: "Review",
        participantIds: ["not-an-object-id"],
      }).success,
    ).toBe(false);
  });

  it("rejects non-HTTP meeting links", () => {
    expect(
      createMeetingSchema.safeParse({
        ...BASE_CREATE,
        title: "Review",
        mode: "ONLINE",
        location: null,
        meetingLink: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("requires a client name on create", () => {
    const { clientName: _clientName, ...withoutClient } = BASE_CREATE;
    void _clientName;
    expect(
      createMeetingSchema.safeParse({ ...withoutClient, title: "Review" })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid meeting mode", () => {
    expect(
      createMeetingSchema.safeParse({
        ...BASE_CREATE,
        title: "Review",
        mode: "HYBRID",
      }).success,
    ).toBe(false);
  });

  it("requires a location for offline meetings", () => {
    expect(
      createMeetingSchema.safeParse({
        ...BASE_CREATE,
        title: "Review",
        location: "",
      }).success,
    ).toBe(false);
  });

  it("requires a valid URL for online meetings", () => {
    expect(
      createMeetingSchema.safeParse({
        ...BASE_CREATE,
        title: "Review",
        mode: "ONLINE",
        location: null,
        meetingLink: null,
      }).success,
    ).toBe(false);
  });

  it("leaves an omitted meeting link untouched on update", () => {
    const parsed = updateMeetingSchema.parse({ title: "Updated" });
    expect(parsed).not.toHaveProperty("meetingLink");
  });

  it("accepts null to clear a meeting link", () => {
    const parsed = updateMeetingSchema.parse({ meetingLink: null });
    expect(parsed.meetingLink).toBeNull();
  });

  it("accepts an optimistic version for generic meeting updates", () => {
    const parsed = updateMeetingSchema.parse({
      title: "Versioned update",
      expectedUpdatedAt: "2030-01-01T09:00:00.000Z",
    });

    expect(parsed.expectedUpdatedAt).toEqual(
      new Date("2030-01-01T09:00:00.000Z"),
    );
  });

  it("requires both bounds for a conflict check", () => {
    expect(conflictCheckSchema.safeParse({}).success).toBe(false);
    expect(
      conflictCheckSchema.safeParse({
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T10:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});

describe("meeting time window", () => {
  it("accepts an end time after the start time", () => {
    expect(() =>
      assertMeetingWindow(
        new Date("2030-01-01T09:00:00.000Z"),
        new Date("2030-01-01T10:00:00.000Z"),
      ),
    ).not.toThrow();
  });

  it("rejects equal and reversed windows", () => {
    const start = new Date("2030-01-01T09:00:00.000Z");
    expect(() => assertMeetingWindow(start, start)).toThrow(
      "End time must be after start time",
    );
    expect(() =>
      assertMeetingWindow(start, new Date("2030-01-01T08:00:00.000Z")),
    ).toThrow("End time must be after start time");
  });

  it("rejects an invalid date", () => {
    expect(() =>
      assertMeetingWindow(
        new Date("not-a-date"),
        new Date("2030-01-01T10:00:00.000Z"),
      ),
    ).toThrow("Start time is invalid");
  });
});

describe("meeting status", () => {
  const startAt = new Date("2030-01-01T10:00:00.000Z");
  const endAt = new Date("2030-01-01T11:00:00.000Z");

  it("derives Upcoming, Ongoing, and Past from the time window", () => {
    expect(
      getMeetingStatus(
        { startAt, endAt },
        new Date("2030-01-01T09:59:59.000Z"),
      ),
    ).toBe("UPCOMING");
    expect(
      getMeetingStatus(
        { startAt, endAt },
        new Date("2030-01-01T10:00:00.000Z"),
      ),
    ).toBe("ONGOING");
    expect(
      getMeetingStatus(
        { startAt, endAt },
        new Date("2030-01-01T11:00:00.000Z"),
      ),
    ).toBe("PAST");
  });

  it("keeps cancellation explicit and higher priority than time", () => {
    expect(
      getMeetingStatus(
        {
          startAt,
          endAt,
          cancelledAt: new Date("2029-12-01T00:00:00.000Z"),
        },
        new Date("2030-01-01T10:30:00.000Z"),
      ),
    ).toBe("CANCELLED");
    expect(cancelMeetingSchema.parse({ reason: "Schedule changed" })).toEqual({
      reason: "Schedule changed",
    });
  });
});

describe("meeting cancellation eligibility", () => {
  const endAt = new Date("2030-01-01T11:00:00.000Z");

  it("allows cancellation strictly before the persisted end time", () => {
    expect(() =>
      assertMeetingNotEnded(
        { endAt },
        new Date("2030-01-01T10:59:59.999Z"),
      ),
    ).not.toThrow();
  });

  it("rejects cancellation at the persisted end time with the API contract", () => {
    const attempt = () => assertMeetingNotEnded({ endAt }, endAt);

    expect(attempt).toThrow(
      "Meeting has already ended and cannot be cancelled.",
    );
    try {
      attempt();
    } catch (error) {
      expect(error).toEqual(
        expect.objectContaining({
          statusCode: 409,
          code: "MEETING_ALREADY_ENDED",
          message: "Meeting has already ended and cannot be cancelled.",
        }),
      );
    }
  });
});
