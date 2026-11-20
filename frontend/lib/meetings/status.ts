import type { Meeting, MeetingStatus } from "@/types/meetings";

export function getMeetingStatus(
  meeting: Pick<Meeting, "startAt" | "endAt" | "status" | "cancelledAt">,
  now = Date.now(),
): MeetingStatus {
  if (meeting.cancelledAt || meeting.status === "CANCELLED") {
    return "CANCELLED";
  }

  const start = new Date(meeting.startAt).getTime();
  const end = new Date(meeting.endAt).getTime();
  if (now < start) return "UPCOMING";
  if (now < end) return "ONGOING";
  return "PAST";
}

export function meetingStatusLabel(status: MeetingStatus) {
  if (status === "CANCELLED") return "Cancelled";
  if (status === "ONGOING") return "Ongoing";
  if (status === "PAST") return "Past";
  return "Upcoming";
}
