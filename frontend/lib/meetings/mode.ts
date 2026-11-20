import type { MeetingMode } from "@/types/meetings";

export type MeetingModeView = MeetingMode | null;

export function meetingModeLabel(mode: MeetingMode | null | undefined) {
  if (mode === "ONLINE") return "Online";
  if (mode === "OFFLINE") return "Offline";
  return "Not specified";
}

export function meetingModeAriaLabel(mode: MeetingMode | null | undefined) {
  if (mode === undefined) return "Meeting mode unavailable";
  if (mode === "ONLINE") return "Online meeting";
  if (mode === "OFFLINE") return "Offline meeting";
  return "Meeting mode not specified";
}

export function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
