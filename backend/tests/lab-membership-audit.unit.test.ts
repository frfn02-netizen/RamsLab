import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUserById: vi.fn(),
  findUsersByIds: vi.fn(),
  findActiveLabMembership: vi.fn(),
  findLabMembership: vi.fn(),
  findLabMembershipAuditEventById: vi.fn(),
  findPendingLabMembershipEvents: vi.fn(),
  insertActiveLabMembership: vi.fn(),
  listLabMemberships: vi.fn(),
  createLabMembershipEvent: vi.fn(),
  markLabMembershipEventApplied: vi.fn(),
  markLabMembershipEventFailed: vi.fn(),
  markLabMembershipEventSuperseded: vi.fn(),
  searchUsersForMembership: vi.fn(),
  transitionLabMembership: vi.fn(),
}));

vi.mock(
  "../src/modules/lab-memberships/lab-membership.repository.js",
  () => mocks,
);
vi.mock("../src/modules/users/user.repository.js", () => ({
  findUserById: mocks.findUserById,
  findUsersByIds: mocks.findUsersByIds,
}));

import {
  addLabMembership,
  createMembershipTransitionId,
  membershipEventKey,
  membershipRevision,
  updateLabMembership,
} from "../src/modules/lab-memberships/lab-membership.service.js";
import type {
  LabMembership,
  LabMembershipAuditAction,
  LabMembershipAuditLog,
  LabMembershipStatus,
} from "../src/modules/lab-memberships/lab-membership.types.js";

const ACTOR_ID = new ObjectId("00000000000000000000a001");
const MEMBER_ID = new ObjectId("00000000000000000000a002");
const MEMBERSHIP_ID = new ObjectId("00000000000000000000a003");
const EVENT_ID = new ObjectId("00000000000000000000a004");
const NOW = new Date("2042-01-01T00:00:00.000Z");

const actor = {
  userId: ACTOR_ID.toString(),
  role: "ADMIN" as const,
  tokenVersion: 0,
};

function membership(
  status: LabMembershipStatus,
  options: {
    revision?: number;
    lastTransitionId?: string;
  } = {},
): LabMembership {
  return {
    _id: MEMBERSHIP_ID,
    userId: MEMBER_ID,
    labId: "rams",
    status,
    revision: options.revision ?? 1,
    lastTransitionId: options.lastTransitionId ?? "previous-transition",
    joinedAt: NOW,
    updatedAt: NOW,
    createdBy: ACTOR_ID,
    updatedBy: ACTOR_ID,
  };
}

function directoryEntries() {
  return [
    {
      _id: ACTOR_ID,
      email: "admin@test.local",
      role: "ADMIN",
      isActive: true,
      displayName: "Admin",
    },
    {
      _id: MEMBER_ID,
      email: "member@test.local",
      role: "DOSEN",
      isActive: true,
      displayName: "Member",
    },
  ];
}

