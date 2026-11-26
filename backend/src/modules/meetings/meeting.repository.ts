import { Collection, ObjectId, type Filter } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type {
  CreateMeetingInput,
  UpdateMeetingInput,
} from "./meeting.schema.js";
import type { Meeting, MeetingAttachment } from "./meeting.types.js";

const MEETINGS_COLLECTION = "meetings";

export type AddMeetingAttachmentResult =
  | { status: "ok"; meeting: Meeting }
  | { status: "not_found" }
  | { status: "limit_reached" };

export function getMeetingsCollection(): Collection<Meeting> {
  return getDatabase().collection<Meeting>(MEETINGS_COLLECTION);
}

export function toObjectId(value: string): ObjectId | null {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function findMeetingsForUser(options: {
  userId: string;
  isAdmin: boolean;
  from?: Date;
  to?: Date;
}): Promise<Meeting[]> {
  const filter: Filter<Meeting> = {};

  if (!options.isAdmin) {
    const userId = toObjectId(options.userId);
    if (!userId) return [];
    filter.$or = [{ createdBy: userId }, { participantIds: userId }];
  }

  if (options.to) filter.startAt = { $lt: options.to };
  if (options.from) filter.endAt = { $gt: options.from };

  return getMeetingsCollection()
    .find(filter)
    .sort({ startAt: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findMeetingsForCalendar(options: {
  from?: Date;
  to?: Date;
}): Promise<Meeting[]> {
  const filter: Filter<Meeting> = {};
  if (options.to) filter.startAt = { $lt: options.to };
  if (options.from) filter.endAt = { $gt: options.from };

  return getMeetingsCollection()
    .find(filter)
    .sort({ startAt: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findMeetingsForAgenda(options: {
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}): Promise<Meeting[]> {
  const filter: Filter<Meeting> = {};
  if (options.to) filter.startAt = { $lt: options.to };
  if (options.from) filter.endAt = { $gt: options.from };

  return getMeetingsCollection()
    .find(filter)
    .sort({ startAt: 1 })
    .skip(options.offset)
    .limit(options.limit)
    .toArray();
}

export async function findMeetingById(id: string): Promise<Meeting | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  return getMeetingsCollection().findOne({ _id: objectId });
}

export async function findOverlappingMeetings(options: {
  startAt: Date;
  endAt: Date;
  userIds: ObjectId[];
  excludeId?: string;
}): Promise<Meeting[]> {
  if (options.userIds.length === 0) return [];

  const filter: Filter<Meeting> = {
    $and: [
      { startAt: { $lt: options.endAt } },
      { endAt: { $gt: options.startAt } },
      {
        $or: [
          { createdBy: { $in: options.userIds } },
          { participantIds: { $in: options.userIds } },
          { picIds: { $in: options.userIds } },
        ],
      },
      {
        cancelledAt: { $exists: false },
      },
    ],
  };

  const excludeId = options.excludeId ? toObjectId(options.excludeId) : null;
  if (excludeId) filter._id = { $ne: excludeId };

  return getMeetingsCollection()
    .find(filter)
    .sort({ startAt: 1 })
    .limit(SECURITY_LIMITS.maxArrayEntries)
    .toArray();
}

export async function createMeeting(
  input: CreateMeetingInput,
  creatorId: ObjectId,
  participantIds: ObjectId[],
): Promise<Meeting> {
  const now = new Date();
  const primaryPicId = input.primaryPicId
    ? toObjectId(input.primaryPicId)
    : null;
  const picIds = (input.picIds ?? [])
    .map(toObjectId)
    .filter((id): id is ObjectId => id !== null);

  const meeting: Meeting = {
    title: input.title,
    description: input.description,
    clientName: input.clientName,
    mode: input.mode,
    location: input.location ?? null,
    startAt: input.startAt,
    endAt: input.endAt,
    createdBy: creatorId,
    primaryPicId: primaryPicId ?? undefined,
    picIds: picIds.length > 0 ? picIds : undefined,
    participantIds,
    meetingLink: input.meetingLink ?? null,
    additionalReminderEmails: input.additionalReminderEmails ?? [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
  const result = await getMeetingsCollection().insertOne(meeting);
  return { ...meeting, _id: result.insertedId };
}

export async function updateMeeting(
  id: string,
  input: UpdateMeetingInput,
  participantIds: ObjectId[] | undefined,
  expectedUpdatedAt?: Date,
): Promise<Meeting | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const set: Partial<Meeting> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.clientName !== undefined) set.clientName = input.clientName;
  if (input.mode !== undefined) set.mode = input.mode;
  if (input.location !== undefined) set.location = input.location;
  if (input.startAt !== undefined) set.startAt = input.startAt;
  if (input.endAt !== undefined) set.endAt = input.endAt;
  if (input.meetingLink !== undefined)
    set.meetingLink = input.meetingLink || null;
  if (input.additionalReminderEmails !== undefined)
    set.additionalReminderEmails = input.additionalReminderEmails;
  if (participantIds !== undefined) set.participantIds = participantIds;
  if (input.primaryPicId !== undefined) {
    set.primaryPicId = toObjectId(input.primaryPicId) ?? undefined;
  }
  if (input.picIds !== undefined) {
    set.picIds = input.picIds
      .map(toObjectId)
      .filter((id): id is ObjectId => id !== null);
  }

  // Legacy documents may still contain removed fields. Strip them on write so
  // old visibility/audit data does not survive a legitimate update.
  const update: Parameters<Collection<Meeting>["findOneAndUpdate"]>[1] = {
    $set: set,
    $unset: { visibility: "", auditHistory: "" },
  };

  return getMeetingsCollection().findOneAndUpdate(
    {
      _id: objectId,
      ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
    },
    update,
    { returnDocument: "after" },
  );
}

export async function cancelMeeting(
  id: string,
  cancelledAt: Date,
  cancelledBy: ObjectId,
  reason: string | undefined,
): Promise<Meeting | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const set: Partial<Meeting> = {
    cancelledAt,
    cancelledBy,
    updatedAt: cancelledAt,
  };
  if (reason) set.cancellationReason = reason;

  return getMeetingsCollection().findOneAndUpdate(
    {
      _id: objectId,
      cancelledAt: { $exists: false },
      endAt: { $gt: cancelledAt },
    },
    { $set: set, $unset: { visibility: "", auditHistory: "" } },
    { returnDocument: "after" },
  );
}

export async function deleteMeeting(id: string): Promise<boolean> {
  const objectId = toObjectId(id);
  if (!objectId) return false;
  const result = await getMeetingsCollection().deleteOne({ _id: objectId });
  return result.deletedCount === 1;
}

export async function addMeetingAttachment(
  id: string,
  attachment: MeetingAttachment,
  maxAttachments: number,
): Promise<AddMeetingAttachmentResult> {
  const objectId = toObjectId(id);
  if (!objectId) return { status: "not_found" };

  const update: Parameters<Collection<Meeting>["findOneAndUpdate"]>[1] = {
    $push: { attachments: attachment },
    $set: { updatedAt: new Date() },
    $unset: { visibility: "", auditHistory: "" },
  };

  const meeting = await getMeetingsCollection().findOneAndUpdate(
    {
      _id: objectId,
      $expr: {
        $lt: [{ $size: { $ifNull: ["$attachments", []] } }, maxAttachments],
      },
    },
    update,
    { returnDocument: "after" },
  );

  if (meeting) return { status: "ok", meeting };

  const existing = await getMeetingsCollection().findOne(
    { _id: objectId },
    { projection: { _id: 1 } },
  );
  return existing ? { status: "limit_reached" } : { status: "not_found" };
}

export async function removeMeetingAttachment(
  id: string,
  attachmentId: string,
): Promise<{ meeting: Meeting | null; removed: MeetingAttachment | null }> {
  const objectId = toObjectId(id);
  if (!objectId) return { meeting: null, removed: null };

  const existing = await getMeetingsCollection().findOne({ _id: objectId });
  const removed =
    existing?.attachments.find((item) => item.id === attachmentId) ?? null;
  if (!existing || !removed) return { meeting: existing, removed: null };

  const meeting = await getMeetingsCollection().findOneAndUpdate(
    { _id: objectId, "attachments.id": attachmentId },
    {
      $pull: { attachments: { id: attachmentId } },
      $set: { updatedAt: new Date() },
      $unset: { visibility: "", auditHistory: "" },
    },
    { returnDocument: "after" },
  );
  return { meeting, removed: meeting ? removed : null };
}
