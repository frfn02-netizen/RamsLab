import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { getLabMembershipsCollection } from "../src/modules/lab-memberships/lab-membership.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const OTHER_DOSEN_ID = "00000000000000000000b104";
const TITLE_PREFIX = "Vitest Meeting Highlight";
const HIGHLIGHTED_TITLE = `${TITLE_PREFIX} highlighted`;
const PRIVATE_TITLE = `${TITLE_PREFIX} private busy`;
process.env.MEETINGS_HIGHLIGHTED_USER_IDS = TEST_DOSEN_USER_ID;

let app: import("express").Express;
let highlightedToken: string;
let otherDosenToken: string;
let adminToken: string;
let publicMeetingId = "";
let privateMeetingId = "";
let membershipIds: ObjectId[] = [];

async function cleanup() {
  await getMeetingsCollection().deleteMany({
    title: { $regex: `^${TITLE_PREFIX}` },
  });
  await getUsersCollection().deleteMany({ _id: new ObjectId(OTHER_DOSEN_ID) });
  await getLabMembershipsCollection().deleteMany({
    _id: { $in: membershipIds },
  });
}

beforeAll(async () => {
  const appModule = await import("../src/app.js");
  const databaseModule = await import("../src/config/database.js");
  app = appModule.default;
  await databaseModule.connectDatabase();
  await ensureTestUsers();
  await cleanup();

  const now = new Date();
  await getUsersCollection().updateOne(
    { _id: new ObjectId(OTHER_DOSEN_ID) },
    {
      $set: {
        email: "vitest.highlight.other-dosen@test.local",
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

  const memberships = await getLabMembershipsCollection().insertMany([
    {
      labId: "rams",
      userId: new ObjectId(TEST_DOSEN_USER_ID),
      status: "ACTIVE",
      joinedAt: now,
      updatedAt: now,
      createdBy: new ObjectId(TEST_ADMIN_USER_ID),
      updatedBy: new ObjectId(TEST_ADMIN_USER_ID),
    },
    {
      labId: "rams",
      userId: new ObjectId(OTHER_DOSEN_ID),
      status: "ACTIVE",
      joinedAt: now,
      updatedAt: now,
      createdBy: new ObjectId(TEST_ADMIN_USER_ID),
      updatedBy: new ObjectId(TEST_ADMIN_USER_ID),
    },
  ]);
  membershipIds = Object.values(memberships.insertedIds);

  highlightedToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
  otherDosenToken = signTestToken(OTHER_DOSEN_ID, "DOSEN");
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  const publicMeeting = await request(app)
    .post("/api/meetings")
    .set("Cookie", `rams_access_token=${highlightedToken}`)
    .send({
      title: HIGHLIGHTED_TITLE,
      clientName: "Highlight Client",
      mode: "ONLINE",
      meetingLink: "https://meet.google.com/highlight-public",
      startAt: "2033-01-01T09:00:00.000Z",
      endAt: "2033-01-01T10:00:00.000Z",
      participantIds: [OTHER_DOSEN_ID],
    });
  expect(publicMeeting.status).toBe(201);
  publicMeetingId = publicMeeting.body.data.meeting._id;

  const privateMeeting = await request(app)
    .post("/api/meetings")
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({
      title: PRIVATE_TITLE,
      clientName: "Private Highlight Client",
      mode: "ONLINE",
      meetingLink: "https://meet.google.com/highlight-private",
      startAt: "2033-01-02T09:00:00.000Z",
      endAt: "2033-01-02T10:00:00.000Z",
      participantIds: [TEST_DOSEN_USER_ID],
      visibility: "PRIVATE",
    });
  expect(privateMeeting.status).toBe(201);
  privateMeetingId = privateMeeting.body.data.meeting._id;
});

afterAll(async () => {
  await cleanup();
});

describe("meeting highlight involvement", () => {
  it("returns a boolean to authorized list and detail responses", async () => {
    const list = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${highlightedToken}`);
    expect(list.status).toBe(200);
    const highlighted = list.body.data.find(
      (meeting: { _id: string }) => meeting._id === publicMeetingId,
    );
    expect(highlighted.involvesHighlightedUser).toBe(true);

    const detail = await request(app)
      .get(`/api/meetings/${publicMeetingId}`)
      .set("Cookie", `rams_access_token=${highlightedToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.involvesHighlightedUser).toBe(true);
  });

  it("includes involvement on authorized calendar events", async () => {
    const calendar = await request(app)
      .get("/api/meetings/calendar")
      .set("Cookie", `rams_access_token=${highlightedToken}`);
    expect(calendar.status).toBe(200);
    const publicEvent = calendar.body.data.find(
      (meeting: { _id: string }) => meeting._id === publicMeetingId,
    );
    expect(publicEvent.canViewDetails).toBe(true);
    expect(publicEvent.involvesHighlightedUser).toBe(true);

    const privateEvent = calendar.body.data.find(
      (meeting: { _id: string }) => meeting._id === privateMeetingId,
    );
    expect(privateEvent.canViewDetails).toBe(true);
    expect(privateEvent.involvesHighlightedUser).toBe(true);
  });

  it("keeps PRIVATE Busy involvement hidden and preserves the six-field contract", async () => {
    const calendar = await request(app)
      .get("/api/meetings/calendar")
      .set("Cookie", `rams_access_token=${otherDosenToken}`);
    expect(calendar.status).toBe(200);
    const busy = calendar.body.data.find(
      (meeting: { _id: string }) => meeting._id === privateMeetingId,
    );
    expect(busy).toEqual({
      _id: privateMeetingId,
      title: "Busy",
      startAt: "2033-01-02T09:00:00.000Z",
      endAt: "2033-01-02T10:00:00.000Z",
      createdBy: null,
      canViewDetails: false,
    });
    expect(busy).not.toHaveProperty("involvesHighlightedUser");
  });

  it("never exposes involvement through public endpoints", async () => {
    const list = await request(app)
      .get("/api/public/schedule")
      .query({ q: TITLE_PREFIX, limit: 100 });
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.body)).not.toContain("involvesHighlightedUser");
    expect(
      list.body.data.some(
        (meeting: { _id: string }) => meeting._id === privateMeetingId,
      ),
    ).toBe(false);

    const publicDetail = await request(app).get(
      `/api/public/schedule/${publicMeetingId}`,
    );
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data).not.toHaveProperty("involvesHighlightedUser");

    const privateDetail = await request(app).get(
      `/api/public/schedule/${privateMeetingId}`,
    );
    expect(privateDetail.status).toBe(404);
  });
});
