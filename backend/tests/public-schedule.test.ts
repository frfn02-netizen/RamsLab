import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";

const TITLE_PREFIX = "Vitest Public Schedule";
const PUBLIC_UPCOMING_ID = new ObjectId();
const PUBLIC_ONGOING_ID = new ObjectId();
const PUBLIC_PAST_ID = new ObjectId();
const PRIVATE_ID = new ObjectId();
const CANCELLED_ID = new ObjectId();
const LEGACY_ID = new ObjectId();
const CREATOR_ID = new ObjectId("00000000000000000000d001");
const PARTICIPANT_ID = new ObjectId("00000000000000000000d002");

const now = Date.now();
const pastStart = new Date(now - 5 * 24 * 60 * 60 * 1000);
const ongoingStart = new Date(now - 60 * 60 * 1000);
const upcomingStart = new Date(now + 2 * 24 * 60 * 60 * 1000);
const privateStart = new Date(now + 3 * 24 * 60 * 60 * 1000);
const cancelledStart = new Date(now + 4 * 24 * 60 * 60 * 1000);
const legacyStart = new Date(now + 5 * 24 * 60 * 60 * 1000);

const PUBLIC_KEYS = [
  "clientName",
  "endAt",
  "id",
  "location",
  "meetingLink",
  "mode",
  "startAt",
  "status",
  "title",
].sort();

function meeting(overrides: Record<string, unknown>) {
  return {
    description: "Internal agenda that must not be public",
    clientName: "Public Client",
    mode: "ONLINE",
    location: null,
    startAt: upcomingStart,
    endAt: new Date(upcomingStart.getTime() + 60 * 60 * 1000),
    visibility: "INTERNAL",
    createdBy: CREATOR_ID,
    participantIds: [PARTICIPANT_ID],
    meetingLink: "https://meet.google.com/public-secret-link",
    auditHistory: [],
    attachments: [],
    createdAt: new Date(now),
    updatedAt: new Date(now),
    ...overrides,
  };
}

async function cleanup() {
  await getMeetingsCollection().deleteMany({
    title: { $regex: `^${TITLE_PREFIX}` },
  });
}

beforeAll(async () => {
  await connectDatabase();
  await cleanup();

  await getMeetingsCollection().insertMany([
    meeting({
      _id: PUBLIC_UPCOMING_ID,
      title: `${TITLE_PREFIX} upcoming`,
      clientName: "Public Client Alpha",
      mode: "ONLINE",
      meetingLink: "https://meet.google.com/upcoming-secret",
    }),
    meeting({
      _id: PUBLIC_ONGOING_ID,
      title: `${TITLE_PREFIX} ongoing`,
      clientName: "Public Client Beta",
      mode: "ONLINE",
      startAt: ongoingStart,
      endAt: new Date(ongoingStart.getTime() + 2 * 60 * 60 * 1000),
    }),
    meeting({
      _id: PUBLIC_PAST_ID,
      title: `${TITLE_PREFIX} past`,
      clientName: "Historical Client",
      mode: "OFFLINE",
      location: "Historical Room",
      startAt: pastStart,
      endAt: new Date(pastStart.getTime() + 60 * 60 * 1000),
    }),
    meeting({
      _id: PRIVATE_ID,
      title: `${TITLE_PREFIX} private`,
      clientName: "Private Client",
      visibility: "PRIVATE",
      meetingLink: "https://meet.google.com/private-only-link",
      startAt: privateStart,
      endAt: new Date(privateStart.getTime() + 60 * 60 * 1000),
    }),
    meeting({
      _id: CANCELLED_ID,
      title: `${TITLE_PREFIX} cancelled`,
      clientName: "Cancelled Client",
      meetingLink: "https://meet.google.com/cancelled-only-link",
      cancelledAt: new Date(now),
      cancelledBy: CREATOR_ID,
      cancellationReason: "Internal reason",
      startAt: cancelledStart,
      endAt: new Date(cancelledStart.getTime() + 60 * 60 * 1000),
    }),
    meeting({
      _id: LEGACY_ID,
      title: `${TITLE_PREFIX} legacy`,
      clientName: "Legacy Client",
      visibility: undefined,
      startAt: legacyStart,
      endAt: new Date(legacyStart.getTime() + 60 * 60 * 1000),
    }),
  ] as never);
});

afterAll(async () => {
  await cleanup();
});

