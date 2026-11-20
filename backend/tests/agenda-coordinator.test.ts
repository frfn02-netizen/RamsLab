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
  restoreUserFixtures,
  signTestToken,
  snapshotUserFixtures,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const COORDINATOR_ID = "00000000000000000000f001";
const PLAIN_STUDENT_ID = "00000000000000000000f002";
const PREFIX = "Vitest Agenda Coordinator";

let adminToken: string;
let dosenToken: string;
let coordinatorToken: string;
let plainStudentToken: string;
let databaseReady = false;
let fixtureSnapshots: Awaited<ReturnType<typeof snapshotUserFixtures>> = [];

function futureMeeting(
  title: string,
  date: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    title: `${PREFIX} ${title}`,
    description: "Coordinator regression meeting",
    clientName: "RAMS Test Client",
    mode: "OFFLINE",
    location: "RAMS Meeting Room",
    startAt: `${date}T09:00:00.000Z`,
    endAt: `${date}T10:00:00.000Z`,
    visibility: "INTERNAL",
    participantIds: [],
    ...overrides,
  };
}

async function cleanup() {
  await getMeetingsCollection().deleteMany({
    title: { $regex: `^${PREFIX}` },
  });
  await getUsersCollection().deleteMany({
    _id: {
      $in: [new ObjectId(COORDINATOR_ID), new ObjectId(PLAIN_STUDENT_ID)],
    },
  });
}

