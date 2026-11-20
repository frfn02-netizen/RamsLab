import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { PERMISSIONS } from "../src/middlewares/permission.middlewares.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const STUDENT_ONE_ID = "00000000000000000000c001";
const STUDENT_TWO_ID = "00000000000000000000c002";
const STUDENT_NO_ACCESS_ID = "00000000000000000000c003";
const TITLE_PREFIX = "Vitest Schedule Portal";

let studentOneToken: string;
let studentTwoToken: string;
let noAccessToken: string;
let adminToken: string;
let meetingId = "";
let databaseReady = false;

async function seedStudent(
  id: string,
  email: string,
  displayName: string,
  permissions: string[],
) {
  const now = new Date();
  await getUsersCollection().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        email,
        displayName,
        role: "STUDENT",
        isActive: true,
        permissions,
        mustChangePassword: false,
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
}

async function cleanup() {
  await getMeetingsCollection().deleteMany({
    title: { $regex: `^${TITLE_PREFIX}` },
  });
  await getUsersCollection().deleteMany({
    _id: {
      $in: [
        new ObjectId(STUDENT_ONE_ID),
        new ObjectId(STUDENT_TWO_ID),
        new ObjectId(STUDENT_NO_ACCESS_ID),
      ],
    },
  });
}

beforeAll(async () => {
  await connectDatabase();
  databaseReady = true;
  await ensureTestUsers();
  await cleanup();
  await seedStudent(
    STUDENT_ONE_ID,
    "vitest.schedule.one@test.local",
    "Schedule Student One",
    [PERMISSIONS.SCHEDULE_PORTAL_ACCESS],
  );
  await seedStudent(
    STUDENT_TWO_ID,
    "vitest.schedule.two@test.local",
    "Schedule Student Two",
    [PERMISSIONS.SCHEDULE_PORTAL_ACCESS],
  );
  await seedStudent(
    STUDENT_NO_ACCESS_ID,
    "vitest.schedule.none@test.local",
    "Schedule Student Without Access",
    [],
  );
  studentOneToken = signTestToken(STUDENT_ONE_ID, "STUDENT");
  studentTwoToken = signTestToken(STUDENT_TWO_ID, "STUDENT");
  noAccessToken = signTestToken(STUDENT_NO_ACCESS_ID, "STUDENT");
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
});

afterAll(async () => {
  if (!databaseReady) return;
  await cleanup();
});

