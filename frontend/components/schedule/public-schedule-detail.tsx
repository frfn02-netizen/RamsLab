"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import MeetingModeBadge from "@/components/meetings-workspace/meeting-mode-badge";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import { Button, ErrorState } from "@/components/ui";
import { SkeletonLines } from "@/components/skeletons";
import { ApiError, getUserFacingError } from "@/lib/api/errors";
import { cancelMeeting, getMeeting } from "@/lib/api/meetings";
import {
  getPublicScheduleMeeting,
} from "@/lib/api/public-schedule";
import { canAccessSchedulePortal } from "@/lib/authz";
import { formatTimeRange } from "@/lib/meetings/calendar";
import { safeHttpUrl } from "@/lib/meetings/mode";
import { meetingStatusLabel } from "@/lib/meetings/status";
import type { PublicScheduleMeeting } from "@/types/public-schedule";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status: PublicScheduleMeeting["status"]) {
  if (status === "ONGOING") return "bg-[#FFF3D9] text-[#94631A]";
  if (status === "PAST") return "bg-[#F1F0EE] text-[#69645E]";
  return "bg-[#EAF3E8] text-[#356B35]";
}

export default function PublicScheduleDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user, status } = useAuth();
  const { success, error: notifyError } = useToast();
  const [meeting, setMeeting] = useState<PublicScheduleMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const canManage =
    status === "authenticated" &&
    Boolean(user) &&
    !user?.mustChangePassword &&
    canAccessSchedulePortal(user?.role, user?.permissions ?? []);
  const publicMeetingLink = safeHttpUrl(meeting?.meetingLink);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      getPublicScheduleMeeting(id)
        .then((next) => {
          if (!cancelled) setMeeting(next);
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
    let cancelled = false;
    if (!canManage || !meeting) {
      const timer = window.setTimeout(() => {
        if (cancelled) return;
        setCanEdit(false);
        setCanCancel(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    getMeeting(id)
      .then((internal) => {
        if (cancelled) return;
        setCanEdit(Boolean(internal.canEdit));
        setCanCancel(Boolean(internal.canCancel ?? internal.canEdit));
      })
      .catch(() => {
        if (!cancelled) {
          setCanEdit(false);
          setCanCancel(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, id, meeting, reloadKey]);

  useEffect(() => {
    if (!confirmingCancel) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmingCancel(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirmingCancel]);

  async function cancel() {
    if (!meeting) return;
    setCancelling(true);
    try {
      await cancelMeeting(meeting.id, cancellationReason);
      success("Schedule cancelled.");
      router.push("/schedule/mine");
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
    return (
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
        <SkeletonLines lines={8} />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        <Link
          href="/schedule"
          className="text-sm font-semibold text-[#6B6A64] hover:text-[var(--rams-red)]"
        >
          Back to public schedule
        </Link>
        <div className="mt-5">
          <ErrorState message="This public schedule entry is unavailable." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8F6F3]">
      <div className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#6B6A64]">
          <Link href="/schedule" className="hover:text-[var(--rams-red)]">
            Public schedule
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[var(--rams-charcoal)]">Activity detail</span>
        </div>

        <header className="mt-6 border-l-4 border-[var(--rams-red)] pl-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(meeting.status)}`}
            >
              {meetingStatusLabel(meeting.status)}
            </span>
            <span className="text-xs font-semibold text-[#6B6A64]">
              Public information
            </span>
          </div>
          <h1 className="mt-3 font-display text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--rams-charcoal)] sm:text-[2.7rem]">
            {meeting.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#5F5A54]">
            This page shows public schedule information only.
          </p>
          {publicMeetingLink && (
            <a
              href={publicMeetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
            >
              {meeting.mode === "ONLINE"
                ? "Join Google Meet"
                : "Open Meeting Link"}
            </a>
          )}
        </header>

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <section className="rounded-xl border border-[#E3DED7] bg-white px-5 py-6 shadow-[0_8px_22px_rgba(31,35,40,0.025)] sm:px-6">
            <h2 className="font-display text-lg font-semibold text-[var(--rams-charcoal)]">
              Schedule
            </h2>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                  Date
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--rams-charcoal)]">
                  {formatDate(meeting.startAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                  Time
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--rams-charcoal)]">
                  {formatTimeRange(meeting.startAt, meeting.endAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                  Client
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--rams-charcoal)]">
                  {meeting.clientName?.trim() || "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                  Mode
                </dt>
                <dd className="mt-1">
                  <MeetingModeBadge mode={meeting.mode} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                  Location
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--rams-charcoal)]">
                  {meeting.location?.trim() || "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                  Primary PIC
                </dt>
                <dd className="mt-1 text-sm font-medium text-[var(--rams-charcoal)]">
                  {meeting.primaryPicName || "Not specified"}
                </dd>
              </div>
              {meeting.additionalPicNames && meeting.additionalPicNames.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A867D]">
                    Additional PICs
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-[var(--rams-charcoal)]">
                    {meeting.additionalPicNames.join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[#E3DED7] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(31,35,40,0.025)]">
              <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                Public access
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#6B6A64]">
                Public meeting links are available for non-private meetings.
                Participants, creator details, descriptions, attachments, and
                audit history are not part of the public schedule.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/schedule/calendar"
                  className="text-xs font-semibold text-[var(--rams-red)] underline-offset-4 hover:underline"
                >
                  Open public calendar
                </Link>
              </div>
            </section>

            {(canEdit || canCancel) && (
              <section className="rounded-xl border border-[#E3DED7] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(31,35,40,0.025)]">
                <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                  Manage schedule
                </h2>
                <p className="mt-2 text-xs leading-5 text-[#6B6A64]">
                  These actions use your authenticated Schedule Portal
                  permissions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canEdit && (
                    <Link
                      href={`/schedule/${meeting.id}/edit`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#DCD6CE] bg-white px-4 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)]/45 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                    >
                      Edit schedule
                    </Link>
                  )}
                  {canCancel &&
                    meeting.status !== "PAST" &&
                    meeting.status !== "CANCELLED" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setConfirmingCancel(true)}
                    >
                      Cancel schedule
                    </Button>
                  )}
                </div>
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
            aria-labelledby="public-cancel-title"
            className="w-full max-w-md rounded-xl border border-[#E3DED7] bg-white p-6 shadow-[0_18px_50px_rgba(31,35,40,0.18)]"
          >
            <h2
              id="public-cancel-title"
              className="text-lg font-semibold text-[var(--rams-charcoal)]"
            >
              Cancel this schedule?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#5F5A54]">
              The meeting will be removed from the active public schedule and
              kept in the authenticated cancellation history.
            </p>
            <label
              htmlFor="public-cancel-reason"
              className="mt-5 block text-sm font-semibold text-[var(--rams-charcoal)]"
            >
              Reason (optional)
            </label>
            <textarea
              id="public-cancel-reason"
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
                Keep schedule
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
    </div>
  );
}
