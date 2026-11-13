"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import { useToast } from "@/components/providers/toast-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { DetailSkeleton } from "@/components/skeletons";
import { getUserFacingError } from "@/lib/api/errors";
import { deleteMeeting, getMeeting } from "@/lib/api/meetings";
import {
  formatBytes,
  formatDayLong,
  formatTimeRange,
} from "@/lib/meetings/calendar";
import type { Meeting } from "@/types/meetings";

export default function MeetingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { success, error: notifyError } = useToast();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      getMeeting(id)
        .then((data) => {
          if (!cancelled) setMeeting(data);
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

  async function remove() {
    if (!meeting) return;
    setDeleting(true);
    try {
      await deleteMeeting(meeting._id);
      success("Meeting deleted.");
      router.push("/dashboard/meetings");
    } catch (reason) {
      notifyError(getUserFacingError(reason));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (loading) {
    return <DetailSkeleton sections={3} />;
  }

  if (error || !meeting) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-3xl space-y-5">
          <Link
            href="/dashboard/meetings"
            className="text-sm font-bold text-[var(--rams-red)]"
          >
            ← Meetings
          </Link>
          <ErrorState message={error ?? "Meeting not found"} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl space-y-7">
        <Link
          href="/dashboard/meetings"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Meetings
        </Link>

        <PageHeader
          title={meeting.title}
          action={
            meeting.canEdit ? (
              <LinkButton href={`/dashboard/meetings/${meeting._id}/edit`}>
                Edit meeting
              </LinkButton>
            ) : null
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-base font-bold text-[var(--rams-charcoal)]">
                Agenda
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[var(--rams-charcoal)]">
                {meeting.description || "No description was added."}
              </p>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-bold text-[var(--rams-charcoal)]">
                Attachments
              </h2>
              {meeting.attachments.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--rams-gray)]">
                  No attachments were added to this meeting.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-black/8">
                  {meeting.attachments.map((attachment) => (
                    <li key={attachment.id} className="py-3 first:pt-0 last:pb-0">
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
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Schedule
              </h2>
              <p className="mt-2 text-sm font-semibold text-[var(--rams-charcoal)]">
                {formatDayLong(new Date(meeting.startAt))}
              </p>
              <p className="mt-1 text-sm text-[var(--rams-gray)]">
                {formatTimeRange(meeting.startAt, meeting.endAt)}
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Organizer
              </h2>
              <p className="mt-2 break-all text-sm text-[var(--rams-charcoal)]">
                {meeting.createdBy?.email ?? "Unknown account"}
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Participants
                </h2>
                <span className="text-xs text-[var(--rams-gray)]">
                  {meeting.participants.length}
                </span>
              </div>
              {meeting.participants.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--rams-gray)]">
                  No participants were added.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {meeting.participants.map((participant) => (
                    <li
                      key={participant.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0 truncate text-sm text-[var(--rams-charcoal)]">
                        {participant.email}
                      </span>
                      <Badge
                        tone={participant.role === "ADMIN" ? "red" : "neutral"}
                      >
                        {participant.role}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {meeting.meetingLink && (
              <Card className="p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Meeting link
                </h2>
                <a
                  href={meeting.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all text-sm font-semibold text-[var(--rams-red)] hover:text-[var(--rams-red-dark)]"
                >
                  {meeting.meetingLink}
                </a>
              </Card>
            )}
          </div>
        </div>

        {meeting.canEdit && (
          <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="text-sm font-bold text-[var(--rams-charcoal)]">
                Delete this meeting
              </h2>
              <p className="mt-1 text-xs text-[var(--rams-gray)]">
                Participants will no longer see it, and attachments are removed.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              Delete meeting
            </Button>
          </Card>
        )}
      </div>

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
