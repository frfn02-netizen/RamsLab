import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import {
  addMeetingAttachment,
  getMeetingsCollection,
} from "../src/modules/meetings/meeting.repository.js";
import { MAX_MEETING_ATTACHMENTS } from "../src/modules/meetings/meeting.schema.js";
import type { MeetingAttachment } from "../src/modules/meetings/meeting.types.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
  TEST_ALUMNI_USER_ID,
} from "./auth-fixture.js";

const OTHER_DOSEN_ID = "00000000000000000000b002";
const TITLE_PREFIX = "Vitest Meeting";

let creatorToken: string;
let otherDosenToken: string;
let adminToken: string;
let alumniToken: string;
let meetingId: string;

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

  creatorToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
  otherDosenToken = signTestToken(OTHER_DOSEN_ID, "DOSEN");
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  alumniToken = signTestToken(TEST_ALUMNI_USER_ID, "ALUMNI");
});

afterAll(async () => {
  await cleanupMeetings();
});

describe("Meetings API", () => {
  it("creates a meeting with participants as an authenticated dosen", async () => {
    const response = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} kickoff`,
        description: "First planning session",
        startAt: "2030-03-01T09:00:00.000Z",
        endAt: "2030-03-01T10:00:00.000Z",
        participantIds: [TEST_ADMIN_USER_ID],
        meetingLink: "https://meet.google.com/abc-defg-hij",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.meeting.title).toBe(`${TITLE_PREFIX} kickoff`);
    expect(response.body.data.meeting.canEdit).toBe(true);
    expect(response.body.data.meeting.participants).toHaveLength(1);
    expect(response.body.data.conflicts).toEqual([]);
    meetingId = response.body.data.meeting._id;
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

  it("hides an unrelated meeting from another dosen", async () => {
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
    expect(detail.status).toBe(403);
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

  it("updates the meeting as the creator", async () => {
    const response = await request(app)
      .patch(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({ title: `${TITLE_PREFIX} updated` });

    expect(response.status).toBe(200);
    expect(response.body.data.meeting.title).toBe(`${TITLE_PREFIX} updated`);
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
