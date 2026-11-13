"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import { SkeletonLines } from "@/components/skeletons";
import {
  Badge,
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

const PAST_LIMIT = 10;

type MeetingGroup = {
  upcoming: Meeting[];
  past: Meeting[];
};

function MeetingRow({
  meeting,
  isOrganizer,
}: {
  meeting: Meeting;
  isOrganizer: boolean;
}) {
  return (
    <Link
      href={`/dashboard/meetings/${meeting._id}`}
      className="flex items-center gap-4 px-5 py-4 transition hover:bg-[var(--rams-gray-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)]"
    >
      <DayChip value={meeting.startAt} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-[var(--rams-charcoal)]">
            {meeting.title}
          </span>
          <Badge tone={isOrganizer ? "red" : "neutral"}>
            {isOrganizer ? "Organizer" : "Participant"}
          </Badge>
        </span>
        <span className="mt-1 block text-xs text-[var(--rams-gray)]">
          {formatTimeRange(meeting.startAt, meeting.endAt)}
          {meeting.participants.length > 0
            ? `, ${meeting.participants.length} participant${
                meeting.participants.length === 1 ? "" : "s"
              }`
            : ""}
        </span>
      </span>
    </Link>
  );
}

function MeetingsSkeleton() {
  return (
    <Card className="divide-y divide-black/8">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="h-14 w-14 shrink-0 border border-black/10 bg-[var(--rams-gray-light)]" />
          <div className="min-w-0 flex-1">
            <SkeletonLines lines={2} />
          </div>
        </div>
      ))}
    </Card>
  );
}

export default function MyMeetings() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<MeetingGroup>({
    upcoming: [],
    past: [],
  });
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
          const mine = data.filter(
            (meeting) =>
              meeting.createdBy?.id === user?.id ||
              meeting.participantIds.includes(user?.id ?? ""),
          );
          const upcoming = mine
            .filter((meeting) => new Date(meeting.endAt).getTime() >= current)
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            );
          const past = mine
            .filter((meeting) => new Date(meeting.endAt).getTime() < current)
            .sort(
              (a, b) =>
                new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
            )
            .slice(0, PAST_LIMIT);
          setGroups({ upcoming, past });
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
  }, [reloadKey, user?.id]);

  const total = groups.upcoming.length + groups.past.length;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl space-y-7">
        <PageHeader
          title="My Meetings"
          description="Meetings you organize or attend, with upcoming sessions first."
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

        {loading ? (
          <MeetingsSkeleton />
        ) : total === 0 ? (
          <EmptyState
            title="No meetings yet"
            description="When you organize or join a meeting, it will appear here."
            action={
              <LinkButton href="/dashboard/meetings/new">
                Schedule meeting
              </LinkButton>
            }
          />
        ) : (
          <div className="space-y-7">
            <section aria-labelledby="my-upcoming-heading">
              <div className="flex items-end justify-between gap-3">
                <h2
                  id="my-upcoming-heading"
                  className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--rams-gray)]"
                >
                  Upcoming
                </h2>
                <span className="text-xs text-[var(--rams-gray)]">
                  {groups.upcoming.length} meeting
                  {groups.upcoming.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3">
                {groups.upcoming.length === 0 ? (
                  <p className="border border-dashed border-black/15 bg-white px-5 py-6 text-sm text-[var(--rams-gray)]">
                    No upcoming meetings. Schedule one to fill the agenda.
                  </p>
                ) : (
                  <Card className="divide-y divide-black/8">
                    {groups.upcoming.map((meeting) => (
                      <MeetingRow
                        key={meeting._id}
                        meeting={meeting}
                        isOrganizer={meeting.createdBy?.id === user?.id}
                      />
                    ))}
                  </Card>
                )}
              </div>
            </section>

            {groups.past.length > 0 && (
              <section aria-labelledby="my-past-heading">
                <div className="flex items-end justify-between gap-3">
                  <h2
                    id="my-past-heading"
                    className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--rams-gray)]"
                  >
                    Past
                  </h2>
                  <span className="text-xs text-[var(--rams-gray)]">
                    Latest {groups.past.length}
                  </span>
                </div>
                <Card className="mt-3 divide-y divide-black/8">
                  {groups.past.map((meeting) => (
                    <MeetingRow
                      key={meeting._id}
                      meeting={meeting}
                      isOrganizer={meeting.createdBy?.id === user?.id}
                    />
                  ))}
                </Card>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
