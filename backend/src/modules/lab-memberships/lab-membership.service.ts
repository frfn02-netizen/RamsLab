import { ObjectId } from "mongodb";

import { CURRENT_LAB_ID } from "../../config/lab.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { HttpError } from "../../middlewares/error.middleware.js";
import type { JwtPayload } from "../auth/auth.types.js";
import { findUserById, findUsersByIds } from "../users/user.repository.js";
import type { UserDirectoryEntry } from "../users/user.types.js";
import {
  createLabMembershipEvent,
  findActiveLabMembership,
  findLabMembership,
  findLabMembershipAuditEventById,
  findPendingLabMembershipEvents,
  insertActiveLabMembership,
  listLabMemberships,
  markLabMembershipEventApplied,
  markLabMembershipEventFailed,
  markLabMembershipEventSuperseded,
  searchUsersForMembership,
  transitionLabMembership,
} from "./lab-membership.repository.js";
import type {
  LabMembership,
  LabMembershipAuditAction,
  LabMembershipCandidate,
  LabMembershipResponse,
  LabMembershipStatus,
} from "./lab-membership.types.js";

const MAX_PAGE_SIZE = SECURITY_LIMITS.maxPageSize;
const DEFAULT_PAGE_SIZE = 50;

function isAdmin(actor: Pick<JwtPayload, "role">) {
  return actor.role === "ADMIN";
}

function assertMembershipAdmin(actor: JwtPayload) {
  if (!isAdmin(actor)) {
    throw new HttpError(403, "Only an admin can manage lab membership");
  }
}

function parseUserId(value: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new HttpError(400, "Invalid user id");
  }
  return new ObjectId(value);
}

function summary(entry: UserDirectoryEntry) {
  const fallbackName = entry.email.split("@", 1)[0] || entry.email;
  return {
    id: entry._id?.toString() ?? "",
    displayName: entry.displayName?.trim() || fallbackName,
    email: entry.email,
    role: entry.role,
    isActive: entry.isActive,
  };
}

async function serializeMemberships(
  memberships: LabMembership[],
): Promise<LabMembershipResponse[]> {
  const userIds = new Map<string, ObjectId>();
  for (const membership of memberships) {
    userIds.set(membership.userId.toString(), membership.userId);
    userIds.set(membership.createdBy.toString(), membership.createdBy);
    userIds.set(membership.updatedBy.toString(), membership.updatedBy);
  }

  const users = await findUsersByIds([...userIds.values()]);
  const byId = new Map(
    users.map((entry) => [entry._id?.toString() ?? "", summary(entry)]),
  );

  return memberships.map((membership) => ({
    userId: membership.userId.toString(),
    labId: membership.labId,
    status: membership.status,
    joinedAt: membership.joinedAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
    user: byId.get(membership.userId.toString()) ?? null,
    createdBy: byId.get(membership.createdBy.toString()) ?? null,
    updatedBy: byId.get(membership.updatedBy.toString()) ?? null,
  }));
}

export async function isActiveLabMember(
  userId: string,
  labId = CURRENT_LAB_ID,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const membership = await findActiveLabMembership({
    userId: new ObjectId(userId),
    labId,
  });
  return Boolean(membership);
}

export async function requireActiveLabMembership(
  userId: string,
  labId = CURRENT_LAB_ID,
): Promise<void> {
  if (!(await isActiveLabMember(userId, labId))) {
    throw new HttpError(
      403,
      "Active lab membership is required",
      undefined,
      "LAB_MEMBERSHIP_REQUIRED",
    );
  }
}

export async function requireAgendaAccess(
  actor: JwtPayload,
  labId = CURRENT_LAB_ID,
): Promise<void> {
  if (isAdmin(actor)) return;
  await requireActiveLabMembership(actor.userId, labId);
}

export async function getLabMembershipForUser(
  userId: string,
  labId = CURRENT_LAB_ID,
): Promise<LabMembership | null> {
  if (!ObjectId.isValid(userId)) return null;
  return findLabMembership({
    userId: new ObjectId(userId),
    labId,
  });
}

export async function listLabMembershipEntries(options: {
  actor: JwtPayload;
  query?: string;
  status?: LabMembershipStatus;
  limit?: number;
  offset?: number;
}): Promise<{
  items: LabMembershipResponse[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}> {
  assertMembershipAdmin(options.actor);

  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? DEFAULT_PAGE_SIZE), 1),
    MAX_PAGE_SIZE,
  );
  const offset = Math.min(
    Math.max(Math.trunc(options.offset ?? 0), 0),
    SECURITY_LIMITS.maxPageNumber,
  );
  const query = options.query?.trim().slice(0, SECURITY_LIMITS.maxSearchLength);

  let userIds: ObjectId[] | undefined;
  if (query) {
    const matches = await searchUsersForMembership({
      query,
      limit: MAX_PAGE_SIZE,
    });
    userIds = matches
      .map((user) => user._id)
      .filter((id): id is ObjectId => Boolean(id));
    if (userIds.length === 0) {
      return {
        items: [],
        pagination: { limit, offset, hasMore: false, nextOffset: null },
      };
    }
  }

  const memberships = await listLabMemberships({
    labId: CURRENT_LAB_ID,
    status: options.status,
    userIds,
    limit,
    offset,
  });
  const hasMore = memberships.length > limit;
  const page = hasMore ? memberships.slice(0, limit) : memberships;

  return {
    items: await serializeMemberships(page),
    pagination: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    },
  };
}

