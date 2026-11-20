import request from "supertest";
import { ObjectId } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { CURRENT_LAB_ID } from "../src/config/lab.js";
import {
  createLabMembershipEvent,
  findPendingLabMembershipEvents,
  getLabMembershipAuditCollection,
  getLabMembershipsCollection,
  markLabMembershipEventFailed,
  transitionLabMembership,
} from "../src/modules/lab-memberships/lab-membership.repository.js";
import * as labMembershipRepository from "../src/modules/lab-memberships/lab-membership.repository.js";
import { createLabMembershipIndexes } from "../src/modules/lab-memberships/lab-membership.index.js";
import { updateLabMembership } from "../src/modules/lab-memberships/lab-membership.service.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import type {
  LabMembership,
  LabMembershipAuditLog,
  LabMembershipStatus,
} from "../src/modules/lab-memberships/lab-membership.types.js";
import type { User } from "../src/modules/users/user.types.js";
import { signTestToken } from "./auth-fixture.js";

const ADMIN_ID = new ObjectId("00000000000000000000f001");
const MEMBERS: ObjectId[] = [
  new ObjectId("00000000000000000000f002"),
  new ObjectId("00000000000000000000f003"),
  new ObjectId("00000000000000000000f004"),
  new ObjectId("00000000000000000000f005"),
  new ObjectId("00000000000000000000f006"),
  new ObjectId("00000000000000000000f007"),
  new ObjectId("00000000000000000000f008"),
  new ObjectId("00000000000000000000f009"),
  new ObjectId("00000000000000000000f00a"),
];
const ALL_USER_IDS = [ADMIN_ID, ...MEMBERS];
const NOW = new Date("2042-06-01T00:00:00.000Z");

const actor = {
  userId: ADMIN_ID.toString(),
  role: "ADMIN" as const,
  tokenVersion: 0,
};
let adminToken: string;
let databaseConnected = false;

function userDoc(id: ObjectId, role: User["role"]): User {
  return {
    _id: id,
    displayName: `Reliability ${id.toHexString().slice(-2)}`,
    email: `${id.toHexString()}@phase224.test`,
    passwordHash: "not-used-by-phase-2-2-4-tests",
    role,
    isActive: true,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function membershipDoc(options: {
  userId: ObjectId;
  status: LabMembershipStatus;
  revision?: number;
  lastTransitionId?: string;
}): LabMembership {
  return {
    userId: options.userId,
    labId: CURRENT_LAB_ID,
    status: options.status,
    ...(options.revision === undefined ? {} : { revision: options.revision }),
    ...(options.lastTransitionId === undefined
      ? {}
      : { lastTransitionId: options.lastTransitionId }),
    joinedAt: NOW,
    updatedAt: NOW,
    createdBy: ADMIN_ID,
    updatedBy: ADMIN_ID,
  };
}

async function insertMembership(options: {
  userId: ObjectId;
  status: LabMembershipStatus;
  revision?: number;
  lastTransitionId?: string;
}) {
  await getLabMembershipsCollection().insertOne(membershipDoc(options));
}

async function createPendingEvent(options: {
  userId: ObjectId;
  transitionId: string;
  action?: LabMembershipAuditLog["action"];
  expectedStatus: LabMembershipStatus | null;
  targetStatus: LabMembershipStatus;
  expectedRevision: number | null;
  resultRevision: number;
}) {
  const { event } = await createLabMembershipEvent({
    eventKey: `phase-2-2-4:${options.userId.toHexString()}:${options.transitionId}`,
    transitionId: options.transitionId,
    labId: CURRENT_LAB_ID,
    memberUserId: options.userId,
    actorUserId: ADMIN_ID,
    action: options.action ?? "ACTIVATED",
    expectedStatus: options.expectedStatus,
    targetStatus: options.targetStatus,
    expectedRevision: options.expectedRevision,
    resultRevision: options.resultRevision,
    now: NOW,
  });
  expect(event._id).toBeDefined();
  return event;
}

async function eventById(id: ObjectId | undefined) {
  if (!id) throw new Error("Missing audit event id");
  return getLabMembershipAuditCollection().findOne({ _id: id });
}

beforeAll(async () => {
  await connectDatabase();
  databaseConnected = true;
  await createLabMembershipIndexes();
  await getLabMembershipsCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    userId: { $in: ALL_USER_IDS },
  });
  await getLabMembershipAuditCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    memberUserId: { $in: ALL_USER_IDS },
  });
  await getUsersCollection().deleteMany({ _id: { $in: ALL_USER_IDS } });
  await getUsersCollection().insertMany([
    userDoc(ADMIN_ID, "ADMIN"),
    ...MEMBERS.map((userId) => userDoc(userId, "DOSEN")),
  ]);
  adminToken = signTestToken(ADMIN_ID.toString(), "ADMIN");
});

