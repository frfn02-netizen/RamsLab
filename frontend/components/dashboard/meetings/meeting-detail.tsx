"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import { Initials } from "@/components/meetings-workspace/day-chip";
import MeetingHighlightBadge from "@/components/meetings-workspace/meeting-highlight-badge";
import MeetingModeBadge from "@/components/meetings-workspace/meeting-mode-badge";
import { useToast } from "@/components/providers/toast-providers";
import { Badge, Button, ErrorState } from "@/components/ui";
import { DetailSkeleton } from "@/components/skeletons";
import { ApiError, getUserFacingError } from "@/lib/api/errors";
import {
  cancelMeeting as cancelMeetingRequest,
  deleteMeeting,
  getMeeting,
  getMeetingAudit,
} from "@/lib/api/meetings";
import { formatBytes, formatTimeRange } from "@/lib/meetings/calendar";
import { meetingModeLabel, safeHttpUrl } from "@/lib/meetings/mode";
import { getMeetingStatus, meetingStatusLabel } from "@/lib/meetings/status";
import type {
  Meeting,
  MeetingAuditEntry,
  MeetingMode,
  MeetingStatus,
  MeetingUserSummary,
} from "@/types/meetings";

const PANEL =
  "rounded-xl border border-[#E3DED7] bg-white shadow-[0_8px_22px_rgba(31,35,40,0.025)]";

type IconName =
  | "calendar"
  | "clock"
  | "video"
  | "edit"
  | "paperclip"
  | "people"
  | "link"
  | "location"
  | "trash"
  | "external"
  | "eye"
  | "download";

const ICON_PATHS: Record<IconName, string[]> = {
  calendar: [
    "M4.5 5.5h15a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19V7a1.5 1.5 0 011.5-1.5Z",
    "M7.5 3.5v4M16.5 3.5v4M3 10h18",
  ],
  clock: ["M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17Z", "M12 7.5v4.8l3.1 1.8"],
  video: [
    "M4 5.5h9a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 17V7A1.5 1.5 0 014 5.5Z",
    "m14.5 9 5-2.5v11l-5-2.5",
  ],
  edit: [
    "m4 16.5-.8 3.3 3.3-.8L18.8 6.7a2.3 2.3 0 00-3.3-3.3L4 16.5Z",
    "m13.5 5.5 3 3",
  ],
  paperclip: [
    "m8.5 12.5 5.7-5.7a3 3 0 114.3 4.3l-7.1 7.1a4.5 4.5 0 01-6.4-6.4l7-7",
  ],
  people: [
    "M9 10.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5Z",
    "M3 19c0-3 2.7-5.3 6-5.3s6 2.3 6 5.3M16 6a2.75 2.75 0 010 5.4M17 14.2c2.1.5 3.5 2.1 3.5 4.1",
  ],
  link: [
    "M9.2 14.8 7.7 16.3a3.25 3.25 0 01-4.6-4.6l2.5-2.5a3.25 3.25 0 014.6 0",
    "m14.8 9.2 1.5-1.5a3.25 3.25 0 014.6 4.6l-2.5 2.5a3.25 3.25 0 01-4.6 0",
    "m8.5 15.5 7-7",
  ],
  location: [
    "M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1114 0Z",
    "M12 12.5a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6Z",
  ],
  trash: [
    "M4.5 7.5h15M9 4.5h6l1 3H8l1-3ZM7 7.5l.7 12h8.6l.7-12M10 10.5v6M14 10.5v6",
  ],
  external: [
    "M11 4h5v5M16 4l-7 7M14 11v4a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h4",
  ],
  eye: [
    "M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z",
    "M12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5Z",
  ],
  download: ["M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4 19.5h16"],
};

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

function FileIcon({ pdf = false }: { pdf?: boolean }) {
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
        pdf
          ? "bg-[#FBE9E7] text-[var(--rams-red)]"
          : "bg-[#F4F1EA] text-[#6B6A64]"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path d="M6 3.5h7l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1v-15a1 1 0 011-1Z" />
        <path d="M13 3.5v5h5M8 14h8M8 17h5" />
      </svg>
    </span>
  );
}

function compactDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function durationLabel(startAt: string, endAt: string) {
  const minutes = Math.round(
    (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000,
  );
  if (!Number.isFinite(minutes) || minutes < 0) return "Not specified";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours}h ${remainder}m`;
}

function timelineDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function participantDisplayName(participant: Meeting["participants"][number]) {
  return participant.displayName?.trim() || participant.email;
}

function picDisplayName(pic: MeetingUserSummary) {
  return pic.displayName?.trim() || pic.email;
}

function auditActionLabel(action: MeetingAuditEntry["action"]) {
  if (action === "CREATE") return "Meeting created";
  if (action === "CANCEL") return "Meeting cancelled";
  if (action === "DELEGATE_ASSIGNED") return "Delegate assigned";
  if (action === "DELEGATE_REVOKED") return "Delegate revoked";
  if (action === "ATTACHMENT_ADDED") return "Attachment added";
  if (action === "ATTACHMENT_REMOVED") return "Attachment removed";
  if (action === "GUEST_INVITATION_CREATED") return "Guest invitation created";
  if (action === "GUEST_INVITATION_REVOKED") return "Guest invitation revoked";
  if (action === "GUEST_INVITATION_REGENERATED")
    return "Guest invitation regenerated";
  return "Meeting updated";
}

function auditFieldLabel(field: string) {
  const labels: Record<string, string> = {
    title: "Title",
    description: "Description",
    guestDescription: "Guest-facing description",
    clientName: "Client / organization",
    mode: "Meeting mode",
    location: "Physical location",
    startAt: "Start time",
    endAt: "End time",
    visibility: "Visibility",
    participantIds: "Internal participants",
    externalParticipants: "External participants",
    guestInvitationIds: "Guest invitations",
    delegatedUserIds: "Delegated users",
    meetingLink: "Meeting link",
    status: "Status",
    cancellationReason: "Cancellation reason",
    attachment: "Attachment",
    invitation: "Guest invitation",
  };
  return labels[field] ?? field;
}

function auditValueLabel(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }
  if (field === "status" && typeof value === "string") {
    return meetingStatusLabel(value as MeetingStatus);
  }
  if (field === "mode" && typeof value === "string") {
    return meetingModeLabel(value as MeetingMode);
  }
  if ((field === "startAt" || field === "endAt") && typeof value === "string") {
    return timelineDate(value);
  }
  if (field === "participantIds" && Array.isArray(value)) {
    return `${value.length} internal participant${value.length === 1 ? "" : "s"}`;
  }
  if (field === "externalParticipants" && Array.isArray(value)) {
    return `${value.length} external participant${value.length === 1 ? "" : "s"}`;
  }
  if (field === "delegatedUserIds" && Array.isArray(value)) {
    return `${value.length} delegate${value.length === 1 ? "" : "s"}`;
  }
  if (field === "guestInvitationIds" && Array.isArray(value)) {
    return `${value.length} guest invitation${value.length === 1 ? "" : "s"}`;
  }
  if (field === "invitation" && typeof value === "object") {
    return "Guest invitation state changed";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export default function MeetingDetail({
  id,
  basePath = "/dashboard/meetings",
  calendarPath = "/meetings/calendar",
}: {
  id: string;
  basePath?: string;
  calendarPath?: string;
}) {
  const router = useRouter();
  const { success, error: notifyError } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [audit, setAudit] = useState<MeetingAuditEntry[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setAuditError(null);

      getMeeting(id)
        .then((data) => {
          if (cancelled) return;
          setMeeting(data);
          return getMeetingAudit(id)
            .then((history) => {
              if (!cancelled) setAudit(history);
            })
            .catch((reason) => {
              if (!cancelled) setAuditError(getUserFacingError(reason));
            });
        })
        .catch((reason) => {
          if (!cancelled) setError(getUserFacingError(reason));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, reloadKey]);

  useEffect(() => {
    if (!confirmingCancel) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmingCancel(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirmingCancel]);

  async function remove() {
    if (!meeting) return;
    setDeleting(true);
    try {
      await deleteMeeting(meeting._id);
      success("Meeting deleted.");
      router.push(basePath);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  async function cancel() {
    if (!meeting) return;
    setCancelling(true);
    try {
      const updated = await cancelMeetingRequest(
        meeting._id,
        cancellationReason,
      );
      setMeeting(updated);
      setAudit(await getMeetingAudit(meeting._id));
      setCancellationReason("");
      setConfirmingCancel(false);
      success("Meeting cancelled.");
    } catch (reason) {
      notifyError(getUserFacingError(reason));
      if (reason instanceof ApiError && reason.status === 409) {
        setConfirmingCancel(false);
        setReloadKey((value) => value + 1);
      }
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <DetailSkeleton sections={3} />;
  }

  if (error || !meeting) {
    return (
      <div className="min-h-full bg-[#F8F6F3] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <Link
            href={basePath}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6A64] transition hover:text-[var(--rams-red)]"
          >
            ← Meetings
          </Link>
          <ErrorState message={error ?? "Meeting not found"} />
        </div>
      </div>
    );
  }

  const status = getMeetingStatus(meeting);
  const statusLabel = meetingStatusLabel(status);
  const canCancel =
    (meeting.canCancel ?? meeting.canEdit) &&
    status !== "PAST" &&
    status !== "CANCELLED";
  const canDelete = meeting.canDelete ?? meeting.canEdit;
  const meetingUrl = safeHttpUrl(meeting.meetingLink);
  const canJoinOnline = meeting.mode === "ONLINE" && Boolean(meetingUrl);
  const visibilityLabel =
    meeting.visibility === "INTERNAL"
      ? "Internal"
      : meeting.visibility === "PRIVATE"
        ? "Private"
        : "Not specified";
  const statusClass =
    status === "CANCELLED"
      ? "bg-[#FBE4E2] text-[var(--rams-red-dark)]"
      : status === "PAST"
        ? "bg-[#F1F0EE] text-[#69645E]"
        : status === "ONGOING"
          ? "bg-[#FFF3D9] text-[#94631A]"
          : "bg-[#EAF3E8] text-[#356B35]";

  return (
    <div className="min-h-full bg-[#F8F6F3] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mx-auto w-full max-w-[1220px]">
        <div className="flex items-center gap-3 text-xs font-semibold text-[#6B6A64]">
          <Link
            href={basePath}
            className="transition hover:text-[var(--rams-red)]"
          >
            ← Meetings
          </Link>
          <span aria-hidden="true" className="text-[#B8B1A8]">
            /
          </span>
          <span className="text-[var(--rams-charcoal)]">Detail</span>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.75fr)] xl:items-start">
          <div className="min-w-0">
            <header className="border-l-4 border-[var(--rams-red)] pl-5">
              <h1
                className={`font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[2.35rem] ${
                  meeting.involvesHighlightedUser
                    ? "text-[var(--rams-red)]"
                    : "text-[var(--rams-charcoal)]"
                }`}
              >
                {meeting.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--rams-charcoal)]">
                <span className="inline-flex items-center gap-2">
                  <Icon
                    name="calendar"
                    className="h-5 w-5 text-[var(--rams-charcoal)]"
                  />
                  {compactDate(meeting.startAt)}
                </span>
                <span className="h-5 w-px bg-[#DED8D0]" aria-hidden="true" />
                <span className="inline-flex items-center gap-2">
                  <Icon name="clock" className="h-5 w-5" />
                  {formatTimeRange(meeting.startAt, meeting.endAt)}
                </span>
                <span className="h-5 w-px bg-[#DED8D0]" aria-hidden="true" />
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                >
                  <span
                    className="h-2 w-2 rounded-full bg-current"
                    aria-hidden="true"
                  />
                  {statusLabel}
                </span>
                <MeetingHighlightBadge
                  involvesHighlightedUser={meeting.involvesHighlightedUser}
                />
              </div>
            </header>

            <div className="mt-7 flex flex-wrap gap-3">
              {canJoinOnline && meetingUrl && (
                <a
                  href={meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--rams-red)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(181,18,27,0.14)] transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                >
                  <Icon name="video" className="h-5 w-5" />
                  Join meeting
                  <Icon name="external" className="h-4 w-4" />
                </a>
              )}
              {meeting.canEdit && (
                <Link
                  href={`${basePath}/${meeting._id}/edit`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#DCD6CE] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)]/45 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                >
                  <Icon name="edit" className="h-5 w-5" />
                  Edit meeting
                </Link>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#E9BDB8] bg-[#FFF7F5] px-5 py-2.5 text-sm font-semibold text-[var(--rams-red-dark)] transition hover:border-[var(--rams-red)] hover:bg-[#FDEAE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                >
                  Cancel meeting
                </button>
              )}
              <Link
                href={calendarPath}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#DCD6CE] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)]/45 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
              >
                <Icon name="calendar" className="h-5 w-5" />
                Open in calendar
              </Link>
            </div>

            <div className="mt-8 space-y-5">
              <section className={`${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
                <div className="flex items-center gap-3 border-b border-[#EEEAE4] pb-4">
                  <Icon
                    name="people"
                    className="h-6 w-6 text-[var(--rams-red)]"
                  />
                  <h2 className="font-display text-[1.05rem] font-semibold text-[var(--rams-charcoal)]">
                    People in charge
                  </h2>
                </div>
                {meeting.primaryPic || meeting.pics?.length ? (
                  <div className="mt-2 space-y-4">
                    {meeting.primaryPic && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                          Primary PIC
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <Initials
                            value={picDisplayName(meeting.primaryPic)}
                            className="h-9 w-9 shrink-0"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                              {picDisplayName(meeting.primaryPic)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#6B6A64]">
                              {meeting.primaryPic.email}
                            </span>
                          </span>
                          <Badge
                            tone={
                              meeting.primaryPic.role === "ADMIN"
                                ? "red"
                                : "neutral"
                            }
                          >
                            {meeting.primaryPic.role}
                          </Badge>
                        </div>
                      </div>
                    )}
                    {meeting.additionalPics &&
                      meeting.additionalPics.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                            Additional PICs
                          </p>
                          <ul className="mt-2 divide-y divide-[#EEEAE4]">
                            {meeting.additionalPics.map((pic) => (
                              <li
                                key={pic.id}
                                className="flex items-center gap-3 py-3"
                              >
                                <Initials
                                  value={picDisplayName(pic)}
                                  className="h-9 w-9 shrink-0"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                                    {picDisplayName(pic)}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-[#6B6A64]">
                                    {pic.email}
                                  </span>
                                </span>
                                <Badge
                                  tone={
                                    pic.role === "ADMIN" ? "red" : "neutral"
                                  }
                                >
                                  {pic.role}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#6B6A64]">
                    No PIC assignment is stored for this legacy meeting.
                  </p>
                )}
              </section>

              <section className={`${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
                <div className="flex items-center gap-3 border-b border-[#EEEAE4] pb-4">
                  <Icon
                    name="calendar"
                    className="h-6 w-6 text-[var(--rams-red)]"
                  />
                  <h2 className="font-display text-[1.05rem] font-semibold text-[var(--rams-charcoal)]">
                    Agenda
                  </h2>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#4F4B46]">
                  {meeting.description || "No description was added."}
                </p>
              </section>

              <section className={`${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
                <div className="flex items-center justify-between gap-3 border-b border-[#EEEAE4] pb-4">
                  <div className="flex items-center gap-3">
                    <Icon
                      name="paperclip"
                      className="h-6 w-6 text-[var(--rams-red)]"
                    />
                    <h2 className="font-display text-[1.05rem] font-semibold text-[var(--rams-charcoal)]">
                      Attachments
                      <span className="ml-1 font-normal text-[#6B6A64]">
                        ({meeting.attachments.length})
                      </span>
                    </h2>
                  </div>
                </div>
                {meeting.attachments.length === 0 ? (
                  <p className="mt-4 rounded-lg border border-dashed border-[#DCD6CE] px-4 py-5 text-sm text-[#6B6A64]">
                    No attachments were added to this meeting.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {meeting.attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-lg px-1 py-2"
                      >
                        <FileIcon
                          pdf={attachment.mimeType === "application/pdf"}
                        />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={attachment.filename}
                          className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                        >
                          <span className="block break-all text-sm font-semibold text-[var(--rams-charcoal)]">
                            {attachment.filename}
                          </span>
                          <span className="mt-1 block text-xs text-[#6B6A64]">
                            {formatBytes(attachment.size)} ·{" "}
                            {attachment.mimeType.split("/")[1]?.toUpperCase() ??
                              "FILE"}
                          </span>
                        </a>
                        <div className="flex shrink-0 items-center gap-2">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${attachment.filename}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCD6CE] text-[#5D5953] transition hover:border-[var(--rams-red)]/40 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                          >
                            <Icon name="eye" className="h-5 w-5" />
                          </a>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Download ${attachment.filename}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#DCD6CE] text-[#5D5953] transition hover:border-[var(--rams-red)]/40 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                          >
                            <Icon name="download" className="h-5 w-5" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={`${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
                <div className="flex items-center gap-3 border-b border-[#EEEAE4] pb-4">
                  <Icon
                    name="people"
                    className="h-6 w-6 text-[var(--rams-red)]"
                  />
                  <h2 className="font-display text-[1.05rem] font-semibold text-[var(--rams-charcoal)]">
                    Internal participants
                    <span className="ml-1 font-normal text-[#6B6A64]">
                      ({meeting.participants.length})
                    </span>
                  </h2>
                </div>
                {meeting.participants.length === 0 ? (
                  <p className="mt-4 text-sm text-[#6B6A64]">
                    No participants were added.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-[#EEEAE4]">
                    {meeting.participants.map((participant) => (
                      <li
                        key={participant.id}
                        className="flex items-center gap-3 py-3"
                      >
                        <Initials
                          value={participantDisplayName(participant)}
                          className="h-9 w-9 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                            {participantDisplayName(participant)}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[#6B6A64]">
                            {participant.email}
                          </span>
                        </span>
                        <Badge
                          tone={
                            participant.role === "ADMIN" ? "red" : "neutral"
                          }
                        >
                          {participant.role}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
            <section className={`${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
              <div className="flex items-center gap-3 border-b border-[#EEEAE4] pb-4">
                <Icon
                  name="calendar"
                  className="h-6 w-6 text-[var(--rams-red)]"
                />
                <h2 className="font-display text-[1.05rem] font-semibold text-[var(--rams-charcoal)]">
                  Meeting information
                </h2>
              </div>
              <dl className="divide-y divide-[#EEEAE4]">
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                  <dt className="text-sm text-[#5F5A54]">
                    Client / organization
                  </dt>
                  <dd className="min-w-0 break-words text-sm font-medium text-[var(--rams-charcoal)]">
                    {meeting.clientName?.trim() || (
                      <span className="font-normal text-[#8A867D]">
                        Not specified
                      </span>
                    )}
                  </dd>
                </div>
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                  <dt className="text-sm text-[#5F5A54]">Meeting mode</dt>
                  <dd className="flex min-w-0 items-center">
                    <MeetingModeBadge mode={meeting.mode} />
                  </dd>
                </div>
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                  <dt className="text-sm text-[#5F5A54]">Date &amp; time</dt>
                  <dd className="text-sm font-medium leading-6 text-[var(--rams-charcoal)]">
                    <span className="block">
                      {compactDate(meeting.startAt)}
                    </span>
                    <span className="block">
                      {formatTimeRange(meeting.startAt, meeting.endAt)}
                    </span>
                  </dd>
                </div>
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                  <dt className="text-sm text-[#5F5A54]">Duration</dt>
                  <dd className="text-sm font-medium text-[var(--rams-charcoal)]">
                    {durationLabel(meeting.startAt, meeting.endAt)}
                  </dd>
                </div>
                {meeting.mode !== "ONLINE" && (
                  <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                    <dt className="text-sm text-[#5F5A54]">
                      Physical location
                    </dt>
                    <dd className="min-w-0 break-words text-sm font-medium text-[var(--rams-charcoal)]">
                      {meeting.location?.trim() ? (
                        <span className="inline-flex items-start gap-2">
                          <Icon
                            name="location"
                            className="mt-0.5 h-5 w-5 shrink-0"
                          />
                          {meeting.location}
                        </span>
                      ) : (
                        <span className="font-normal text-[#8A867D]">
                          Not specified
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {(meeting.mode !== "OFFLINE" ||
                  Boolean(meeting.meetingLink)) && (
                  <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                    <dt className="text-sm text-[#5F5A54]">Meeting link</dt>
                    <dd className="min-w-0">
                      {meetingUrl ? (
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-[var(--rams-red)] hover:underline"
                        >
                          <Icon name="link" className="h-5 w-5 shrink-0" />
                          <span className="truncate">
                            {meeting.meetingLink}
                          </span>
                          <Icon name="external" className="h-4 w-4 shrink-0" />
                        </a>
                      ) : meeting.meetingLink?.trim() ? (
                        <span className="break-all text-sm font-medium text-[#5F5A54]">
                          {meeting.meetingLink}
                        </span>
                      ) : (
                        <span className="text-sm text-[#8A867D]">
                          Not specified
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                  <dt className="text-sm text-[#5F5A54]">Created by</dt>
                  <dd className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--rams-charcoal)]">
                    <Initials
                      value={
                        meeting.createdBy?.displayName ??
                        meeting.createdBy?.email
                      }
                      className="h-9 w-9 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">
                        {meeting.createdBy?.displayName ??
                          meeting.createdBy?.email ??
                          "Unknown account"}
                      </span>
                      {meeting.createdBy?.email && (
                        <span className="mt-0.5 block truncate text-xs font-normal text-[#6B6A64]">
                          {meeting.createdBy.email}
                        </span>
                      )}
                    </span>
                  </dd>
                </div>
                <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-4">
                  <dt className="text-sm text-[#5F5A54]">Visibility</dt>
                  <dd className="text-sm font-medium text-[var(--rams-charcoal)]">
                    {visibilityLabel}
                  </dd>
                </div>
              </dl>
            </section>

            <section className={`${PANEL} px-5 py-5 sm:px-6 sm:py-6`}>
              <div className="flex items-center gap-3 border-b border-[#EEEAE4] pb-4">
                <Icon
                  name="people"
                  className="h-6 w-6 text-[var(--rams-red)]"
                />
                <h2 className="font-display text-[1.05rem] font-semibold text-[var(--rams-charcoal)]">
                  Audit history
                </h2>
              </div>
              {auditError ? (
                <p
                  role="alert"
                  className="mt-4 text-sm leading-6 text-[#8B3732]"
                >
                  {auditError}
                </p>
              ) : audit.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-[#DCD6CE] px-4 py-5 text-sm text-[#6B6A64]">
                  No audit events are available for this legacy meeting.
                </p>
              ) : (
                <ol className="relative ml-3 mt-5 border-l border-[#E0D9D1]">
                  {audit.map((entry, index) => (
                    <li
                      key={entry.id}
                      className={`relative pl-7 ${
                        index === audit.length - 1 ? "" : "pb-6"
                      }`}
                    >
                      <span className="absolute -left-[0.62rem] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--rams-red)] ring-4 ring-white">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </span>
                      <p className="text-sm font-semibold text-[var(--rams-red)]">
                        {auditActionLabel(entry.action)}
                      </p>
                      <p className="mt-1 text-xs text-[#7D7972]">
                        {entry.actor?.displayName ??
                          entry.actor?.email ??
                          "Unknown actor"}{" "}
                        · {timelineDate(entry.timestamp)}
                      </p>
                      <ul className="mt-3 space-y-2 text-xs text-[#5F5A54]">
                        {Object.entries(entry.changes).map(
                          ([field, change]) => (
                            <li
                              key={field}
                              className="rounded-md bg-[#FBFAF7] px-3 py-2"
                            >
                              <span className="font-semibold text-[var(--rams-charcoal)]">
                                {auditFieldLabel(field)}
                              </span>
                              <span className="mx-1.5 text-[#A8A399]">:</span>
                              {auditValueLabel(change.oldValue, field)}
                              <span className="mx-1.5 text-[#A8A399]">to</span>
                              {auditValueLabel(change.newValue, field)}
                            </li>
                          ),
                        )}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {canDelete && (
              <section className="flex items-start gap-4 rounded-xl border border-[#F0C9C6] bg-[#FFF0EF] px-5 py-5 sm:px-6">
                <Icon
                  name="trash"
                  className="mt-0.5 h-6 w-6 shrink-0 text-[var(--rams-red)]"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-[var(--rams-red-dark)]">
                    Delete meeting
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#6B5753]">
                    Remove this meeting and its attachments permanently.
                  </p>
                </div>
                <Button
                  variant="danger"
                  className="shrink-0 px-3 text-xs"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete meeting
                </Button>
              </section>
            )}
          </aside>
        </div>
      </div>

      {confirmingCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17181C]/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-meeting-title"
            className="w-full max-w-md rounded-xl border border-[#E3DED7] bg-white p-6 shadow-[0_18px_50px_rgba(31,35,40,0.18)]"
          >
            <h2
              id="cancel-meeting-title"
              className="text-lg font-semibold text-[var(--rams-charcoal)]"
            >
              Cancel this meeting?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5F5A54]">
              The meeting will remain in the history with a Cancelled status.
              This action cannot be undone here.
            </p>
            <label
              htmlFor="meeting-cancellation-reason"
              className="mt-5 block text-sm font-semibold text-[var(--rams-charcoal)]"
            >
              Reason (optional)
            </label>
            <textarea
              id="meeting-cancellation-reason"
              rows={3}
              maxLength={1000}
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[#DCD6CE] bg-white px-3 py-2 text-sm text-[var(--rams-charcoal)] outline-none focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[#F9D9D5]"
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmingCancel(false)}
                disabled={cancelling}
              >
                Keep meeting
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void cancel()}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Confirm cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <DeleteConfirmationModal
          personType="meeting"
          personName={meeting.title}
          deleting={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => void remove()}
        />
      )}
    </div>
  );
}
