import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { CURRENT_LAB_ID } from "../src/config/lab.js";
import { getMeetingsCollection } from "../src/modules/meetings/meeting.repository.js";
import {
  getLabMembershipAuditCollection,
  getLabMembershipsCollection,
} from "../src/modules/lab-memberships/lab-membership.repository.js";
import { createLabMembershipIndexes } from "../src/modules/lab-memberships/lab-membership.index.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import type { Meeting } from "../src/modules/meetings/meeting.types.js";
import type { User } from "../src/modules/users/user.types.js";
import { signTestToken } from "./auth-fixture.js";

const ADMIN_ID = "00000000000000000000e001";
const DOSEN_ID = "00000000000000000000e002";
const ALUMNI_ID = "00000000000000000000e003";
const OTHER_DOSEN_ID = "00000000000000000000e004";
const MEMBER_ALUMNI_ID = "00000000000000000000e005";
const NONMEMBER_ALUMNI_ID = "00000000000000000000e006";
const NONMEMBER_DOSEN_ID = "00000000000000000000e007";
const STUDENT_ID = "00000000000000000000e008";
const PREFIX = "Vitest Phase 2";
const NOW = new Date("2042-01-01T00:00:00.000Z");
const INTERNAL_START = "2042-02-01T09:00:00.000Z";
const PRIVATE_START = "2042-02-01T11:00:00.000Z";

const createdMeetingIds: ObjectId[] = [];
let adminToken: string;
let dosenToken: string;
let alumniToken: string;
let nonmemberAlumniToken: string;
let otherDosenToken: string;
let nonmemberDosenToken: string;
let studentToken: string;

