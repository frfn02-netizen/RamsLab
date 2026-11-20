import type { IndexDescription } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  createMeetingIndexes,
  MEETING_INDEX_SPECS,
  type MeetingIndexCollection,
} from "../src/modules/meetings/meeting.index.js";

function indexFromSpec(spec: (typeof MEETING_INDEX_SPECS)[number]): IndexDescription {
  return { key: spec.key, name: spec.name };
}

function createFakeCollection(initialIndexes: IndexDescription[]) {
  let indexes = initialIndexes.map((index) => ({
    ...index,
    key: { ...index.key },
  }));
  const created: string[] = [];

  const collection = {
    listIndexes() {
      return {
        toArray: async () =>
          indexes.map((index) => ({ ...index, key: { ...index.key } })),
      };
    },
    async createIndex(
      key: Record<string, number>,
      options: { name: string },
    ) {
      indexes.push({ key, ...options });
      created.push(options.name);
      return options.name;
    },
  } as unknown as MeetingIndexCollection;

  return {
    collection,
    created,
    getIndexes: () => indexes,
  };
}

describe("meeting indexes", () => {
  it("creates every active meeting index when none exist", async () => {
    const fake = createFakeCollection([{ key: { _id: 1 }, name: "_id_" }]);

    await createMeetingIndexes(fake.collection);

    expect(fake.created).toEqual(MEETING_INDEX_SPECS.map((spec) => spec.name));
    expect(fake.getIndexes()).toEqual(
      expect.arrayContaining(MEETING_INDEX_SPECS.map(indexFromSpec)),
    );
  });

  it("does nothing when active indexes already exist", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      ...MEETING_INDEX_SPECS.map(indexFromSpec),
    ]);

    await createMeetingIndexes(fake.collection);

    expect(fake.created).toEqual([]);
  });

  it("is safe to run repeatedly", async () => {
    const fake = createFakeCollection([{ key: { _id: 1 }, name: "_id_" }]);

    await createMeetingIndexes(fake.collection);
    await createMeetingIndexes(fake.collection);

    expect(fake.created).toEqual(MEETING_INDEX_SPECS.map((spec) => spec.name));
  });

  it("rejects an incompatible existing active index configuration", async () => {
    const creatorSpec = MEETING_INDEX_SPECS.find(
      (spec) => spec.name === "meetings_creator_index",
    );
    if (!creatorSpec) throw new Error("creator index spec is missing");

    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      { key: { createdBy: 1 }, name: creatorSpec.name },
    ]);

    await expect(createMeetingIndexes(fake.collection)).rejects.toThrow(
      "meetings_creator_index has an incompatible existing configuration",
    );
    expect(fake.created).toEqual([]);
  });

  it("does not manage or drop legacy delegate and guest indexes", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      { key: { delegatedUserIds: 1, startAt: 1 }, name: "meetings_delegate_index" },
      {
        key: { "guestInvitations.tokenHash": 1 },
        name: "meetings_guest_invitation_token_index",
      },
      ...MEETING_INDEX_SPECS.map(indexFromSpec),
    ]);

    await createMeetingIndexes(fake.collection);

    expect(fake.created).toEqual([]);
    expect(fake.getIndexes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "meetings_delegate_index" }),
        expect.objectContaining({
          name: "meetings_guest_invitation_token_index",
        }),
      ]),
    );
  });
});
