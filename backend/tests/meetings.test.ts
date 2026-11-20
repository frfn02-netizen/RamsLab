import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { CURRENT_LAB_ID } from "../src/config/lab.js";
import {
  addMeetingAttachment,
  getMeetingsCollection,
} from "../src/modules/meetings/meeting.repository.js";
import { MAX_MEETING_ATTACHMENTS } from "../src/modules/meetings/meeting.schema.js";
import type { MeetingAttachment } from "../src/modules/meetings/meeting.types.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { getLabMembershipsCollection } from "../src/modules/lab-memberships/lab-membership.repository.js";
import {
  ensureTestUsers,
  restoreUserFixtures,
  signTestToken,
  snapshotUserFixtures,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
  TEST_ALUMNI_USER_ID,
} from "./auth-fixture.js";

const OTHER_DOSEN_ID = "00000000000000000000b004";
const TITLE_PREFIX = "Vitest Meetings API";
const OFFLINE_MEETING = {
  clientName: "RAMS Test Client",
  mode: "OFFLINE" as const,
  location: "RAMS Meeting Room",
};
const ONLINE_MEETING = {
  clientName: "RAMS Test Client",
  mode: "ONLINE" as const,
};

let creatorToken: string;
let otherDosenToken: string;
let adminToken: string;
let alumniToken: string;
let meetingId: string;
let databaseReady = false;
let userFixtureSnapshotReady = false;
let userFixtureSnapshots: Awaited<ReturnType<typeof snapshotUserFixtures>> = [];

async function cleanupMeetings() {
  await getMeetingsCollection().deleteMany({
    createdBy: {
      $in: [
        new ObjectId(TEST_DOSEN_USER_ID),
        new ObjectId(OTHER_DOSEN_ID),
        new ObjectId(TEST_ADMIN_USER_ID),
      ],
    },
    title: { $regex: `^${TITLE_PREFIX}` },
  });
}

async function createCancellationMeeting(
  label: string,
  startAt: Date,
  endAt: Date,
  token = creatorToken,
) {
  const response = await request(app)
    .post("/api/meetings")
    .set("Cookie", `rams_access_token=${token}`)
    .send({
      ...OFFLINE_MEETING,
      title: `${TITLE_PREFIX} cancellation ${label}`,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
    });

  expect(response.status).toBe(201);
  return response.body.data.meeting._id as string;
}

function buildSeedAttachment(index: number, stamp: number): MeetingAttachment {
  return {
    id: `seed-${stamp}-${index}`,
    url: `https://res.cloudinary.com/test/raw/upload/seed-${stamp}-${index}.pdf`,
    publicId: `rams-platform/meetings/seed-${stamp}-${index}`,
    filename: `seed-${stamp}-${index}.pdf`,
    mimeType: "application/pdf",
    size: 1024,
    uploadedAt: new Date(),
  };
}