function userDoc(id: string, role: User["role"], isActive = true): User {
  return {
    _id: new ObjectId(id),
    displayName: `${role} ${id.slice(-4)}`,
    email: `${id}@phase2.test`,
    passwordHash: "not-used-by-phase-2-tests",
    role,
    isActive,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function meetingDoc(options: {
  title: string;
  startAt: string;
  visibility: Meeting["visibility"];
  createdBy: ObjectId;
}): Meeting {
  return {
    title: options.title,
    description: `${options.title} description`,
    startAt: new Date(options.startAt),
    endAt: new Date(new Date(options.startAt).getTime() + 60 * 60_000),
    visibility: options.visibility,
    createdBy: options.createdBy,
    participantIds: [],
    meetingLink: null,
    auditHistory: [],
    attachments: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

beforeAll(async () => {
  await connectDatabase();
  await createLabMembershipIndexes();
  await getUsersCollection().deleteMany({
    _id: {
      $in: [
        new ObjectId(ADMIN_ID),
        new ObjectId(DOSEN_ID),
        new ObjectId(ALUMNI_ID),
        new ObjectId(OTHER_DOSEN_ID),
        new ObjectId(MEMBER_ALUMNI_ID),
        new ObjectId(NONMEMBER_ALUMNI_ID),
        new ObjectId(NONMEMBER_DOSEN_ID),
        new ObjectId(STUDENT_ID),
      ],
    },
  });
  await getUsersCollection().insertMany([
    userDoc(ADMIN_ID, "ADMIN"),
    userDoc(DOSEN_ID, "DOSEN"),
    userDoc(ALUMNI_ID, "ALUMNI"),
    userDoc(OTHER_DOSEN_ID, "DOSEN"),
    userDoc(MEMBER_ALUMNI_ID, "ALUMNI"),
    userDoc(NONMEMBER_ALUMNI_ID, "ALUMNI"),
    userDoc(NONMEMBER_DOSEN_ID, "DOSEN"),
    userDoc(STUDENT_ID, "STUDENT"),
  ]);

  await getLabMembershipsCollection().deleteMany({ labId: CURRENT_LAB_ID });
  await getLabMembershipAuditCollection().deleteMany({ labId: CURRENT_LAB_ID });
  await getMeetingsCollection().deleteMany({
    title: { $regex: `^${PREFIX}` },
  });

  adminToken = signTestToken(ADMIN_ID, "ADMIN");
  dosenToken = signTestToken(DOSEN_ID, "DOSEN");
  alumniToken = signTestToken(MEMBER_ALUMNI_ID, "ALUMNI");
  nonmemberAlumniToken = signTestToken(NONMEMBER_ALUMNI_ID, "ALUMNI");
  otherDosenToken = signTestToken(OTHER_DOSEN_ID, "DOSEN");
  nonmemberDosenToken = signTestToken(NONMEMBER_DOSEN_ID, "DOSEN");
  studentToken = signTestToken(STUDENT_ID, "STUDENT");

  for (const userId of [
    DOSEN_ID,
    MEMBER_ALUMNI_ID,
  ]) {
    const response = await request(app)
      .post("/api/lab-memberships")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ userId });
    expect(response.status).toBe(201);
  }

  const internal = await getMeetingsCollection().insertOne(
    meetingDoc({
      title: `${PREFIX} internal agenda`,
      startAt: INTERNAL_START,
      visibility: "INTERNAL",
      createdBy: new ObjectId(DOSEN_ID),
    }),
  );
  createdMeetingIds.push(internal.insertedId);

  const privateMeeting = await getMeetingsCollection().insertOne(
    meetingDoc({
      title: `${PREFIX} private agenda`,
      startAt: PRIVATE_START,
      visibility: "PRIVATE",
      createdBy: new ObjectId(DOSEN_ID),
    }),
  );
  createdMeetingIds.push(privateMeeting.insertedId);
});

afterAll(async () => {
  await getLabMembershipsCollection().deleteMany({ labId: CURRENT_LAB_ID });
  await getLabMembershipAuditCollection().deleteMany({ labId: CURRENT_LAB_ID });
  await getMeetingsCollection().deleteMany({ _id: { $in: createdMeetingIds } });
  await getUsersCollection().deleteMany({
    _id: {
      $in: [
        new ObjectId(ADMIN_ID),
        new ObjectId(DOSEN_ID),
        new ObjectId(ALUMNI_ID),
        new ObjectId(OTHER_DOSEN_ID),
        new ObjectId(MEMBER_ALUMNI_ID),
        new ObjectId(NONMEMBER_ALUMNI_ID),
        new ObjectId(NONMEMBER_DOSEN_ID),
        new ObjectId(STUDENT_ID),
      ],
    },
  });
});

describe("lab membership management", () => {
  it("allows only ADMIN to manage memberships", async () => {
    const list = await request(app)
      .get("/api/lab-memberships")
      .set("Cookie", `rams_access_token=${dosenToken}`);
    expect(list.status).toBe(403);

    const add = await request(app)
      .post("/api/lab-memberships")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send({ userId: ALUMNI_ID });
    expect(add.status).toBe(403);
  });

  it("lists memberships with user identity and does not expose duplicate active records", async () => {
    const list = await request(app)
      .get("/api/lab-memberships?limit=20")
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: DOSEN_ID,
          status: "ACTIVE",
          user: expect.objectContaining({ email: `${DOSEN_ID}@phase2.test` }),
        }),
      ]),
    );

    const duplicate = await request(app)
      .post("/api/lab-memberships")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ userId: DOSEN_ID });
    expect(duplicate.status).toBe(409);
  });

  it("deactivates and reactivates without creating a duplicate record or audit gap", async () => {
    const deactivate = await request(app)
      .delete(`/api/lab-memberships/${OTHER_DOSEN_ID}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(deactivate.status).toBe(404);

    const add = await request(app)
      .post("/api/lab-memberships")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ userId: OTHER_DOSEN_ID });
    expect(add.status).toBe(201);

    const inactive = await request(app)
      .delete(`/api/lab-memberships/${OTHER_DOSEN_ID}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(inactive.status).toBe(200);
    expect(inactive.body.data.status).toBe("INACTIVE");

    const reactivate = await request(app)
      .patch(`/api/lab-memberships/${OTHER_DOSEN_ID}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ status: "ACTIVE" });
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.data.status).toBe("ACTIVE");

    const stored = await getLabMembershipsCollection().countDocuments({
      labId: CURRENT_LAB_ID,
      userId: new ObjectId(OTHER_DOSEN_ID),
    });
    expect(stored).toBe(1);

    const audit = await getLabMembershipAuditCollection()
      .find({
        labId: CURRENT_LAB_ID,
        memberUserId: new ObjectId(OTHER_DOSEN_ID),
      })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    expect(audit.map((entry) => entry.action)).toEqual([
      "ADDED",
      "DEACTIVATED",
      "ACTIVATED",
    ]);
  });

  it("prevents an admin from deactivating their own membership", async () => {
    const add = await request(app)
      .post("/api/lab-memberships")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ userId: ADMIN_ID });
    expect(add.status).toBe(201);

    const deactivate = await request(app)
      .delete(`/api/lab-memberships/${ADMIN_ID}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(deactivate.status).toBe(400);
  });
});