export async function searchLabMembershipCandidates(options: {
  actor: JwtPayload;
  query?: string;
  limit?: number;
}): Promise<LabMembershipCandidate[]> {
  assertMembershipAdmin(options.actor);
  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? 20), 1),
    50,
  );
  const users = await searchUsersForMembership({
    query: options.query?.trim().slice(0, SECURITY_LIMITS.maxSearchLength) ?? "",
    limit,
    activeOnly: true,
  });
  return users
    .filter((user): user is typeof user & { _id: ObjectId } => Boolean(user._id))
    .map((user) => ({
      id: user._id.toString(),
      displayName: user.displayName?.trim() || undefined,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }));
}

export function membershipRevision(membership: LabMembership): number {
  return membership.revision ?? 0;
}

export function createMembershipTransitionId(): string {
  return new ObjectId().toHexString();
}

export function membershipEventKey(
  labId: string,
  userId: ObjectId,
  action: LabMembershipAuditAction,
  transitionId: string,
): string {
  return `${labId}:${userId.toString()}:${action}:${transitionId}`;
}

function sanitizeMutationErrorCode(error: unknown): string {
  const name = error instanceof Error ? error.name : "";
  if (
    name === "MongoNetworkError" ||
    name === "MongoServerSelectionError" ||
    name === "MongoNotConnectedError" ||
    name === "MongoTopologyClosedError"
  ) {
    return "DATABASE_UNAVAILABLE";
  }
  return "MUTATION_FAILED";
}

async function finalizePendingMembershipEvents(
  memberUserId: ObjectId,
  labId: string,
): Promise<void> {
  const events = await findPendingLabMembershipEvents({
    labId,
    memberUserId,
  });
  if (events.length === 0) return;

  const membership = await findLabMembership({ userId: memberUserId, labId });
  for (const event of events) {
    if (
      !event._id ||
      event.status !== "PENDING" ||
      !event.transitionId ||
      event.resultRevision === undefined ||
      !event.targetStatus
    ) {
      continue;
    }

    const currentRevision = membership ? membershipRevision(membership) : -1;
    const exactMatch =
      membership?.lastTransitionId === event.transitionId &&
      currentRevision === event.resultRevision &&
      membership.status === event.targetStatus;

    if (exactMatch) {
      const applied = await markLabMembershipEventApplied({
        id: event._id,
        transitionId: event.transitionId,
        now: new Date(),
      });
      if (!applied) {
        const latest = await findLabMembershipAuditEventById(event._id);
        if (latest?.status !== "APPLIED") {
          throw new Error("Pending membership audit event could not be applied");
        }
      }
      continue;
    }

    if (currentRevision >= event.resultRevision) {
      await markLabMembershipEventSuperseded({
        id: event._id,
        transitionId: event.transitionId,
        now: new Date(),
      });
    }
  }
}

async function ensureMembershipEventApplied(
  eventId: ObjectId | undefined,
  transitionId: string,
  now: Date,
  actorUserId: ObjectId,
): Promise<void> {
  if (!eventId) throw new Error("Missing membership audit event id");
  const applied = await markLabMembershipEventApplied({
    id: eventId,
    transitionId,
    now,
  });
  if (applied) return;

  const latest = await findLabMembershipAuditEventById(eventId);
  if (latest?.status !== "APPLIED") {
    throw new Error(
      `Membership audit event ${eventId.toString()} was not applied by actor ${actorUserId.toString()}`,
    );
  }
}

async function failMembershipEvent(
  eventId: ObjectId | undefined,
  transitionId: string,
  now: Date,
  errorCode: string,
): Promise<void> {
  if (!eventId) return;
  await markLabMembershipEventFailed({
    id: eventId,
    transitionId,
    now,
    errorCode,
  });
}

