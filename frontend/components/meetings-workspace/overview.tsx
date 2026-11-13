"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/skeletons";
import {
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetings } from "@/lib/api/meetings";
import { formatTimeRange } from "@/lib/meetings/calendar";
import type { Meeting } from "@/types/meetings";
import DayChip from "./day-chip";

const LATER_LIMIT = 5;

function NextMeetingSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-7 w-2/3" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <Skeleton className="mt-6 h-10 w-36" />
    </Card>
  );
}

export default function MeetingsOverview() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      getMeetings()
        .then((data) => {
          if (cancelled) return;
          const current = Date.now();
          setMeetings(
            data
              .filter(
                (meeting) => new Date(meeting.endAt).getTime() >= current,
              )
              .sort(
                (a, b) =>
                  new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
              ),
          );
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
  }, [reloadKey]);

  const next = meetings[0] ?? null;
  const later = meetings.slice(1, 1 + LATER_LIMIT);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl space-y-7">
        <PageHeader
          title="Meetings workspace"
          description="Plan internal lab meetings, review the calendar, and follow the meetings you organize or attend."
          action={
            <LinkButton href="/dashboard/meetings/new">
              Schedule meeting
            </LinkButton>
          }
        />

        {error && (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section aria-labelledby="next-meeting-heading">
            <h2
              id="next-meeting-heading"
              className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--rams-gray)]"
            >
              Next meeting
            </h2>

            <div className="mt-3">
              {loading ? (
                <NextMeetingSkeleton />
              ) : next ? (
                <Card className="p-6">
                  <div className="flex flex-wrap items-start gap-5">
                    <DayChip value={next.startAt} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--rams-red)]">
                        {formatTimeRange(next.startAt, next.endAt)}
                      </p>
                      <h3 className="mt-1 text-2xl font-bold tracking-tight text-[var(--rams-charcoal)]">
                        {next.title}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--rams-gray)]">
                        {next.participants.length} participant
                        {next.participants.length === 1 ? "" : "s"}
                        {next.createdBy
                          ? `, organized by ${next.createdBy.email}`
                          : ""}
                      </p>
                      {next.description && (
                        <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[var(--rams-gray)]">
                          {next.description}
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-2">
                        <LinkButton href={`/dashboard/meetings/${next._id}`}>
                          Open meeting
                        </LinkButton>
                        <LinkButton
                          href="/meetings/calendar"
                          variant="secondary"
                        >
                          View calendar
                        </LinkButton>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <EmptyState
                  title="No upcoming meetings"
                  description="The workspace agenda is clear. Schedule the next lab meeting to get started."
                  action={
                    <LinkButton href="/dashboard/meetings/new">
                      Schedule meeting
                    </LinkButton>
                  }
                />
              )}
            </div>
          </section>

          <aside className="space-y-4" aria-label="Workspace shortcuts">
            <Card className="p-5">
              <h2 className="text-sm font-bold text-[var(--rams-charcoal)]">
                Workspace
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--rams-gray)]">
                {loading
                  ? "Loading your agenda."
                  : `${meetings.length} upcoming meeting${
                      meetings.length === 1 ? "" : "s"
                    } visible to you.`}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <LinkButton href="/meetings/calendar" variant="secondary">
                  Open calendar
                </LinkButton>
                <LinkButton href="/meetings/mine" variant="secondary">
                  My Meetings
                </LinkButton>
              </div>
            </Card>

            <Link
              href="/dashboard"
              className="block border border-black/10 bg-white px-5 py-4 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
            >
              Back to RAMS Dashboard
            </Link>
          </aside>
        </div>

        {!loading && later.length > 0 && (
          <section aria-labelledby="later-meetings-heading">
            <div className="flex items-end justify-between gap-3">
              <h2
                id="later-meetings-heading"
                className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--rams-gray)]"
              >
                Also upcoming
              </h2>
              <Link
                href="/meetings/mine"
                className="text-xs font-semibold text-[var(--rams-red)] hover:text-[var(--rams-red-dark)]"
              >
                See all meetings
              </Link>
            </div>
            <Card className="mt-3 divide-y divide-black/8">
              {later.map((meeting) => (
                <Link
                  key={meeting._id}
                  href={`/dashboard/meetings/${meeting._id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--rams-gray-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)]"
                >
                  <DayChip value={meeting.startAt} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                      {meeting.title}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--rams-gray)]">
                      {formatTimeRange(meeting.startAt, meeting.endAt)}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]"
                    aria-hidden="true"
                  >
                    Open
                  </span>
                </Link>
              ))}
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
