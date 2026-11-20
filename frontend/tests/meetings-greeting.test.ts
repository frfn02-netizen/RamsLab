import { describe, expect, it } from "vitest";

import { meetingGreeting } from "@/lib/meetings/greeting";

describe("meetingGreeting", () => {
  it.each([
    [11, "Good morning, Budi Santoso."],
    [12, "Good afternoon, Budi Santoso."],
    [17, "Good afternoon, Budi Santoso."],
    [18, "Good evening, Budi Santoso."],
  ])("uses the local hour %s", (hour, expected) => {
    expect(
      meetingGreeting("Budi Santoso", new Date(2031, 2, 1, hour, 0, 0)),
    ).toBe(expected);
  });

  it("does not expose an email or ID when fullName is empty", () => {
    const date = new Date(2031, 2, 1, 14, 0, 0);

    expect(meetingGreeting("   ", date)).toBe("Good afternoon.");
    expect(meetingGreeting(undefined, date)).toBe("Good afternoon.");
  });
});
