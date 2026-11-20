import { MongoServerError, ObjectId, type Collection, type Filter } from "mongodb";

import { getDatabase } from "../../config/database.js";
import { CURRENT_LAB_ID } from "../../config/lab.js";
import { getUsersCollection } from "../users/user.repository.js";
import type { User } from "../users/user.types.js";
import type {
  LabMembership,
  LabMembershipAuditAction,
  LabMembershipAuditLog,
  LabMembershipStatus,
} from "./lab-membership.types.js";

const LAB_MEMBERSHIPS_COLLECTION = "lab_memberships";
const LAB_MEMBERSHIP_AUDIT_COLLECTION = "lab_membership_audit_logs";

export function getLabMembershipsCollection(): Collection<LabMembership> {
  return getDatabase().collection<LabMembership>(LAB_MEMBERSHIPS_COLLECTION);
}

export function getLabMembershipAuditCollection(): Collection<LabMembershipAuditLog> {
  return getDatabase().collection<LabMembershipAuditLog>(
    LAB_MEMBERSHIP_AUDIT_COLLECTION,
  );
}

export async function findLabMembership(options: {
  userId: ObjectId;
  labId?: string;
}): Promise<LabMembership | null> {
  return getLabMembershipsCollection().findOne({
    labId: options.labId ?? CURRENT_LAB_ID,
    userId: options.userId,
  });
}

export async function findActiveLabMembership(options: {
  userId: ObjectId;
  labId?: string;
}): Promise<LabMembership | null> {
  return getLabMembershipsCollection().findOne({
    labId: options.labId ?? CURRENT_LAB_ID,
    userId: options.userId,
    status: "ACTIVE",
  });
}

export async function listLabMemberships(options: {
  labId?: string;
  status?: LabMembershipStatus;
  userIds?: ObjectId[];
  limit: number;
  offset: number;
}): Promise<LabMembership[]> {
  const filter: Filter<LabMembership> = {
    labId: options.labId ?? CURRENT_LAB_ID,
  };
  if (options.status) filter.status = options.status;
  if (options.userIds) filter.userId = { $in: options.userIds };

  return getLabMembershipsCollection()
    .find(filter)
    .sort({ updatedAt: -1, _id: 1 })
    .skip(options.offset)
    .limit(options.limit + 1)
    .toArray();
}

function expectedRevisionFilter(
  expectedRevision: number,
): Filter<LabMembership> {
  if (expectedRevision === 0) {
    return { $or: [{ revision: 0 }, { revision: { $exists: false } }] };
  }
  return { revision: expectedRevision };
}

export async function insertActiveLabMembership(options: {
  userId: ObjectId;
  actorUserId: ObjectId;
  labId?: string;
  now: Date;
  transitionId: string;
}): Promise<LabMembership | null> {
  const membership: LabMembership = {
    userId: options.userId,
    labId: options.labId ?? CURRENT_LAB_ID,
    status: "ACTIVE",
    revision: 1,
    lastTransitionId: options.transitionId,
    joinedAt: options.now,
    updatedAt: options.now,
    createdBy: options.actorUserId,
    updatedBy: options.actorUserId,
  };

  try {
    const inserted = await getLabMembershipsCollection().insertOne(membership);
    return { ...membership, _id: inserted.insertedId };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return null;
    }
    throw error;
  }
}

export async function transitionLabMembership(options: {
  userId: ObjectId;
  labId?: string;
  expectedStatus: LabMembershipStatus;
  expectedRevision: number;
  status: LabMembershipStatus;
  actorUserId: ObjectId;
  now: Date;
  transitionId: string;
}): Promise<LabMembership | null> {
  const filter: Filter<LabMembership> = {
    labId: options.labId ?? CURRENT_LAB_ID,
    userId: options.userId,
    status: options.expectedStatus,
    ...expectedRevisionFilter(options.expectedRevision),
  };

  return getLabMembershipsCollection().findOneAndUpdate(
    filter,
    {
      $set: {
        status: options.status,
        updatedAt: options.now,
        updatedBy: options.actorUserId,
        lastTransitionId: options.transitionId,
      },
      $inc: { revision: 1 },
    },
    { returnDocument: "after" },
  );
}

