import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";
import {
  ensureTestUsers,
  restoreUserFixtures,
  signTestToken,
  snapshotUserFixtures,
  TEST_ADMIN_USER_ID,
  TEST_ALUMNI_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const TITLE_PREFIX = "Vitest Meeting concurrency";

let creatorToken: string;
let databaseReady = false;
let userFixtureSnapshotReady = false;
let userFixtureSnapshots: Awaited<ReturnType<typeof snapshotUserFixtures>> = [];

async function cleanup() {
  await getMeetingsCollection().deleteMany({
    createdBy: new ObjectId(TEST_DOSEN_USER_ID),
    title: { $regex: `^${TITLE_PREFIX}` },
  });
}

async function createMeeting(title: string) {
  const response = await request(app)
    .post("/api/meetings")
    .set("Cookie", `rams_access_token=${creatorToken}`)
    .send({
      title: `${TITLE_PREFIX} ${title}`,
      description: "Concurrency test meeting",
      clientName: "Concurrency Test Client",
      mode: "OFFLINE",
      location: "Concurrency Room",
      startAt: "2035-04-01T09:00:00.000Z",
      endAt: "2035-04-01T10:00:00.000Z",
      participantIds: [TEST_ADMIN_USER_ID],
    });
  expect(response.status).toBe(201);
  return response.body.data.meeting as {
    _id: string;
    updatedAt: string;
    title: string;
  };
}

beforeAll(async () => {
  await connectDatabase();
  databaseReady = true;
  userFixtureSnapshots = await snapshotUserFixtures([
    TEST_ADMIN_USER_ID,
    TEST_DOSEN_USER_ID,
    TEST_ALUMNI_USER_ID,
  ]);
  userFixtureSnapshotReady = true;
  await ensureTestUsers();
  await cleanup();
  creatorToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
});

afterAll(async () => {
  if (!databaseReady) return;

  try {
    await cleanup();
  } finally {
    if (userFixtureSnapshotReady) {
      await restoreUserFixtures(userFixtureSnapshots);
    }
  }
});

describe("meeting update optimistic concurrency", () => {
  it("rejects a stale update after the meeting changed", async () => {
    const meeting = await createMeeting("stale update");

    const current = await request(app)
      .patch(`/api/meetings/${meeting._id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} current title`,
        expectedUpdatedAt: meeting.updatedAt,
      });
    expect(current.status).toBe(200);

    const stale = await request(app)
      .patch(`/api/meetings/${meeting._id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} stale title`,
        expectedUpdatedAt: meeting.updatedAt,
      });
    expect(stale.status).toBe(409);

    const stored = await getMeetingsCollection().findOne({
      _id: new ObjectId(meeting._id),
    });
    expect(stored?.title).toBe(`${TITLE_PREFIX} current title`);
  });

  it("allows a non-stale update with the latest version", async () => {
    const meeting = await createMeeting("fresh update");

    const first = await request(app)
      .patch(`/api/meetings/${meeting._id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} first update`,
        expectedUpdatedAt: meeting.updatedAt,
      });
    expect(first.status).toBe(200);

    const second = await request(app)
      .patch(`/api/meetings/${meeting._id}`)
      .set("Cookie", `rams_access_token=${creatorToken}`)
      .send({
        title: `${TITLE_PREFIX} second update`,
        expectedUpdatedAt: first.body.data.meeting.updatedAt,
      });
    expect(second.status).toBe(200);
    expect(second.body.data.meeting.title).toBe(
      `${TITLE_PREFIX} second update`,
    );
  });
});
