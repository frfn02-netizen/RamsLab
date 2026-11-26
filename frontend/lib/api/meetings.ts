import { apiRequest, apiRequestWithMeta } from "./client";
import type {
  Meeting,
  MeetingAuditEntry,
  MeetingAgendaPage,
  MeetingCalendarEvent,
  MeetingConflict,
  MeetingInput,
  MeetingSaveResult,
  MeetingUpdateInput,
  UserDirectoryEntry,
} from "@/types/meetings";

export const getMeetings = (params: { from?: string; to?: string } = {}) => {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return apiRequest<Meeting[]>(
    `/meetings${query.size ? `?${query.toString()}` : ""}`,
  );
};

export const getMeetingCalendar = (
  params: { from?: string; to?: string } = {},
) => {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return apiRequest<MeetingCalendarEvent[]>(
    `/meetings/calendar${query.size ? `?${query.toString()}` : ""}`,
  );
};

export const getMeetingAgenda = (
  params: { from?: string; to?: string; limit?: number; offset?: number } = {},
) => {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  return apiRequest<MeetingAgendaPage>(
    `/meetings/agenda${query.size ? `?${query.toString()}` : ""}`,
  );
};

export const getMeeting = (id: string) =>
  apiRequest<Meeting>(`/meetings/${encodeURIComponent(id)}`);

export const getMeetingAudit = (id: string) =>
  apiRequest<MeetingAuditEntry[]>(`/meetings/${encodeURIComponent(id)}/audit`);

export const createMeeting = (input: MeetingInput) =>
  apiRequest<MeetingSaveResult>("/meetings", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateMeeting = (id: string, input: MeetingUpdateInput) =>
  apiRequest<MeetingSaveResult>(`/meetings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const cancelMeeting = (id: string, reason?: string) =>
  apiRequest<Meeting>(`/meetings/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
  });

export const deleteMeeting = async (id: string) => {
  await apiRequestWithMeta(`/meetings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const checkMeetingConflicts = (input: {
  startAt: string;
  endAt: string;
  picIds?: string[];
  participantIds: string[];
  excludeId?: string;
}) =>
  apiRequest<MeetingConflict[]>("/meetings/conflicts/check", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const uploadMeetingAttachment = (id: string, file: File) =>
  apiRequest<Meeting>(`/meetings/${encodeURIComponent(id)}/attachments`, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": file.type,
      "X-Original-Filename": file.name,
    },
    timeoutMs: 60000,
  });

export const removeMeetingAttachment = (id: string, attachmentId: string) =>
  apiRequest<Meeting>(
    `/meetings/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: "DELETE" },
  );

export const getUserDirectory = () =>
  apiRequest<UserDirectoryEntry[]>("/users/directory");
