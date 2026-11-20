import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

import { connectDatabase } from "../src/config/database.js";
import type { EmailMessage, EmailSendResult } from "../src/lib/email.js";
import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";
import type { Meeting } from "../src/modules/meetings/meeting.types.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import type { User } from "../src/modules/users/user.types.js";
import {
  createMeetingReminderIndexes,
  getMeetingReminderDeliveriesCollection,
} from "../src/modules/meeting-reminders/meeting-reminder.index.js";
import {
  claimReminderDelivery,
  insertReminderDeliveryIfAbsent,
} from "../src/modules/meeting-reminders/meeting-reminder.repository.js";
import {
  cleanupObsoleteDeliveries,
  runMeetingReminderCycle,
} from "../src/modules/meeting-reminders/meeting-reminder.service.js";
import { MEETING_REMINDER_TIMEZONE } from "../src/modules/meeting-reminders/meeting-reminder.constants.js";

const ORGANIZER_ID = new ObjectId("00000000000000000000d001");
const PARTICIPANT_ID = new ObjectId("00000000000000000000d002");
const INACTIVE_ID = new ObjectId("00000000000000000000d003");
const DELEGATE_ID = new ObjectId("00000000000000000000d004");
const ORPHAN_ID = new ObjectId("00000000000000000000d005");
const TITLE_PREFIX = "Vitest Meeting Reminder";
const NOW = new Date("2040-01-01T00:00:00.000Z");

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const config = {
  enabled: true,
  pollMs: 60_000,
  timezone: MEETING_REMINDER_TIMEZONE,
  maxAttempts: 4,
  leaseMs: 120_000,
  retryBaseMs: 60_000,
  retryCapMs: 900_000,
};

const createdMeetingIds: ObjectId[] = [];

