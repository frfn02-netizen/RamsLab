import type { Collection, IndexDescription } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  createMeetingReminderIndexes,
  LEGACY_MEETING_REMINDER_INDEX_NAMES,
  MEETING_REMINDER_INDEX_SPECS,
} from "../src/modules/meeting-reminders/meeting-reminder.index.js";
import type { MeetingReminderDelivery } from "../src/modules/meeting-reminders/meeting-reminder.types.js";

function createFakeCollection(
  initial: IndexDescription[],
  documents: Array<Record<string, unknown>> = [],
) {
  let indexes = initial.map((index) => ({
    ...index,
    key: { ...index.key },
  }));
  const operations: string[] = [];
  const docs = documents.map((document) => ({ ...document }));

  const collection = {
    async indexes() {
      return indexes.map((index) => ({ ...index, key: { ...index.key } }));
    },
    async createIndex(
      key: Record<string, number>,
      options: { name: string; unique?: boolean },
    ) {
      indexes.push({ key, ...options });
      operations.push(`create:${options.name}`);
      return options.name;
    },
    async dropIndex(name: string) {
      indexes = indexes.filter((index) => index.name !== name);
      operations.push(`drop:${name}`);
    },
    async updateMany(
      filter: { channel?: { $exists?: boolean } },
      update: { $set?: { channel?: string } },
    ) {
      let modifiedCount = 0;
      for (const document of docs) {
        if (
          filter.channel?.$exists === false &&
          !Object.prototype.hasOwnProperty.call(document, "channel")
        ) {
          document.channel = update.$set?.channel;
          modifiedCount += 1;
        }
      }
      return { modifiedCount };
    },
  } as unknown as Collection<MeetingReminderDelivery>;

  return {
    collection,
    operations,
    getIndexes: () => indexes,
    getDocuments: () => docs,
  };
}

function specIndex(spec: (typeof MEETING_REMINDER_INDEX_SPECS)[number]) {
  return {
    key: spec.key,
    name: spec.name,
    ...("unique" in spec ? { unique: spec.unique } : {}),
  };
}

describe("meeting reminder indexes", () => {
  it("expands to channel-aware indexes and keeps legacy indexes by default", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      ...LEGACY_MEETING_REMINDER_INDEX_NAMES.map((name) => ({
        key: { meetingId: 1 },
        name,
      })),
    ]);

    await createMeetingReminderIndexes(fake.collection);

    expect(fake.operations).toEqual(
      MEETING_REMINDER_INDEX_SPECS.map((spec) => `create:${spec.name}`),
    );
    expect(
      fake
        .getIndexes()
        .some((index) => index.name === "meeting_reminder_delivery_unique_v2"),
    ).toBe(true);
    expect(
      fake
        .getIndexes()
        .some((index) => index.name === "meeting_reminder_delivery_unique"),
    ).toBe(true);
  });

  it("contracts legacy indexes only when explicitly requested, after creating v2", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      ...LEGACY_MEETING_REMINDER_INDEX_NAMES.map((name) => ({
        key: { meetingId: 1 },
        name,
      })),
    ]);

    await createMeetingReminderIndexes(fake.collection, {
      dropLegacyIndexes: true,
    });

    const firstLegacyDrop = fake.operations.indexOf(
      `drop:${LEGACY_MEETING_REMINDER_INDEX_NAMES[0]}`,
    );
    const uniqueCreate = fake.operations.indexOf(
      "create:meeting_reminder_delivery_unique_v2",
    );
    expect(uniqueCreate).toBeGreaterThanOrEqual(0);
    expect(firstLegacyDrop).toBeGreaterThan(uniqueCreate);
    expect(
      fake
        .getIndexes()
        .some((index) => index.name === "meeting_reminder_delivery_unique"),
    ).toBe(false);
  });

  it("refuses channel coexistence before the contract step", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      {
        key: { meetingId: 1, intervalMinutes: 1 },
        name: "meeting_reminder_delivery_unique",
      },
    ]);

    await expect(
      createMeetingReminderIndexes(fake.collection, {
        requireChannelCoexistence: true,
      }),
    ).rejects.toThrow("contract step");
  });

  it("allows channel coexistence when the contract step is explicit", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      {
        key: { meetingId: 1, intervalMinutes: 1 },
        name: "meeting_reminder_delivery_unique",
      },
    ]);

    await createMeetingReminderIndexes(fake.collection, {
      dropLegacyIndexes: true,
      requireChannelCoexistence: true,
    });

    expect(
      fake
        .getIndexes()
        .some((index) => index.name === "meeting_reminder_delivery_unique"),
    ).toBe(false);
  });

  it("is idempotent when the active indexes already exist", async () => {
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      ...MEETING_REMINDER_INDEX_SPECS.map(specIndex),
    ]);

    await createMeetingReminderIndexes(fake.collection);
    await createMeetingReminderIndexes(fake.collection);

    expect(fake.operations).toEqual([]);
  });

  it("replaces an incompatible active index definition", async () => {
    const spec = MEETING_REMINDER_INDEX_SPECS[0];
    const fake = createFakeCollection([
      { key: { _id: 1 }, name: "_id_" },
      { key: { meetingId: 1 }, name: spec.name, unique: true },
    ]);

    await createMeetingReminderIndexes(fake.collection);

    expect(fake.operations).toContain(`drop:${spec.name}`);
    expect(fake.operations).toContain(`create:${spec.name}`);
  });

  it("backfills historical deliveries while the legacy index is still present", async () => {
    const fake = createFakeCollection(
      [
        { key: { _id: 1 }, name: "_id_" },
        {
          key: { meetingId: 1, intervalMinutes: 1 },
          name: "meeting_reminder_delivery_unique",
        },
      ],
      [
        { meetingId: "m1", status: "sent" },
        { meetingId: "m2", status: "sent", channel: "EMAIL" },
      ],
    );

    await createMeetingReminderIndexes(fake.collection);

    expect(fake.getDocuments()).toEqual([
      { meetingId: "m1", status: "sent", channel: "EMAIL" },
      { meetingId: "m2", status: "sent", channel: "EMAIL" },
    ]);
    expect(
      fake
        .getIndexes()
        .some((index) => index.name === "meeting_reminder_delivery_unique"),
    ).toBe(true);

    await createMeetingReminderIndexes(fake.collection);
    expect(fake.getDocuments()).toEqual([
      { meetingId: "m1", status: "sent", channel: "EMAIL" },
      { meetingId: "m2", status: "sent", channel: "EMAIL" },
    ]);
  });
});
