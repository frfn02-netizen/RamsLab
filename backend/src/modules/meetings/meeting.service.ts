import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { HttpError } from "../../middlewares/error.middleware.js";
import {
  removeMeetingAttachment as removeCloudinaryAttachment,
  uploadMeetingAttachment,
} from "../../lib/cloudinary.js";
import { findUsersByIds } from "../users/user.repository.js";
import type { JwtPayload } from "../auth/auth.types.js";
import type { UserDirectoryEntry } from "../users/user.types.js";
import {
  addMeetingAttachment,
  createMeeting as createMeetingRecord,
  deleteMeeting as deleteMeetingRecord,
  findMeetingById,
  findMeetingsForUser,
  findOverlappingMeetings,
  removeMeetingAttachment as removeMeetingAttachmentRecord,
  toObjectId,
  updateMeeting as updateMeetingRecord,
} from "./meeting.repository.js";
import type { ConflictCheckInput, CreateMeetingInput, UpdateMeetingInput } from "./meeting.schema.js";
import type {
  Meeting,
  MeetingConflict,
  MeetingResponse,
  MeetingUserSummary,
} from "./meeting.types.js";

function assertDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new HttpError(400, `${label} is invalid`);
  }
}

export function assertMeetingWindow(startAt: Date, endAt: Date) {
  assertDate(startAt, "Start time");
  assertDate(endAt, "End time");
  if (endAt.getTime() <= startAt.getTime()) {
    throw new HttpError(400, "End time must be after start time");
  }
}

function uniqueObjectIds(values: ObjectId[]): ObjectId[] {
  const seen = new Set<string>();
  const result: ObjectId[] = [];
  for (const value of values) {
    const key = value.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function normalizeParticipantIds(
  ids: string[],
  creatorId: ObjectId,
): ObjectId[] {
  const creatorKey = creatorId.toString();
  const parsed = ids
    .map(toObjectId)
    .filter((value): value is ObjectId => value !== null)
    .filter((value) => value.toString() !== creatorKey);
  return uniqueObjectIds(parsed);
}

async function assertValidParticipants(ids: ObjectId[]) {
  if (ids.length === 0) return;

  const entries = await findUsersByIds(ids);
  const valid = new Set(
    entries
      .filter(
        (entry) =>
          entry.isActive && (entry.role === "ADMIN" || entry.role === "DOSEN"),
      )
      .map((entry) => entry._id?.toString()),
  );
  if (ids.some((id) => !valid.has(id.toString()))) {
    throw new HttpError(400, "Participants must be active staff accounts");
  }
}

function summary(entry: UserDirectoryEntry): MeetingUserSummary {
  return {
    id: entry._id?.toString() ?? "",
    email: entry.email,
    role: entry.role,
  };
}

async function userMapFor(meetings: Meeting[]) {
  const ids = new Map<string, ObjectId>();
  for (const meeting of meetings) {
    if (meeting.createdBy) ids.set(meeting.createdBy.toString(), meeting.createdBy);
    for (const participantId of meeting.participantIds ?? []) {
      ids.set(participantId.toString(), participantId);
    }
  }
  const entries = await findUsersByIds([...ids.values()]);
  return new Map(
    entries.map((entry) => [entry._id?.toString() ?? "", summary(entry)]),
  );
}

function serialize(
  meeting: Meeting,
  actor: JwtPayload,
  users: Map<string, MeetingUserSummary>,
): MeetingResponse {
  const creatorId = meeting.createdBy?.toString() ?? "";
  return {
    _id: meeting._id?.toString() ?? "",
    title: meeting.title,
    description: meeting.description ?? "",
    startAt: meeting.startAt.toISOString(),
    endAt: meeting.endAt.toISOString(),
    createdBy: users.get(creatorId) ?? null,
    participants: (meeting.participantIds ?? [])
      .map((id) => users.get(id.toString()))
      .filter((value): value is MeetingUserSummary => Boolean(value)),
    participantIds: (meeting.participantIds ?? []).map((id) => id.toString()),
    meetingLink: meeting.meetingLink ?? null,
    attachments: (meeting.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      uploadedAt: attachment.uploadedAt.toISOString(),
    })),
    createdAt: meeting.createdAt.toISOString(),
    updatedAt: meeting.updatedAt.toISOString(),
    canEdit:
      actor.role === "ADMIN" || creatorId === actor.userId,
  };
}

