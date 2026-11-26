import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { HttpError } from "../../middlewares/error.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import {
  removeMeetingAttachment as removeCloudinaryAttachment,
  uploadMeetingAttachment,
} from "../../lib/cloudinary.js";
import { isSafeHttpUrl } from "../../lib/url-security.js";
import { meetingInvolvesHighlightedUser } from "../../config/meeting-highlight.js";
import {
  findActiveInternalEmailContacts,
  findUsersByIds,
} from "../users/user.repository.js";
import type { JwtPayload } from "../auth/auth.types.js";
import type { UserDirectoryEntry } from "../users/user.types.js";
import {
  addMeetingAttachment,
  cancelMeeting as cancelMeetingRecord,
  createMeeting as createMeetingRecord,
  deleteMeeting as deleteMeetingRecord,
  findMeetingById,
  findMeetingsForAgenda,
  findMeetingsForCalendar,
  findMeetingsForUser,
  findOverlappingMeetings,
  removeMeetingAttachment as removeMeetingAttachmentRecord,
  toObjectId,
  updateMeeting as updateMeetingRecord,
} from "./meeting.repository.js";
import { MAX_MEETING_ATTACHMENTS } from "./meeting.schema.js";
import type {
  CancelMeetingInput,
  ConflictCheckInput,
  CreateMeetingInput,
  UpdateMeetingInput,
} from "./meeting.schema.js";
import type {
  Meeting,
  MeetingCalendarCreator,
  MeetingCalendarResponse,
  MeetingConflict,
  MeetingMode,
  MeetingResponse,
  MeetingStatus,
  MeetingUserSummary,
} from "./meeting.types.js";

const MEETING_ALREADY_ENDED_MESSAGE =
  "Meeting has already ended and cannot be cancelled.";
const MEETING_ALREADY_ENDED_CODE = "MEETING_ALREADY_ENDED";

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

async function withoutInternalRecipientEmails(
  emails: string[] | undefined,
): Promise<string[] | undefined> {
  if (!emails || emails.length === 0) return emails;

  // Internal staff should be added as participants, not duplicated through the
  // free-form reminder list. Match against every active ADMIN/DOSEN address.
  const internalEmails = new Set(
    (await findActiveInternalEmailContacts()).map((contact) =>
      contact.email.trim().toLowerCase(),
    ),
  );
  return emails.filter((email) => !internalEmails.has(email.trim().toLowerCase()));
}

type MeetingDetailFields = {
  clientName?: string | null;
  mode?: MeetingMode | null;
  location?: string | null;
  meetingLink?: string | null;
  additionalReminderEmails?: string[];
};

