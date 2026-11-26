import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";

export function meetingCopy() {
  return typeof document !== "undefined" && document.documentElement.lang === "id"
    ? idMessages.meetings
    : enMessages.meetings;
}