describe("shared internal agenda", () => {
  it("allows DOSEN and STUDENT accounts without lab membership", async () => {
    for (const token of [dosenToken, studentToken]) {
      const response = await request(app)
        .get(
          `/api/meetings/agenda?from=2042-01-31T00:00:00.000Z&to=2042-02-02T00:00:00.000Z`,
        )
        .set("Cookie", `rams_access_token=${token}`);
      expect(response.status).toBe(200);
      const items = response.body.data.items as Array<{
        title: string;
        canViewDetails: boolean;
      }>;
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: `${PREFIX} internal agenda`,
          }),
        ]),
      );
    }
  });

  it("returns only the Busy whitelist for PRIVATE meetings", async () => {
    const response = await request(app)
      .get(
        `/api/meetings/agenda?from=2042-01-31T00:00:00.000Z&to=2042-02-02T00:00:00.000Z`,
      )
      .set("Cookie", `rams_access_token=${studentToken}`);
    expect(response.status).toBe(200);
    const busy = (response.body.data.items as Array<Record<string, unknown>>).find(
      (item) => item._id === createdMeetingIds[1]?.toString(),
    );
    expect(busy).toEqual({
      _id: createdMeetingIds[1]?.toString(),
      title: "Busy",
      startAt: new Date(PRIVATE_START).toISOString(),
      endAt: new Date(new Date(PRIVATE_START).getTime() + 60 * 60_000).toISOString(),
      createdBy: null,
      canViewDetails: false,
    });
    expect(JSON.stringify(busy)).not.toContain("private agenda");
    expect(JSON.stringify(busy)).not.toContain("description");
  });

  it("keeps alumni out of the shared agenda and read-only users cannot write", async () => {
    const alumniAgenda = await request(app)
      .get("/api/meetings/agenda")
      .set("Cookie", `rams_access_token=${nonmemberAlumniToken}`);
    expect(alumniAgenda.status).toBe(403);

    const dosenCalendar = await request(app)
      .get("/api/meetings/calendar")
      .set("Cookie", `rams_access_token=${nonmemberDosenToken}`);
    expect(dosenCalendar.status).toBe(200);

    const studentAgenda = await request(app)
      .get("/api/meetings/agenda")
      .set("Cookie", `rams_access_token=${studentToken}`);
    expect(studentAgenda.status).toBe(200);

    const create = await request(app)
      .post("/api/meetings")
      .set("Cookie", `rams_access_token=${alumniToken}`)
      .send({
        title: `${PREFIX} alumni attempt`,
        startAt: "2042-03-01T09:00:00.000Z",
        endAt: "2042-03-01T10:00:00.000Z",
      });
    expect(create.status).toBe(403);
  });

  it("keeps PRIVATE detail access restricted to ADMIN, creator, or participants", async () => {
    const privateId = createdMeetingIds[1]?.toString();
    const alumniDetail = await request(app)
      .get(`/api/meetings/${privateId}`)
      .set("Cookie", `rams_access_token=${alumniToken}`);
    expect(alumniDetail.status).toBe(403);

    const creatorDetail = await request(app)
      .get(`/api/meetings/${privateId}`)
      .set("Cookie", `rams_access_token=${dosenToken}`);
    expect(creatorDetail.status).toBe(200);

    const adminDetail = await request(app)
      .get(`/api/meetings/${privateId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(adminDetail.status).toBe(200);
  });

  it("bounds pagination and validates date ranges", async () => {
    const oversized = await request(app)
      .get("/api/meetings/agenda?limit=9999")
      .set("Cookie", `rams_access_token=${dosenToken}`);
    expect(oversized.status).toBe(200);
    expect(oversized.body.data.pagination.limit).toBe(200);

    const invalidRange = await request(app)
      .get(
        "/api/meetings/agenda?from=2042-03-02T00:00:00.000Z&to=2042-03-01T00:00:00.000Z",
      )
      .set("Cookie", `rams_access_token=${dosenToken}`);
    expect(invalidRange.status).toBe(400);
  });
});