async function seedStudent(id: string, email: string, displayName: string) {
  const now = new Date();
  await getUsersCollection().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        displayName,
        email,
        role: "STUDENT",
        isActive: true,
        permissions: [],
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

beforeAll(async () => {
  await connectDatabase();
  databaseReady = true;
  fixtureSnapshots = await snapshotUserFixtures([
    TEST_ADMIN_USER_ID,
    TEST_DOSEN_USER_ID,
  ]);
  await ensureTestUsers();
  await cleanup();
  await seedStudent(
    COORDINATOR_ID,
    "vitest.agenda.coordinator@test.local",
    "Agenda Coordinator Student",
  );
  await seedStudent(
    PLAIN_STUDENT_ID,
    "vitest.agenda.reader@test.local",
    "Read Only Student",
  );

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
  coordinatorToken = signTestToken(COORDINATOR_ID, "STUDENT");
  plainStudentToken = signTestToken(PLAIN_STUDENT_ID, "STUDENT");

  const grant = await request(app)
    .patch(`/api/users/${COORDINATOR_ID}/agenda-access`)
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({ enabled: true });
  expect(grant.status).toBe(200);
  expect(grant.body.data.permissions).toContain(PERMISSIONS.AGENDA_MANAGE);
});

afterAll(async () => {
  if (!databaseReady) return;
  try {
    await cleanup();
  } finally {
    await restoreUserFixtures(fixtureSnapshots);
  }
});

describe("shared agenda access", () => {
  it("lets students read the shared agenda without schedule access", async () => {
    const agenda = await request(app)
      .get("/api/meetings/agenda")
      .set("Cookie", `rams_access_token=${plainStudentToken}`);
    expect(agenda.status).toBe(200);

    const calendar = await request(app)
      .get("/api/meetings/calendar")
      .set("Cookie", `rams_access_token=${plainStudentToken}`);
    expect(calendar.status).toBe(200);

    const create = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${plainStudentToken}`)
      .send(futureMeeting("reader create denied", "2044-02-01"));
    expect(create.status).toBe(403);
  });

  it("shows shared internal detail but denies another student's edits", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send(
        futureMeeting("dosen internal", "2044-02-02", {
          participantIds: [PLAIN_STUDENT_ID],
        }),
      );
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const detail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${plainStudentToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.title).toBe(`${PREFIX} dosen internal`);
    expect(detail.body.data.canEdit).toBe(false);
    expect(detail.body.data.canCancel).toBe(false);

    const edit = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${plainStudentToken}`)
      .send({ title: `${PREFIX} unauthorized reader edit` });
    expect(edit.status).toBe(403);

    const cancel = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${plainStudentToken}`)
      .send({});
    expect(cancel.status).toBe(403);
  });
});

describe("agenda coordinator permission", () => {
  it("lists student accounts and grants only to students", async () => {
    const list = await request(app)
      .get("/api/users/agenda-coordinators")
      .query({ q: "agenda.coordinator" })
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: COORDINATOR_ID,
          hasAgendaManage: true,
        }),
      ]),
    );

    const dosen = await request(app)
      .patch(`/api/users/${TEST_DOSEN_USER_ID}/agenda-access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ enabled: true });
    expect(dosen.status).toBe(404);

    const forbidden = await request(app)
      .patch(`/api/users/${COORDINATOR_ID}/agenda-access`)
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send({ enabled: false });
    expect(forbidden.status).toBe(403);
  });

  it("creates shared internal meetings but not private meetings", async () => {
    const internal = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send(futureMeeting("coordinator internal", "2044-02-03"));
    expect(internal.status).toBe(201);
    expect(internal.body.data.meeting.createdBy.id).toBe(COORDINATOR_ID);
    expect(internal.body.data.meeting.canEdit).toBe(true);
    expect(internal.body.data.meeting.canCancel).toBe(true);
    expect(internal.body.data.meeting.canDelete).toBe(false);

    const privateMeeting = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send(
        futureMeeting("coordinator private denied", "2044-02-04", {
          visibility: "PRIVATE",
        }),
      );
    expect(privateMeeting.status).toBe(403);
  });

  it("edits another creator's internal meeting without changing ownership", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send(
        futureMeeting("dosen editable", "2044-02-05", {
          participantIds: [PLAIN_STUDENT_ID],
        }),
      );
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const updated = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send({ title: `${PREFIX} coordinator edited` });
    expect(updated.status).toBe(200);
    expect(updated.body.data.meeting.title).toBe(
      `${PREFIX} coordinator edited`,
    );
    expect(updated.body.data.meeting.createdBy.id).toBe(TEST_DOSEN_USER_ID);
    expect(updated.body.data.meeting.participantIds).toEqual([
      PLAIN_STUDENT_ID,
    ]);
    expect(updated.body.data.meeting.isOrganizer).toBe(false);

    const stored = await getMeetingsCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.createdBy.toString()).toBe(TEST_DOSEN_USER_ID);
    expect(stored?.participantIds.map((value) => value.toString())).toEqual([
      PLAIN_STUDENT_ID,
    ]);

    const audit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data[0]).toEqual(
      expect.objectContaining({
        action: "UPDATE",
        actorId: COORDINATOR_ID,
      }),
    );
    expect(audit.body.data[0].changes.title).toEqual({
      oldValue: `${PREFIX} dosen editable`,
      newValue: `${PREFIX} coordinator edited`,
    });

    const deleteAttempt = await request(app)
      .delete(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`);
    expect(deleteAttempt.status).toBe(403);
  });

  it("cancels another creator's internal meeting and audits the coordinator", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send(futureMeeting("dosen cancellable", "2044-02-06"));
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const cancelled = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send({ reason: "Coordinator rescheduled" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");

    const audit = await request(app)
      .get(`/api/meetings/${id}/audit`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data[0]).toEqual(
      expect.objectContaining({
        action: "CANCEL",
        actorId: COORDINATOR_ID,
      }),
    );
  });

  it("keeps private meetings inaccessible to coordinators", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send(
        futureMeeting("dosen private", "2044-02-07", {
          visibility: "PRIVATE",
        }),
      );
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const detail = await request(app)
      .get(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`);
    expect(detail.status).toBe(403);

    const edit = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send({ title: `${PREFIX} private coordinator edit` });
    expect(edit.status).toBe(403);

    const cancel = await request(app)
      .post(`/api/meetings/${id}/cancel`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send({});
    expect(cancel.status).toBe(403);
  });

  it("revokes coordinator privileges immediately without removing shared read access", async () => {
    const created = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send(futureMeeting("dosen revoke target", "2044-02-08"));
    expect(created.status).toBe(201);
    const id = created.body.data.meeting._id as string;

    const revoke = await request(app)
      .patch(`/api/users/${COORDINATOR_ID}/agenda-access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ enabled: false });
    expect(revoke.status).toBe(200);
    expect(revoke.body.data.permissions).not.toContain(
      PERMISSIONS.AGENDA_MANAGE,
    );

    const edit = await request(app)
      .patch(`/api/meetings/${id}`)
      .set("Cookie", `rams_access_token=${coordinatorToken}`)
      .send({ title: `${PREFIX} revoked edit` });
    expect(edit.status).toBe(403);

    const agenda = await request(app)
      .get("/api/meetings/agenda")
      .set("Cookie", `rams_access_token=${coordinatorToken}`);
    expect(agenda.status).toBe(200);
  });
});
