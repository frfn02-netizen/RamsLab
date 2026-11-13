import { Collection, ObjectId, type Filter } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type { CreateMeetingInput, UpdateMeetingInput } from "./meeting.schema.js";
import type { Meeting, MeetingAttachment } from "./meeting.types.js";

const MEETINGS_COLLECTION = "meetings";

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
    startAt: { $lt: options.endAt },
    endAt: { $gt: options.startAt },
    $or: [
      { createdBy: { $in: options.userIds } },
      { participantIds: { $in: options.userIds } },
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
  const meeting: Meeting = {
    title: input.title,
    description: input.description,
    startAt: input.startAt,
    endAt: input.endAt,
    createdBy: creatorId,
    participantIds,
    meetingLink: input.meetingLink ?? null,
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
): Promise<Meeting | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const set: Partial<Meeting> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.startAt !== undefined) set.startAt = input.startAt;
  if (input.endAt !== undefined) set.endAt = input.endAt;
  if (input.meetingLink !== undefined)
    set.meetingLink = input.meetingLink || null;
  if (participantIds !== undefined) set.participantIds = participantIds;

  return getMeetingsCollection().findOneAndUpdate(
    { _id: objectId },
    { $set: set },
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
): Promise<Meeting | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  return getMeetingsCollection().findOneAndUpdate(
    { _id: objectId },
    {
      $push: { attachments: attachment },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );
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
    { _id: objectId },
    {
      $pull: { attachments: { id: attachmentId } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" },
  );
  return { meeting, removed };
}
