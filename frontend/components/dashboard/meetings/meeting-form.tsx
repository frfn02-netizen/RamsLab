"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import { Initials } from "@/components/meetings-workspace/day-chip";
import { Badge, Button, ErrorState, Field, inputClass } from "@/components/ui";
import CustomSelect from "@/components/ui/custom-select";
import { FormSkeleton } from "@/components/skeletons";
import { getUserFacingError } from "@/lib/api/errors";
import {
  checkMeetingConflicts,
  createMeeting,
  getMeeting,
  getUserDirectory,
  removeMeetingAttachment,
  updateMeeting,
  uploadMeetingAttachment,
} from "@/lib/api/meetings";
import {
  combineDateTime,
  formatBytes,
  formatTimeRange,
  toDateInput,
  toTimeInput,
} from "@/lib/meetings/calendar";
import { safeHttpUrl } from "@/lib/safe-url";
import { canManageOwnMeetings } from "@/lib/authz";
import { meetingCopy } from "@/lib/meeting-copy";
import type {
  Meeting,
  MeetingConflict,
  MeetingInput,
  MeetingMode,
  MeetingSaveResult,
  MeetingUpdateInput,
  UserDirectoryEntry,
} from "@/types/meetings";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_ATTACHMENT_EXTENSION = /\.(pdf|ppt|pptx|doc|docx)$/i;
const REMINDER_EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function parseReminderEmails(value: string) {
  const unique = [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  return {
    emails: unique.filter((email) => REMINDER_EMAIL_PATTERN.test(email)),
    invalid: unique.filter((email) => !REMINDER_EMAIL_PATTERN.test(email)),
  };
}

type PendingFile = { key: string; file: File };

function createPendingFile(file: File): PendingFile {
  return { key: crypto.randomUUID(), file };
}

type FormState = {
  title: string;
  description: string;
  clientName: string;
  mode: MeetingMode | "";
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  primaryPicId: string;
  additionalPicIds: string[];
  participantIds: string[];
  additionalReminderEmails: string;
};

function initialForm(date?: string): FormState {
  const validDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toDateInput(new Date());
  return {
    title: "",
    description: "",
    clientName: "",
    mode: "",
    location: "",
    date: validDate,
    startTime: "",
    endTime: "",
    meetingLink: "",
    primaryPicId: "",
    additionalPicIds: [],
    participantIds: [],
    additionalReminderEmails: "",
  };
}

function meetingFormState(meeting: Meeting): FormState {
  return {
    title: meeting.title,
    description: meeting.description,
    clientName: meeting.clientName ?? "",
    mode: meeting.mode ?? "",
    location: meeting.location ?? "",
    date: toDateInput(new Date(meeting.startAt)),
    startTime: toTimeInput(new Date(meeting.startAt)),
    endTime: toTimeInput(new Date(meeting.endAt)),
    meetingLink: meeting.meetingLink ?? "",
    primaryPicId: meeting.primaryPicId ?? "",
    additionalPicIds: (meeting.picIds ?? []).filter(
      (userId) => userId !== meeting.primaryPicId,
    ),
    participantIds: meeting.participantIds,
    additionalReminderEmails: (meeting.additionalReminderEmails ?? []).join(
      "\n",
    ),
  };
}

function roleTone(role: UserDirectoryEntry["role"]) {
  if (role === "ADMIN") return "red" as const;
  return "neutral" as const;
}

function directoryDisplayName(entry: UserDirectoryEntry) {
  return (
    entry.displayName?.trim() || entry.email.split("@", 1)[0] || entry.email
  );
}

const PANEL = "rounded-lg border border-[#E7E2D8] bg-white";

function FileIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F1EA] text-[#6B6A64]">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M5 2.5h6l4 4v11a1 1 0 01-1 1H5a1 1 0 01-1-1v-14a1 1 0 011-1zM11 2.5v4h4M7 11h6M7 14h4" />
      </svg>
    </span>
  );
}

