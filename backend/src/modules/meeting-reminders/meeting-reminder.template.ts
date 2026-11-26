import {
  getFrontendBasePath,
  getPrimaryFrontendOrigin,
} from "../../config/security.js";
import { isSafeHttpUrl } from "../../lib/url-security.js";
import type { Meeting } from "../meetings/meeting.types.js";
import type { MeetingReminderRecipient } from "./meeting-reminder.types.js";

type ReminderMeeting = Pick<
  Meeting,
  "_id" | "title" | "description" | "startAt" | "endAt" | "meetingLink"
>;

export interface MeetingReminderEmailInput {
  meeting: ReminderMeeting;
  recipient: MeetingReminderRecipient;
  organizerName: string;
  timezone: string;
}

export interface MeetingReminderEmail {
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatReminderDateTime(value: Date, timezone: string): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);

  return `${formatted} (${timezone})`;
}

function formatDuration(startAt: Date, endAt: Date): string {
  const totalMinutes = Math.max(
    1,
    Math.round((endAt.getTime() - startAt.getTime()) / 60_000),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${
    minutes === 1 ? "" : "s"
  }`;
}

export function buildMeetingReminderDetailUrl(
  meetingId: string,
): string | null {
  const url = `${getPrimaryFrontendOrigin()}${getFrontendBasePath()}/meetings/${encodeURIComponent(
    meetingId,
  )}`;
  return isSafeHttpUrl(url) ? url : null;
}

function safeMeetingLink(value: string | null): string | null {
  return value && isSafeHttpUrl(value) ? value : null;
}

export function renderMeetingReminderEmail(
  input: MeetingReminderEmailInput,
): MeetingReminderEmail {
  const { meeting, recipient, organizerName, timezone } = input;
  const dateTime = formatReminderDateTime(meeting.startAt, timezone);
  const duration = formatDuration(meeting.startAt, meeting.endAt);
  const meetingLink = safeMeetingLink(meeting.meetingLink);
  const detailUrl = meeting._id
    ? buildMeetingReminderDetailUrl(meeting._id.toString())
    : null;
  const description = meeting.description?.trim().slice(0, 2_000) ?? "";
  const title = meeting.title.trim();
  const safeTitle = title.replace(/\s+/g, " ");

  const subject = `Reminder: ${safeTitle} — ${dateTime}`;

  const textLines = [
    `Hi ${recipient.displayName},`,
    "",
    `This is a reminder for the RAMS meeting "${title}".`,
    "",
    `When: ${dateTime}`,
    `Duration: ${duration}`,
    `Organizer: ${organizerName}`,
    ...(meetingLink ? [`Where: ${meetingLink}`] : []),
    ...(description ? ["", "Details:", description] : []),
    ...(detailUrl ? ["", `View the meeting in RAMS: ${detailUrl}`] : []),
    "",
    "If you are no longer able to attend, contact the organizer.",
  ];

  const htmlRows = [
    `<p>Hi ${escapeHtml(recipient.displayName)},</p>`,
    `<p>This is a reminder for the RAMS meeting <strong>${escapeHtml(
      title,
    )}</strong>.</p>`,
    "<ul>",
    `<li><strong>When:</strong> ${escapeHtml(dateTime)}</li>`,
    `<li><strong>Duration:</strong> ${escapeHtml(duration)}</li>`,
    `<li><strong>Organizer:</strong> ${escapeHtml(organizerName)}</li>`,
    ...(meetingLink
      ? [
          `<li><strong>Where:</strong> <a href="${escapeHtml(
            meetingLink,
          )}">${escapeHtml(meetingLink)}</a></li>`,
        ]
      : []),
    "</ul>",
    ...(description
      ? [`<p><strong>Details:</strong></p><p>${escapeHtml(description)}</p>`]
      : []),
    ...(detailUrl
      ? [
          `<p><a href="${escapeHtml(
            detailUrl,
          )}">View the meeting in RAMS</a></p>`,
        ]
      : []),
    "<p>If you are no longer able to attend, contact the organizer.</p>",
  ];

  return {
    subject,
    text: textLines.join("\n"),
    html: htmlRows.join("\n"),
  };
}
