"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import MeetingHighlightBadge from "@/components/meetings-workspace/meeting-highlight-badge";
import { Button, ErrorState, LinkButton } from "@/components/ui";
import { Skeleton } from "@/components/skeletons";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetingAgenda, getMeetings } from "@/lib/api/meetings";
import {
  buildMonthGrid,
  dayKey,
  formatDayLong,
  formatDurationCompact,
  formatMonthYear,
  formatTime,
  groupByDay,
  isSameDay,
  monthVisibleRange,
  startOfDay,
} from "@/lib/meetings/calendar";
import { meetingModeAriaLabel, meetingModeLabel } from "@/lib/meetings/mode";
import { meetingToCalendarEvent } from "@/lib/meetings/calendar-event";
import { canCreateMeetings } from "@/lib/authz";
import { meetingStatusLabel } from "@/lib/meetings/status";
import type { MeetingCalendarEvent } from "@/types/meetings";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarModeMarker({ mode }: { mode: MeetingCalendarEvent["mode"] }) {
  const shape =
    mode === undefined
      ? "rounded-full border border-dashed border-[#8A867D] bg-transparent"
      : mode === "ONLINE"
        ? "rounded-full border border-[var(--rams-red)] bg-white"
        : mode === "OFFLINE"
          ? "rounded-full bg-[var(--rams-red)]"
          : "rounded-[1px] bg-[#B8B1A8]";

  return (
    <span className={`h-1.5 w-1.5 shrink-0 ${shape}`} aria-hidden="true" />
  );
}