async function hydrate(meetings: Meeting[], actor: JwtPayload) {
  const users = await userMapFor(meetings);
  return meetings.map((meeting) => serialize(meeting, actor, users));
}

function assertCanView(meeting: Meeting, actor: JwtPayload) {
  if (
    actor.role === "ADMIN" ||
    meeting.createdBy?.toString() === actor.userId ||
    (meeting.participantIds ?? []).some(
      (id) => id.toString() === actor.userId,
    )
  ) {
    return;
  }
  throw new HttpError(403, "You do not have access to this meeting");
}

function assertCanModify(meeting: Meeting, actor: JwtPayload) {
  if (
    actor.role === "ADMIN" ||
    meeting.createdBy?.toString() === actor.userId
  ) {
    return;
  }
  throw new HttpError(403, "You cannot change this meeting");
}

async function computeConflicts(options: {
  startAt: Date;
  endAt: Date;
  creatorId: ObjectId;
  participantIds: ObjectId[];
  excludeId?: string;
}): Promise<MeetingConflict[]> {
  assertMeetingWindow(options.startAt, options.endAt);

  const userIds = uniqueObjectIds([
    options.creatorId,
    ...options.participantIds,
  ]);
  const overlaps = await findOverlappingMeetings({
    startAt: options.startAt,
    endAt: options.endAt,
    userIds,
    excludeId: options.excludeId,
  });
  if (overlaps.length === 0) return [];

  const users = await userMapFor(overlaps);
  return overlaps.map((meeting) => ({
    _id: meeting._id?.toString() ?? "",
    title: meeting.title,
    startAt: meeting.startAt.toISOString(),
    endAt: meeting.endAt.toISOString(),
    participants: (meeting.participantIds ?? [])
      .map((id) => users.get(id.toString()))
      .filter((value): value is MeetingUserSummary => Boolean(value)),
  }));
}

async function creatorIdFor(actor: JwtPayload): Promise<ObjectId> {
  const creatorId = toObjectId(actor.userId);
  if (!creatorId) throw new HttpError(401, "Authentication required");
  return creatorId;
}

export async function getMeetings(
  actor: JwtPayload,
  range: { from?: Date; to?: Date },
) {
  if (range.from) assertDate(range.from, "Start of range");
  if (range.to) assertDate(range.to, "End of range");
  if (range.from && range.to && range.to.getTime() <= range.from.getTime()) {
    throw new HttpError(400, "Range end must be after range start");
  }

  const meetings = await findMeetingsForUser({
    userId: actor.userId,
    isAdmin: actor.role === "ADMIN",
    from: range.from,
    to: range.to,
  });
  return hydrate(meetings, actor);
}

export async function getMeeting(id: string, actor: JwtPayload) {
  const meeting = await findMeetingById(id);
  if (!meeting) throw new HttpError(404, "Meeting not found");
  assertCanView(meeting, actor);
  const [response] = await hydrate([meeting], actor);
  return response;
}

export async function createMeeting(input: CreateMeetingInput, actor: JwtPayload) {
  assertMeetingWindow(input.startAt, input.endAt);
  const creatorId = await creatorIdFor(actor);
  const participantIds = normalizeParticipantIds(
    input.participantIds,
    creatorId,
  );
  await assertValidParticipants(participantIds);

  const conflicts = await computeConflicts({
    startAt: input.startAt,
    endAt: input.endAt,
    creatorId,
    participantIds,
  });

  const meeting = await createMeetingRecord(input, creatorId, participantIds);
  const [response] = await hydrate([meeting], actor);
  return { meeting: response, conflicts };
}

