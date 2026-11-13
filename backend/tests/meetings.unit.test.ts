import { describe, expect, it } from "vitest";
import {
  conflictCheckSchema,
  createMeetingSchema,
  updateMeetingSchema,
} from "../src/modules/meetings/meeting.schema.js";
import { assertMeetingWindow } from "../src/modules/meetings/meeting.service.js";

const USER_ID = "00000000000000000000a002";
const OTHER_ID = "00000000000000000000a001";

describe("meeting schema", () => {
  it("accepts a valid meeting payload", () => {
    const parsed = createMeetingSchema.parse({
      title: "Weekly review",
      description: "Discuss progress",
      startAt: "2030-01-01T09:00:00.000Z",
      endAt: "2030-01-01T10:00:00.000Z",
      participantIds: [USER_ID, OTHER_ID, USER_ID],
      meetingLink: "https://meet.google.com/abc-defg-hij",
    });

    expect(parsed.title).toBe("Weekly review");
    expect(parsed.startAt).toBeInstanceOf(Date);
    expect(parsed.endAt).toBeInstanceOf(Date);
    expect(parsed.meetingLink).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("rejects an empty title", () => {
    expect(
      createMeetingSchema.safeParse({
        title: "   ",
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T10:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate-invalid participant ids", () => {
    expect(
      createMeetingSchema.safeParse({
        title: "Review",
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T10:00:00.000Z",
        participantIds: ["not-an-object-id"],
      }).success,
    ).toBe(false);
  });

  it("rejects non-HTTP meeting links", () => {
    expect(
      createMeetingSchema.safeParse({
        title: "Review",
        startAt: "2030-01-01T09:00:00.000Z",
        endAt: "2030-01-01T10:00:00.000Z",
        meetingLink: "javascript:alert(1)",
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