export async function addLabMembership(options: {
  actor: JwtPayload;
  userId: string;
}): Promise<LabMembershipResponse> {
  assertMembershipAdmin(options.actor);
  const userId = parseUserId(options.userId);
  const user = await findUserById(userId.toString());
  if (!user || !user.isActive) {
    throw new HttpError(400, "An active user account is required");
  }

  const actorId = new ObjectId(options.actor.userId);
  const existing = await findLabMembership({
    userId,
    labId: CURRENT_LAB_ID,
  });
  await finalizePendingMembershipEvents(userId, CURRENT_LAB_ID);
  if (existing?.status === "ACTIVE") {
    throw new HttpError(409, "This user is already an active lab member");
  }

  const action: LabMembershipAuditAction = existing ? "ACTIVATED" : "ADDED";
  const transitionId = createMembershipTransitionId();
  const expectedRevision = existing ? membershipRevision(existing) : null;
  const resultRevision = expectedRevision === null ? 1 : expectedRevision + 1;
  const now = new Date();
  const { event, created } = await createLabMembershipEvent({
    eventKey: membershipEventKey(
      CURRENT_LAB_ID,
      userId,
      action,
      transitionId,
    ),
    transitionId,
    labId: CURRENT_LAB_ID,
    memberUserId: userId,
    actorUserId: actorId,
    action,
    expectedStatus: existing?.status ?? null,
    targetStatus: "ACTIVE",
    expectedRevision,
    resultRevision,
    now,
  });
  if (!created) {
    throw new HttpError(409, "Membership operation already recorded");
  }

  let membership: LabMembership | null;
  try {
    membership = existing
      ? await transitionLabMembership({
          userId,
          actorUserId: actorId,
          labId: CURRENT_LAB_ID,
          expectedStatus: existing.status,
          expectedRevision: membershipRevision(existing),
          status: "ACTIVE",
          now,
          transitionId,
        })
      : await insertActiveLabMembership({
          userId,
          actorUserId: actorId,
          labId: CURRENT_LAB_ID,
          now,
          transitionId,
        });
  } catch (error) {
    await failMembershipEvent(
      event._id,
      transitionId,
      now,
      sanitizeMutationErrorCode(error),
    );
    throw error;
  }

  if (!membership) {
    const error = new HttpError(
      409,
      "Lab membership changed while this request was being processed",
    );
    await failMembershipEvent(
      event._id,
      transitionId,
      now,
      "MEMBERSHIP_CONFLICT",
    );
    throw error;
  }

  await ensureMembershipEventApplied(event._id, transitionId, now, actorId);
  const [serialized] = await serializeMemberships([membership]);
  if (!serialized) throw new Error("Membership serialization failed");
  return serialized;
}

export async function updateLabMembership(options: {
  actor: JwtPayload;
  userId: string;
  status: LabMembershipStatus;
}): Promise<LabMembershipResponse> {
  assertMembershipAdmin(options.actor);
  const userId = parseUserId(options.userId);
  if (
    options.actor.userId === userId.toString() &&
    options.status === "INACTIVE"
  ) {
    throw new HttpError(400, "You cannot deactivate your own membership");
  }

  const actorId = new ObjectId(options.actor.userId);
  const existing = await findLabMembership({
    userId,
    labId: CURRENT_LAB_ID,
  });
  await finalizePendingMembershipEvents(userId, CURRENT_LAB_ID);
  if (!existing) {
    throw new HttpError(404, "Lab membership not found");
  }

  const now = new Date();
  if (existing.status === options.status) {
    const latest =
      (await findLabMembership({ userId, labId: CURRENT_LAB_ID })) ?? existing;
    const [serialized] = await serializeMemberships([latest]);
    if (!serialized) throw new Error("Membership serialization failed");
    return serialized;
  }

  const action: LabMembershipAuditAction =
    options.status === "ACTIVE" ? "ACTIVATED" : "DEACTIVATED";
  const transitionId = createMembershipTransitionId();
  const expectedRevision = membershipRevision(existing);
  const resultRevision = expectedRevision + 1;
  const { event, created } = await createLabMembershipEvent({
    eventKey: membershipEventKey(
      CURRENT_LAB_ID,
      userId,
      action,
      transitionId,
    ),
    transitionId,
    labId: CURRENT_LAB_ID,
    memberUserId: userId,
    actorUserId: actorId,
    action,
    expectedStatus: existing.status,
    targetStatus: options.status,
    expectedRevision,
    resultRevision,
    now,
  });
  if (!created) {
    throw new HttpError(409, "Membership operation already recorded");
  }

  let updated: LabMembership | null;
  try {
    updated = await transitionLabMembership({
      userId,
      labId: CURRENT_LAB_ID,
      expectedStatus: existing.status,
      expectedRevision,
      status: options.status,
      actorUserId: actorId,
      now,
      transitionId,
    });
  } catch (error) {
    await failMembershipEvent(
      event._id,
      transitionId,
      now,
      sanitizeMutationErrorCode(error),
    );
    throw error;
  }

  if (!updated) {
    const error = new HttpError(
      409,
      "Lab membership changed while this request was being processed",
    );
    await failMembershipEvent(
      event._id,
      transitionId,
      now,
      "MEMBERSHIP_CONFLICT",
    );
    throw error;
  }

  await ensureMembershipEventApplied(event._id, transitionId, now, actorId);
  const [serialized] = await serializeMemberships([updated]);
  if (!serialized) throw new Error("Membership serialization failed");
  return serialized;
}

export async function deactivateLabMembership(options: {
  actor: JwtPayload;
  userId: string;
}): Promise<LabMembershipResponse> {
  return updateLabMembership({
    actor: options.actor,
    userId: options.userId,
    status: "INACTIVE",
  });
}