function userDocument(
  id: ObjectId,
  role: User["role"],
  isActive = true,
): User {
  return {
    _id: id,
    displayName: `${role} ${id.toString().slice(-4)}`,
    email: `${id.toString()}@test.local`,
    passwordHash: "not-used-by-reminder-tests",
    role,
    isActive,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function meetingDocument(overrides: Partial<Meeting> = {}): Meeting {
  return {
    title: `${TITLE_PREFIX} ${new ObjectId().toString()}`,
    description: "Reminder integration meeting",
    guestDescription: "",
    startAt: new Date(NOW.getTime() + 24 * 60 * 60_000),
    endAt: new Date(NOW.getTime() + 25 * 60 * 60_000),
    visibility: "INTERNAL",
    createdBy: ORGANIZER_ID,
    organizerId: ORGANIZER_ID,
    delegatedUserIds: [DELEGATE_ID],
    participantIds: [PARTICIPANT_ID],
    externalParticipants: [
      {
        id: "external-1",
        fullName: "External Person",
        email: "external@test.local",
      },
    ],
    meetingLink: "https://meet.example.com/reminder",
    auditHistory: [],
    guestInvitations: [],
    attachments: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

async function insertMeeting(overrides: Partial<Meeting> = {}) {
  const meeting = meetingDocument(overrides);
  const result = await getMeetingsCollection().insertOne(meeting);
  createdMeetingIds.push(result.insertedId);
  return { ...meeting, _id: result.insertedId };
}

function fakeSender(result?: EmailSendResult) {
  const messages: EmailMessage[] = [];
  const send = vi.fn(
    async (message: EmailMessage): Promise<EmailSendResult> => {
      messages.push(message);
      return (
        result ?? {
          sent: true,
          status: "accepted",
          provider: "test",
          providerMessageId: `message-${messages.length}`,
        }
      );
    },
  );
  return { send, messages };
}

function run(options: {
  now?: Date;
  send: (message: EmailMessage) => Promise<EmailSendResult>;
  instanceId?: string;
}) {
  return runMeetingReminderCycle({
    now: options.now ?? NOW,
    config,
    instanceId: options.instanceId ?? "test-instance",
    send: options.send,
    logger: silentLogger,
  });
}

async function deliveriesFor(meetingId: ObjectId) {
  return getMeetingReminderDeliveriesCollection()
    .find({ meetingId })
    .toArray();
}

async function cleanupReminderMeetings(): Promise<void> {
  const meetings = await getMeetingsCollection()
    .find({ title: { $regex: `^${TITLE_PREFIX}` } })
    .project({ _id: 1 })
    .toArray();
  const meetingIds = meetings
    .map((meeting) => meeting._id)
    .filter((id): id is ObjectId => Boolean(id));

  if (meetingIds.length === 0) return;

  await getMeetingReminderDeliveriesCollection().deleteMany({
    meetingId: { $in: meetingIds },
  });
  await getMeetingsCollection().deleteMany({ _id: { $in: meetingIds } });
}

beforeAll(async () => {
  await connectDatabase();
  await cleanupReminderMeetings();
  await createMeetingReminderIndexes();
  await getUsersCollection().deleteMany({
    _id: {
      $in: [ORGANIZER_ID, PARTICIPANT_ID, INACTIVE_ID, DELEGATE_ID, ORPHAN_ID],
    },
  });
  await getUsersCollection().insertMany([
    userDocument(ORGANIZER_ID, "DOSEN"),
    userDocument(PARTICIPANT_ID, "ADMIN"),
    userDocument(INACTIVE_ID, "DOSEN", false),
    userDocument(DELEGATE_ID, "DOSEN"),
    userDocument(ORPHAN_ID, "DOSEN"),
  ]);
});

beforeEach(async () => {
  await cleanupReminderMeetings();
});

afterAll(async () => {
  await getMeetingReminderDeliveriesCollection().deleteMany({
    meetingId: { $in: createdMeetingIds },
  });
  await getMeetingsCollection().deleteMany({ _id: { $in: createdMeetingIds } });
  await getUsersCollection().deleteMany({
    _id: {
      $in: [ORGANIZER_ID, PARTICIPANT_ID, INACTIVE_ID, DELEGATE_ID, ORPHAN_ID],
    },
  });
});

describe("meeting reminder delivery", () => {
  it("sends one 24-hour reminder to the organizer and active participant only", async () => {
    const meeting = await insertMeeting();
    const { send, messages } = fakeSender();

    const first = await run({ send });
    const second = await run({ send });

    expect(first.scannedMeetings).toBeGreaterThanOrEqual(1);
    expect(second.sent).toBe(0);
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.to).sort()).toEqual(
      [
        `${ORGANIZER_ID.toString()}@test.local`,
        `${PARTICIPANT_ID.toString()}@test.local`,
      ].sort(),
    );
    expect(messages.some((message) => message.to.includes("external"))).toBe(
      false,
    );
    expect(messages.some((message) => message.to.includes("d004"))).toBe(false);

    const deliveries = await deliveriesFor(meeting._id!);
    expect(deliveries).toHaveLength(6);
    expect(
      deliveries.filter((delivery) => delivery.status === "sent"),
    ).toHaveLength(2);
    expect(
      deliveries.filter((delivery) => delivery.status === "pending"),
    ).toHaveLength(4);
  });

  it("deduplicates an organizer who is also a participant", async () => {
    const meeting = await insertMeeting({
      participantIds: [ORGANIZER_ID, PARTICIPANT_ID, ORGANIZER_ID],
    });
    const { send, messages } = fakeSender();

    await run({ send });

    expect(messages).toHaveLength(2);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(deliveries).toHaveLength(6);
  });

  it("excludes inactive participants", async () => {
    const meeting = await insertMeeting({
      participantIds: [INACTIVE_ID],
    });
    const { send, messages } = fakeSender();

    await run({ send });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.to).toBe(`${ORGANIZER_ID.toString()}@test.local`);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(deliveries).toHaveLength(3);
  });

  it("cancels obsolete pending reminders and creates a new schedule after reschedule", async () => {
    const meeting = await insertMeeting();
    const { send, messages } = fakeSender();

    await run({ send });
    expect(messages).toHaveLength(2);

    const newStartAt = new Date(NOW.getTime() + 48 * 60 * 60_000);
    await getMeetingsCollection().updateOne(
      { _id: meeting._id! },
      { $set: { startAt: newStartAt, endAt: new Date(newStartAt.getTime() + 60 * 60_000), updatedAt: NOW } },
    );

    await run({ send });

    const afterReschedule = await deliveriesFor(meeting._id!);
    expect(
      afterReschedule.filter((delivery) => delivery.status === "sent"),
    ).toHaveLength(2);
    expect(
      afterReschedule.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(4);

    const nextNow = new Date(NOW.getTime() + 24 * 60 * 60_000);
    await run({ send, now: nextNow });
    expect(messages).toHaveLength(4);

    const afterNewSchedule = await deliveriesFor(meeting._id!);
    expect(
      afterNewSchedule.filter((delivery) => delivery.status === "sent"),
    ).toHaveLength(4);
  });

  it("cancels pending reminders when the meeting is cancelled without sending more email", async () => {
    const meeting = await insertMeeting();
    const { send, messages } = fakeSender();

    await run({ send });
    expect(messages).toHaveLength(2);

    await getMeetingsCollection().updateOne(
      { _id: meeting._id! },
      { $set: { cancelledAt: NOW, cancelledBy: ORGANIZER_ID, updatedAt: NOW } },
    );
    await run({ send });

    expect(messages).toHaveLength(2);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(
      deliveries.filter((delivery) => delivery.status === "pending"),
    ).toHaveLength(0);
    expect(
      deliveries.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(4);
  });

  it("cancels orphaned pending reminders after a hard delete", async () => {
    const meeting = await insertMeeting();
    const { send, messages } = fakeSender();

    await run({ send });
    expect(messages).toHaveLength(2);

    await getMeetingsCollection().deleteOne({ _id: meeting._id! });
    await run({ send });

    expect(messages).toHaveLength(2);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(
      deliveries.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(4);
  });

  it("retries an explicit 429 rejection with backoff", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    let calls = 0;
    const send = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return {
          sent: false,
          status: "failed",
          provider: "test",
          httpStatus: 429,
          reason: "provider_error",
        } satisfies EmailSendResult;
      }
      return {
        sent: true,
        status: "accepted",
        provider: "test",
        providerMessageId: "retry-success",
      } satisfies EmailSendResult;
    });

    await run({ send });
    const scheduled = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(scheduled).toMatchObject({ status: "pending", attempts: 1 });
    expect(scheduled?.nextAttemptAt).toBeInstanceOf(Date);

    await run({ send, now: new Date(NOW.getTime() + 61_000) });
    const refreshed = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(refreshed).toMatchObject({ status: "sent", attempts: 2 });
    expect(calls).toBe(2);
  });

  it("marks ambiguous failures as unknown and never retries them", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const { send, messages } = fakeSender({
      sent: false,
      status: "failed",
      provider: "test",
      reason: "connection_failed",
    });

    await run({ send });
    await run({ send, now: new Date(NOW.getTime() + 10 * 60_000) });

    expect(messages).toHaveLength(1);
    const delivery = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(delivery).toMatchObject({
      status: "unknown",
      lastFailureReason: "connection_failed",
    });
  });

  it("allows only one scheduler instance to claim a delivery", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const scheduledFor = new Date(NOW.getTime() + 24 * 60 * 60_000);
    const inserted = await insertReminderDeliveryIfAbsent(
      {
        meetingId: meeting._id!,
        meetingStartAt: meeting.startAt,
        intervalMinutes: 1440,
        recipientKind: "USER",
        recipientId: ORGANIZER_ID.toString(),
        scheduledFor,
      },
      "pending",
      NOW,
    );

    const [first, second] = await Promise.all([
      claimReminderDelivery({
        id: inserted.delivery._id,
        leaseOwner: "instance-a",
        now: NOW,
        leaseMs: config.leaseMs,
        maxAttempts: config.maxAttempts,
      }),
      claimReminderDelivery({
        id: inserted.delivery._id,
        leaseOwner: "instance-b",
        now: NOW,
        leaseMs: config.leaseMs,
        maxAttempts: config.maxAttempts,
      }),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
  });

  it("prevents duplicate sends when two cycles run concurrently", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const { send, messages } = fakeSender();

    await Promise.all([
      run({ send, instanceId: "instance-a" }),
      run({ send, instanceId: "instance-b" }),
    ]);

    expect(messages).toHaveLength(1);
    const delivery = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(delivery?.status).toBe("sent");
  });

  it("turns an expired sending lease into unknown without resending", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const inserted = await insertReminderDeliveryIfAbsent(
      {
        meetingId: meeting._id!,
        meetingStartAt: meeting.startAt,
        intervalMinutes: 1440,
        recipientKind: "USER",
        recipientId: ORGANIZER_ID.toString(),
        scheduledFor: NOW,
      },
      "pending",
      NOW,
    );

    const claimed = await claimReminderDelivery({
      id: inserted.delivery._id,
      leaseOwner: "crashed-instance",
      now: NOW,
      leaseMs: config.leaseMs,
      maxAttempts: config.maxAttempts,
    });
    expect(claimed?.status).toBe("sending");

    const cleanup = await cleanupObsoleteDeliveries({
      now: new Date(NOW.getTime() + config.leaseMs + 1),
      config,
      logger: silentLogger,
    });

    expect(cleanup.unknown).toBe(1);
    const delivery = await getMeetingReminderDeliveriesCollection().findOne({
      _id: inserted.delivery._id,
    });
    expect(delivery).toMatchObject({
      status: "unknown",
      lastFailureReason: "lease_expired",
    });
  });

  it("does nothing when the feature flag is disabled", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const { send, messages } = fakeSender();

    const summary = await runMeetingReminderCycle({
      now: NOW,
      config: { ...config, enabled: false },
      send,
      logger: silentLogger,
    });

    expect(summary.enabled).toBe(false);
    expect(messages).toHaveLength(0);
    expect(await deliveriesFor(meeting._id!)).toHaveLength(0);
  });
});