export async function searchUsersForMembership(options: {
  query: string;
  limit: number;
  activeOnly?: boolean;
}): Promise<User[]> {
  const escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter: Filter<User> = {};
  if (options.activeOnly) filter.isActive = true;
  if (escaped) {
    filter.$or = [
      { email: { $regex: escaped, $options: "i" } },
      { displayName: { $regex: escaped, $options: "i" } },
    ];
  }

  return getUsersCollection()
    .find(filter, {
      projection: {
        displayName: 1,
        email: 1,
        role: 1,
        isActive: 1,
      },
    })
    .sort({ email: 1 })
    .limit(options.limit)
    .toArray();
}

export async function createLabMembershipEvent(options: {
  eventKey: string;
  transitionId: string;
  labId: string;
  memberUserId: ObjectId;
  actorUserId: ObjectId;
  action: LabMembershipAuditAction;
  expectedStatus: LabMembershipStatus | null;
  targetStatus: LabMembershipStatus;
  expectedRevision: number | null;
  resultRevision: number;
  now: Date;
}): Promise<{ event: LabMembershipAuditLog; created: boolean }> {
  const collection = getLabMembershipAuditCollection();

  try {
    const inserted = await collection.insertOne({
      eventKey: options.eventKey,
      transitionId: options.transitionId,
      labId: options.labId,
      memberUserId: options.memberUserId,
      actorUserId: options.actorUserId,
      action: options.action,
      expectedStatus: options.expectedStatus,
      targetStatus: options.targetStatus,
      expectedRevision: options.expectedRevision,
      resultRevision: options.resultRevision,
      status: "PENDING",
      attempts: 1,
      lastError: null,
      createdAt: options.now,
      updatedAt: options.now,
      appliedAt: null,
    });
    const event = await collection.findOne({ _id: inserted.insertedId });
    if (!event) throw new Error("Membership audit event could not be read");
    return { event, created: true };
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) {
      throw error;
    }

    const existing = await collection.findOne({ eventKey: options.eventKey });
    if (!existing) throw error;
    return { event: existing, created: false };
  }
}

export async function findLabMembershipAuditEventById(
  id: ObjectId,
): Promise<LabMembershipAuditLog | null> {
  return getLabMembershipAuditCollection().findOne({ _id: id });
}

export async function markLabMembershipEventApplied(options: {
  id: ObjectId;
  transitionId?: string;
  now: Date;
}): Promise<boolean> {
  const result = await getLabMembershipAuditCollection().updateOne(
    {
      _id: options.id,
      status: "PENDING",
      ...(options.transitionId
        ? { transitionId: options.transitionId }
        : {}),
    },
    {
      $set: {
        status: "APPLIED",
        appliedAt: options.now,
        updatedAt: options.now,
        lastError: null,
      },
    },
  );
  return result.modifiedCount === 1;
}

export async function markLabMembershipEventFailed(options: {
  id: ObjectId;
  transitionId?: string;
  now: Date;
  errorCode: string;
}): Promise<boolean> {
  const result = await getLabMembershipAuditCollection().updateOne(
    {
      _id: options.id,
      status: "PENDING",
      ...(options.transitionId
        ? { transitionId: options.transitionId }
        : {}),
    },
    {
      $set: {
        status: "FAILED",
        lastError: options.errorCode.slice(0, 200),
        updatedAt: options.now,
      },
    },
  );
  return result.modifiedCount === 1;
}

export async function markLabMembershipEventSuperseded(options: {
  id: ObjectId;
  transitionId?: string;
  now: Date;
}): Promise<boolean> {
  const result = await getLabMembershipAuditCollection().updateOne(
    {
      _id: options.id,
      status: "PENDING",
      ...(options.transitionId
        ? { transitionId: options.transitionId }
        : {}),
    },
    {
      $set: {
        status: "SUPERSEDED",
        updatedAt: options.now,
      },
    },
  );
  return result.modifiedCount === 1;
}

export async function findPendingLabMembershipEvents(options: {
  labId: string;
  memberUserId: ObjectId;
}): Promise<LabMembershipAuditLog[]> {
  return getLabMembershipAuditCollection()
    .find({
      labId: options.labId,
      memberUserId: options.memberUserId,
      status: "PENDING",
    })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
}
