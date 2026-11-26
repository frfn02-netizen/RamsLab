"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import MeetingHighlightBadge from "@/components/meetings-workspace/meeting-highlight-badge";
import MeetingModeBadge from "@/components/meetings-workspace/meeting-mode-badge";
import { Button, ErrorState, LinkButton } from "@/components/ui";
import { Skeleton } from "@/components/skeletons";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetingAgenda, getMeetings } from "@/lib/api/meetings";
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
import { meetingModeAriaLabel } from "@/lib/meetings/mode";
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
                          ? "bg-[#FBF8F2]"
                          : day.inMonth
                            ? "bg-white hover:bg-[#FBFAF7]"
                            : "bg-[#FBFAF7]"
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
                                  ? "text-[var(--rams-charcoal)]"
                                  : "text-[#C9C3B8]"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                        {selected && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-[var(--rams-red)]"
                            aria-hidden="true"
                          />
                        )}
                      </span>

                      <span className="mt-1.5 hidden space-y-1 sm:block">
                        {items.slice(0, 2).map((meeting) => (
                          <span
                            key={meeting._id}
                            className="flex items-center gap-1.5 rounded-md bg-[#F4F1EA] px-1.5 py-1"
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
                                  : "text-[#4B4A45]"
                              }`}
                            >
                              {formatTime(meeting.startAt)} {meeting.title}
                            </span>
                          </span>
                        ))}
                        {items.length > 2 && (
                          <span className="block px-1.5 text-[0.62rem] font-medium text-[#8A867D]">
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
              <div className="overflow-hidden rounded-lg border border-[#E7E2D8] bg-white">
                <div className="flex items-start justify-between gap-3 border-b border-[#F0ECE4] px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#8A867D]">
                      Selected day
                    </p>
                    <h2 className="mt-1 text-[0.95rem] font-semibold text-[var(--rams-charcoal)]">
                      {formatDayLong(selectedDate)}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#E7E2D8] px-2.5 py-1 text-[0.65rem] font-semibold text-[#6B6A64]">
                    {selectedMeetings.length}
                  </span>
                </div>

                {selectedMeetings.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                      No meetings on this day
                    </p>
                    <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#6B6A64]">
                      Pick another day, or schedule a meeting for this date.
                    </p>
                    {canCreate && (
                      <Link
                        href={`${basePath}/new?date=${dayKey(selectedDate)}`}
                        className="mt-4 inline-flex text-xs font-semibold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]"
                      >
                        Schedule for this day
                      </Link>
                    )}
                  </div>
                ) : (
                  <ul className="divide-y divide-[#F0ECE4]">
                    {selectedMeetings.map((meeting) => {
                      return (
                        <li key={meeting._id}>
                          {meeting.canViewDetails ? (
                            <div className="px-5 py-4 transition hover:bg-[#FBFAF7]">
                              <Link
                                href={`${basePath}/${meeting._id}`}
                                className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)]"
                              >
                                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]">
                                  {formatTimeRange(
                                    meeting.startAt,
                                    meeting.endAt,
                                  )}
                                </p>
                                <p
                                  className={`mt-1 text-sm font-semibold ${
                                    meeting.involvesHighlightedUser
                                      ? "text-[var(--rams-red)]"
                                      : "text-[var(--rams-charcoal)]"
                                  }`}
                                >
                                  {meeting.title}
                                </p>
                                <div className="mt-1.5">
                                  <MeetingHighlightBadge
                                    involvesHighlightedUser={
                                      meeting.involvesHighlightedUser
                                    }
                                  />
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                                  <MeetingModeBadge mode={meeting.mode} />
                                  {meeting.clientName !== undefined && (
                                    <span
                                      className={`text-xs ${
                                        meeting.clientName?.trim()
                                          ? "font-medium text-[#4F4B46]"
                                          : "text-[#8A867D]"
                                      }`}
                                    >
                                      {meeting.clientName?.trim() ||
                                        "Client not specified"}
                                    </span>
                                  )}
                                  {meeting.mode === "OFFLINE" && (
                                    <span className="text-xs text-[#6B6A64]">
                                      {meeting.location?.trim() ||
                                        "Location not specified"}
                                    </span>
                                  )}
                                </div>
                                {meeting.createdBy?.displayName && (
                                  <p className="mt-1 text-xs text-[#6B6A64]">
                                    {meeting.createdBy.displayName}
                                  </p>
                                )}
                                {meeting.primaryPicName && (
                                  <p className="mt-1 text-xs text-[#6B6A64]">
                                    Primary PIC: {meeting.primaryPicName}
                                    {meeting.additionalPicNames &&
                                      meeting.additionalPicNames.length > 0 &&
                                      ` +${meeting.additionalPicNames.length} additional`}
                                  </p>
                                )}
                                {meeting.status && (
                                  <p className="mt-1 text-xs font-semibold text-[var(--rams-red)]">
                                    {meetingStatusLabel(meeting.status)}
                                  </p>
                                )}
                              </Link>
                            </div>
                          ) : (
                            <div className="px-5 py-4">
                              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]">
                                {formatTimeRange(
                                  meeting.startAt,
                                  meeting.endAt,
                                )}
                              </p>
                              <p
                                className={`mt-1 text-sm font-semibold ${
                                  meeting.involvesHighlightedUser
                                    ? "text-[var(--rams-red)]"
                                    : "text-[var(--rams-charcoal)]"
                                }`}
                              >
                                {meeting.title}
                              </p>
                              <div className="mt-1.5">
                                <MeetingHighlightBadge
                                  involvesHighlightedUser={
                                    meeting.involvesHighlightedUser
                                  }
                                />
                              </div>
                              {meeting.createdBy?.displayName && (
                                <p className="mt-1 text-xs text-[#6B6A64]">
                                  {meeting.createdBy.displayName}
                                </p>
                              )}
                              {meeting.primaryPicName && (
                                <p className="mt-1 text-xs text-[#6B6A64]">
                                  Primary PIC: {meeting.primaryPicName}
                                </p>
                              )}
                              {meeting.status && (
                                <p className="mt-1 text-xs font-semibold text-[var(--rams-red)]">
                                  {meetingStatusLabel(meeting.status)}
                                </p>
                              )}
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