export default function MeetingForm({
  id,
  initialDate,
  basePath = "/dashboard/meetings",
}: {
  id?: string;
  initialDate?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const copy = meetingCopy();
  const { success, error: notifyError } = useToast();

  const [form, setForm] = useState<FormState>(() => initialForm(initialDate));
  const [initialFormState, setInitialFormState] = useState<FormState | null>(
    null,
  );
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [users, setUsers] = useState<UserDirectoryEntry[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<MeetingConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [removingAttachmentId, setRemovingAttachmentId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      Promise.all([
        getUserDirectory(),
        id ? getMeeting(id) : Promise.resolve(null),
      ])
        .then(([directory, existing]) => {
          if (cancelled) return;
          setUsers(directory);
          if (existing) {
            const nextForm = meetingFormState(existing);
            setMeeting(existing);
            setInitialFormState(nextForm);
            setForm(nextForm);
          }
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
  }, [id]);

  const start = combineDateTime(form.date, form.startTime);
  const end = combineDateTime(form.date, form.endTime);
  const startIso = start?.toISOString() ?? "";
  const endIso = end?.toISOString() ?? "";
  const participantKey = form.participantIds.join(",");
  const picKey = [form.primaryPicId, ...form.additionalPicIds].join(",");

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: number | undefined;
    const conflictPicIds = picKey ? picKey.split(",").filter(Boolean) : [];

    const kickoff = window.setTimeout(() => {
      if (cancelled) return;
      if (!startIso || !endIso || new Date(endIso) <= new Date(startIso)) {
        setConflicts([]);
        setCheckingConflicts(false);
        return;
      }

      setCheckingConflicts(true);
      debounceTimer = window.setTimeout(() => {
        checkMeetingConflicts({
          startAt: startIso,
          endAt: endIso,
          picIds: conflictPicIds,
          participantIds: participantKey ? participantKey.split(",") : [],
          ...(id ? { excludeId: id } : {}),
        })
          .then((result) => {
            if (!cancelled) setConflicts(result);
          })
          .catch(() => {
            if (!cancelled) setConflicts([]);
          })
          .finally(() => {
            if (!cancelled) setCheckingConflicts(false);
          });
      }, 400);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(kickoff);
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
    };
  }, [startIso, endIso, participantKey, picKey, id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleParticipant(userId: string) {
    setForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(userId)
        ? current.participantIds.filter((value) => value !== userId)
        : [...current.participantIds, userId],
    }));
  }

  function toggleFilteredParticipants() {
    const shownIds = new Set(filteredParticipantIds);
    setForm((current) => {
      const allSelected = filteredParticipantIds.every((id) =>
        current.participantIds.includes(id),
      );
      return {
        ...current,
        participantIds: allSelected
          ? current.participantIds.filter((id) => !shownIds.has(id))
          : [
              ...current.participantIds,
              ...filteredParticipantIds.filter(
                (id) => !current.participantIds.includes(id),
              ),
            ],
      };
    });
  }

  function toggleAdditionalPic(userId: string) {
    setForm((current) => ({
      ...current,
      additionalPicIds: current.additionalPicIds.includes(userId)
        ? current.additionalPicIds.filter((value) => value !== userId)
        : [...current.additionalPicIds, userId],
    }));
  }

  const internalUsers = users.filter((entry) => entry.role !== "ALUMNI");
  const picDirectory = internalUsers.filter((entry) =>
    [directoryDisplayName(entry), entry.email, entry.role]
      .join(" ")
      .toLowerCase()
      .includes(userQuery.trim().toLowerCase()),
  );
  const participantDirectory = internalUsers.filter(
    (entry) =>
      entry.id !== user?.id &&
      [directoryDisplayName(entry), entry.email, entry.role]
        .join(" ")
        .toLowerCase()
        .includes(userQuery.trim().toLowerCase()),
  );
  const selectedInternalCount = form.participantIds.length;
  const filteredParticipantIds = participantDirectory.map((entry) => entry.id);
  const participantTotal = internalUsers.filter(
    (entry) => entry.id !== user?.id,
  ).length;
  const selectedFilteredCount = filteredParticipantIds.filter((id) =>
    form.participantIds.includes(id),
  ).length;
  const allFilteredSelected =
    filteredParticipantIds.length > 0 &&
    selectedFilteredCount === filteredParticipantIds.length;
  const someFilteredSelected =
    selectedFilteredCount > 0 && !allFilteredSelected;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const existingAttachmentCount = meeting?.attachments.length ?? 0;
  const canManageAttachments =
    user?.role === "ADMIN" ||
    (canManageOwnMeetings(user?.role) &&
      (!meeting || meeting.isOrganizer !== false));

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    setFileError(null);

    const next = [...files];
    for (const file of selected) {
      if (
        !ALLOWED_ATTACHMENT_TYPES.has(file.type) &&
        !ALLOWED_ATTACHMENT_EXTENSION.test(file.name)
      ) {
        setFileError("Only PDF, PowerPoint, and Word documents are allowed.");
        continue;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setFileError("Each file must be 20 MB or smaller.");
        continue;
      }
      if (
        next.some(
          (existing) =>
            existing.file.name === file.name &&
            existing.file.size === file.size,
        )
      ) {
        continue;
      }
      if (existingAttachmentCount + next.length >= MAX_ATTACHMENTS) {
        setFileError("A meeting can have at most 10 attachments.");
        break;
      }
      next.push(createPendingFile(file));
    }
    setFiles(next);
  }

  async function removeExistingAttachment(attachmentId: string) {
    if (!id) return;
    setRemovingAttachmentId(attachmentId);
    try {
      const updated = await removeMeetingAttachment(id, attachmentId);
      setMeeting(updated);
      success("Attachment removed.");
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setRemovingAttachmentId(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      notifyError("Meeting title is required.");
      return;
    }
    const clientName = form.clientName.trim();
    if (!id && !clientName) {
      notifyError("Client or organization is required.");
      return;
    }
    if (id && initialFormState?.clientName && !clientName) {
      notifyError("Client or organization is required.");
      return;
    }

    const mode = form.mode || null;
    if (!id && !mode) {
      notifyError("Select whether the meeting is offline or online.");
      return;
    }
    if (id && initialFormState?.mode && !mode) {
      notifyError("Select whether the meeting is offline or online.");
      return;
    }

    const location = form.location.trim();
    const meetingLink = form.meetingLink.trim();
    if (mode === "OFFLINE" && !location) {
      notifyError("A physical location is required for offline meetings.");
      return;
    }
    if (meetingLink && !safeHttpUrl(meetingLink)) {
      notifyError("Enter a valid HTTP(S) meeting link.");
      return;
    }
    if (mode === "ONLINE" && !meetingLink) {
      notifyError("A meeting link is required for online meetings.");
      return;
    }

    const startAt = combineDateTime(form.date, form.startTime);
    const endAt = combineDateTime(form.date, form.endTime);
    if (!startAt || !endAt) {
      notifyError("Choose a date, a start time, and an end time.");
      return;
    }
    if (endAt.getTime() <= startAt.getTime()) {
      notifyError("End time must be after start time.");
      return;
    }

    const picIds = form.primaryPicId
      ? [form.primaryPicId, ...form.additionalPicIds]
      : [];
    const hasExistingPicAssignment = Boolean(
      initialFormState?.primaryPicId ||
      initialFormState?.additionalPicIds.length,
    );
    const picAssignmentChanged =
      !id ||
      form.primaryPicId !== (initialFormState?.primaryPicId ?? "") ||
      form.additionalPicIds.join(",") !==
        (initialFormState?.additionalPicIds ?? []).join(",");
    if (
      (!id || hasExistingPicAssignment || picAssignmentChanged) &&
      !form.primaryPicId
    ) {
      notifyError("Select a primary PIC.");
      return;
    }

    const reminderEmails = parseReminderEmails(form.additionalReminderEmails);
    if (reminderEmails.invalid.length > 0) {
      notifyError(copy.additionalReminderEmailsInvalid);
      return;
    }

    setSaving(true);
    try {
      const commonInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        participantIds: form.participantIds,
        additionalReminderEmails: reminderEmails.emails,
      };

      let result: MeetingSaveResult;
      if (!id) {
        const input: MeetingInput = {
          ...commonInput,
          clientName,
          mode: mode!,
          location: mode === "OFFLINE" ? location : null,
          meetingLink: meetingLink || null,
          primaryPicId: form.primaryPicId,
          picIds,
        };
        result = await createMeeting(input);
      } else {
        const legacyModePreserved = !initialFormState?.mode && !mode;
        const input: MeetingUpdateInput = {
          ...commonInput,
          ...(clientName ? { clientName } : {}),
          meetingLink: meetingLink || null,
          ...(legacyModePreserved
            ? {}
            : {
                mode: mode!,
                location: mode === "OFFLINE" ? location : null,
              }),
          ...(picAssignmentChanged
            ? { primaryPicId: form.primaryPicId, picIds }
            : {}),
          expectedUpdatedAt: meeting?.updatedAt,
        };
        result = await updateMeeting(id, input);
      }
      const savedId = result.meeting._id;

      let uploadFailed = false;
      for (const { file } of files) {
        try {
          await uploadMeetingAttachment(savedId, file);
        } catch {
          uploadFailed = true;
        }
      }

      if (uploadFailed) {
        notifyError(
          "Meeting saved, but one or more attachments could not be uploaded.",
        );
      } else {
        success(id ? copy.updated : copy.created);
      }
      router.push(`${basePath}/${savedId}`);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormSkeleton fields={8} actionCount={2} />;
  }

  if (error) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-3xl space-y-5">
          <Link
            href={basePath}
            className="text-sm font-bold text-[var(--rams-red)]"
          >
            ← Meetings
          </Link>
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  const backHref = id ? `${basePath}/${id}` : basePath;
  const allowLegacyMode = Boolean(
    id && initialFormState && !initialFormState.mode,
  );
  const clientNameRequired = !id || Boolean(initialFormState?.clientName);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6A64] transition hover:text-[var(--rams-red)]"
        >
          {id ? "← Back to meeting" : "← Meetings"}
        </Link>

        <div className="mt-4">
          <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-[var(--rams-charcoal)] sm:text-[2rem]">
            {id ? "Edit meeting" : "Schedule meeting"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B6A64]">
            Set the agenda, invite registered accounts, and attach supporting
            documents.
          </p>
        </div>

        <form onSubmit={submit} noValidate className="mt-7 space-y-5">
          <section className={`${PANEL} px-6 py-6`}>
            <div className="border-b border-[#F0ECE4] pb-4">
              <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                People in charge
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                Choose one primary PIC and, when needed, additional active
                internal PICs. PIC assignments do not add participants or change
                meeting ownership.
              </p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Primary PIC" htmlFor="meeting-primary-pic">
                <CustomSelect
                  id="meeting-primary-pic"
                  value={form.primaryPicId}
                  onChange={(primaryPicId) => {
                    setForm((current) => ({
                      ...current,
                      primaryPicId,
                      additionalPicIds: current.additionalPicIds.filter(
                        (userId) => userId !== primaryPicId,
                      ),
                    }));
                  }}
                  options={picDirectory.map((entry) => ({
                    value: entry.id,
                    label: `${directoryDisplayName(entry)} (${entry.role})`,
                  }))}
                  placeholder="Select primary PIC"
                  ariaDescribedby="meeting-primary-pic-help"
                />
                <p
                  id="meeting-primary-pic-help"
                  className="mt-1.5 text-xs leading-5 text-[#6B6A64]"
                >
                  Required for new meetings. Legacy meetings remain unchanged
                  until you assign a PIC.
                </p>
              </Field>

              <div>
                <h3 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                  Additional PICs
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                  Optional active internal accounts who share responsibility.
                </p>
                <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[#E7E2D8]">
                  {picDirectory.filter(
                    (entry) => entry.id !== form.primaryPicId,
                  ).length === 0 ? (
                    <p className="px-4 py-4 text-sm text-[#6B6A64]">
                      No additional PICs match this search.
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#F0ECE4]">
                      {picDirectory
                        .filter((entry) => entry.id !== form.primaryPicId)
                        .map((entry) => {
                          const checked = form.additionalPicIds.includes(
                            entry.id,
                          );
                          return (
                            <li key={entry.id}>
                              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[#FBFAF7]">
                                <input
                                  aria-label={`Additional PIC: ${entry.email}`}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAdditionalPic(entry.id)}
                                  className="h-4 w-4 accent-[var(--rams-red)]"
                                />
                                <Initials
                                  value={directoryDisplayName(entry)}
                                  className="h-8 w-8"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                                    {directoryDisplayName(entry)}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-[#6B6A64]">
                                    {entry.email}
                                  </span>
                                </span>
                                <Badge tone={roleTone(entry.role)}>
                                  {entry.role}
                                </Badge>
                              </label>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={`${PANEL} px-6 py-6`}>
            <div className="border-b border-[#F0ECE4] pb-4">
              <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                Meeting details
              </h2>
              <p className="mt-1 text-xs text-[#6B6A64]">
                Client, schedule, and whether this session is physical or
                online.
              </p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Title"
                htmlFor="meeting-title"
                className="sm:col-span-2"
              >
                <input
                  id="meeting-title"
                  required
                  maxLength={200}
                  className={inputClass}
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </Field>

              <Field
                label="Client or organization"
                htmlFor="meeting-client-name"
                className="sm:col-span-2"
              >
                <input
                  id="meeting-client-name"
                  required={clientNameRequired}
                  maxLength={200}
                  className={inputClass}
                  value={form.clientName}
                  onChange={(event) => update("clientName", event.target.value)}
                  aria-describedby="meeting-client-name-help"
                />
                <p
                  id="meeting-client-name-help"
                  className="mt-1.5 text-xs leading-5 text-[#6B6A64]"
                >
                  External client, person, or organization. Internal RAMS
                  attendees are selected separately below.
                </p>
              </Field>

              <Field label="Date" htmlFor="meeting-date">
                <input
                  id="meeting-date"
                  type="date"
                  required
                  className={inputClass}
                  value={form.date}
                  onChange={(event) => update("date", event.target.value)}
                />
              </Field>

              <Field label="Mode" htmlFor="meeting-mode">
                <CustomSelect
                  id="meeting-mode"
                  value={form.mode}
                  ariaDescribedby="meeting-mode-help"
                  onChange={(next) =>
                    update("mode", next as MeetingMode | "")
                  }
                  options={[
                    ...(!id || allowLegacyMode
                      ? [
                          {
                            value: "",
                            label: id
                              ? "Not specified (legacy)"
                              : "Select mode",
                          },
                        ]
                      : []),
                    { value: "OFFLINE", label: "Offline" },
                    { value: "ONLINE", label: "Online" },
                  ]}
                />
                <p
                  id="meeting-mode-help"
                  className="mt-1.5 text-xs leading-5 text-[#6B6A64]"
                >
                  Choose whether attendees meet physically or online.
                </p>
              </Field>

              {form.mode === "OFFLINE" && (
                <Field label="Physical location" htmlFor="meeting-location">
                  <input
                    id="meeting-location"
                    required
                    maxLength={300}
                    className={inputClass}
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                    aria-describedby="meeting-location-help"
                  />
                  <p
                    id="meeting-location-help"
                    className="mt-1.5 text-xs leading-5 text-[#6B6A64]"
                  >
                    Physical room, building, or site for this offline meeting.
                  </p>
                </Field>
              )}

              <Field
                label={
                  form.mode === "ONLINE"
                    ? "Meeting Link"
                    : "Meeting Link (optional)"
                }
                htmlFor="meeting-link"
              >
                <input
                  id="meeting-link"
                  type="url"
                  inputMode="url"
                  required={form.mode === "ONLINE"}
                  placeholder="https://meet.google.com/..."
                  className={inputClass}
                  value={form.meetingLink}
                  onChange={(event) =>
                    update("meetingLink", event.target.value)
                  }
                  aria-describedby="meeting-link-help"
                />
                <p
                  id="meeting-link-help"
                  className="mt-1.5 text-xs leading-5 text-[#6B6A64]"
                >
                  {form.mode === "ONLINE"
                    ? "Required for online meetings. Use a complete HTTP or HTTPS link."
                    : "Optional for offline meetings. Use a complete HTTP or HTTPS link when provided."}
                </p>
              </Field>

              {!form.mode && allowLegacyMode && (
                <div className="rounded-lg border border-dashed border-[#DDD6C9] bg-[#FBFAF7] px-4 py-3 text-xs leading-5 text-[#6B6A64] sm:col-span-2">
                  This legacy meeting has no stored mode. Existing location and
                  link values are preserved unless you select a mode.
                </div>
              )}

              <Field label="Start time" htmlFor="meeting-start">
                <input
                  id="meeting-start"
                  type="time"
                  required
                  className={inputClass}
                  value={form.startTime}
                  onChange={(event) => update("startTime", event.target.value)}
                />
              </Field>

              <Field label="End time" htmlFor="meeting-end">
                <input
                  id="meeting-end"
                  type="time"
                  required
                  className={inputClass}
                  value={form.endTime}
                  onChange={(event) => update("endTime", event.target.value)}
                />
              </Field>

              <Field
                label="Description"
                htmlFor="meeting-description"
                className="sm:col-span-2"
              >
                <textarea
                  id="meeting-description"
                  rows={4}
                  maxLength={5000}
                  className={inputClass}
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </Field>
            </div>
          </section>

          <section className={`${PANEL} px-6 py-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0ECE4] pb-4">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                  Participants
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                  Add active staff accounts from RAMS.
                </p>
              </div>
              <span className="rounded-full border border-[#E7E2D8] px-2.5 py-1 text-[0.66rem] font-semibold text-[#6B6A64]">
                {selectedInternalCount} internal
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                  Internal participants
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                  Active staff accounts are available. Each selection is stored
                  by userId.
                </p>
              </div>
              <input
                type="search"
                className={inputClass}
                placeholder="Search by name, email, or role"
                aria-label="Search internal participants"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
              {participantDirectory.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-[#FBFAF7] px-4 py-2.5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-[var(--rams-charcoal)]">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleFilteredParticipants}
                      className="h-4 w-4 accent-[var(--rams-red)]"
                    />
                    {copy.selectAllParticipants}
                  </label>
                  <span className="text-xs text-[#6B6A64]">
                    {copy.selectedParticipants
                      .replace("{selected}", String(selectedInternalCount))
                      .replace("{total}", String(participantTotal))}
                  </span>
                </div>
              )}
              {participantDirectory.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#DDD6C9] px-4 py-5 text-sm text-[#6B6A64]">
                  No registered accounts match this search.
                </p>
              ) : (
                <ul className="max-h-64 divide-y divide-[#F0ECE4] overflow-y-auto rounded-lg border border-[#E7E2D8]">
                  {participantDirectory.map((entry) => {
                    const checked = form.participantIds.includes(entry.id);
                    return (
                      <li key={entry.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[#FBFAF7]">
                          <input
                            aria-label={`Participant: ${entry.email}`}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(entry.id)}
                            className="h-4 w-4 accent-[var(--rams-red)]"
                          />
                          <Initials
                            value={directoryDisplayName(entry)}
                            className="h-8 w-8"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                              {directoryDisplayName(entry)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#6B6A64]">
                              {entry.email}
                            </span>
                          </span>
                          <Badge tone={roleTone(entry.role)}>
                            {entry.role}
                          </Badge>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 space-y-3 border-t border-[#F0ECE4] pt-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                  {copy.additionalReminderEmailsLabel}
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                  {copy.additionalReminderEmailsHint}
                </p>
              </div>
              <textarea
                className={`${inputClass} min-h-24`}
                aria-label={copy.additionalReminderEmailsLabel}
                placeholder="staff@example.com"
                value={form.additionalReminderEmails}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    additionalReminderEmails: event.target.value,
                  }))
                }
              />
            </div>
          </section>

          {canManageAttachments && (
            <section className={`${PANEL} px-6 py-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0ECE4] pb-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                    Attachments
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                    PDF, PowerPoint, or Word. Maximum 20 MB per file and 10
                    files per meeting.
                  </p>
                </div>
                {existingAttachmentCount > 0 && (
                  <span className="rounded-full border border-[#E7E2D8] px-2.5 py-1 text-[0.66rem] font-semibold text-[#6B6A64]">
                    {existingAttachmentCount} attached
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                {meeting && meeting.attachments.length > 0 && (
                  <ul className="divide-y divide-[#F0ECE4] rounded-lg border border-[#E7E2D8]">
                    {meeting.attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FileIcon />
                          <div className="min-w-0">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-sm font-semibold text-[var(--rams-charcoal)] hover:text-[var(--rams-red)]"
                            >
                              {attachment.filename}
                            </a>
                            <p className="mt-0.5 text-xs text-[#6B6A64]">
                              {formatBytes(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 py-1.5 text-xs"
                          disabled={removingAttachmentId === attachment.id}
                          onClick={() =>
                            void removeExistingAttachment(attachment.id)
                          }
                        >
                          {removingAttachmentId === attachment.id
                            ? "Removing..."
                            : "Remove"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <Field
                  label={
                    existingAttachmentCount > 0
                      ? "Add more documents"
                      : "Add documents"
                  }
                  htmlFor="meeting-files"
                >
                  <input
                    id="meeting-files"
                    type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                    className="block w-full rounded-lg border border-dashed border-[#DDD6C9] bg-[#FBFAF7] px-4 py-4 text-sm text-[#6B6A64] transition file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--rams-red)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-[var(--rams-red)]/35 hover:file:bg-[var(--rams-red-dark)]"
                    onChange={chooseFiles}
                    disabled={saving}
                    aria-describedby="meeting-files-help"
                  />
                </Field>
                <p id="meeting-files-help" className="text-xs text-[#6B6A64]">
                  Files are uploaded after the meeting is saved.
                </p>

                {files.length > 0 && (
                  <ul className="divide-y divide-[#F0ECE4] rounded-lg border border-[#E7E2D8]">
                    {files.map(({ key, file }, index) => (
                      <li
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FileIcon />
                          <div className="min-w-0">
                            <p className="break-all text-sm font-semibold text-[var(--rams-charcoal)]">
                              {file.name}
                            </p>
                            <p className="mt-0.5 text-xs text-[#6B6A64]">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 py-1.5 text-xs"
                          disabled={saving}
                          onClick={() =>
                            setFiles((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {fileError && (
                  <p
                    className="text-sm font-semibold text-red-700"
                    role="alert"
                  >
                    {fileError}
                  </p>
                )}
              </div>
            </section>
          )}

          {(checkingConflicts || conflicts.length > 0) && (
            <section
              className="rounded-lg border border-amber-200 bg-amber-50/60 px-5 py-4"
              aria-live="polite"
            >
              <h2 className="text-sm font-semibold text-amber-900">
                {checkingConflicts
                  ? "Checking for conflicts..."
                  : "Possible scheduling conflict"}
              </h2>
              {conflicts.length > 0 && (
                <>
                  <p className="mt-1 text-xs leading-5 text-amber-900">
                    Another meeting overlaps this time or shares a participant.
                    You can still save if this is intentional.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {conflicts.map((conflict, index) => (
                      <li
                        key={`${conflict._id ?? "busy"}-${index}`}
                        className="text-xs text-amber-900"
                      >
                        <span className="font-semibold">
                          {conflict.busy
                            ? "Busy"
                            : (conflict.title ?? "Meeting conflict")}
                        </span>
                        {!conflict.busy &&
                          conflict.startAt &&
                          conflict.endAt &&
                          `: ${formatTimeRange(conflict.startAt, conflict.endAt)}`}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-[#E7E2D8] bg-[#FBFAF7] px-4 py-3">
            <Link
              href={backHref}
              className="px-3 py-2 text-sm font-semibold text-[#6B6A64] transition hover:text-[var(--rams-charcoal)]"
            >
              Cancel
            </Link>
            <Button disabled={saving}>
              {saving ? "Saving..." : id ? "Save changes" : "Schedule meeting"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