function normalizeMeetingDetails<T extends MeetingDetailFields>(meeting: T): T {
  const normalized = { ...meeting };
  if (typeof normalized.clientName === "string") {
    normalized.clientName = normalized.clientName.trim();
  }
  if (typeof normalized.location === "string") {
    normalized.location = normalized.location.trim() || null;
  }
  if (typeof normalized.meetingLink === "string") {
    normalized.meetingLink = normalized.meetingLink.trim() || null;
  }
  if (Array.isArray(normalized.additionalReminderEmails)) {
    normalized.additionalReminderEmails = [
      ...new Set(
        normalized.additionalReminderEmails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  if (normalized.mode === "OFFLINE") {
    const location = normalized.location?.trim();
    if (!location) {
      throw new HttpError(
        400,
        "A physical location is required for offline meetings",
      );
    }
    const meetingLink = normalized.meetingLink?.trim() || null;
    if (meetingLink && !isSafeHttpUrl(meetingLink)) {
      throw new HttpError(
        400,
        "A valid meeting URL is required when a link is provided",
      );
    }
    normalized.location = location;
    normalized.meetingLink = meetingLink;
  } else if (normalized.mode === "ONLINE") {
    const meetingLink = normalized.meetingLink?.trim();
    if (!meetingLink || !isSafeHttpUrl(meetingLink)) {
      throw new HttpError(
        400,
        "A valid meeting URL is required for online meetings",
      );
    }
    normalized.location = null;
    normalized.meetingLink = meetingLink;
  }

  return normalized;
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
          entry.isActive &&
          (entry.role === "ADMIN" || entry.role === "DOSEN"),
      )
      .map((entry) => entry._id?.toString()),
  );
  if (ids.some((id) => !valid.has(id.toString()))) {
    throw new HttpError(
      400,
      "Participants must be active accounts with meeting access",
    );
  }
}

function summary(entry: UserDirectoryEntry): MeetingUserSummary {
  const fallbackName = entry.email.split("@", 1)[0] || entry.email;
  return {
    id: entry._id?.toString() ?? "",
    displayName: entry.displayName?.trim() || fallbackName,
    email: entry.email,
    role: entry.role,
  };
}

function isInternalRole(actor: JwtPayload) {
  return actor.role === "ADMIN" || actor.role === "DOSEN";
}

function canManageOwnMeeting(actor: JwtPayload) {
  return actor.role === "ADMIN" || actor.role === "DOSEN";
}

function assertSharedAgendaAccess(actor: JwtPayload) {
  if (!isInternalRole(actor)) {
    throw new HttpError(403, "The shared agenda is available to RAMS accounts");
  }
}

export function getMeetingStatus(
  meeting: Pick<Meeting, "startAt" | "endAt" | "cancelledAt">,
  now = new Date(),
): MeetingStatus {
  if (meeting.cancelledAt) return "CANCELLED";

  const current = now.getTime();
  if (current < meeting.startAt.getTime()) return "UPCOMING";
  if (current < meeting.endAt.getTime()) return "ONGOING";
  return "PAST";
}

export function assertMeetingNotEnded(
  meeting: Pick<Meeting, "endAt">,
  now = new Date(),
) {
  if (meeting.endAt.getTime() <= now.getTime()) {
    throw new HttpError(
      409,
      MEETING_ALREADY_ENDED_MESSAGE,
      undefined,
      MEETING_ALREADY_ENDED_CODE,
    );
  }
}

async function userMapFor(meetings: Meeting[]) {
  const ids = new Map<string, ObjectId>();
  for (const meeting of meetings) {
    if (meeting.createdBy)
      ids.set(meeting.createdBy.toString(), meeting.createdBy);
    if (meeting.primaryPicId)
      ids.set(meeting.primaryPicId.toString(), meeting.primaryPicId);
    for (const picId of meeting.picIds ?? []) {
      ids.set(picId.toString(), picId);
    }
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
  const isOrganizer = creatorId === actor.userId;
  const canManageOwn =
    actor.role === "ADMIN" || (isOrganizer && canManageOwnMeeting(actor));
  const canEdit = canManageOwn;
  const canDelete = canManageOwn && (actor.role === "ADMIN" || isOrganizer);
  const primaryPic = meeting.primaryPicId
    ? users.get(meeting.primaryPicId.toString())
    : undefined;
  const additionalPics = (meeting.picIds ?? [])
    .filter((id) => id.toString() !== meeting.primaryPicId?.toString())
    .map((id) => users.get(id.toString()))
    .filter((value): value is MeetingUserSummary => Boolean(value));
  return {
    _id: meeting._id?.toString() ?? "",
    title: meeting.title,
    description: meeting.description ?? "",
    clientName: meeting.clientName?.trim() || null,
    mode: meeting.mode ?? null,
    location: meeting.location?.trim() || null,
    startAt: meeting.startAt.toISOString(),
    endAt: meeting.endAt.toISOString(),
    createdBy: users.get(creatorId) ?? null,
    primaryPicId: meeting.primaryPicId?.toString(),
    picIds: (meeting.picIds ?? []).map((id) => id.toString()),
    pics: (meeting.picIds ?? [])
      .map((id) => users.get(id.toString()))
      .filter((value): value is MeetingUserSummary => Boolean(value)),
    ...(primaryPic ? { primaryPic } : {}),
    ...(additionalPics.length > 0 ? { additionalPics } : {}),
    participants: (meeting.participantIds ?? [])
      .map((id) => users.get(id.toString()))
      .filter((value): value is MeetingUserSummary => Boolean(value)),
    participantIds: (meeting.participantIds ?? []).map((id) => id.toString()),
    meetingLink: meeting.meetingLink ?? null,
    additionalReminderEmails: meeting.additionalReminderEmails ?? [],
    status: getMeetingStatus(meeting),
    cancelledAt: meeting.cancelledAt?.toISOString() ?? null,
    cancelledBy: meeting.cancelledBy?.toString() ?? null,
    cancellationReason: meeting.cancellationReason ?? null,
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
    canEdit,
    canCancel: canEdit,
    canDelete,
    isOrganizer,
    involvesHighlightedUser: meetingInvolvesHighlightedUser(meeting),
  };
}

function hasDetailAccess(meeting: Meeting, actor: JwtPayload) {
  // Meetings are shared across RAMS staff accounts. These fallbacks keep legacy
  // callers and fixtures understandable even though all routes are internal.
  return (
    isInternalRole(actor) ||
    actor.role === "ADMIN" ||
    meeting.createdBy?.toString() === actor.userId ||
    (meeting.participantIds ?? []).some((id) => id.toString() === actor.userId)
  );
}

function calendarCreator(
  creator: MeetingUserSummary | undefined,
): MeetingCalendarCreator | null {
  if (!creator) return null;
  return {
    id: creator.id,
    ...(creator.displayName ? { displayName: creator.displayName } : {}),
    role: creator.role,
  };
}

function serializeCalendar(
  meeting: Meeting,
  actor: JwtPayload,
  users: Map<string, MeetingUserSummary>,
): MeetingCalendarResponse {
  const creatorId = meeting.createdBy?.toString() ?? "";
  const canViewDetails = hasDetailAccess(meeting, actor);
  const primaryPic = meeting.primaryPicId
    ? users.get(meeting.primaryPicId.toString())
    : undefined;
  const additionalPicNames = (meeting.picIds ?? [])
    .filter((id) => id.toString() !== meeting.primaryPicId?.toString())
    .map((id) => users.get(id.toString())?.displayName)
    .filter((value): value is string => Boolean(value));

  return {
    _id: meeting._id?.toString() ?? "",
    title: meeting.title,
    startAt: meeting.startAt.toISOString(),
    endAt: meeting.endAt.toISOString(),
    createdBy: calendarCreator(users.get(creatorId)),
    canViewDetails,
    status: getMeetingStatus(meeting),
    clientName: meeting.clientName?.trim() || null,
    mode: meeting.mode ?? null,
    location: meeting.location?.trim() || null,
    involvesHighlightedUser: meetingInvolvesHighlightedUser(meeting),
    ...(primaryPic?.displayName
      ? { primaryPicName: primaryPic.displayName }
      : {}),
    ...(additionalPicNames.length > 0 ? { additionalPicNames } : {}),
  };
}

async function hydrate(meetings: Meeting[], actor: JwtPayload) {
  const users = await userMapFor(meetings);
  return meetings.map((meeting) => serialize(meeting, actor, users));
}

function assertCanView(meeting: Meeting, actor: JwtPayload) {
  if (hasDetailAccess(meeting, actor)) return;
  throw new HttpError(403, "You do not have access to this meeting");
}

function canEditMeeting(meeting: Meeting, actor: JwtPayload) {
  return (
    canManageOwnMeeting(actor) &&
    (actor.role === "ADMIN" || meeting.createdBy?.toString() === actor.userId)
  );
}

function canCancelMeeting(meeting: Meeting, actor: JwtPayload) {
  return canEditMeeting(meeting, actor);
}

function canDeleteMeeting(meeting: Meeting, actor: JwtPayload) {
  return (
    canManageOwnMeeting(actor) &&
    (actor.role === "ADMIN" || meeting.createdBy?.toString() === actor.userId)
  );
}

function assertCanModify(meeting: Meeting, actor: JwtPayload) {
  if (
    (actor.role === "ADMIN" || actor.role === "DOSEN") &&
    (actor.role === "ADMIN" || meeting.createdBy?.toString() === actor.userId)
  ) {
    return;
  }
  throw new HttpError(403, "You cannot change this meeting");
}

function assertCanEdit(meeting: Meeting, actor: JwtPayload) {
  if (!canEditMeeting(meeting, actor)) {
    throw new HttpError(403, "You cannot change this meeting");
  }
}

function assertCanCancel(meeting: Meeting, actor: JwtPayload) {
  if (!canCancelMeeting(meeting, actor)) {
    throw new HttpError(
      403,
      "Only the meeting creator, an agenda coordinator, or an admin can perform this action",
    );
  }
}

function assertCanDelete(meeting: Meeting, actor: JwtPayload) {
  if (!canDeleteMeeting(meeting, actor)) {
    throw new HttpError(
      403,
      "Only the meeting creator or an admin can perform this action",
    );
  }
}

function assertCanCreateMeeting(actor: JwtPayload) {
  if (!canManageOwnMeeting(actor)) {
    throw new HttpError(403, "You cannot create meetings");
  }
}

async function computeConflicts(options: {
  startAt: Date;
  endAt: Date;
  creatorId: ObjectId;
  picIds: ObjectId[];
  participantIds: ObjectId[];
  actor: JwtPayload;
  excludeId?: string;
}): Promise<MeetingConflict[]> {
  assertMeetingWindow(options.startAt, options.endAt);

  const userIds = uniqueObjectIds([
    options.creatorId,
    ...options.picIds,
    ...options.participantIds,
  ]);
  const overlaps = await findOverlappingMeetings({
    startAt: options.startAt,
    endAt: options.endAt,
    userIds,
    excludeId: options.excludeId,
  });
  if (overlaps.length === 0) return [];

  const visibleOverlaps = overlaps.filter((meeting) =>
    hasDetailAccess(meeting, options.actor),
  );
  const users = await userMapFor(visibleOverlaps);
  const conflicts: MeetingConflict[] = visibleOverlaps.map((meeting) => ({
    busy: false,
    _id: meeting._id?.toString() ?? "",
    title: meeting.title,
    startAt: meeting.startAt.toISOString(),
    endAt: meeting.endAt.toISOString(),
    participants: uniqueObjectIds([
      ...(meeting.picIds ?? []),
      ...(meeting.participantIds ?? []),
    ])
      .map((id) => users.get(id.toString()))
      .filter((value): value is MeetingUserSummary => Boolean(value)),
  }));

  if (visibleOverlaps.length !== overlaps.length) {
    conflicts.push({ busy: true });
  }

  return conflicts;
}

function normalizePicIds(ids: string[]): ObjectId[] {
  const parsed = ids.map(toObjectId);
  if (parsed.some((value) => value === null)) {
    throw new HttpError(400, "PICs must reference valid user accounts");
  }
  const values = parsed as ObjectId[];
  if (new Set(values.map((value) => value.toString())).size !== values.length) {
    throw new HttpError(400, "PIC list contains duplicate IDs");
  }
  return values;
}

function requirePrimaryPic(
  primaryPicId: ObjectId | undefined,
  picIds: ObjectId[],
) {
  if (!primaryPicId) {
    throw new HttpError(400, "A primary PIC is required");
  }
  if (!picIds.some((id) => id.equals(primaryPicId))) {
    throw new HttpError(400, "Primary PIC must be included in the PIC list");
  }
}

async function assertValidPics(ids: ObjectId[]) {
  if (ids.length === 0) return;

  const entries = await findUsersByIds(ids);
  const valid = new Set(
    entries
      .filter(
        (entry) =>
          entry.isActive &&
          (entry.role === "ADMIN" || entry.role === "DOSEN"),
      )
      .map((entry) => entry._id?.toString()),
  );
  if (ids.some((id) => !valid.has(id.toString()))) {
    throw new HttpError(400, "PICs must be active internal accounts");
  }
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

export async function getMeetingCalendar(
  actor: JwtPayload,
  range: { from?: Date; to?: Date },
) {
  if (range.from) assertDate(range.from, "Start of range");
  if (range.to) assertDate(range.to, "End of range");
  if (range.from && range.to && range.to.getTime() <= range.from.getTime()) {
    throw new HttpError(400, "Range end must be after range start");
  }

  assertSharedAgendaAccess(actor);

  const meetings = await findMeetingsForCalendar(range);
  const users = await userMapFor(meetings);
  return meetings.map((meeting) => serializeCalendar(meeting, actor, users));
}

export async function getMeetingAgenda(
  actor: JwtPayload,
  options: {
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  },
): Promise<{
  items: MeetingCalendarResponse[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}> {
  if (options.from) assertDate(options.from, "Start of range");
  if (options.to) assertDate(options.to, "End of range");
  if (
    options.from &&
    options.to &&
    options.to.getTime() <= options.from.getTime()
  ) {
    throw new HttpError(400, "Range end must be after range start");
  }

  assertSharedAgendaAccess(actor);

  const limit = Math.min(
    Math.max(Math.trunc(options.limit ?? SECURITY_LIMITS.maxPageSize), 1),
    SECURITY_LIMITS.maxPageSize,
  );
  const offset = Math.min(
    Math.max(Math.trunc(options.offset ?? 0), 0),
    SECURITY_LIMITS.maxPageNumber,
  );

  const meetings = await findMeetingsForAgenda({
    from: options.from,
    to: options.to,
    limit: limit + 1,
    offset,
  });
  const hasMore = meetings.length > limit;
  const page = hasMore ? meetings.slice(0, limit) : meetings;
  const users = await userMapFor(page);

  return {
    items: page.map((meeting) => serializeCalendar(meeting, actor, users)),
    pagination: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    },
  };
}

export async function getMeeting(id: string, actor: JwtPayload) {
  const meeting = await findMeetingById(id);
  if (!meeting) throw new HttpError(404, "Meeting not found");
  assertCanView(meeting, actor);
  const [response] = await hydrate([meeting], actor);
  return response;
}

export async function createMeeting(
  input: CreateMeetingInput,
  actor: JwtPayload,
) {
  const normalizedInput = normalizeMeetingDetails(input);
  normalizedInput.additionalReminderEmails =
    (await withoutInternalRecipientEmails(
      normalizedInput.additionalReminderEmails,
    )) ?? [];
  assertMeetingWindow(normalizedInput.startAt, normalizedInput.endAt);
  assertCanCreateMeeting(actor);
  const creatorId = await creatorIdFor(actor);
  const primaryPicId = toObjectId(normalizedInput.primaryPicId);
  const picIds = normalizePicIds(normalizedInput.picIds);
  requirePrimaryPic(primaryPicId ?? undefined, picIds);
  await assertValidPics(picIds);
  const participantIds = normalizeParticipantIds(
    normalizedInput.participantIds,
    creatorId,
  );
  await assertValidParticipants(participantIds);

  const conflicts = await computeConflicts({
    startAt: normalizedInput.startAt,
    endAt: normalizedInput.endAt,
    creatorId,
    picIds,
    participantIds,
    actor,
  });

  const meeting = await createMeetingRecord(
    normalizedInput,
    creatorId,
    participantIds,
  );
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
  assertCanEdit(existing, actor);

  if (
    input.expectedUpdatedAt &&
    input.expectedUpdatedAt.getTime() !== existing.updatedAt.getTime()
  ) {
    throw new HttpError(
      409,
      "The meeting changed before it could be updated. Reload and try again",
    );
  }

  const startAt = input.startAt ?? existing.startAt;
  const endAt = input.endAt ?? existing.endAt;
  assertMeetingWindow(startAt, endAt);

  const creatorId = existing.createdBy;
  const picAssignmentUpdated =
    input.primaryPicId !== undefined || input.picIds !== undefined;
  let primaryPicId =
    input.primaryPicId === undefined
      ? existing.primaryPicId
      : (toObjectId(input.primaryPicId) ?? undefined);
  let picIds =
    input.picIds === undefined
      ? (existing.picIds ?? [])
      : normalizePicIds(input.picIds);
  if (picAssignmentUpdated && input.picIds === undefined && primaryPicId) {
    picIds = existing.picIds?.length ? existing.picIds : [primaryPicId];
  }
  if (picAssignmentUpdated) {
    requirePrimaryPic(primaryPicId, picIds);
    await assertValidPics(picIds);
  }

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
    picIds,
    participantIds,
    actor,
    excludeId: id,
  });

  const additionalReminderEmails =
    input.additionalReminderEmails === undefined
      ? existing.additionalReminderEmails
      : await withoutInternalRecipientEmails(
          input.additionalReminderEmails,
        );
  const candidate = normalizeMeetingDetails({
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    clientName:
      input.clientName === undefined ? existing.clientName : input.clientName,
    mode: input.mode === undefined ? existing.mode : input.mode,
    location: input.location === undefined ? existing.location : input.location,
    startAt,
    endAt,
    primaryPicId,
    picIds,
    participantIds,
    meetingLink:
      input.meetingLink === undefined
        ? existing.meetingLink
        : (input.meetingLink ?? null),
    additionalReminderEmails,
  });
  const normalizedInput: UpdateMeetingInput = {
    ...input,
    ...(picAssignmentUpdated
      ? {
          primaryPicId: primaryPicId?.toString(),
          picIds: picIds.map((id) => id.toString()),
        }
      : {}),
    ...(input.clientName !== undefined
      ? { clientName: candidate.clientName ?? undefined }
      : {}),
    ...(input.mode !== undefined ? { mode: candidate.mode ?? undefined } : {}),
    ...(input.additionalReminderEmails !== undefined
      ? { additionalReminderEmails: candidate.additionalReminderEmails }
      : {}),
    ...(input.location !== undefined ||
    input.mode !== undefined ||
    input.meetingLink !== undefined
      ? { location: candidate.location ?? null }
      : {}),
    ...(input.location !== undefined ||
    input.mode !== undefined ||
    input.meetingLink !== undefined
      ? { meetingLink: candidate.meetingLink ?? null }
      : {}),
  };
  const updated = await updateMeetingRecord(
    id,
    normalizedInput,
    input.participantIds === undefined ? undefined : participantIds,
    input.expectedUpdatedAt,
  );
  if (!updated) {
    throw new HttpError(
      409,
      "The meeting changed before it could be updated. Reload and try again",
    );
  }

  const [response] = await hydrate([updated], actor);
  return { meeting: response, conflicts };
}

function actorObjectId(actor: JwtPayload): ObjectId {
  const id = toObjectId(actor.userId);
  if (!id) throw new HttpError(401, "Authentication required");
  return id;
}

export async function cancelMeeting(
  id: string,
  input: CancelMeetingInput,
  actor: JwtPayload,
) {
  const existing = await findMeetingById(id);
  if (!existing) throw new HttpError(404, "Meeting not found");
  assertCanCancel(existing, actor);
  if (existing.cancelledAt) {
    throw new HttpError(409, "Meeting is already cancelled");
  }

  const cancelledAt = new Date();
  assertMeetingNotEnded(existing, cancelledAt);

  const reason = input.reason?.trim() || undefined;

  const updated = await cancelMeetingRecord(
    id,
    cancelledAt,
    actorObjectId(actor),
    reason,
  );
  if (!updated) {
    const current = await findMeetingById(id);
    if (current && !current.cancelledAt) {
      assertMeetingNotEnded(current, cancelledAt);
    }
    throw new HttpError(409, "Meeting is already cancelled");
  }

  const [response] = await hydrate([updated], actor);
  return response;
}

export async function deleteMeeting(id: string, actor: JwtPayload) {
  const existing = await findMeetingById(id);
  if (!existing) throw new HttpError(404, "Meeting not found");
  assertCanDelete(existing, actor);

  const deleted = await deleteMeetingRecord(id);
  if (!deleted) throw new HttpError(404, "Meeting not found");
  await Promise.all(
    (existing.attachments ?? []).map((attachment) =>
      removeCloudinaryAttachment(attachment.publicId).catch((error) => {
        console.error(
          `[meetings] Failed to delete Cloudinary attachment ${attachment.publicId}`,
          error,
        );
      }),
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

  if ((meeting.attachments ?? []).length >= MAX_MEETING_ATTACHMENTS) {
    throw new HttpError(400, "A meeting can have at most 10 attachments");
  }

  const uploaded = await uploadMeetingAttachment(
    file.buffer,
    file.originalFilename,
  );

  const attachmentId = randomUUID();
  const uploadedAt = new Date();

  const result = await addMeetingAttachment(
    id,
    {
      id: attachmentId,
      url: uploaded.url,
      publicId: uploaded.publicId,
      filename: uploaded.filename,
      mimeType: file.mimeType,
      size: file.size,
      uploadedAt,
    },
    MAX_MEETING_ATTACHMENTS,
  );

  if (result.status !== "ok") {
    await removeCloudinaryAttachment(uploaded.publicId).catch((error) => {
      console.error(
        `[meetings] Failed to clean up orphaned Cloudinary attachment ${uploaded.publicId}`,
        error,
      );
    });
    if (result.status === "limit_reached") {
      throw new HttpError(400, "A meeting can have at most 10 attachments");
    }
    throw new HttpError(404, "Meeting not found");
  }

  const [response] = await hydrate([result.meeting], actor);
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

  const expectedRemoved = (meeting.attachments ?? []).find(
    (attachment) => attachment.id === attachmentId,
  );
  if (!expectedRemoved) throw new HttpError(404, "Attachment not found");

  const { meeting: updated, removed } = await removeMeetingAttachmentRecord(
    id,
    attachmentId,
  );
  if (!removed) throw new HttpError(404, "Attachment not found");
  if (removed.publicId) {
    await removeCloudinaryAttachment(removed.publicId).catch((error) => {
      console.error(
        `[meetings] Failed to delete Cloudinary attachment ${removed.publicId}`,
        error,
      );
    });
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
  const picIds = normalizePicIds(input.picIds ?? []);
  await assertValidPics(picIds);

  return computeConflicts({
    startAt: input.startAt,
    endAt: input.endAt,
    creatorId,
    picIds,
    participantIds,
    actor,
    excludeId: input.excludeId,
  });
}
