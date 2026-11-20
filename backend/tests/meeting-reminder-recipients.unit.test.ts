import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";

import { meetingReminderUserIds } from "../src/modules/meeting-reminders/meeting-reminder.recipients.js";

describe("meeting reminder ownership", () => {
  it("uses createdBy as the owner recipient source", () => {
    const creator = new ObjectId("00000000000000000000a001");
    const participant = new ObjectId("00000000000000000000a002");

    expect(
      meetingReminderUserIds({
        _id: new ObjectId("00000000000000000000a003"),
        createdBy: creator,
        participantIds: [participant],
      }),
    ).toEqual([creator, participant]);
  });
});