function pendingEvent(
  action: LabMembershipAuditAction,
  options: {
    transitionId?: string;
    expectedStatus?: LabMembershipStatus | null;
    targetStatus?: LabMembershipStatus;
    expectedRevision?: number | null;
    resultRevision?: number;
    status?: LabMembershipAuditLog["status"];
  } = {},
): LabMembershipAuditLog {
  const targetStatus = options.targetStatus ?? "ACTIVE";
  return {
    _id: EVENT_ID,
    eventKey: "event-key",
    transitionId: options.transitionId ?? "transition-1",
    labId: "rams",
    memberUserId: MEMBER_ID,
    actorUserId: ACTOR_ID,
    action,
    status: options.status ?? "PENDING",
    expectedStatus:
      options.expectedStatus === undefined ? null : options.expectedStatus,
    targetStatus,
    expectedRevision:
      options.expectedRevision === undefined ? null : options.expectedRevision,
    resultRevision: options.resultRevision ?? 1,
    attempts: 1,
    lastError: null,
    createdAt: NOW,
    updatedAt: NOW,
    appliedAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findUserById.mockResolvedValue({
    _id: MEMBER_ID,
    email: "member@test.local",
    role: "DOSEN",
    isActive: true,
  });
  mocks.findUsersByIds.mockResolvedValue(directoryEntries());
  mocks.findPendingLabMembershipEvents.mockResolvedValue([]);
  mocks.findLabMembershipAuditEventById.mockResolvedValue(
    pendingEvent("ADDED", { status: "APPLIED" }),
  );
  mocks.markLabMembershipEventApplied.mockResolvedValue(true);
  mocks.markLabMembershipEventFailed.mockResolvedValue(true);
  mocks.markLabMembershipEventSuperseded.mockResolvedValue(true);
  mocks.insertActiveLabMembership.mockImplementation(
    async (options: { transitionId: string }) =>
      membership("ACTIVE", {
        revision: 1,
        lastTransitionId: options.transitionId,
      }),
  );
  mocks.transitionLabMembership.mockImplementation(
    async (options: {
      status: LabMembershipStatus;
      expectedRevision: number;
      transitionId: string;
    }) =>
      membership(options.status, {
        revision: options.expectedRevision + 1,
        lastTransitionId: options.transitionId,
      }),
  );
  mocks.createLabMembershipEvent.mockImplementation(
    async (options: {
      action: LabMembershipAuditAction;
      transitionId: string;
      expectedStatus: LabMembershipStatus | null;
      targetStatus: LabMembershipStatus;
      expectedRevision: number | null;
      resultRevision: number;
    }) => ({
      event: pendingEvent(options.action, options),
      created: true,
    }),
  );
});