async function seedMeetingWithAttachments(count: number): Promise<string> {
  const now = new Date();
  const stamp = now.getTime();
  const result = await getMeetingsCollection().insertOne({
    title: `${TITLE_PREFIX} attachment cap ${stamp}`,
    description: "",
    startAt: new Date("2031-01-01T09:00:00.000Z"),
    endAt: new Date("2031-01-01T10:00:00.000Z"),
    createdBy: new ObjectId(TEST_DOSEN_USER_ID),
    participantIds: [],
    meetingLink: null,
    attachments: Array.from({ length: count }, (_, index) =>
      buildSeedAttachment(index, stamp),
    ),
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toHexString();
}

beforeAll(async () => {
  await connectDatabase();
  databaseReady = true;
  userFixtureSnapshots = await snapshotUserFixtures([
    TEST_ADMIN_USER_ID,
    TEST_DOSEN_USER_ID,
    TEST_ALUMNI_USER_ID,
    OTHER_DOSEN_ID,
  ]);
  userFixtureSnapshotReady = true;
  await ensureTestUsers();

  const now = new Date();
  await getUsersCollection().updateOne(
    { _id: new ObjectId(OTHER_DOSEN_ID) },
    {
      $set: {
        email: "vitest.other.dosen@test.local",
        role: "DOSEN",
        isActive: true,
        tokenVersion: 0,
        updatedAt: now,
      },
      $setOnInsert: {
        passwordHash: "not-used-by-tests",
        lastLoginAt: null,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  await cleanupMeetings();
  await getLabMembershipsCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    userId: { $in: [new ObjectId(TEST_DOSEN_USER_ID), new ObjectId(OTHER_DOSEN_ID)] },
  });
  await getLabMembershipsCollection().insertMany([
    {
      labId: CURRENT_LAB_ID,
      userId: new ObjectId(TEST_DOSEN_USER_ID),
      status: "ACTIVE",
      joinedAt: now,
      updatedAt: now,
      createdBy: new ObjectId(TEST_ADMIN_USER_ID),
      updatedBy: new ObjectId(TEST_ADMIN_USER_ID),
    },
    {
      labId: CURRENT_LAB_ID,
      userId: new ObjectId(OTHER_DOSEN_ID),
      status: "ACTIVE",
      joinedAt: now,
      updatedAt: now,
      createdBy: new ObjectId(TEST_ADMIN_USER_ID),
      updatedBy: new ObjectId(TEST_ADMIN_USER_ID),
    },
  ]);

  creatorToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
  otherDosenToken = signTestToken(OTHER_DOSEN_ID, "DOSEN");
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  alumniToken = signTestToken(TEST_ALUMNI_USER_ID, "ALUMNI");
});

afterAll(async () => {
  if (!databaseReady) return;

  try {
    await cleanupMeetings();
    await getLabMembershipsCollection().deleteMany({
      labId: CURRENT_LAB_ID,
      userId: {
        $in: [new ObjectId(TEST_DOSEN_USER_ID), new ObjectId(OTHER_DOSEN_ID)],
      },
    });
  } finally {
    if (userFixtureSnapshotReady) {
      await restoreUserFixtures(userFixtureSnapshots);
    }
  }
});

describe("Meetings API", () => {
  it("creates a meeting with participants as an authenticated dosen", async () => {
    const response = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...ONLINE_MEETING,
        title: `${TITLE_PREFIX} kickoff`,
        description: "First planning session",
        startAt: "2030-03-01T09:00:00.000Z",
        endAt: "2030-03-01T10:00:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
        meetingLink: "https://meet.google.com/abc-defg-hij",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    meetingId = response.body.data.meeting._id;
    expect(response.body.data.meeting.title).toBe(`${TITLE_PREFIX} kickoff`);
    expect(response.body.data.meeting.visibility).toBe("INTERNAL");
    expect(response.body.data.meeting.status).toBe("UPCOMING");
    expect(response.body.data.meeting.canEdit).toBe(true);
    expect(response.body.data.meeting.participants).toHaveLength(1);
    expect(response.body.data.meeting).not.toHaveProperty(
      "externalParticipants",
    );
    expect(response.body.data.conflicts).toEqual([]);
  });

  it("derives status, records audit history, and cancels explicitly", async () => {
    const response = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} status audit`,
        startAt: "2032-03-01T09:00:00.000Z",
        endAt: "2032-03-01T10:00:00.000Z",
        participantIds: [OTHER_DOSEN_ID],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.meeting.status).toBe("UPCOMING");
    const id = response.body.data.meeting._id as string;

    const participantAudit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(participantAudit.status).toBe(200);
    expect(participantAudit.body.data).toHaveLength(1);
    expect(participantAudit.body.data[0]).toEqual(
      expect.objectContaining({
        action: "CREATE",
        actorId: TEST_DOSEN_USER_ID,
      }),
    );

    const failedUpdate = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ endAt: "2032-03-01T08:00:00.000Z" });
    expect(failedUpdate.status).toBe(400);

    const afterFailedUpdate = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(afterFailedUpdate.body.data).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ title: `${TITLE_PREFIX} status audit updated` });
    expect(updated.status).toBe(200);

    const unauthorizedCancel = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({ reason: "Not the organizer" });
    expect(unauthorizedCancel.status).toBe(403);

    const cancelled = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ reason: "Schedule changed" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");
    expect(cancelled.body.data.cancellationReason).toBe("Schedule changed");

    const audit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.map((entry: { action: string }) => entry.action)).toEqual([
      "CANCEL",
      "UPDATE",
      "CREATE",
    ]);
    expect(audit.body.data[0].changes.status).toEqual({
      oldValue: "UPCOMING",
      newValue: "CANCELLED",
    });

    const repeatedCancel = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({});
    expect(repeatedCancel.status).toBe(409);
  });

  it("allows cancellation of an upcoming meeting", async () => {
    const now = Date.now();
    const id = await createCancellationMeeting(
      "upcoming",
      new Date(now + 60 * 60 * 1000),
      new Date(now + 2 * 60 * 60 * 1000),
    );

    const response = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
  });

  it("allows cancellation of an ongoing meeting", async () => {
    const now = Date.now();
    const id = await createCancellationMeeting(
      "ongoing",
      new Date(now - 60 * 60 * 1000),
      new Date(now + 60 * 60 * 1000),
    );

    const response = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
  });

  it("rejects cancellation of a past meeting with the ended error contract", async () => {
    const now = Date.now();
    const id = await createCancellationMeeting(
      "past",
      new Date(now - 2 * 60 * 60 * 1000),
      new Date(now - 60 * 60 * 1000),
    );

    const response = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MEETING_ALREADY_ENDED");
    expect(response.body.message).toBe(
      "Meeting has already ended and cannot be cancelled.",
    );

    const stored = await getMeetingsCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.cancelledAt).toBeUndefined();
  });

  it("rejects cancellation when the end time equals the server time", async () => {
    const exactNow = new Date("2040-06-01T12:00:00.000Z");
    vi.useFakeTimers({ now: exactNow, toFake: ["Date"] });

    try {
      const exactTimeToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
      const id = await createCancellationMeeting(
        "exact-boundary",
        new Date(exactNow.getTime() - 60 * 60 * 1000),
        exactNow,
        exactTimeToken,
      );

      const response = await request(app)
        .post(`/api/meetings/${id}/cancel`)
        .set("Cookie", `rams_access_token=${exactTimeToken}`)
        .send({});

      expect(response.status).toBe(409);
      expect(response.body.code).toBe("MEETING_ALREADY_ENDED");
      expect(response.body.message).toBe(
        "Meeting has already ended and cannot be cancelled.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a second cancellation of an already cancelled meeting", async () => {
    const now = Date.now();
    const id = await createCancellationMeeting(
      "idempotency",
      new Date(now + 60 * 60 * 1000),
      new Date(now + 2 * 60 * 60 * 1000),
    );

    const first = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({});
    const second = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({});

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.message).toBe("Meeting is already cancelled");
  });

  it("keeps unauthorized cancellation rejected", async () => {
    const now = Date.now();
    const id = await createCancellationMeeting(
      "unauthorized",
      new Date(now + 60 * 60 * 1000),
      new Date(now + 2 * 60 * 60 * 1000),
    );

    const response = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({});

    expect(response.status).toBe(403);
  });

  it("creates only one cancellation audit event for concurrent requests", async () => {
    const now = Date.now();
    const id = await createCancellationMeeting(
      "concurrent",
      new Date(now + 60 * 60 * 1000),
      new Date(now + 2 * 60 * 60 * 1000),
    );

    const responses = await Promise.all(
      [creatorToken, creatorToken].map((token) =>
        request(app)
          .post(`/api/meetings/${id}/cancel`)
          .set("Cookie", `rams_access_token=${token}`)
          .send({}),
      ),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([
      200,
      409,
    ]);

    const audit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(audit.status).toBe(200);
    expect(
      audit.body.data.filter((entry: { action: string }) => entry.action === "CANCEL"),
    ).toHaveLength(1);
  });

  it("lists the meeting for the creator and participant", async () => {
    const creatorList = await request(app)
      .get("/api/meetings?from=2030-02-25T00:00:00.000Z&to=2030-03-05T00:00:00.000Z")
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(creatorList.status).toBe(200);
    expect(creatorList.body.data.map((item: { _id: string }) => item._id)).toContain(
      meetingId,
    );

    const adminList = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.data.map((item: { _id: string }) => item._id)).toContain(
      meetingId,
    );
  });

  it("exposes shared internal calendar fields to an unrelated dosen", async () => {
    const response = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-02-25T00:00:00.000Z&to=2030-03-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${otherDosenToken}`);

    expect(response.status).toBe(200);
    const event = response.body.data.find(
      (item: { _id: string }) => item._id === meetingId,
    );
    expect(event).toEqual(
      expect.objectContaining({
        _id: meetingId,
        title: `${TITLE_PREFIX} kickoff`,
        startAt: "2030-03-01T09:00:00.000Z",
        endAt: "2030-03-01T10:00:00.000Z",
        canViewDetails: true,
        clientName: "RAMS Test Client",
        mode: "ONLINE",
        location: null,
      }),
    );
    expect(event.createdBy).toBeTruthy();
    expect(event).not.toHaveProperty("description");
    expect(event).not.toHaveProperty("meetingLink");
    expect(event).not.toHaveProperty("attachments");
    expect(event).not.toHaveProperty("participants");
    expect(event).not.toHaveProperty("externalParticipants");

    const creatorCalendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-02-25T00:00:00.000Z&to=2030-03-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${creatorToken}`);
    const creatorEvent = creatorCalendar.body.data.find(
      (item: { _id: string }) => item._id === meetingId,
    );
    expect(creatorEvent).toEqual(
      expect.objectContaining({
        clientName: "RAMS Test Client",
        mode: "ONLINE",
        location: null,
        canViewDetails: true,
      }),
    );
    expect(creatorEvent).not.toHaveProperty("meetingLink");
    expect(creatorEvent).not.toHaveProperty("participants");
    expect(creatorEvent).not.toHaveProperty("participantIds");
    expect(creatorEvent).not.toHaveProperty("attachments");
    expect(creatorEvent).not.toHaveProperty("description");
  });

  it("returns mode, client, and location on an authorized INTERNAL calendar event", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} internal offline calendar`,
        startAt: "2040-07-01T09:00:00.000Z",
        endAt: "2040-07-01T10:00:00.000Z",
        participantIds: [],
      });
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const calendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2040-06-25T00:00:00.000Z&to=2040-07-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(calendar.status).toBe(200);
    const event = calendar.body.data.find(
      (item: { _id: string }) => item._id === id,
    );
    expect(event).toEqual(
      expect.objectContaining({
        clientName: "RAMS Test Client",
        mode: "OFFLINE",
        location: "RAMS Meeting Room",
        canViewDetails: true,
      }),
    );
    expect(event).not.toHaveProperty("meetingLink");
    expect(event).not.toHaveProperty("participants");
    expect(event).not.toHaveProperty("participantIds");
    expect(event).not.toHaveProperty("attachments");
    expect(event).not.toHaveProperty("description");
  });

  it("renders private meetings as Busy for non-participants and preserves participant details", async () => {
    const privateMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...ONLINE_MEETING,
        title: `${TITLE_PREFIX} private block`,
        description: "Private agenda must not enter the calendar response",
        startAt: "2030-05-01T09:00:00.000Z",
        endAt: "2030-05-01T10:00:00.000Z",
        visibility: "PRIVATE",
        participantIds: [],
        meetingLink: "https://meet.google.com/private-link",
      });

    expect(privateMeeting.status).toBe(201);
    expect(privateMeeting.body.data.meeting.visibility).toBe("PRIVATE");
    const privateId = privateMeeting.body.data.meeting._id as string;

    const calendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-04-25T00:00:00.000Z&to=2030-05-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(calendar.status).toBe(200);
    const busy = calendar.body.data.find(
      (item: { _id: string }) => item._id === privateId,
    );
    expect(busy).toEqual({
      _id: privateId,
      title: "Busy",
      startAt: "2030-05-01T09:00:00.000Z",
      endAt: "2030-05-01T10:00:00.000Z",
      createdBy: null,
      canViewDetails: false,
    });
    expect(JSON.stringify(busy)).not.toContain("Private agenda");
    expect(JSON.stringify(busy)).not.toContain("private-link");

    const creatorDetail = await request(app)
      .get(`/api/meetings/${privateId}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(creatorDetail.status).toBe(200);
    expect(creatorDetail.body.data.description).toContain("Private agenda");
    expect(creatorDetail.body.data.meetingLink).toContain("private-link");

    const adminCalendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-04-25T00:00:00.000Z&to=2030-05-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${adminToken}`);
    const adminEvent = adminCalendar.body.data.find(
      (item: { _id: string }) => item._id === privateId,
    );
    expect(adminEvent).toEqual(
      expect.objectContaining({
        title: `${TITLE_PREFIX} private block`,
        canViewDetails: true,
        clientName: "RAMS Test Client",
        mode: "ONLINE",
        location: null,
      }),
    );
    expect(adminEvent).not.toHaveProperty("description");
    expect(adminEvent).not.toHaveProperty("meetingLink");
    expect(adminEvent).not.toHaveProperty("attachments");
    expect(adminEvent).not.toHaveProperty("externalParticipants");
    expect(adminEvent).not.toHaveProperty("participants");
    expect(adminEvent).not.toHaveProperty("participantIds");

    const participantMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} private participant`,
        description: "Participant-only agenda",
        startAt: "2030-06-01T09:00:00.000Z",
        endAt: "2030-06-01T10:00:00.000Z",
        visibility: "PRIVATE",
        participantIds: [OTHER_DOSEN_ID],
      });
    expect(participantMeeting.status).toBe(201);
    const participantMeetingId = participantMeeting.body.data.meeting
      ._id as string;

    const participantCalendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-05-25T00:00:00.000Z&to=2030-06-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    const participantEvent = participantCalendar.body.data.find(
      (item: { _id: string }) => item._id === participantMeetingId,
    );
    expect(participantEvent).toEqual(
      expect.objectContaining({
        title: `${TITLE_PREFIX} private participant`,
        canViewDetails: true,
        clientName: "RAMS Test Client",
        mode: "OFFLINE",
        location: "RAMS Meeting Room",
      }),
    );
    expect(participantEvent).not.toHaveProperty("meetingLink");
    expect(participantEvent).not.toHaveProperty("participants");
    expect(participantEvent).not.toHaveProperty("participantIds");

    const participantDetail = await request(app)
      .get(`/api/meetings/${participantMeetingId}`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(participantDetail.status).toBe(200);
    expect(participantDetail.body.data.description).toBe(
      "Participant-only agenda",
    );
  });

  it("keeps ownership creator-only and removes delegation endpoints", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} creator ownership`,
        description: "Only the creator may manage this meeting",
        startAt: "2034-08-01T09:00:00.000Z",
        endAt: "2034-08-01T10:00:00.000Z",
        visibility: "PRIVATE",
        participantIds: [],
      });

    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;
    expect(created.body.data.meeting.createdBy.id).toBe(TEST_DOSEN_USER_ID);
    expect(created.body.data.meeting).not.toHaveProperty("organizerId");
    expect(created.body.data.meeting).not.toHaveProperty("delegatedUserIds");
    expect(created.body.data.meeting).not.toHaveProperty("isDelegate");
    expect(created.body.data.meeting.canEdit).toBe(true);
    expect(created.body.data.meeting.canCancel).toBe(true);
    expect(created.body.data.meeting.canDelete).toBe(true);

    const removedAssign = await request(app)
      .post(`/api/meetings/${id}/delegates`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ userId: OTHER_DOSEN_ID });
    expect(removedAssign.status).toBe(404);

    const removedRevoke = await request(app)
      .delete(`/api/meetings/${id}/delegates/${OTHER_DOSEN_ID}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(removedRevoke.status).toBe(404);

    const removedGuestManagement = await request(app)
      .post(`/api/meetings/${id}/guest-invitations`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ externalParticipantId: "legacy-guest" });
    expect(removedGuestManagement.status).toBe(404);

    const removedGuestLookup = await request(app).get(
      "/api/meeting-guests/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(removedGuestLookup.status).toBe(404);

    const unrelatedDetail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(unrelatedDetail.status).toBe(403);

    const unrelatedUpdate = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({ title: `${TITLE_PREFIX} hijacked` });
    expect(unrelatedUpdate.status).toBe(403);

    const unrelatedCancel = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({ reason: "Not the creator" });
    expect(unrelatedCancel.status).toBe(403);

    const updated = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} creator update`,
        createdBy: OTHER_DOSEN_ID,
        organizerId: OTHER_DOSEN_ID,
        delegatedUserIds: [OTHER_DOSEN_ID],
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.meeting.createdBy.id).toBe(TEST_DOSEN_USER_ID);
    expect(updated.body.data.meeting).not.toHaveProperty("organizerId");
    expect(updated.body.data.meeting).not.toHaveProperty("delegatedUserIds");

    const audit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.map((entry: { action: string }) => entry.action)).toEqual([
      "UPDATE",
      "CREATE",
    ]);
  });

  it("treats legacy meetings without visibility as private on the calendar", async () => {
    const now = new Date();
    const legacy = await getMeetingsCollection().insertOne({
      title: `${TITLE_PREFIX} legacy private`,
      description: "Legacy confidential agenda",
      startAt: new Date("2030-07-01T09:00:00.000Z"),
      endAt: new Date("2030-07-01T10:00:00.000Z"),
      createdBy: new ObjectId(TEST_DOSEN_USER_ID),
      participantIds: [],
      externalParticipants: [
        {
          id: "legacy-external",
          fullName: "Legacy private contact",
          email: "legacy-contact@example.com",
        },
      ],
      meetingLink: "https://meet.google.com/legacy-private",
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });

    const calendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-06-25T00:00:00.000Z&to=2030-07-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(calendar.status).toBe(200);
    const busy = calendar.body.data.find(
      (item: { _id: string }) => item._id === legacy.insertedId.toHexString(),
    );
    expect(busy).toEqual(
      expect.objectContaining({
        title: "Busy",
        createdBy: null,
        canViewDetails: false,
      }),
    );
    expect(JSON.stringify(busy)).not.toContain("Legacy confidential agenda");
    expect(JSON.stringify(busy)).not.toContain("legacy-private");
    expect(JSON.stringify(busy)).not.toContain("legacy-contact@example.com");
    expect(busy).not.toHaveProperty("status");

    const detail = await request(app)
      .get(`/api/meetings/${legacy.insertedId.toHexString()}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.visibility).toBe("PRIVATE");
    expect(detail.body.data.description).toBe("Legacy confidential agenda");
    expect(detail.body.data.createdBy.id).toBe(TEST_DOSEN_USER_ID);
    expect(detail.body.data).not.toHaveProperty("organizerId");
    expect(detail.body.data).not.toHaveProperty("organizer");
    expect(detail.body.data).not.toHaveProperty("delegatedUserIds");

    const creatorCalendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2030-06-25T00:00:00.000Z&to=2030-07-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${creatorToken}`);
    const legacyEvent = creatorCalendar.body.data.find(
      (item: { _id: string }) =>
        item._id === legacy.insertedId.toHexString(),
    );
    expect(legacyEvent).toEqual(
      expect.objectContaining({
        canViewDetails: true,
        clientName: null,
        mode: null,
        location: null,
      }),
    );
    expect(legacyEvent).not.toHaveProperty("meetingLink");
    expect(legacyEvent).not.toHaveProperty("participants");
    expect(legacyEvent).not.toHaveProperty("participantIds");
  });

  it("does not treat a mismatched legacy organizerId as active ownership", async () => {
    const now = new Date();
    const legacy = await getMeetingsCollection().insertOne({
      title: `${TITLE_PREFIX} legacy ownership mismatch`,
      description: "Legacy ownership must remain inert",
      startAt: new Date("2030-07-01T09:00:00.000Z"),
      endAt: new Date("2030-07-01T10:00:00.000Z"),
      createdBy: new ObjectId(OTHER_DOSEN_ID),
      organizerId: new ObjectId(TEST_DOSEN_USER_ID),
      participantIds: [],
      externalParticipants: [],
      meetingLink: null,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });
    const id = legacy.insertedId.toHexString();

    const list = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((item: { _id: string }) => item._id)).not.toContain(
      id,
    );

    const detail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(detail.status).toBe(403);

    const update = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ title: `${TITLE_PREFIX} unauthorized legacy update` });
    expect(update.status).toBe(403);

    const cancel = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ reason: "Unauthorized legacy cancellation" });
    expect(cancel.status).toBe(403);

    const remove = await request(app)
      .delete(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(remove.status).toBe(403);

    const adminDetail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(adminDetail.status).toBe(200);
    expect(adminDetail.body.data.createdBy.id).toBe(OTHER_DOSEN_ID);
  });

  it("keeps own-meeting lists scoped while allowing shared internal detail", async () => {
    const list = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.map((item: { _id: string }) => item._id)).not.toContain(
      meetingId,
    );

    const detail = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.title).toBe(`${TITLE_PREFIX} kickoff`);
    expect(detail.body.data.canEdit).toBe(false);
  });

  it("allows an admin to read and an unrelated dosen to be rejected on update", async () => {
    const detail = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(detail.status).toBe(200);

    const forbidden = await request(app)
      .patch(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({ title: `${TITLE_PREFIX} hijacked` });
    expect(forbidden.status).toBe(403);
  });

  it("detects a conflicting meeting that shares a participant", async () => {
    const response = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} overlap`,
        startAt: "2030-03-01T09:30:00.000Z",
        endAt: "2030-03-01T10:30:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.conflicts).toHaveLength(1);
    expect(response.body.data.conflicts[0]._id).toBe(meetingId);
  });

  it("checks conflicts without creating a meeting", async () => {
    const response = await request(app)
      .post("/api/meetings/conflicts/check")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        startAt: "2030-03-01T09:00:00.000Z",
        endAt: "2030-03-01T09:45:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
        excludeId: meetingId,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]._id).not.toBe(meetingId);
  });

  it("returns Busy when participantIds are manipulated to probe an inaccessible meeting", async () => {
    const privateMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} conflict privacy target`,
        description: "This must not be returned by conflict checking",
        startAt: "2035-05-01T09:00:00.000Z",
        endAt: "2035-05-01T10:00:00.000Z",
        visibility: "PRIVATE",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(privateMeeting.status).toBe(201);

    const checked = await request(app)
      .post("/api/meetings/conflicts/check")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        startAt: "2035-05-01T09:15:00.000Z",
        endAt: "2035-05-01T09:45:00.000Z",
        // This id is used to detect a scheduling overlap. It must not grant
        // the requester access to the target meeting's details.
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(checked.status).toBe(200);
    expect(checked.body.data).toEqual([{ busy: true }]);
    expect(JSON.stringify(checked.body.data)).not.toContain(
      "conflict privacy target",
    );

    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} conflict privacy create`,
        startAt: "2035-05-01T09:15:00.000Z",
        endAt: "2035-05-01T09:45:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(created.status).toBe(201);
    expect(created.body.data.conflicts).toEqual([{ busy: true }]);

    const internalMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${otherDosenToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} internal conflict privacy target`,
        startAt: "2035-06-01T09:00:00.000Z",
        endAt: "2035-06-01T10:00:00.000Z",
        visibility: "INTERNAL",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(internalMeeting.status).toBe(201);

    const internalChecked = await request(app)
      .post("/api/meetings/conflicts/check")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        startAt: "2035-06-01T09:15:00.000Z",
        endAt: "2035-06-01T09:45:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(internalChecked.status).toBe(200);
    expect(internalChecked.body.data).toEqual([
      expect.objectContaining({
        busy: false,
        title: `${TITLE_PREFIX} internal conflict privacy target`,
      }),
    ]);
  });

  it("updates the meeting as the creator and ignores legacy external fields", async () => {
    const response = await request(app)
      .patch(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} updated`,
        externalParticipants: [
          { fullName: "Legacy external", organization: "Field team" },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.meeting.title).toBe(`${TITLE_PREFIX} updated`);
    expect(response.body.data.meeting).not.toHaveProperty(
      "externalParticipants",
    );
  });

  it("ignores legacy external participants and removed guest fields on create", async () => {
    const response = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        ...OFFLINE_MEETING,
        title: `${TITLE_PREFIX} legacy external ignored`,
        startAt: "2030-04-01T09:00:00.000Z",
        endAt: "2030-04-01T10:00:00.000Z",
        participantIds: [],
        guestDescription: "Legacy guest text",
        externalParticipants: [
          { fullName: "Guest without account", organization: "Field team" },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.meeting.participantIds).toEqual([]);
    expect(response.body.data.meeting.participants).toEqual([]);
    expect(response.body.data.meeting).not.toHaveProperty(
      "externalParticipants",
    );
    expect(response.body.data.meeting).not.toHaveProperty("guestDescription");
  });

  it("rejects a disallowed attachment type before upload", async () => {
    const response = await request(app)
      .post(`/api/meetings/${meetingId}/attachments`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .set("Content-Type", "text/plain")
      .set("X-Original-Filename", "notes.txt")
      .send("not allowed");

    expect(response.status).toBe(415);
  });

  it("rejects an upload once the meeting already has 10 attachments", async () => {
    const fullId = await seedMeetingWithAttachments(MAX_MEETING_ATTACHMENTS);

    const response = await request(app)
      .post(`/api/meetings/${fullId}/attachments`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .set("Content-Type", "application/pdf")
      .set("X-Original-Filename", "extra.pdf")
      .send(Buffer.from("%PDF-1.4 attachment cap test"));

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "A meeting can have at most 10 attachments",
    );

    const stored = await getMeetingsCollection().findOne({
      _id: new ObjectId(fullId),
    });
    expect(stored?.attachments).toHaveLength(MAX_MEETING_ATTACHMENTS);
  });

  it("enforces the attachment cap atomically under concurrent inserts", async () => {
    const nearFullId = await seedMeetingWithAttachments(
      MAX_MEETING_ATTACHMENTS - 1,
    );
    const attempts = 5;

    const results = await Promise.all(
      Array.from({ length: attempts }, (_, index) =>
        addMeetingAttachment(
          nearFullId,
          {
            ...buildSeedAttachment(index, Date.now()),
            id: `race-${index}`,
            publicId: `rams-platform/meetings/race-${index}`,
          },
          MAX_MEETING_ATTACHMENTS,
        ),
      ),
    );

    expect(results.filter((result) => result.status === "ok")).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "limit_reached"),
    ).toHaveLength(attempts - 1);

    const stored = await getMeetingsCollection().findOne({
      _id: new ObjectId(nearFullId),
    });
    expect(stored?.attachments).toHaveLength(MAX_MEETING_ATTACHMENTS);
  });

  it("reports not_found when adding an attachment to a missing meeting", async () => {
    const result = await addMeetingAttachment(
      new ObjectId().toHexString(),
      buildSeedAttachment(0, Date.now()),
      MAX_MEETING_ATTACHMENTS,
    );

    expect(result.status).toBe("not_found");
  });

  it("exposes a participant directory only to staff", async () => {
    const staff = await request(app)
      .get("/api/users/directory")
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(staff.status).toBe(200);
    expect(Array.isArray(staff.body.data)).toBe(true);
    expect(
      staff.body.data.some(
        (entry: { email: string }) =>
          entry.email === "vitest.dosen.account@test.local",
      ),
    ).toBe(true);

    const alumni = await request(app)
      .get("/api/users/directory")
      .set("Cookie", `rams_access_token=${alumniToken}`);
    expect(alumni.status).toBe(403);
  });

  it("denies Meetings access to alumni", async () => {
    const response = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${alumniToken}`);

    expect(response.status).toBe(403);

    const calendar = await request(app)
      .get("/api/meetings/calendar")
      .set("Cookie", `rams_access_token=${alumniToken}`);
    expect(calendar.status).toBe(403);
  });

  it("creates offline and online meetings with normalized mode fields", async () => {
    const offline = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} offline contract`,
        clientName: "  PT Offshore Client  ",
        mode: "OFFLINE",
        location: "  Meeting Room A  ",
        meetingLink: "https://meet.google.com/ignored-offline",
        startAt: "2040-01-01T09:00:00.000Z",
        endAt: "2040-01-01T10:00:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(offline.status).toBe(201);
    expect(offline.body.data.meeting).toEqual(
      expect.objectContaining({
        clientName: "PT Offshore Client",
        mode: "OFFLINE",
        location: "Meeting Room A",
        meetingLink: "https://meet.google.com/ignored-offline",
      }),
    );
    expect(offline.body.data.meeting.createdBy.id).toBe(TEST_DOSEN_USER_ID);
    expect(offline.body.data.meeting.participantIds).toEqual([
      TEST_ADMIN_USER_ID,
    ]);

    const online = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} online contract`,
        clientName: "PT Online Client",
        mode: "ONLINE",
        location: "Ignored physical room",
        meetingLink: "https://meet.google.com/online-contract",
        startAt: "2040-01-02T09:00:00.000Z",
        endAt: "2040-01-02T10:00:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
      });

    expect(online.status).toBe(201);
    expect(online.body.data.meeting).toEqual(
      expect.objectContaining({
        clientName: "PT Online Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/online-contract",
      }),
    );
  });

  it("rejects incomplete or invalid mode contracts", async () => {
    const base = {
      title: `${TITLE_PREFIX} invalid mode contract`,
      startAt: "2040-02-01T09:00:00.000Z",
      endAt: "2040-02-01T10:00:00.000Z",
      participantIds: [],
    };
    const cases = [
      {
        ...base,
        mode: "OFFLINE",
        location: "Room",
      },
      {
        ...base,
        clientName: "Client",
        mode: "HYBRID",
        location: "Room",
      },
      {
        ...base,
        clientName: "Client",
        mode: "OFFLINE",
        location: "",
      },
      {
        ...base,
        clientName: "Client",
        mode: "ONLINE",
        meetingLink: null,
      },
      {
        ...base,
        clientName: "Client",
        mode: "OFFLINE",
        location: "Room",
        meetingLink: "ftp://example.com/not-http",
      },
    ];

    for (const payload of cases) {
      const response = await request(app)
        .post("/api/meetings")
        .set("Cookie", `rams_access_token=${creatorToken}`)
        .send(payload);
      expect(response.status).toBe(400);
    }
  });

  it("validates merged meeting state across mode transitions", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} mode transition`,
        clientName: "Transition Client",
        mode: "OFFLINE",
        location: "Transition Room",
        startAt: "2040-03-01T09:00:00.000Z",
        endAt: "2040-03-01T10:00:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
      });
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const missingOnlineLink = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ mode: "ONLINE" });
    expect(missingOnlineLink.status).toBe(400);

    const online = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        mode: "ONLINE",
        meetingLink: "https://meet.google.com/transition-online",
      });
    expect(online.status).toBe(200);
    expect(online.body.data.meeting).toEqual(
      expect.objectContaining({
        clientName: "Transition Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/transition-online",
      }),
    );

    const titleOnly = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ title: `${TITLE_PREFIX} mode transition title` });
    expect(titleOnly.status).toBe(200);
    expect(titleOnly.body.data.meeting).toEqual(
      expect.objectContaining({
        title: `${TITLE_PREFIX} mode transition title`,
        clientName: "Transition Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/transition-online",
      }),
    );

    const missingOfflineLocation = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ mode: "OFFLINE" });
    expect(missingOfflineLocation.status).toBe(400);

    const offline = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ mode: "OFFLINE", location: "Transition Room 2" });
    expect(offline.status).toBe(200);
    expect(offline.body.data.meeting).toEqual(
      expect.objectContaining({
        clientName: "Transition Client",
        mode: "OFFLINE",
        location: "Transition Room 2",
        meetingLink: "https://meet.google.com/transition-online",
      }),
    );
  });

  it("serializes legacy meetings without inferring new fields", async () => {
    const now = new Date();
    const legacy = await getMeetingsCollection().insertOne({
      title: `${TITLE_PREFIX} legacy mode fields`,
      description: "Legacy meeting without mode metadata",
      startAt: new Date("2040-04-01T09:00:00.000Z"),
      endAt: new Date("2040-04-01T10:00:00.000Z"),
      createdBy: new ObjectId(TEST_DOSEN_USER_ID),
      participantIds: [new ObjectId(TEST_ADMIN_USER_ID)],
      meetingLink: "https://meet.google.com/legacy-no-mode",
      attachments: [],
      createdAt: now,
      updatedAt: now,
    });
    const id = legacy.insertedId.toHexString();

    const detail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toEqual(
      expect.objectContaining({
        clientName: null,
        mode: null,
        location: null,
        meetingLink: "https://meet.google.com/legacy-no-mode",
      }),
    );

    const updated = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ title: `${TITLE_PREFIX} legacy mode fields updated` });
    expect(updated.status).toBe(200);
    expect(updated.body.data.meeting).toEqual(
      expect.objectContaining({
        clientName: null,
        mode: null,
        location: null,
        meetingLink: "https://meet.google.com/legacy-no-mode",
      }),
    );
  });

  it("keeps mode details private for unauthorized Busy responses", async () => {
    const privateMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} private mode details`,
        clientName: "Confidential Client",
        mode: "ONLINE",
        meetingLink: "https://meet.google.com/private-mode-link",
        startAt: "2040-05-01T09:00:00.000Z",
        endAt: "2040-05-01T10:00:00.000Z",
        visibility: "PRIVATE",
        participantIds: [],
      });
    expect(privateMeeting.status).toBe(201);
    const id = privateMeeting.body.data.meeting._id as string;

    const creatorDetail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(creatorDetail.status).toBe(200);
    expect(creatorDetail.body.data).toEqual(
      expect.objectContaining({
        clientName: "Confidential Client",
        mode: "ONLINE",
        location: null,
        meetingLink: "https://meet.google.com/private-mode-link",
      }),
    );

    const calendar = await request(app)
      .get(
        "/api/meetings/calendar?from=2040-04-25T00:00:00.000Z&to=2040-05-05T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    const busy = calendar.body.data.find(
      (item: { _id: string }) => item._id === id,
    );
    expect(busy).toEqual({
      _id: id,
      title: "Busy",
      startAt: "2040-05-01T09:00:00.000Z",
      endAt: "2040-05-01T10:00:00.000Z",
      createdBy: null,
      canViewDetails: false,
    });
    expect(JSON.stringify(busy)).not.toContain("Confidential Client");
    expect(JSON.stringify(busy)).not.toContain("private-mode-link");
  });

  it("records client, mode, and location in audit snapshots", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} audit mode fields`,
        clientName: "Audit Client",
        mode: "OFFLINE",
        location: "Audit Room",
        startAt: "2040-06-01T09:00:00.000Z",
        endAt: "2040-06-01T10:00:00.000Z",
        participantIds: [],
      });
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const createAudit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(createAudit.status).toBe(200);
    expect(createAudit.body.data[0].changes).toEqual(
      expect.objectContaining({
        clientName: { oldValue: null, newValue: "Audit Client" },
        mode: { oldValue: null, newValue: "OFFLINE" },
        location: { oldValue: null, newValue: "Audit Room" },
      }),
    );

    const updated = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        mode: "ONLINE",
        meetingLink: "https://meet.google.com/audit-mode",
      });
    expect(updated.status).toBe(200);

    const updateAudit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(updateAudit.status).toBe(200);
    expect(updateAudit.body.data[0].changes).toEqual(
      expect.objectContaining({
        mode: { oldValue: "OFFLINE", newValue: "ONLINE" },
        location: { oldValue: "Audit Room", newValue: null },
        meetingLink: {
          oldValue: null,
          newValue: "https://meet.google.com/audit-mode",
        },
      }),
    );
  });

  it("deletes the meeting as the creator", async () => {
    const response = await request(app)
      .delete(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(response.status).toBe(200);

    const missing = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${creatorToken}`);
    expect(missing.status).toBe(404);
  });
});