beforeEach(async () => {
  if (!databaseConnected) return;
  await getLabMembershipsCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    userId: { $in: ALL_USER_IDS },
  });
  await getLabMembershipAuditCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    memberUserId: { $in: ALL_USER_IDS },
  });
});

afterAll(async () => {
  if (!databaseConnected) return;
  await getLabMembershipsCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    userId: { $in: ALL_USER_IDS },
  });
  await getLabMembershipAuditCollection().deleteMany({
    labId: CURRENT_LAB_ID,
    memberUserId: { $in: ALL_USER_IDS },
  });
  await getUsersCollection().deleteMany({ _id: { $in: ALL_USER_IDS } });
});

describe("lab membership reliability integration", () => {
  it("allows exactly one concurrent activation and returns 409 to the loser", async () => {
    const userId = MEMBERS[0];
    const requests = await Promise.all([
      request(app)
        .post("/api/lab-memberships")
        .set("Cookie", `rams_access_token=${adminToken}`)
        .send({ userId: userId.toString() }),
      request(app)
        .post("/api/lab-memberships")
        .set("Cookie", `rams_access_token=${adminToken}`)
        .send({ userId: userId.toString() }),
    ]);

    expect(requests.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);

    const stored = await getLabMembershipsCollection().findOne({
      labId: CURRENT_LAB_ID,
      userId,
    });
    expect(stored?.status).toBe("ACTIVE");
    expect(stored?.revision).toBe(1);
    expect(stored?.lastTransitionId).toBeTruthy();

    const events = await getLabMembershipAuditCollection()
      .find({ labId: CURRENT_LAB_ID, memberUserId: userId })
      .toArray();
    expect(events.filter((event) => event.status === "APPLIED")).toHaveLength(
      1,
    );
    expect(events.some((event) => event.status === "PENDING")).toBe(false);
    for (const event of events) {
      if (event.status !== "APPLIED") {
        expect(["FAILED", "SUPERSEDED"]).toContain(event.status);
      }
    }
  });

  it("finalizes an applied event before a newer operation can commit", async () => {
    const userId = MEMBERS[8];
    const transitionA = new ObjectId().toHexString();
    await insertMembership({
      userId,
      status: "INACTIVE",
      revision: 1,
      lastTransitionId: "prior-transition",
    });
    const eventA = await createPendingEvent({
      userId,
      transitionId: transitionA,
      expectedStatus: "INACTIVE",
      targetStatus: "ACTIVE",
      expectedRevision: 1,
      resultRevision: 2,
    });

    let resolveFirstRead!: () => void;
    let resolveSecondReadStarted!: () => void;
    let releaseSecondRead!: () => void;
    const firstReadDone = new Promise<void>((resolve) => {
      resolveFirstRead = resolve;
    });
    const secondReadStarted = new Promise<void>((resolve) => {
      resolveSecondReadStarted = resolve;
    });
    const secondReadGate = new Promise<void>((resolve) => {
      releaseSecondRead = resolve;
    });

    const originalFind = labMembershipRepository.findLabMembership;
    let readCount = 0;
    const findSpy = vi
      .spyOn(labMembershipRepository, "findLabMembership")
      .mockImplementation(async (options) => {
        const currentRead = ++readCount;
        if (currentRead === 1) {
          const membership = await originalFind(options);
          resolveFirstRead();
          return membership;
        }
        if (currentRead === 2) {
          resolveSecondReadStarted();
          await secondReadGate;
          return originalFind(options);
        }
        return originalFind(options);
      });

    try {
      const operationB = updateLabMembership({
        actor,
        userId: userId.toString(),
        status: "INACTIVE",
      }).then(
        (value) => ({ state: "fulfilled" as const, value }),
        (error) => ({ state: "rejected" as const, error }),
      );

      await firstReadDone;
      await secondReadStarted;

      const transitionedA = await transitionLabMembership({
        userId,
        labId: CURRENT_LAB_ID,
        expectedStatus: "INACTIVE",
        expectedRevision: 1,
        status: "ACTIVE",
        actorUserId: ADMIN_ID,
        now: NOW,
        transitionId: transitionA,
      });
      expect(transitionedA?.revision).toBe(2);
      expect((await eventById(eventA._id))?.status).toBe("PENDING");

      releaseSecondRead();
      const operationBResult = await operationB;
      expect(operationBResult.state).toBe("fulfilled");
      if (operationBResult.state === "fulfilled") {
        expect(operationBResult.value.status).toBe("ACTIVE");
      }
    } finally {
      releaseSecondRead();
      findSpy.mockRestore();
    }

    expect((await eventById(eventA._id))?.status).toBe("APPLIED");
    const stored = await getLabMembershipsCollection().findOne({
      labId: CURRENT_LAB_ID,
      userId,
    });
    expect(stored?.status).toBe("ACTIVE");
    expect(stored?.revision).toBe(2);
    expect(stored?.lastTransitionId).toBe(transitionA);
    const events = await getLabMembershipAuditCollection()
      .find({ labId: CURRENT_LAB_ID, memberUserId: userId })
      .toArray();
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("APPLIED");
  });

  it("serializes competing CAS transitions and increments revision once", async () => {
    const userId = MEMBERS[1];
    await insertMembership({
      userId,
      status: "ACTIVE",
      revision: 1,
      lastTransitionId: "prior-transition",
    });

    const firstTransition = new ObjectId().toHexString();
    const secondTransition = new ObjectId().toHexString();
    const results = await Promise.all([
      transitionLabMembership({
        userId,
        labId: CURRENT_LAB_ID,
        expectedStatus: "ACTIVE",
        expectedRevision: 1,
        status: "INACTIVE",
        actorUserId: ADMIN_ID,
        now: NOW,
        transitionId: firstTransition,
      }),
      transitionLabMembership({
        userId,
        labId: CURRENT_LAB_ID,
        expectedStatus: "ACTIVE",
        expectedRevision: 1,
        status: "ACTIVE",
        actorUserId: ADMIN_ID,
        now: NOW,
        transitionId: secondTransition,
      }),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    const stored = await getLabMembershipsCollection().findOne({
      labId: CURRENT_LAB_ID,
      userId,
    });
    expect(stored?.revision).toBe(2);
    expect([firstTransition, secondTransition]).toContain(
      stored?.lastTransitionId,
    );
  });

  it("recovers a pending event after CAS when finalization did not run", async () => {
    const userId = MEMBERS[2];
    const transitionId = new ObjectId().toHexString();
    await insertMembership({
      userId,
      status: "INACTIVE",
      revision: 1,
      lastTransitionId: "prior-transition",
    });
    const event = await createPendingEvent({
      userId,
      transitionId,
      expectedStatus: "INACTIVE",
      targetStatus: "ACTIVE",
      expectedRevision: 1,
      resultRevision: 2,
    });

    const transitioned = await transitionLabMembership({
      userId,
      labId: CURRENT_LAB_ID,
      expectedStatus: "INACTIVE",
      expectedRevision: 1,
      status: "ACTIVE",
      actorUserId: ADMIN_ID,
      now: NOW,
      transitionId,
    });
    expect(transitioned?.revision).toBe(2);
    expect((await eventById(event._id))?.status).toBe("PENDING");

    const recovered = await updateLabMembership({
      actor,
      userId: userId.toString(),
      status: "ACTIVE",
    });
    expect(recovered.status).toBe("ACTIVE");
    expect((await eventById(event._id))?.status).toBe("APPLIED");
  });

  it("does not apply a pending event when CAS never succeeded", async () => {
    const userId = MEMBERS[3];
    const transitionId = new ObjectId().toHexString();
    await insertMembership({
      userId,
      status: "INACTIVE",
      revision: 1,
      lastTransitionId: "prior-transition",
    });
    const event = await createPendingEvent({
      userId,
      transitionId,
      expectedStatus: "INACTIVE",
      targetStatus: "ACTIVE",
      expectedRevision: 1,
      resultRevision: 2,
    });

    const result = await updateLabMembership({
      actor,
      userId: userId.toString(),
      status: "INACTIVE",
    });
    expect(result.status).toBe("INACTIVE");
    expect((await eventById(event._id))?.status).toBe("PENDING");
    const stored = await getLabMembershipsCollection().findOne({
      labId: CURRENT_LAB_ID,
      userId,
    });
    expect(stored?.revision).toBe(1);
  });

  it("supersedes a stale pending event instead of applying it", async () => {
    const userId = MEMBERS[4];
    const transitionId = new ObjectId().toHexString();
    await insertMembership({
      userId,
      status: "ACTIVE",
      revision: 3,
      lastTransitionId: "newer-transition",
    });
    const event = await createPendingEvent({
      userId,
      transitionId,
      expectedStatus: "INACTIVE",
      targetStatus: "ACTIVE",
      expectedRevision: 1,
      resultRevision: 2,
    });

    await updateLabMembership({
      actor,
      userId: userId.toString(),
      status: "ACTIVE",
    });

    expect((await eventById(event._id))?.status).toBe("SUPERSEDED");
  });

  it("keeps a FAILED event FAILED during recovery", async () => {
    const userId = MEMBERS[5];
    const transitionId = new ObjectId().toHexString();
    await insertMembership({
      userId,
      status: "ACTIVE",
      revision: 2,
      lastTransitionId: transitionId,
    });
    const event = await createPendingEvent({
      userId,
      transitionId,
      expectedStatus: "INACTIVE",
      targetStatus: "ACTIVE",
      expectedRevision: 1,
      resultRevision: 2,
    });
    await markLabMembershipEventFailed({
      id: event._id!,
      transitionId,
      now: NOW,
      errorCode: "MUTATION_FAILED",
    });

    await updateLabMembership({
      actor,
      userId: userId.toString(),
      status: "ACTIVE",
    });

    const stored = await eventById(event._id);
    expect(stored?.status).toBe("FAILED");
    expect(stored?.lastError).toBe("MUTATION_FAILED");
  });

  it("rejects duplicate event keys without adding audit rows", async () => {
    const userId = MEMBERS[6];
    const transitionId = new ObjectId().toHexString();
    await createPendingEvent({
      userId,
      transitionId,
      expectedStatus: null,
      targetStatus: "ACTIVE",
      expectedRevision: null,
      resultRevision: 1,
    });

    const duplicate = await createLabMembershipEvent({
      eventKey: `phase-2-2-4:${userId.toHexString()}:${transitionId}`,
      transitionId,
      labId: CURRENT_LAB_ID,
      memberUserId: userId,
      actorUserId: ADMIN_ID,
      action: "ACTIVATED",
      expectedStatus: null,
      targetStatus: "ACTIVE",
      expectedRevision: null,
      resultRevision: 1,
      now: NOW,
    });

    expect(duplicate.created).toBe(false);
    expect(
      await getLabMembershipAuditCollection().countDocuments({
        labId: CURRENT_LAB_ID,
        memberUserId: userId,
      }),
    ).toBe(1);
  });

  it("transitions a legacy revisionless membership from revision zero", async () => {
    const userId = MEMBERS[7];
    await insertMembership({
      userId,
      status: "INACTIVE",
    });

    const updated = await updateLabMembership({
      actor,
      userId: userId.toString(),
      status: "ACTIVE",
    });

    expect(updated.status).toBe("ACTIVE");
    const stored = await getLabMembershipsCollection().findOne({
      labId: CURRENT_LAB_ID,
      userId,
    });
    expect(stored?.revision).toBe(1);
    expect(stored?.lastTransitionId).toBeTruthy();
    const events = await getLabMembershipAuditCollection()
      .find({ labId: CURRENT_LAB_ID, memberUserId: userId })
      .toArray();
    expect(events).toHaveLength(1);
    expect(events[0]?.status).toBe("APPLIED");
  });

  it("orders pending audit events deterministically when timestamps tie", async () => {
    const userId = MEMBERS[0];
    const first = await createPendingEvent({
      userId,
      transitionId: new ObjectId().toHexString(),
      action: "ADDED",
      expectedStatus: null,
      targetStatus: "ACTIVE",
      expectedRevision: null,
      resultRevision: 1,
    });
    const second = await createPendingEvent({
      userId,
      transitionId: new ObjectId().toHexString(),
      action: "DEACTIVATED",
      expectedStatus: "ACTIVE",
      targetStatus: "INACTIVE",
      expectedRevision: 1,
      resultRevision: 2,
    });

    const events = await findPendingLabMembershipEvents({
      labId: CURRENT_LAB_ID,
      memberUserId: userId,
    });

    expect(events.map((event) => event.action)).toEqual([
      "ADDED",
      "DEACTIVATED",
    ]);
    expect(events.map((event) => event._id?.toHexString())).toEqual([
      first._id?.toHexString(),
      second._id?.toHexString(),
    ]);
  });

  it("verifies the required indexes in the isolated test database", async () => {
    const membershipIndexes = await getLabMembershipsCollection()
      .listIndexes()
      .toArray();
    const auditIndexes = await getLabMembershipAuditCollection()
      .listIndexes()
      .toArray();

    expect(
      membershipIndexes.some((index) => index.name === "lab_membership_unique"),
    ).toBe(true);
    const eventIndex = auditIndexes.find(
      (index) => index.name === "lab_membership_audit_event_unique",
    );
    expect(eventIndex?.unique).toBe(true);
    expect(
      auditIndexes.some(
        (index) => index.name === "lab_membership_audit_recovery_index",
      ),
    ).toBe(true);
  });
});
