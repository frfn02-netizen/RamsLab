import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";

/**
 * Dashboard lecturer copy. Mirrors lib/meeting-copy.ts so the client form does
 * not need a translations provider in tests or in the (internal) shell.
 */
export function dosenCopy() {
  return typeof document !== "undefined" &&
    document.documentElement.lang === "id"
    ? idMessages.dashboardDosen
    : enMessages.dashboardDosen;
}
