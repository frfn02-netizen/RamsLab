import { apiRequest, apiRequestWithMeta } from "./client";
import type {
  Meeting,
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

export const getMeeting = (id: string) =>
  apiRequest<Meeting>(`/meetings/${encodeURIComponent(id)}`);

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

export const deleteMeeting = async (id: string) => {
  await apiRequestWithMeta(`/meetings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const checkMeetingConflicts = (input: {
  startAt: string;
  endAt: string;
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
