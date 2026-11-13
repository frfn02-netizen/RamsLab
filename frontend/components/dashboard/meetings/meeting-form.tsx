"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
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
import type {
  Meeting,
  MeetingConflict,
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

type PendingFile = { key: string; file: File };

function createPendingFile(file: File): PendingFile {
  return { key: crypto.randomUUID(), file };
}

type FormState = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
  participantIds: string[];
};

function initialForm(date?: string): FormState {
  const validDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toDateInput(new Date());
  return {
    title: "",
    description: "",
    date: validDate,
    startTime: "",
    endTime: "",
    meetingLink: "",
    participantIds: [],
  };
}

function roleTone(role: UserDirectoryEntry["role"]) {
  if (role === "ADMIN") return "red" as const;
  return "neutral" as const;
}

export default function MeetingForm({
  id,
  initialDate,
}: {
  id?: string;
  initialDate?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: notifyError } = useToast();

  const [form, setForm] = useState<FormState>(() => initialForm(initialDate));
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
            setMeeting(existing);
            setForm({
              title: existing.title,
              description: existing.description,
              date: toDateInput(new Date(existing.startAt)),
              startTime: toTimeInput(new Date(existing.startAt)),
              endTime: toTimeInput(new Date(existing.endAt)),
              meetingLink: existing.meetingLink ?? "",
              participantIds: existing.participantIds,
            });
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

  useEffect(() => {
    let cancelled = false;
    let debounceTimer: number | undefined;

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
  }, [startIso, endIso, participantKey, id]);

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

  const directory = users.filter(
    (entry) =>
      entry.id !== user?.id &&
      entry.email.toLowerCase().includes(userQuery.trim().toLowerCase()),
  );
  const selectedCount = form.participantIds.length;
  const existingAttachmentCount = meeting?.attachments.length ?? 0;

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

    setSaving(true);
    try {
      const input = {
        title: form.title.trim(),
        description: form.description.trim(),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        participantIds: form.participantIds,
        meetingLink: form.meetingLink.trim() ? form.meetingLink.trim() : null,
      };
      const result = id
        ? await updateMeeting(id, input)
        : await createMeeting(input);
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
        success(id ? "Meeting updated." : "Meeting scheduled.");
      }
      router.push(`/dashboard/meetings/${savedId}`);
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
            href="/dashboard/meetings"
            className="text-sm font-bold text-[var(--rams-red)]"
          >
            ← Meetings
          </Link>
          <ErrorState message={error} />
        </div>
      </div>
    );
  }

  const backHref = id ? `/dashboard/meetings/${id}` : "/dashboard/meetings";

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href={backHref}
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          {id ? "← Back to meeting" : "← Meetings"}
        </Link>

        <PageHeader
          title={id ? "Edit meeting" : "Schedule meeting"}
          description="Set the agenda, invite registered accounts, and attach supporting documents."
        />

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-8">
            <section className="grid gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="meeting-title" className="sm:col-span-2">
                <input
                  id="meeting-title"
                  required
                  maxLength={200}
                  className={inputClass}
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
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

              <Field label="Meeting link" htmlFor="meeting-link">
                <input
                  id="meeting-link"
                  type="url"
                  inputMode="url"
                  placeholder="https://meet.google.com/..."
                  className={inputClass}
                  value={form.meetingLink}
                  onChange={(event) =>
                    update("meetingLink", event.target.value)
                  }
                />
              </Field>

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
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-base font-bold text-[var(--rams-charcoal)]">
                  Participants
                </h2>
                <p className="text-xs text-[var(--rams-gray)]">
                  {selectedCount} selected
                </p>
              </div>
              <p className="text-xs leading-5 text-[var(--rams-gray)]">
                You are the organizer. Select other registered accounts to add
                them to this meeting.
              </p>
              <input
                type="search"
                className={inputClass}
                placeholder="Search by email"
                aria-label="Search participants by email"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
              {directory.length === 0 ? (
                <p className="border border-dashed border-black/15 px-4 py-5 text-sm text-[var(--rams-gray)]">
                  No registered accounts match this search.
                </p>
              ) : (
                <ul className="max-h-64 divide-y divide-black/8 overflow-y-auto border border-black/10">
                  {directory.map((entry) => {
                    const checked = form.participantIds.includes(entry.id);
                    return (
                      <li key={entry.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[var(--rams-gray-light)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleParticipant(entry.id)}
                            className="h-4 w-4 accent-[var(--rams-red)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--rams-charcoal)]">
                            {entry.email}
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
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-[var(--rams-charcoal)]">
                Attachments
              </h2>
              <p className="text-xs leading-5 text-[var(--rams-gray)]">
                PDF, PowerPoint, or Word. Maximum 20 MB per file and 10 files
                per meeting.
              </p>

              {meeting && meeting.attachments.length > 0 && (
                <ul className="divide-y divide-black/8 border border-black/10">
                  {meeting.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-sm font-semibold text-[var(--rams-charcoal)] hover:text-[var(--rams-red)]"
                        >
                          {attachment.filename}
                        </a>
                        <p className="mt-0.5 text-xs text-[var(--rams-gray)]">
                          {formatBytes(attachment.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
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
                  className="block w-full text-sm text-[var(--rams-gray)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--rams-red)] file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-[var(--rams-red-dark)]"
                  onChange={chooseFiles}
                  disabled={saving}
                  aria-describedby="meeting-files-help"
                />
              </Field>
              <p
                id="meeting-files-help"
                className="text-xs text-[var(--rams-gray)]"
              >
                Files are uploaded after the meeting is saved.
              </p>

              {files.length > 0 && (
                <ul className="divide-y divide-black/8 border border-black/10">
                  {files.map(({ key, file }, index) => (
                    <li
                      key={key}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-[var(--rams-charcoal)]">
                          {file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--rams-gray)]">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
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
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {fileError}
                </p>
              )}
            </section>

            {(checkingConflicts || conflicts.length > 0) && (
              <section
                className="border border-amber-300 bg-amber-50 p-4"
                aria-live="polite"
              >
                <h2 className="text-sm font-bold text-amber-900">
                  {checkingConflicts
                    ? "Checking for conflicts..."
                    : "Possible scheduling conflict"}
                </h2>
                {conflicts.length > 0 && (
                  <>
                    <p className="mt-1 text-xs leading-5 text-amber-900">
                      Another meeting overlaps this time or shares a
                      participant. You can still save if this is intentional.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {conflicts.map((conflict) => (
                        <li
                          key={conflict._id}
                          className="text-xs text-amber-900"
                        >
                          <span className="font-semibold">
                            {conflict.title}
                          </span>
                          {": "}
                          {formatTimeRange(conflict.startAt, conflict.endAt)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            <div className="flex flex-wrap justify-end gap-3 border-t border-black/8 pt-5">
              <Link
                href={backHref}
                className="px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </Link>
              <Button disabled={saving}>
                {saving ? "Saving..." : id ? "Save changes" : "Schedule meeting"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
