import type { Collection, Document, IndexDescription } from "mongodb";

import { getMeetingsCollection } from "./meeting.repository.js";
import type { Meeting } from "./meeting.types.js";

export type MeetingIndexSpec = {
  name: string;
  key: Document;
};

export const MEETING_INDEX_SPECS: readonly MeetingIndexSpec[] = [
  { name: "meetings_time_index", key: { startAt: 1, endAt: 1 } },
  {
    name: "meetings_participant_index",
    key: { participantIds: 1, startAt: 1 },
  },
  { name: "meetings_creator_index", key: { createdBy: 1, startAt: 1 } },
];

export type MeetingIndexCollection = Pick<
  Collection<Meeting>,
  "listIndexes" | "createIndex"
>;

function sameIndexKey(
  actual: Document | undefined,
  expected: Document,
): boolean {
  if (!actual) return false;
  const actualEntries = Object.entries(actual);
  const expectedEntries = Object.entries(expected);
  return (
    actualEntries.length === expectedEntries.length &&
    actualEntries.every(
      ([field, direction], index) =>
        field === expectedEntries[index]?.[0] &&
        direction === expectedEntries[index]?.[1],
    )
  );
}

function matchesIndexSpec(
  index: IndexDescription | undefined,
  spec: MeetingIndexSpec,
): boolean {
  return Boolean(
    index && index.name === spec.name && sameIndexKey(index.key, spec.key),
  );
}

export async function createMeetingIndexes(
  collection: MeetingIndexCollection = getMeetingsCollection(),
): Promise<void> {
  const indexes = await collection.listIndexes().toArray();

  for (const spec of MEETING_INDEX_SPECS) {
    const existing = indexes.find((index) => index.name === spec.name);
    if (existing && !matchesIndexSpec(existing, spec)) {
      throw new Error(
        `Meeting index ${spec.name} has an incompatible existing configuration.`,
      );
    }
  }

  for (const spec of MEETING_INDEX_SPECS) {
    if (indexes.some((index) => matchesIndexSpec(index, spec))) continue;
    await collection.createIndex(spec.key, { name: spec.name });
  }

  const verified = await collection.listIndexes().toArray();
  for (const spec of MEETING_INDEX_SPECS) {
    if (!verified.some((index) => matchesIndexSpec(index, spec))) {
      throw new Error(
        `Meeting index ${spec.name} was not found after creation.`,
      );
    }
  }

  console.log("Meetings indexes verified");
}
