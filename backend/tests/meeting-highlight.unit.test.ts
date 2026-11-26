import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  meetingInvolvesHighlightedUser,
  parseMeetingHighlightedUserIds,
} from "../src/config/meeting-highlight.js";

const FIRST = new ObjectId("00000000000000000000e001");
const SECOND = new ObjectId("00000000000000000000e002");

describe("meeting highlight configuration", () => {
  it("parses, normalizes, and deduplicates configured user IDs", () => {
    const parsed = parseMeetingHighlightedUserIds(
      `${FIRST.toHexString()}, ${SECOND.toHexString()}, ${FIRST.toHexString()},`,
    );
    expect([...parsed]).toEqual([FIRST.toHexString(), SECOND.toHexString()]);
  });

  it("rejects invalid configured user IDs", () => {
    expect(() => parseMeetingHighlightedUserIds("not-a-user-id")).toThrow(
      "MEETINGS_HIGHLIGHTED_USER_IDS",
    );
  });

  it("detects creator and participant involvement", () => {
    const configured = parseMeetingHighlightedUserIds(FIRST.toHexString());
    expect(
      meetingInvolvesHighlightedUser(
        { createdBy: FIRST, participantIds: [] },
        configured,
      ),
    ).toBe(true);
    expect(
      meetingInvolvesHighlightedUser(
        { createdBy: SECOND, participantIds: [FIRST] },
        configured,
      ),
    ).toBe(true);
    expect(
      meetingInvolvesHighlightedUser(
        { createdBy: SECOND, participantIds: [SECOND] },
        configured,
      ),
    ).toBe(false);
  });
});
