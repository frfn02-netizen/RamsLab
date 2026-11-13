import { getMeetingsCollection } from "./meeting.repository.js";

export async function createMeetingIndexes() {
  const collection = getMeetingsCollection();
  await collection.createIndex(
    { startAt: 1, endAt: 1 },
    { name: "meetings_time_index" },
  );
  await collection.createIndex(
    { participantIds: 1, startAt: 1 },
    { name: "meetings_participant_index" },
  );
  await collection.createIndex(
    { createdBy: 1, startAt: 1 },
    { name: "meetings_creator_index" },
  );
  console.log("Meetings indexes created");
}