function CalendarSkeleton() {
  return (
    <div className="rounded-lg border border-[#E7E2D8] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-52" />
      </div>
      <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-[#EDE8DE]">
        {Array.from({ length: 42 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-none bg-white" />
        ))}
      </div>
    </div>
  );
}

export default function MeetingsPage({
  basePath = "/dashboard/meetings",
  title = "Meetings",
  description = "Schedule and review internal lab meetings. Select a day to see its agenda.",
  source = "agenda",
  canCreateOverride,
}: {
  basePath?: string;
  title?: string;
  description?: string;
  source?: "agenda" | "accessibles";
  canCreateOverride?: boolean;
}) {
  const { user } = useAuth();
  const canCreate =
    canCreateOverride ?? canCreateMeetings(user?.role);
  const [cursor, setCursor] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );
  const [meetings, setMeetings] = useState<MeetingCalendarEvent[]>([]);
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

      const loadMeetings =
        source === "agenda"
          ? getMeetingAgenda({
              from: from.toISOString(),
              to: to.toISOString(),
            }).then((data) => data.items)
          : getMeetings({
              from: from.toISOString(),
              to: to.toISOString(),
            }).then((items) => items.map(meetingToCalendarEvent));

      loadMeetings
        .then((items) => {
          if (!cancelled) setMeetings(items);
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
  }, [cursor, reloadKey, source]);

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
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1560px]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-[var(--rams-charcoal)] sm:text-[2rem]">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6B6A64]">
              {description}
            </p>
          </div>
          {canCreate && (
            <div className="shrink-0 sm:pb-1">
              <LinkButton href={`${basePath}/new?date=${dayKey(selectedDate)}`}>
                Schedule meeting
              </LinkButton>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6">
            <ErrorState
              message={error}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <CalendarSkeleton />
            <div className="rounded-lg border border-[#E7E2D8] bg-white p-4">
              <Skeleton className="h-5 w-48" />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section
              aria-label="Month calendar"
              className="min-w-0 overflow-hidden rounded-lg border border-[#E7E2D8] bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0ECE4] px-5 py-4">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--rams-charcoal)]">
                    {formatMonthYear(cursor)}
                  </h2>
                  <span className="text-xs font-medium text-[#8A867D]">
                    {meetings.length} meeting
                    {meetings.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Show previous month"
                    onClick={() => shiftMonth(-1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E2D8] text-[#6B6A64] transition hover:border-[var(--rams-red)]/40 hover:text-[var(--rams-red)]"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M12 5l-5 5 5 5" />
                    </svg>
                  </button>
                  <Button
                    variant="secondary"
                    className="min-h-8 px-3 py-1 text-xs"
                    onClick={goToToday}
                  >
                    Today
                  </Button>
                  <button
                    type="button"
                    aria-label="Show next month"
                    onClick={() => shiftMonth(1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E2D8] text-[#6B6A64] transition hover:border-[var(--rams-red)]/40 hover:text-[var(--rams-red)]"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M8 5l5 5-5 5" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-b border-[#F0ECE4] bg-[#FBFAF7]">
                {WEEKDAYS.map((weekday) => (
                  <div
                    key={weekday}
                    className="py-2 text-center text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#8A867D]"
                  >
                    <span className="hidden sm:inline">{weekday}</span>
                    <span className="sm:hidden">{weekday.slice(0, 1)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px bg-[#EDE8DE]">
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
                      className={`min-h-[5.5rem] p-1.5 text-left align-top transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)] sm:min-h-[6.5rem] sm:p-2 ${
                        selected
                          ? "bg-[#FDF6F1] ring-1 ring-inset ring-[var(--rams-red)]/35"
                          : day.inMonth
                            ? "bg-white hover:bg-[#FBFAF7]"
                            : "bg-stone-50"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.72rem] font-semibold ${
                            isToday
                              ? "bg-[var(--rams-red)] text-white"
                              : selected
                                ? "text-[var(--rams-red)]"
                                : day.inMonth
                                  ? "text-stone-900"
                                  : "text-stone-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {selected && (
                          <span
                            className="h-2 w-2 rounded-full bg-[var(--rams-red)]"
                            aria-hidden="true"
                          />
                        )}
                      </span>

                      <span className="mt-1.5 hidden space-y-1 sm:block">
                        {items.slice(0, 2).map((meeting) => (
                          <span
                            key={meeting._id}
                            className="flex items-center gap-1.5 rounded-md border border-stone-200/80 bg-white px-1.5 py-1"
                          >
                            {meeting.canViewDetails ? (
                              <>
                                <CalendarModeMarker mode={meeting.mode} />
                                <span className="sr-only">
                                  {meetingModeAriaLabel(meeting.mode)}{" "}
                                </span>
                              </>
                            ) : (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8B1A8]"
                                aria-hidden="true"
                              />
                            )}
                            <span
                              className={`truncate text-[0.64rem] font-medium leading-4 ${
                                meeting.involvesHighlightedUser
                                  ? "text-[var(--rams-red)]"
                                  : "text-stone-700"
                              }`}
                            >
                              {formatTime(meeting.startAt)} {meeting.title}
                            </span>
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="block px-1.5 text-[0.62rem] font-medium text-stone-500">
                            +{items.length - 2} more
                          </span>
                        )}
                      </span>

                      {items.length > 0 && (
                        <span className="mt-1.5 flex gap-0.5 sm:hidden">
                          {items.slice(0, 3).map((meeting) => (
                            <span
                              key={meeting._id}
                              className="h-1 w-1 rounded-full bg-[var(--rams-red)]"
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                <div className="flex items-baseline justify-between gap-3 border-b border-stone-200/80 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Selected day
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold tracking-tight text-stone-900">
                      {formatDayLong(selectedDate)}
                    </h2>
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-stone-500">
                    {selectedMeetings.length}
                  </span>
                </div>

                {selectedMeetings.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs text-stone-500">
                    <p>No meetings on this day.</p>
                    {canCreate && (
                      <Link
                        href={`${basePath}/new?date=${dayKey(selectedDate)}`}
                        className="mt-3 inline-flex font-semibold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]"
                      >
                        Schedule for this day
                      </Link>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {selectedMeetings.map((meeting) => {
                      const inactive =
                        meeting.status === "PAST" ||
                        meeting.status === "CANCELLED";
                      const statusDot = inactive
                        ? "bg-stone-300"
                        : "bg-red-700";
                      const statusText = inactive
                        ? "text-stone-500"
                        : "text-red-700";
                      const duration = formatDurationCompact(
                        meeting.startAt,
                        meeting.endAt,
                      );

                      return (
                        <li key={meeting._id}>
                          {meeting.canViewDetails ? (
                            <Link
                              href={`${basePath}/${meeting._id}`}
                              className="group grid grid-cols-[5.5rem_1fr_auto] items-start gap-3.5 px-5 py-4 transition-colors hover:bg-stone-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)]"
                            >
                              <div className="border-r border-stone-200/80 pr-3 tabular-nums">
                                <p className="text-xs font-semibold leading-tight text-stone-900">
                                  {formatTime(meeting.startAt)}
                                </p>
                                <p className="mt-0.5 text-[11px] font-medium leading-tight text-stone-500">
                                  – {formatTime(meeting.endAt)}
                                </p>
                                {duration && (
                                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-500">
                                    {duration}
                                  </p>
                                )}
                              </div>

                              <div className="min-w-0">
                                {meeting.status && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                                      aria-hidden="true"
                                    />
                                    <span
                                      className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${statusText}`}
                                    >
                                      {meetingStatusLabel(meeting.status)}
                                    </span>
                                  </span>
                                )}

                                <p
                                  className={`mt-1 text-[15px] font-semibold leading-snug transition-colors ${
                                    meeting.involvesHighlightedUser
                                      ? "text-[var(--rams-red)]"
                                      : "text-stone-900 group-hover:text-red-700"
                                  }`}
                                >
                                  {meeting.title}
                                </p>

                                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                                  Client:{" "}
                                  <strong className="font-bold text-stone-900">
                                    {meeting.clientName?.trim() ||
                                      "Client not specified"}
                                  </strong>
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                                  <span
                                    aria-label={meetingModeAriaLabel(
                                      meeting.mode,
                                    )}
                                  >
                                    {meetingModeLabel(meeting.mode)}
                                  </span>
                                  {meeting.mode === "OFFLINE" &&
                                    meeting.location?.trim() && (
                                      <>
                                        <span aria-hidden="true"> · </span>
                                        <span>{meeting.location}</span>
                                      </>
                                    )}
                                  {meeting.primaryPicName && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span>
                                        PIC {meeting.primaryPicName}
                                        {meeting.additionalPicNames &&
                                          meeting.additionalPicNames.length >
                                            0 &&
                                          ` +${meeting.additionalPicNames.length}`}
                                      </span>
                                    </>
                                  )}
                                </p>

                                <div className="mt-1.5">
                                  <MeetingHighlightBadge
                                    involvesHighlightedUser={
                                      meeting.involvesHighlightedUser
                                    }
                                  />
                                </div>
                              </div>

                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mt-4 h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-600"
                                aria-hidden="true"
                              >
                                <path d="m8 5 5 5-5 5" />
                              </svg>
                            </Link>
                          ) : (
                            <div className="grid grid-cols-[5.5rem_1fr] items-start gap-3.5 px-5 py-4">
                              <div className="border-r border-stone-200/80 pr-3 tabular-nums">
                                <p className="text-xs font-semibold leading-tight text-stone-900">
                                  {formatTime(meeting.startAt)}
                                </p>
                                <p className="mt-0.5 text-[11px] font-medium leading-tight text-stone-500">
                                  – {formatTime(meeting.endAt)}
                                </p>
                                {duration && (
                                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-stone-500">
                                    {duration}
                                  </p>
                                )}
                              </div>

                              <div className="min-w-0">
                                {meeting.status && (
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                                      aria-hidden="true"
                                    />
                                    <span
                                      className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${statusText}`}
                                    >
                                      {meetingStatusLabel(meeting.status)}
                                    </span>
                                  </span>
                                )}
                                <p className="mt-1 text-[15px] font-semibold leading-snug text-stone-900">
                                  {meeting.title}
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                                  Details are not shared for this meeting.
                                </p>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