export async function updateMeeting(
  id: string,
  input: UpdateMeetingInput,
  actor: JwtPayload,
) {
  const existing = await findMeetingById(id);
  if (!existing) throw new HttpError(404, "Meeting not found");
  assertCanModify(existing, actor);

  const startAt = input.startAt ?? existing.startAt;
  const endAt = input.endAt ?? existing.endAt;
  assertMeetingWindow(startAt, endAt);

  const creatorId = existing.createdBy;
  const participantIds =
    input.participantIds === undefined
      ? existing.participantIds
      : normalizeParticipantIds(input.participantIds, creatorId);
  if (input.participantIds !== undefined) {
    await assertValidParticipants(participantIds);
  }

  const conflicts = await computeConflicts({
    startAt,
    endAt,
    creatorId,
    participantIds,
    excludeId: id,
  });

  const updated = await updateMeetingRecord(
    id,
    input,
    input.participantIds === undefined ? undefined : participantIds,
  );
  if (!updated) throw new HttpError(404, "Meeting not found");

  const [response] = await hydrate([updated], actor);
  return { meeting: response, conflicts };
}

export async function deleteMeeting(id: string, actor: JwtPayload) {
  const existing = await findMeetingById(id);
  if (!existing) throw new HttpError(404, "Meeting not found");
  assertCanModify(existing, actor);

  await deleteMeetingRecord(id);
  await Promise.allSettled(
    (existing.attachments ?? []).map((attachment) =>
      removeCloudinaryAttachment(attachment.publicId),
    ),
  );
}

export async function addAttachment(
  id: string,
  actor: JwtPayload,
  file: {
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
    size: number;
  },
) {
  const meeting = await findMeetingById(id);
  if (!meeting) throw new HttpError(404, "Meeting not found");
  assertCanModify(meeting, actor);

  if ((meeting.attachments ?? []).length >= 10) {
    throw new HttpError(400, "A meeting can have at most 10 attachments");
  }

  const uploaded = await uploadMeetingAttachment(
    file.buffer,
    file.originalFilename,
  );

  const updated = await addMeetingAttachment(id, {
    id: randomUUID(),
    url: uploaded.url,
    publicId: uploaded.publicId,
    filename: uploaded.filename,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: new Date(),
  });
  if (!updated) {
    await removeCloudinaryAttachment(uploaded.publicId).catch(() => undefined);
    throw new HttpError(404, "Meeting not found");
  }

  const [response] = await hydrate([updated], actor);
  return response;
}

export async function removeAttachment(
  id: string,
  attachmentId: string,
  actor: JwtPayload,
) {
  const meeting = await findMeetingById(id);
  if (!meeting) throw new HttpError(404, "Meeting not found");
  assertCanModify(meeting, actor);

  const { meeting: updated, removed } = await removeMeetingAttachmentRecord(
    id,
    attachmentId,
  );
  if (!removed) throw new HttpError(404, "Attachment not found");
  if (removed.publicId) {
    await removeCloudinaryAttachment(removed.publicId).catch(() => undefined);
  }
  if (!updated) throw new HttpError(404, "Meeting not found");

  const [response] = await hydrate([updated], actor);
  return response;
}

export async function checkConflicts(
  input: ConflictCheckInput,
  actor: JwtPayload,
) {
  let creatorId: ObjectId;
  if (input.excludeId) {
    const existing = await findMeetingById(input.excludeId);
    if (!existing) throw new HttpError(404, "Meeting not found");
    assertCanView(existing, actor);
    creatorId = existing.createdBy;
  } else {
    creatorId = await creatorIdFor(actor);
  }

  const participantIds = normalizeParticipantIds(
    input.participantIds,
    creatorId,
  );
  await assertValidParticipants(participantIds);

  return computeConflicts({
    startAt: input.startAt,
    endAt: input.endAt,
    creatorId,
    participantIds,
    excludeId: input.excludeId,
  });
}