describe("durable lab membership audit", () => {
  it("prevents mutation when the audit event cannot be inserted", async () => {
    mocks.findLabMembership.mockResolvedValue(null);
    mocks.createLabMembershipEvent.mockRejectedValue(
      new Error("audit storage unavailable"),
    );

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toThrow("audit storage unavailable");

    expect(mocks.insertActiveLabMembership).not.toHaveBeenCalled();
    expect(mocks.transitionLabMembership).not.toHaveBeenCalled();
  });

  it("records a revision-bound operation identity on success", async () => {
    mocks.findLabMembership.mockResolvedValue(null);

    const result = await addLabMembership({
      actor,
      userId: MEMBER_ID.toString(),
    });

    expect(result.status).toBe("ACTIVE");
    const createOptions = mocks.createLabMembershipEvent.mock.calls[0][0] as {
      action: LabMembershipAuditAction;
      transitionId: string;
      eventKey: string;
      expectedStatus: LabMembershipStatus | null;
      targetStatus: LabMembershipStatus;
      expectedRevision: number | null;
      resultRevision: number;
    };
    expect(createOptions).toEqual(
      expect.objectContaining({
        labId: "rams",
        memberUserId: MEMBER_ID,
        actorUserId: ACTOR_ID,
        action: "ADDED",
        expectedStatus: null,
        targetStatus: "ACTIVE",
        expectedRevision: null,
        resultRevision: 1,
      }),
    );
    expect(createOptions.eventKey).toBe(
      membershipEventKey(
        "rams",
        MEMBER_ID,
        "ADDED",
        createOptions.transitionId,
      ),
    );
    expect(mocks.markLabMembershipEventApplied).toHaveBeenCalledWith({
      id: EVENT_ID,
      transitionId: createOptions.transitionId,
      now: expect.any(Date),
    });
  });

  it("stores sanitized mutation error codes instead of raw errors", async () => {
    mocks.findLabMembership.mockResolvedValue(null);
    mocks.insertActiveLabMembership.mockRejectedValue(
      new Error(
        "mongodb://admin:super-secret@database.internal/rams write failed",
      ),
    );

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toThrow("mongodb://admin:super-secret");

    expect(mocks.markLabMembershipEventFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: EVENT_ID,
        errorCode: "MUTATION_FAILED",
      }),
    );
    const failedOptions = mocks.markLabMembershipEventFailed.mock
      .calls[0][0] as { errorCode: string };
    expect(failedOptions.errorCode).not.toContain("super-secret");
  });

  it("classifies database availability failures with a stable code", async () => {
    mocks.findLabMembership.mockResolvedValue(null);
    const networkError = new Error("connection refused");
    networkError.name = "MongoNetworkError";
    mocks.insertActiveLabMembership.mockRejectedValue(networkError);

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toThrow("connection refused");

    expect(mocks.markLabMembershipEventFailed).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "DATABASE_UNAVAILABLE" }),
    );
  });

  it("leaves a pending event recoverable when applied-state persistence fails", async () => {
    mocks.findLabMembership.mockResolvedValue(null);
    mocks.markLabMembershipEventApplied.mockResolvedValue(false);
    mocks.findLabMembershipAuditEventById.mockResolvedValue(
      pendingEvent("ADDED"),
    );

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toThrow("was not applied");

    expect(mocks.insertActiveLabMembership).toHaveBeenCalledTimes(1);
    expect(mocks.markLabMembershipEventFailed).not.toHaveBeenCalled();
  });

  it("recovers an exact pending operation without creating a duplicate event", async () => {
    mocks.findLabMembership.mockResolvedValue(null);
    mocks.markLabMembershipEventApplied.mockResolvedValue(false);
    mocks.findLabMembershipAuditEventById.mockResolvedValue(
      pendingEvent("ADDED"),
    );

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toThrow("was not applied");

    mocks.findPendingLabMembershipEvents.mockResolvedValue([
      pendingEvent("ADDED"),
    ]);
    mocks.findLabMembership.mockResolvedValue(
      membership("ACTIVE", {
        revision: 1,
        lastTransitionId: "transition-1",
      }),
    );
    mocks.markLabMembershipEventApplied.mockResolvedValue(true);

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.createLabMembershipEvent).toHaveBeenCalledTimes(1);
    expect(mocks.markLabMembershipEventApplied).toHaveBeenLastCalledWith({
      id: EVENT_ID,
      transitionId: "transition-1",
      now: expect.any(Date),
    });
  });

  it("does not finalize a stale pending event against a newer revision", async () => {
    mocks.findPendingLabMembershipEvents.mockResolvedValue([
      pendingEvent("ADDED", {
        transitionId: "old-transition",
        targetStatus: "ACTIVE",
        expectedRevision: null,
        resultRevision: 1,
      }),
    ]);
    mocks.findLabMembership.mockResolvedValue(
      membership("ACTIVE", {
        revision: 2,
        lastTransitionId: "new-transition",
      }),
    );

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.markLabMembershipEventSuperseded).toHaveBeenCalledWith({
      id: EVENT_ID,
      transitionId: "old-transition",
      now: expect.any(Date),
    });
    expect(mocks.markLabMembershipEventApplied).not.toHaveBeenCalled();
  });

  it("never applies a FAILED event during recovery", async () => {
    mocks.findPendingLabMembershipEvents.mockResolvedValue([
      pendingEvent("ADDED", { status: "FAILED" }),
    ]);
    mocks.findLabMembership.mockResolvedValue(
      membership("ACTIVE", {
        revision: 1,
        lastTransitionId: "transition-1",
      }),
    );

    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.markLabMembershipEventApplied).not.toHaveBeenCalled();
    expect(mocks.markLabMembershipEventSuperseded).not.toHaveBeenCalled();
  });

  it("handles compare-and-set conflicts explicitly", async () => {
    mocks.findLabMembership.mockResolvedValue(
      membership("INACTIVE", {
        revision: 3,
        lastTransitionId: "prior-transition",
      }),
    );
    mocks.transitionLabMembership.mockResolvedValue(null);

    await expect(
      updateLabMembership({
        actor,
        userId: MEMBER_ID.toString(),
        status: "ACTIVE",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(mocks.createLabMembershipEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedStatus: "INACTIVE",
        targetStatus: "ACTIVE",
        expectedRevision: 3,
        resultRevision: 4,
      }),
    );
    expect(mocks.markLabMembershipEventFailed).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: "MEMBERSHIP_CONFLICT" }),
    );
    expect(mocks.markLabMembershipEventApplied).not.toHaveBeenCalled();
  });

  it("produces distinct identities for operations in the same millisecond", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      mocks.findLabMembership.mockResolvedValue(
        membership("INACTIVE", {
          revision: 1,
          lastTransitionId: "prior-transition",
        }),
      );

      await updateLabMembership({
        actor,
        userId: MEMBER_ID.toString(),
        status: "ACTIVE",
      });
      await updateLabMembership({
        actor,
        userId: MEMBER_ID.toString(),
        status: "ACTIVE",
      });

      const first = mocks.createLabMembershipEvent.mock.calls[0][0] as {
        eventKey: string;
        transitionId: string;
      };
      const second = mocks.createLabMembershipEvent.mock.calls[1][0] as {
        eventKey: string;
        transitionId: string;
      };
      expect(first.transitionId).not.toBe(second.transitionId);
      expect(first.eventKey).not.toBe(second.eventKey);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reuses a stable event key for the same operation identity", () => {
    const transitionId = createMembershipTransitionId();
    expect(
      membershipEventKey("rams", MEMBER_ID, "DEACTIVATED", transitionId),
    ).toBe(membershipEventKey("rams", MEMBER_ID, "DEACTIVATED", transitionId));
    expect(
      membershipEventKey("rams", MEMBER_ID, "DEACTIVATED", transitionId),
    ).not.toBe(
      membershipEventKey(
        "rams",
        MEMBER_ID,
        "DEACTIVATED",
        createMembershipTransitionId(),
      ),
    );
  });

  it("treats APPLIED as terminal after the mutation result is persisted", async () => {
    mocks.findLabMembership.mockResolvedValue(null);
    mocks.markLabMembershipEventApplied.mockResolvedValue(false);
    mocks.findLabMembershipAuditEventById.mockResolvedValue(
      pendingEvent("ADDED", { status: "APPLIED" }),
    );

    const result = await addLabMembership({
      actor,
      userId: MEMBER_ID.toString(),
    });

    expect(result.status).toBe("ACTIVE");
    expect(mocks.insertActiveLabMembership).toHaveBeenCalledTimes(1);
  });

  it("keeps duplicate active membership and duplicate statuses safe", async () => {
    mocks.findLabMembership.mockResolvedValue(membership("ACTIVE", { revision: 2 }));
    await expect(
      addLabMembership({ actor, userId: MEMBER_ID.toString() }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.createLabMembershipEvent).not.toHaveBeenCalled();

    const alreadyActive = await updateLabMembership({
      actor,
      userId: MEMBER_ID.toString(),
      status: "ACTIVE",
    });
    expect(alreadyActive.status).toBe("ACTIVE");
    expect(mocks.createLabMembershipEvent).not.toHaveBeenCalled();
    expect(mocks.transitionLabMembership).not.toHaveBeenCalled();

    mocks.findLabMembership.mockResolvedValue(
      membership("INACTIVE", { revision: 2 }),
    );
    const deactivated = await updateLabMembership({
      actor,
      userId: MEMBER_ID.toString(),
      status: "INACTIVE",
    });
    expect(deactivated.status).toBe("INACTIVE");
    expect(mocks.createLabMembershipEvent).not.toHaveBeenCalled();
    expect(mocks.transitionLabMembership).not.toHaveBeenCalled();
  });

  it("preserves revision-less legacy memberships as revision zero", () => {
    const legacy = membership("INACTIVE");
    delete legacy.revision;
    expect(membershipRevision(legacy)).toBe(0);
  });
});