describe("Schedule Portal meeting access", () => {
  it("requires schedule portal access for student meeting routes", async () => {
    const create = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${noAccessToken}`)
      .send({
        title: `${TITLE_PREFIX} denied`,
        clientName: "Client",
        mode: "ONLINE",
        meetingLink: "https://meet.google.com/denied",
        startAt: "2034-04-01T09:00:00.000Z",
        endAt: "2034-04-01T10:00:00.000Z",
      });
    expect(create.status).toBe(403);

    const list = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${noAccessToken}`);
    expect(list.status).toBe(403);
  });

  it("lets schedule users search the meeting directory", async () => {
    const directory = await request(app)
      .get("/api/users/directory")
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(directory.status).toBe(200);
    expect(
      directory.body.data.some(
        (entry: { email: string }) =>
          entry.email === "vitest.schedule.two@test.local",
      ),
    ).toBe(true);

    const denied = await request(app)
      .get("/api/users/directory")
      .set("Cookie", `rams_access_token=${noAccessToken}`);
    expect(denied.status).toBe(403);
  });

  it("applies schedule access changes to existing sessions", async () => {
    const revoked = await request(app)
      .patch(`/api/users/${STUDENT_ONE_ID}/schedule-access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ enabled: false });
    expect(revoked.status).toBe(200);

    const denied = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(denied.status).toBe(403);

    const granted = await request(app)
      .patch(`/api/users/${STUDENT_ONE_ID}/schedule-access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ enabled: true });
    expect(granted.status).toBe(200);

    const allowed = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(allowed.status).toBe(200);
  });

  it("creates an official meeting directly with server-derived ownership", async () => {
    const response = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${studentOneToken}`)
      .send({
        title: `${TITLE_PREFIX} direct creation`,
        clientName: "Student Project Client",
        mode: "ONLINE",
        location: "Ignored room",
        meetingLink: "https://meet.google.com/student-direct",
        startAt: "2034-04-02T09:00:00.000Z",
        endAt: "2034-04-02T10:00:00.000Z",
        participantIds: [STUDENT_TWO_ID],
        createdBy: TEST_ADMIN_USER_ID,
      });

    expect(response.status).toBe(201);
    meetingId = response.body.data.meeting._id;
    expect(response.body.data.meeting.createdBy.id).toBe(STUDENT_ONE_ID);
    expect(response.body.data.meeting.participantIds).toEqual([STUDENT_TWO_ID]);
    expect(response.body.data.meeting.mode).toBe("ONLINE");
    expect(response.body.data.meeting.location).toBeNull();
    expect(response.body.data.meeting.canEdit).toBe(true);
    expect(response.body.data.meeting.canCancel).toBe(true);
    expect(response.body.data.meeting.canDelete).toBe(false);

    const list = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(list.status).toBe(200);
    expect(
      list.body.data.some((meeting: { _id: string }) => meeting._id === meetingId),
    ).toBe(true);

    const participantDetail = await request(app)
      .get(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${studentTwoToken}`);
    expect(participantDetail.status).toBe(200);

    const audit = await request(app)
      .get(`/api/meetings/${meetingId}/audit`)
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data[0].action).toBe("CREATE");
    expect(audit.body.data[0].actorId).toBe(STUDENT_ONE_ID);
  });

  it("allows shared agenda reads without schedule portal access", async () => {
    const agenda = await request(app)
      .get("/api/meetings/agenda")
      .set("Cookie", `rams_access_token=${noAccessToken}`);
    expect(agenda.status).toBe(200);

    const calendar = await request(app)
      .get("/api/meetings/calendar")
      .set("Cookie", `rams_access_token=${noAccessToken}`);
    expect(calendar.status).toBe(200);

    const create = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${noAccessToken}`)
      .send({
        title: `${TITLE_PREFIX} unauthorized create`,
        clientName: "Client",
        mode: "ONLINE",
        meetingLink: "https://meet.google.com/no-access",
        startAt: "2034-04-04T09:00:00.000Z",
        endAt: "2034-04-04T10:00:00.000Z",
      });
    expect(create.status).toBe(403);
  });

  it("lets the owner edit and cancel, but not a participant", async () => {
    const participantEdit = await request(app)
      .patch(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${studentTwoToken}`)
      .send({ title: `${TITLE_PREFIX} participant edit` });
    expect(participantEdit.status).toBe(403);

    const participantCancel = await request(app)
      .post(`/api/meetings/${meetingId}/cancel`)
      .set("Cookie", `rams_access_token=${studentTwoToken}`)
      .send({});
    expect(participantCancel.status).toBe(403);

    const ownerEdit = await request(app)
      .patch(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${studentOneToken}`)
      .send({ title: `${TITLE_PREFIX} owner edit` });
    expect(ownerEdit.status).toBe(200);
    expect(ownerEdit.body.data.meeting.title).toBe(
      `${TITLE_PREFIX} owner edit`,
    );

    const ownerDelete = await request(app)
      .delete(`/api/meetings/${meetingId}`)
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(ownerDelete.status).toBe(403);

    const ownerCancel = await request(app)
      .post(`/api/meetings/${meetingId}/cancel`)
      .set("Cookie", `rams_access_token=${studentOneToken}`)
      .send({ reason: "Student schedule changed" });
    expect(ownerCancel.status).toBe(200);
    expect(ownerCancel.body.data.status).toBe("CANCELLED");
  });

  it("keeps private meeting details inaccessible to schedule users", async () => {
    const privateMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        title: `${TITLE_PREFIX} private`,
        clientName: "Private Client",
        mode: "ONLINE",
        meetingLink: "https://meet.google.com/private-schedule",
        startAt: "2034-04-03T09:00:00.000Z",
        endAt: "2034-04-03T10:00:00.000Z",
        visibility: "PRIVATE",
      });
    expect(privateMeeting.status).toBe(201);

    const detail = await request(app)
      .get(`/api/meetings/${privateMeeting.body.data.meeting._id}`)
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(detail.status).toBe(403);

    const list = await request(app)
      .get("/api/meetings")
      .set("Cookie", `rams_access_token=${studentOneToken}`);
    expect(
      list.body.data.some(
        (meeting: { _id: string }) =>
          meeting._id === privateMeeting.body.data.meeting._id,
      ),
    ).toBe(false);
  });
});