describe("Public schedule API", () => {
  it("returns public meetings without authentication and excludes private, cancelled, and legacy-private records", async () => {
    const response = await request(app)
      .get("/api/public/schedule")
      .query({ q: TITLE_PREFIX, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.headers["ratelimit-limit"]).toBe("120");
    expect(response.body.success).toBe(true);
    expect(response.body.total).toBe(3);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data.map((item: { title: string }) => item.title)).toEqual([
      `${TITLE_PREFIX} past`,
      `${TITLE_PREFIX} ongoing`,
      `${TITLE_PREFIX} upcoming`,
    ]);
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("private-only-link");
    expect(serialized).not.toContain("cancelled-only-link");
    expect(serialized).not.toContain("Busy");
    expect(serialized).not.toContain(PARTICIPANT_ID.toString());
    expect(serialized).not.toContain(CREATOR_ID.toString());
    expect(serialized).not.toContain("participantIds");
    expect(serialized).not.toContain("createdBy");
    expect(serialized).not.toContain("description");
    expect(serialized).not.toContain("attachments");
    expect(serialized).not.toContain("auditHistory");
    expect(
      response.body.data.find(
        (item: { title: string }) => item.title === `${TITLE_PREFIX} upcoming`,
      )?.meetingLink,
    ).toBe("https://meet.google.com/upcoming-secret");
    expect(
      response.body.data.find(
        (item: { title: string }) => item.title === `${TITLE_PREFIX} past`,
      )?.meetingLink,
    ).toBe("https://meet.google.com/public-secret-link");
  });

  it("uses a strict public serializer with no internal metadata", async () => {
    const response = await request(app).get(
      `/api/public/schedule/${PUBLIC_UPCOMING_ID.toString()}`,
    );

    expect(response.status).toBe(200);
    expect(Object.keys(response.body.data).sort()).toEqual(PUBLIC_KEYS);
    expect(response.body.data).toMatchObject({
      id: PUBLIC_UPCOMING_ID.toString(),
      title: `${TITLE_PREFIX} upcoming`,
      clientName: "Public Client Alpha",
      mode: "ONLINE",
      location: null,
      meetingLink: "https://meet.google.com/upcoming-secret",
      status: "UPCOMING",
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("Internal agenda");
    expect(serialized).not.toContain(PARTICIPANT_ID.toString());
    expect(serialized).not.toContain(CREATOR_ID.toString());
    expect(serialized).not.toContain("participantIds");
    expect(serialized).not.toContain("createdBy");
    expect(serialized).not.toContain("description");
    expect(serialized).not.toContain("attachments");
    expect(serialized).not.toContain("auditHistory");
  });

  it("returns 404 for private, cancelled, legacy-private, invalid, and missing IDs", async () => {
    for (const id of [
      PRIVATE_ID.toString(),
      CANCELLED_ID.toString(),
      LEGACY_ID.toString(),
      "not-an-object-id",
      new ObjectId().toString(),
    ]) {
      const response = await request(app).get(`/api/public/schedule/${id}`);
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    }
  });

  it("supports title/client search, mode filters, date ranges, and pagination", async () => {
    const clientSearch = await request(app)
      .get("/api/public/schedule")
      .query({ q: "Public Client Beta" });
    expect(clientSearch.status).toBe(200);
    expect(clientSearch.body.total).toBe(1);
    expect(clientSearch.body.data[0].title).toBe(`${TITLE_PREFIX} ongoing`);

    const offline = await request(app)
      .get("/api/public/schedule")
      .query({ q: TITLE_PREFIX, mode: "OFFLINE" });
    expect(offline.status).toBe(200);
    expect(offline.body.total).toBe(1);
    expect(offline.body.data[0].title).toBe(`${TITLE_PREFIX} past`);

    const range = await request(app)
      .get("/api/public/schedule")
      .query({
        q: TITLE_PREFIX,
        from: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        to: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(range.status).toBe(200);
    expect(range.body.total).toBe(1);
    expect(range.body.data[0].title).toBe(`${TITLE_PREFIX} upcoming`);

    const pageOne = await request(app)
      .get("/api/public/schedule")
      .query({ q: TITLE_PREFIX, page: 1, limit: 1 });
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.total).toBe(3);
    expect(pageOne.body.page).toBe(1);
    expect(pageOne.body.limit).toBe(1);
    expect(pageOne.body.totalPages).toBe(3);
    expect(pageOne.body.hasMore).toBe(true);
    expect(pageOne.body.data).toHaveLength(1);

    const pageTwo = await request(app)
      .get("/api/public/schedule")
      .query({ q: TITLE_PREFIX, page: 2, limit: 1 });
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.page).toBe(2);
    expect(pageTwo.body.data[0].title).toBe(`${TITLE_PREFIX} ongoing`);
  });

  it("rejects invalid query parameters", async () => {
    for (const query of [
      { mode: "HYBRID" },
      { page: 0 },
      { limit: 101 },
      { from: "not-a-date" },
      { from: "2030-01-02", to: "2030-01-01" },
    ]) {
      const response = await request(app)
        .get("/api/public/schedule")
        .query(query);
      expect(response.status).toBe(400);
    }
  });

  it("keeps unauthenticated create, edit, and cancel requests rejected", async () => {
    const create = await request(app).post("/api/meetings").send({
      title: `${TITLE_PREFIX} unauthorized`,
      clientName: "Client",
      mode: "ONLINE",
      meetingLink: "https://meet.google.com/unauthorized",
      startAt: "2035-01-01T09:00:00.000Z",
      endAt: "2035-01-01T10:00:00.000Z",
    });
    expect(create.status).toBe(401);

    const edit = await request(app)
      .patch(`/api/meetings/${PUBLIC_UPCOMING_ID.toString()}`)
      .send({ title: "Unauthorized edit" });
    expect(edit.status).toBe(401);

    const cancel = await request(app)
      .post(`/api/meetings/${PUBLIC_UPCOMING_ID.toString()}/cancel`)
      .send({});
    expect(cancel.status).toBe(401);
  });
});
