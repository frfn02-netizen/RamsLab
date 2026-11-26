import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { ObjectId } from "mongodb";

import { connectDatabase } from "../src/config/database.js";
import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";
import type { Meeting } from "../src/modules/meetings/meeting.types.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import type { User } from "../src/modules/users/user.types.js";
import {
  createMeetingReminderIndexes,
  getMeetingReminderDeliveriesCollection,
} from "../src/modules/meeting-reminders/meeting-reminder.index.js";
import type {
  MeetingReminderChannelAdapter,
  MeetingReminderMessage,
  MeetingReminderSendResult,
} from "../src/modules/meeting-reminders/meeting-reminder.channel.js";
import {
  getMeetingReminderChannelLeaseCollection,
  meetingReminderChannelLeaseMs,
} from "../src/modules/meeting-reminders/meeting-reminder.channel-lease.js";
import {
  claimReminderDelivery,
  insertReminderDeliveryIfAbsent,
  reviveCancelledReminderDelivery,
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
const UNVERIFIED_ID = new ObjectId("00000000000000000000d007");
const TITLE_PREFIX = "Vitest Meeting Reminder";
const NOW = new Date("2040-01-01T00:00:00.000Z");

const TEST_USER_IDS = [
  ORGANIZER_ID,
  PARTICIPANT_ID,
  INACTIVE_ID,
  DELEGATE_ID,
  ORPHAN_ID,
  UNVERIFIED_ID,
];

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

const config = {
  channel: "EMAIL" as const,
  contractLegacyIndexes: false,
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
  whatsappNumber: string | null = null,
  whatsappOptIn = false,
): User {
  return {
    _id: id,
    displayName: `${role} ${id.toString().slice(-4)}`,
    email: `${id.toString()}@test.local`,
    passwordHash: "not-used-by-reminder-tests",
    role,
    isActive,
    whatsappNumber,
    whatsappOptIn,
    whatsappOptInAt: whatsappOptIn ? NOW : null,
    whatsappConsentNumber: whatsappOptIn ? whatsappNumber : null,
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

function fakeAdapter(
  options: {
    channel?: "EMAIL" | "WHATSAPP";
    configured?: boolean;
    result?: MeetingReminderSendResult;
    sequence?: MeetingReminderSendResult[];
  } = {},
) {
  const messages: MeetingReminderMessage[] = [];
  const channel = options.channel ?? "EMAIL";
  const sequence = options.sequence ? [...options.sequence] : null;
  const send = vi.fn(
    async (
      message: MeetingReminderMessage,
    ): Promise<MeetingReminderSendResult> => {
      messages.push(message);
      const next = sequence?.shift() ?? options.result;
      return (
        next ?? {
          disposition: "accepted",
          provider: "test",
          providerMessageId: `message-${messages.length}`,
        }
      );
    },
  );
  const adapter: MeetingReminderChannelAdapter = {
    channel,
    name: "test",
    isConfigured: options.configured ?? true,
    send,
  };
  return { adapter, messages, send };
}

function run(options: {
  now?: Date;
  adapter: MeetingReminderChannelAdapter;
  instanceId?: string;
}) {
  return runMeetingReminderCycle({
    now: options.now ?? NOW,
    config: { ...config, channel: options.adapter.channel },
    instanceId: options.instanceId ?? "test-instance",
    channel: options.adapter.channel,
    adapter: options.adapter,
    logger: silentLogger,
  });
}

async function deliveriesFor(meetingId: ObjectId) {
  return getMeetingReminderDeliveriesCollection().find({ meetingId }).toArray();
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
  await createMeetingReminderIndexes(undefined, { dropLegacyIndexes: true });
});

beforeEach(async () => {
  await cleanupReminderMeetings();
  await getMeetingReminderChannelLeaseCollection().deleteMany({});
  await getUsersCollection().deleteMany({ _id: { $in: TEST_USER_IDS } });
  await getUsersCollection().insertMany([
    userDocument(ORGANIZER_ID, "DOSEN", true, "+628111111111", true),
    userDocument(PARTICIPANT_ID, "ADMIN", true, "+628122222222", true),
    userDocument(INACTIVE_ID, "DOSEN", false, "+628133333333", true),
    userDocument(DELEGATE_ID, "DOSEN"),
    userDocument(ORPHAN_ID, "DOSEN"),
    userDocument(UNVERIFIED_ID, "ADMIN", true, "+628155555555", false),
  ]);
});

afterAll(async () => {
  await getMeetingReminderDeliveriesCollection().deleteMany({
    meetingId: { $in: createdMeetingIds },
  });
  await getMeetingsCollection().deleteMany({ _id: { $in: createdMeetingIds } });
  await getUsersCollection().deleteMany({ _id: { $in: TEST_USER_IDS } });
});

describe("meeting reminder delivery", () => {
  it("adds extra reminder addresses and deduplicates internal recipients", async () => {
    const extraEmail = "lab.staff@test.local";
    const meeting = await insertMeeting({
      additionalReminderEmails: [
        extraEmail,
        `${PARTICIPANT_ID.toString()}@test.local`.toUpperCase(),
        "  Lab.Staff@Test.Local  ",
        "not-an-email",
      ],
    });
    const { adapter, messages } = fakeAdapter();

    await run({ adapter });

    const recipients = messages.map((message) => message.recipient.email);
    expect(recipients.sort()).toEqual(
      [
        `${ORGANIZER_ID.toString()}@test.local`,
        `${PARTICIPANT_ID.toString()}@test.local`,
        extraEmail,
      ].sort(),
    );
    expect(recipients.filter((email) => email === extraEmail)).toHaveLength(1);
    expect(recipients).not.toContain("not-an-email");

    const extraDelivery = (await deliveriesFor(meeting._id!)).find(
      (delivery) => delivery.recipientId === `email:${extraEmail}`,
    );
    expect(extraDelivery?.recipientKind).toBe("USER");
  });

  it("sends one 24-hour reminder to the organizer and active participant only", async () => {
    const meeting = await insertMeeting();
    const { adapter, messages } = fakeAdapter();

    const first = await run({ adapter });
    const second = await run({ adapter });

    expect(first.scannedMeetings).toBeGreaterThanOrEqual(1);
    expect(second.sent).toBe(0);
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.recipient.email).sort()).toEqual(
      [
        `${ORGANIZER_ID.toString()}@test.local`,
        `${PARTICIPANT_ID.toString()}@test.local`,
      ].sort(),
    );
    expect(
      messages.some((message) => message.recipient.email.includes("external")),
    ).toBe(false);
    expect(
      messages.some((message) => message.recipient.email.includes("d004")),
    ).toBe(false);

    const deliveries = await deliveriesFor(meeting._id!);
    expect(deliveries).toHaveLength(4);
    expect(
      deliveries.filter((delivery) => delivery.status === "sent"),
    ).toHaveLength(2);
    expect(
      deliveries.filter((delivery) => delivery.status === "pending"),
    ).toHaveLength(2);
  });

  it("deduplicates an organizer who is also a participant", async () => {
    const meeting = await insertMeeting({
      participantIds: [ORGANIZER_ID, PARTICIPANT_ID, ORGANIZER_ID],
    });
    const { adapter, messages } = fakeAdapter();

    await run({ adapter });

    expect(messages).toHaveLength(2);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(deliveries).toHaveLength(4);
  });

  it("excludes inactive participants", async () => {
    const meeting = await insertMeeting({
      participantIds: [INACTIVE_ID],
    });
    const { adapter, messages } = fakeAdapter();

    await run({ adapter });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.recipient.email).toBe(
      `${ORGANIZER_ID.toString()}@test.local`,
    );
    const deliveries = await deliveriesFor(meeting._id!);
    expect(deliveries).toHaveLength(2);
  });

  it("cancels obsolete pending reminders and creates a new schedule after reschedule", async () => {
    const meeting = await insertMeeting();
    const { adapter, messages } = fakeAdapter();

    await run({ adapter });
    expect(messages).toHaveLength(2);

    const newStartAt = new Date(NOW.getTime() + 48 * 60 * 60_000);
    await getMeetingsCollection().updateOne(
      { _id: meeting._id! },
      {
        $set: {
          startAt: newStartAt,
          endAt: new Date(newStartAt.getTime() + 60 * 60_000),
          updatedAt: NOW,
        },
      },
    );

    await run({ adapter });

    const afterReschedule = await deliveriesFor(meeting._id!);
    expect(
      afterReschedule.filter((delivery) => delivery.status === "sent"),
    ).toHaveLength(2);
    expect(
      afterReschedule.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(2);

    const nextNow = new Date(NOW.getTime() + 24 * 60 * 60_000);
    await run({ adapter, now: nextNow });
    expect(messages).toHaveLength(4);

    const afterNewSchedule = await deliveriesFor(meeting._id!);
    expect(
      afterNewSchedule.filter((delivery) => delivery.status === "sent"),
    ).toHaveLength(4);
  });

  it("cancels pending reminders when the meeting is cancelled without sending more", async () => {
    const meeting = await insertMeeting();
    const { adapter, messages } = fakeAdapter();

    await run({ adapter });
    expect(messages).toHaveLength(2);

    await getMeetingsCollection().updateOne(
      { _id: meeting._id! },
      { $set: { cancelledAt: NOW, cancelledBy: ORGANIZER_ID, updatedAt: NOW } },
    );
    await run({ adapter });

    expect(messages).toHaveLength(2);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(
      deliveries.filter((delivery) => delivery.status === "pending"),
    ).toHaveLength(0);
    expect(
      deliveries.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(2);
  });

  it("cancels orphaned pending reminders after a hard delete", async () => {
    const meeting = await insertMeeting();
    const { adapter, messages } = fakeAdapter();

    await run({ adapter });
    expect(messages).toHaveLength(2);

    await getMeetingsCollection().deleteOne({ _id: meeting._id! });
    await run({ adapter });

    expect(messages).toHaveLength(2);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(
      deliveries.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(2);
  });

  it("retries an explicit 429 rejection with backoff", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const { adapter, send } = fakeAdapter({
      sequence: [
        {
          disposition: "retryable",
          provider: "test",
          httpStatus: 429,
          reason: "provider_error",
        },
        {
          disposition: "accepted",
          provider: "test",
          providerMessageId: "retry-success",
        },
      ],
    });

    await run({ adapter });
    const scheduled = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(scheduled).toMatchObject({ status: "pending", attempts: 1 });
    expect(scheduled?.nextAttemptAt).toBeInstanceOf(Date);

    await run({ adapter, now: new Date(NOW.getTime() + 61_000) });
    const refreshed = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(refreshed).toMatchObject({ status: "sent", attempts: 2 });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("marks ambiguous failures as unknown and never retries them", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const { adapter, messages } = fakeAdapter({
      result: {
        disposition: "ambiguous",
        provider: "test",
        reason: "connection_failed",
      },
    });

    await run({ adapter });
    await run({ adapter, now: new Date(NOW.getTime() + 10 * 60_000) });

    expect(messages).toHaveLength(1);
    const delivery = (await deliveriesFor(meeting._id!)).find(
      (row) => row.intervalMinutes === 1440,
    );
    expect(delivery).toMatchObject({
      status: "unknown",
      lastFailureReason: "connection_failed",
    });
  });

  it("allows only one worker instance to claim a delivery", async () => {
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
        channel: "EMAIL",
      },
      "pending",
      NOW,
    );
    expect(inserted.created).toBe(true);

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
    const { adapter, messages } = fakeAdapter();

    await Promise.all([
      run({ adapter, instanceId: "instance-a" }),
      run({ adapter, instanceId: "instance-b" }),
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
        channel: "EMAIL",
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

});

describe("WhatsApp channel", () => {
  it("requires a valid number and active consent", async () => {
    const meeting = await insertMeeting({
      participantIds: [PARTICIPANT_ID, UNVERIFIED_ID, DELEGATE_ID],
    });
    const { adapter, messages } = fakeAdapter({ channel: "WHATSAPP" });

    await run({ adapter });

    expect(messages.map((message) => message.recipient.userId).sort()).toEqual(
      [
        ORGANIZER_ID.toString(),
        PARTICIPANT_ID.toString(),
      ].sort(),
    );
    expect(await deliveriesFor(meeting._id!)).toHaveLength(4);
  });

  it("cancels pending deliveries when consent is revoked", async () => {
    const meeting = await insertMeeting({
      participantIds: [],
      startAt: new Date(NOW.getTime() + 25 * 60 * 60_000),
      endAt: new Date(NOW.getTime() + 26 * 60 * 60_000),
    });
    const { adapter, messages } = fakeAdapter({ channel: "WHATSAPP" });

    await run({ adapter });
    expect(messages).toHaveLength(0);
    expect(
      (await deliveriesFor(meeting._id!)).filter(
        (delivery) => delivery.status === "pending",
      ),
    ).toHaveLength(2);

    await getUsersCollection().updateOne(
      { _id: ORGANIZER_ID },
      { $set: { whatsappOptIn: false, whatsappOptInAt: null } },
    );
    await run({ adapter, now: new Date(NOW.getTime() + 60 * 60_000 + 1) });

    expect(messages).toHaveLength(0);
    const deliveries = await deliveriesFor(meeting._id!);
    expect(
      deliveries.filter((delivery) => delivery.status === "pending"),
    ).toHaveLength(0);
    expect(
      deliveries.filter((delivery) => delivery.status === "cancelled"),
    ).toHaveLength(2);
    expect(
      deliveries.every(
        (delivery) => delivery.lastFailureReason === "recipient_ineligible",
      ),
    ).toBe(true);
  });

  it("treats historical EMAIL rows without a channel as EMAIL", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    await getMeetingReminderDeliveriesCollection().insertOne({
      meetingId: meeting._id!,
      meetingStartAt: meeting.startAt,
      intervalMinutes: 1440,
      recipientKind: "USER",
      recipientId: ORGANIZER_ID.toString(),
      scheduledFor: NOW,
      status: "sent",
      attempts: 1,
      nextAttemptAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastAttemptAt: NOW,
      sentAt: NOW,
      provider: "legacy-email",
      providerMessageId: "legacy-email-message",
      lastFailureReason: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const { adapter, messages } = fakeAdapter();
    await run({ adapter });

    expect(messages).toHaveLength(0);
    const deliveries = await deliveriesFor(meeting._id!);
    const day = deliveries.filter(
      (delivery) => delivery.intervalMinutes === 1440,
    );
    expect(day).toHaveLength(1);
    expect(day[0]?.status).toBe("sent");
    expect(deliveries).toHaveLength(2);
  });

  it("does not let historical EMAIL deliveries suppress WHATSAPP", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const scheduledFor = new Date(NOW.getTime());
    await getMeetingReminderDeliveriesCollection().insertOne({
      meetingId: meeting._id!,
      meetingStartAt: meeting.startAt,
      intervalMinutes: 1440,
      recipientKind: "USER",
      recipientId: ORGANIZER_ID.toString(),
      scheduledFor,
      channel: "EMAIL",
      status: "sent",
      attempts: 1,
      nextAttemptAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastAttemptAt: NOW,
      sentAt: NOW,
      provider: "legacy-email",
      providerMessageId: "legacy-email-message",
      lastFailureReason: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const { adapter, messages } = fakeAdapter({ channel: "WHATSAPP" });
    await run({ adapter });

    expect(messages).toHaveLength(1);
    const deliveries = await deliveriesFor(meeting._id!);
    const whatsapp = deliveries.find(
      (delivery) =>
        delivery.channel === "WHATSAPP" && delivery.intervalMinutes === 1440,
    );
    const email = deliveries.find(
      (delivery) =>
        delivery.channel === "EMAIL" && delivery.intervalMinutes === 1440,
    );
    expect(whatsapp?.status).toBe("sent");
    expect(email?.status).toBe("sent");
    expect(deliveries).toHaveLength(3);
  });

  it("cancels pending EMAIL deliveries after switching channels", async () => {
    const meeting = await insertMeeting({
      participantIds: [],
      startAt: new Date(NOW.getTime() + 25 * 60 * 60_000),
      endAt: new Date(NOW.getTime() + 26 * 60 * 60_000),
    });
    const { adapter: emailAdapter, messages } = fakeAdapter();
    await run({ adapter: emailAdapter });
    expect(messages).toHaveLength(0);

    const { adapter: whatsappAdapter } = fakeAdapter({ channel: "WHATSAPP" });
    await run({ adapter: whatsappAdapter });

    const blocked = await deliveriesFor(meeting._id!);
    expect(
      blocked.filter((delivery) => delivery.channel === "WHATSAPP"),
    ).toHaveLength(0);
    expect(
      blocked.filter(
        (delivery) =>
          delivery.channel !== "WHATSAPP" && delivery.status === "pending",
      ),
    ).toHaveLength(2);

    await run({
      adapter: whatsappAdapter,
      now: new Date(
        NOW.getTime() + meetingReminderChannelLeaseMs(config.pollMs) + 1,
      ),
    });

    const deliveries = await deliveriesFor(meeting._id!);
    const emailPending = deliveries.filter(
      (delivery) =>
        delivery.channel !== "WHATSAPP" && delivery.status === "pending",
    );
    const emailCancelled = deliveries.filter(
      (delivery) =>
        delivery.channel !== "WHATSAPP" && delivery.status === "cancelled",
    );
    expect(emailPending).toHaveLength(0);
    expect(emailCancelled).toHaveLength(2);
    expect(
      deliveries.filter(
        (delivery) =>
          delivery.channel === "WHATSAPP" && delivery.status === "pending",
      ),
    ).toHaveLength(2);
  });
  it("does not let EMAIL and WHATSAPP cycles run as different channels concurrently", async () => {
    const meeting = await insertMeeting({
      participantIds: [],
      startAt: new Date(NOW.getTime() + 25 * 60 * 60_000),
      endAt: new Date(NOW.getTime() + 26 * 60 * 60_000),
    });
    const email = fakeAdapter();
    const whatsapp = fakeAdapter({ channel: "WHATSAPP" });

    await Promise.all([
      run({ adapter: email.adapter, instanceId: "email-instance" }),
      run({ adapter: whatsapp.adapter, instanceId: "whatsapp-instance" }),
    ]);

    const deliveries = await deliveriesFor(meeting._id!);
    const emailRows = deliveries.filter(
      (delivery) => delivery.channel !== "WHATSAPP",
    );
    const whatsappRows = deliveries.filter(
      (delivery) => delivery.channel === "WHATSAPP",
    );
    expect(emailRows.length === 0 || whatsappRows.length === 0).toBe(true);
    expect(deliveries).toHaveLength(2);
    expect(email.messages).toHaveLength(0);
    expect(whatsapp.messages).toHaveLength(0);
  });
});

describe("channel availability", () => {
  it("runs cleanup without dispatching when the adapter is unavailable", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const inserted = await insertReminderDeliveryIfAbsent(
      {
        meetingId: meeting._id!,
        meetingStartAt: meeting.startAt,
        intervalMinutes: 1440,
        recipientKind: "USER",
        recipientId: ORGANIZER_ID.toString(),
        scheduledFor: NOW,
        channel: "EMAIL",
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

    const { adapter, messages } = fakeAdapter({ configured: false });
    const summary = await run({
      adapter,
      now: new Date(NOW.getTime() + config.leaseMs + 1),
    });

    expect(messages).toHaveLength(0);
    expect(summary.unknown).toBe(1);
    const delivery = await getMeetingReminderDeliveriesCollection().findOne({
      _id: inserted.delivery._id,
    });
    expect(delivery?.status).toBe("unknown");
    expect(await deliveriesFor(meeting._id!)).toHaveLength(1);
  });
});

describe("delivery upsert", () => {
  it("reports creation only once and can revive a cancelled delivery", async () => {
    const meeting = await insertMeeting({ participantIds: [] });
    const key = {
      meetingId: meeting._id!,
      meetingStartAt: meeting.startAt,
      intervalMinutes: 1440 as const,
      recipientKind: "USER" as const,
      recipientId: ORGANIZER_ID.toString(),
      scheduledFor: NOW,
      channel: "WHATSAPP" as const,
    };

    const first = await insertReminderDeliveryIfAbsent(key, "pending", NOW);
    const second = await insertReminderDeliveryIfAbsent(key, "pending", NOW);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.delivery._id?.toString()).toBe(
      first.delivery._id?.toString(),
    );

    await getMeetingReminderDeliveriesCollection().updateOne(
      { _id: first.delivery._id },
      { $set: { status: "cancelled", updatedAt: NOW } },
    );
    await expect(reviveCancelledReminderDelivery(key, NOW)).resolves.toBe(true);
    const revived = await getMeetingReminderDeliveriesCollection().findOne({
      _id: first.delivery._id,
    });
    expect(revived?.status).toBe("pending");
  });
});
