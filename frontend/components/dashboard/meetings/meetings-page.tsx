"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { Skeleton } from "@/components/skeletons";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetings } from "@/lib/api/meetings";
import {
  buildMonthGrid,
  dayKey,
  formatDayLong,
  formatMonthYear,
  formatTime,
  formatTimeRange,
  groupByDay,
  isSameDay,
  monthVisibleRange,
  startOfDay,
} from "@/lib/meetings/calendar";
import type { Meeting } from "@/types/meetings";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarSkeleton() {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="mt-5 grid grid-cols-7 gap-px bg-black/10">
        {Array.from({ length: 42 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-none bg-white" />
        ))}
      </div>
    </Card>
  );
}

export default function MeetingsPage({
  basePath = "/dashboard/meetings",
}: {
  basePath?: string;
}) {
  const [cursor, setCursor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const { from, to } = monthVisibleRange(
        cursor.getFullYear(),
        cursor.getMonth(),
      );
      setLoading(true);
      setError(null);

      getMeetings({ from: from.toISOString(), to: to.toISOString() })
        .then((data) => {
          if (!cancelled) setMeetings(data);
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
  }, [cursor, reloadKey]);

  const days = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );
  const byDay = useMemo(() => groupByDay(meetings), [meetings]);
  const selectedMeetings = byDay.get(dayKey(selectedDate)) ?? [];
  const today = startOfDay(new Date());

  function shiftMonth(delta: number) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(next);
    setSelectedDate(next);
  }

  function goToToday() {
    const now = startOfDay(new Date());
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          title="Meetings"
          description="Schedule and review internal lab meetings. Select a day to see its agenda."
          action={
            <LinkButton
              href={`${basePath}/new?date=${dayKey(selectedDate)}`}
            >
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <CalendarSkeleton />
            <Card className="space-y-4 p-5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--rams-charcoal)]">
                    {formatMonthYear(cursor)}
                  </h2>
                  <p className="mt-1 text-xs text-[var(--rams-gray)]">
                    {meetings.length} meeting
                    {meetings.length === 1 ? "" : "s"} in this calendar view
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    aria-label="Show previous month"
                    onClick={() => shiftMonth(-1)}
                  >
                    Previous
                  </Button>
                  <Button variant="secondary" onClick={goToToday}>
                    Today
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label="Show next month"
                    onClick={() => shiftMonth(1)}
                  >
                    Next
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 border-l border-t border-black/10">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="border-b border-r border-black/10 bg-[var(--rams-gray-light)] px-1 py-2 text-center text-[0.65rem] font-bold uppercase tracking-wide text-[var(--rams-charcoal)]"
                  >
                    <span className="hidden sm:inline">{weekday}</span>
                    <span className="sm:hidden">{weekday.slice(0, 1)}</span>
                  </div>
                ))}
                {days.map((day) => {
                  const items = byDay.get(day.key) ?? [];
                  const selected = isSameDay(day.date, selectedDate);
                  const isToday = isSameDay(day.date, today);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${formatDayLong(day.date)}, ${items.length} meeting${
                        items.length === 1 ? "" : "s"
                      }`}
                      onClick={() => setSelectedDate(startOfDay(day.date))}
                      className={`min-h-[4.5rem] border-b border-r border-black/10 p-1.5 text-left align-top transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)] ${
                        selected
                          ? "bg-red-50"
                          : day.inMonth
                            ? "bg-white hover:bg-[var(--rams-gray-light)]"
                            : "bg-[var(--rams-gray-light)]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-[var(--rams-red)] text-white"
                            : "text-[var(--rams-charcoal)]"
                        }`}
                      >
                        {day.date.getDate()}
                      </span>
                      <span className="mt-1 block space-y-0.5">
                        {items.slice(0, 2).map((meeting) => (
                          <span
                            key={meeting._id}
                            className="hidden truncate text-[0.65rem] leading-4 text-[var(--rams-charcoal)] sm:block"
                          >
                            {formatTime(meeting.startAt)} {meeting.title}
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="hidden text-[0.65rem] text-[var(--rams-gray)] sm:block">
                            +{items.length - 2} more
                          </span>
                        )}
                      </span>
                      {items.length > 0 && (
                        <span
                          className="mt-1 block h-1 w-1 rounded-full bg-[var(--rams-red)] sm:hidden"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-[var(--rams-charcoal)]">
                  {formatDayLong(selectedDate)}
                </h2>
                <span className="shrink-0 text-xs text-[var(--rams-gray)]">
                  {selectedMeetings.length} meeting
                  {selectedMeetings.length === 1 ? "" : "s"}
                </span>
              </div>

              {selectedMeetings.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    title="No meetings on this day"
                    description="Pick another day, or schedule a meeting for this date."
                    action={
                      <LinkButton
                        href={`${basePath}/new?date=${dayKey(
                          selectedDate,
                        )}`}
                      >
                        Schedule for this day
                      </LinkButton>
                    }
                  />
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-black/8">
                  {selectedMeetings.map((meeting) => (
                    <li key={meeting._id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`${basePath}/${meeting._id}`}
                        className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                      >
                        <p className="text-sm font-semibold text-[var(--rams-charcoal)] hover:text-[var(--rams-red)]">
                          {meeting.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {formatTimeRange(meeting.startAt, meeting.endAt)}
                          {meeting.participants.length > 0
                            ? `, ${meeting.participants.length} participant${
                                meeting.participants.length === 1 ? "" : "s"
                              }`
                            : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
