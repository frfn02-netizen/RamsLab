"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import MeetingHighlightBadge from "@/components/meetings-workspace/meeting-highlight-badge";
import MeetingModeBadge from "@/components/meetings-workspace/meeting-mode-badge";
import { ErrorState } from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetingAgenda, getMeetings } from "@/lib/api/meetings";
import { assetPath } from "@/lib/asset-path";
import { meetingGreeting } from "@/lib/meetings/greeting";
import { meetingToCalendarEvent } from "@/lib/meetings/calendar-event";
import {
  buildMonthGrid,
  dayKey,
  formatMonthYear,
  formatTime,
  formatTimeRange,
  type CalendarDay,
} from "@/lib/meetings/calendar";
import {
  meetingModeAriaLabel,
  meetingModeLabel,
  type MeetingModeView,
} from "@/lib/meetings/mode";
import type { MeetingCalendarEvent } from "@/types/meetings";
import { getMeetingStatus } from "@/lib/meetings/status";
import { canCreateMeetings } from "@/lib/authz";

type Summary = {
  upcoming: MeetingCalendarEvent[];
  thisMonth: number;
  agendaCount: number;
  todayKey: string;
  monthLabel: string;
  monthDays: CalendarDay[];
  meetingsByDay: Record<string, MeetingCalendarEvent[]>;
};

const EMPTY_SUMMARY: Summary = {
  upcoming: [],
  thisMonth: 0,
  agendaCount: 0,
  todayKey: "",
  monthLabel: "",
  monthDays: [],
  meetingsByDay: {},
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatMeetingDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function meetingGroupLabel(meeting: MeetingCalendarEvent) {
  return meeting.createdBy?.displayName ?? "Lab agenda";
}

function ModeGlyph({ mode }: { mode: MeetingModeView | undefined }) {
  const shape =
    mode === undefined
      ? "rounded-full border border-dashed border-current bg-transparent"
      : mode === "ONLINE"
        ? "rounded-full border border-current bg-transparent"
        : mode === "OFFLINE"
          ? "rounded-full bg-current"
          : "rounded-[1px] bg-current";

  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 ${
        mode ? "text-[var(--rams-red)]" : "text-[#B8B1A8]"
      } ${shape}`}
      aria-hidden="true"
    />
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" />
    </svg>
  );
}

function PeopleIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2M16 6.5a2.6 2.6 0 010 5.1M17 14c2.1.4 3.5 2 3.5 4.2" />
    </svg>
  );
}

function ListIcon({ className = "h-5 w-5" }: { className?: string }) {
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
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function ExternalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 4h5v5M16 4l-7 7M14 11v4a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h4" />
    </svg>
  );
}

function heroPlaceLabel(meeting: MeetingCalendarEvent) {
  if (meeting.mode === "OFFLINE") {
    return meeting.location?.trim() || "Offline";
  }
  if (meeting.mode === "ONLINE") return meetingModeLabel(meeting.mode);
  return "Mode unavailable";
}

export default function MeetingsOverview({
  basePath = "/meetings",
  source = "agenda",
  canCreateOverride,
  intro = "Coordinate lab sessions, keep the monthly agenda in view, and follow the meetings on your agenda.",
  mineLabel = "My Meetings",
  calendarCopy = "See the monthly agenda",
  upcomingLabel = "Upcoming agenda",
  emptyAgendaLabel = "Agenda clear",
}: {
  basePath?: string;
  source?: "agenda" | "accessibles";
  canCreateOverride?: boolean;
  intro?: string;
  mineLabel?: string;
  calendarCopy?: string;
  upcomingLabel?: string;
  emptyAgendaLabel?: string;
}) {
  const { user } = useAuth();
  const canCreate =
    canCreateOverride ?? canCreateMeetings(user?.role);
  const canViewMine = user?.role === "ADMIN" || user?.role === "DOSEN";
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      const loadMeetings =
        source === "agenda"
          ? getMeetingAgenda({ limit: 200 }).then((page) => page.items)
          : getMeetings().then((items) => items.map(meetingToCalendarEvent));

      loadMeetings
        .then((data) => {
          if (cancelled) return;
          const now = new Date();
          const current = now.getTime();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

          const meetingsByDay: Record<string, MeetingCalendarEvent[]> = {};
          for (const meeting of data) {
            const key = dayKey(new Date(meeting.startAt));
            const bucket = meetingsByDay[key];
            if (bucket) bucket.push(meeting);
            else meetingsByDay[key] = [meeting];
          }
          for (const bucket of Object.values(meetingsByDay)) {
            bucket.sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            );
          }

          setSummary({
            upcoming: data
              .filter((meeting) => {
                const status =
                  meeting.status ?? getMeetingStatus(meeting, current);
                return status === "UPCOMING" || status === "ONGOING";
              })
              .sort(
                (a, b) =>
                  new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
              ),
            thisMonth: data.filter((meeting) => {
              const start = new Date(meeting.startAt).getTime();
              return (
                start >= monthStart.getTime() && start < monthEnd.getTime()
              );
            }).length,
            agendaCount: data.length,
            todayKey: dayKey(now),
            monthLabel: formatMonthYear(now),
            monthDays: buildMonthGrid(now.getFullYear(), now.getMonth()),
            meetingsByDay,
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
  }, [reloadKey, source, user?.id]);

  const [next, ...rest] = summary.upcoming;
  const agenda = rest;
  const monthMeetingDays = summary.monthDays.filter(
    (day) => day.inMonth && (summary.meetingsByDay[day.key]?.length ?? 0) > 0,
  ).length;

  return (
    <div className="min-h-full bg-[#F8F6F3]">
      <section className="px-5 pb-4 pt-6 sm:px-7 lg:px-10 lg:pb-5 lg:pt-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--rams-charcoal)] sm:text-[2.2rem]">
              {meetingGreeting(user?.fullName)}
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#6B6A64]">
              {intro}
            </p>
          </div>
          {canCreate && (
            <Link
              href={`${basePath}/new`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(181,18,27,0.16)] transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
            >
              <span
                className="text-lg font-normal leading-none"
                aria-hidden="true"
              >
                +
              </span>
              Schedule meeting
            </Link>
          )}
        </div>
      </section>

      <div className="px-5 pb-8 sm:px-7 lg:px-10 lg:pb-10">
        {error && (
          <div className="mb-6">
            <ErrorState
              message={error}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(440px,1fr)]">
          <section
            aria-labelledby="next-meeting-heading"
            aria-busy={loading}
            className="relative min-h-[13.5rem] overflow-hidden rounded-xl bg-[#25272C] text-white shadow-[0_12px_30px_rgba(31,35,40,0.08)]"
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(37,39,44,0.98) 0%, rgba(37,39,44,0.92) 44%, rgba(37,39,44,0.48) 100%), url("${assetPath("/assets/upscalemedia-transformed.jpeg")}")`,
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-y-0 right-0 w-[22%] bg-[var(--rams-red)] [clip-path:polygon(55%_0,100%_0,100%_100%,0_100%)]"
              aria-hidden="true"
            />

            {loading ? (
              <div className="relative z-10 flex min-h-[13.5rem] flex-col justify-between px-5 py-5 sm:px-7 lg:px-8">
                <div className="space-y-4">
                  <div className="h-3 w-28 rounded bg-white/15" />
                  <div className="h-9 max-w-md rounded bg-white/15" />
                  <div className="h-4 max-w-2xl rounded bg-white/10" />
                </div>
                <div className="h-10 w-44 rounded bg-white/10" />
              </div>
            ) : next ? (
              <article className="relative z-10 flex min-h-[13.5rem] flex-col justify-between gap-5 px-5 py-5 sm:px-7 lg:px-8">
                <div className="min-w-0">
                  <p
                    id="next-meeting-heading"
                    className="flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#F1B9BB]"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-[var(--rams-red-on-dark)]" />
                    Next meeting
                  </p>
                  <h2
                    className={`mt-2 max-w-3xl font-display text-[1.7rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2rem] ${
                      next.involvesHighlightedUser
                        ? "text-[#FFB4B8]"
                        : "text-white"
                    }`}
                  >
                    {next.title}
                  </h2>

                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/15 pt-4 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="min-w-0">
                      <dt className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#B7B0A9]">
                        Date
                      </dt>
                      <dd className="mt-1 text-[0.78rem] font-medium leading-5 text-[#F1EDE9]">
                        {formatMeetingDate(next.startAt)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#B7B0A9]">
                        Time
                      </dt>
                      <dd className="mt-1 text-[0.78rem] font-medium leading-5 tabular-nums text-[#F1EDE9]">
                        {formatTimeRange(next.startAt, next.endAt)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#B7B0A9]">
                        PIC
                      </dt>
                      <dd className="mt-1 truncate text-[0.78rem] font-medium leading-5 text-[#F1EDE9]">
                        {meetingGroupLabel(next)}
                      </dd>
                    </div>
                    {next.canViewDetails && (
                      <>
                        <div className="min-w-0">
                          <dt className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#B7B0A9]">
                            Location / mode
                          </dt>
                          <dd className="mt-1 truncate text-[0.78rem] font-medium leading-5 text-[#F1EDE9]">
                            {heroPlaceLabel(next)}
                          </dd>
                        </div>
                        {next.clientName?.trim() && (
                          <div className="min-w-0">
                            <dt className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#B7B0A9]">
                              Client
                            </dt>
                            <dd className="mt-1 truncate text-[0.78rem] font-medium leading-5 text-[#F1EDE9]">
                              {next.clientName}
                            </dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>

                  {next.canViewDetails && next.involvesHighlightedUser && (
                    <div className="mt-3">
                      <MeetingHighlightBadge
                        involvesHighlightedUser={next.involvesHighlightedUser}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link
                    href={`${basePath}/${next._id}`}
                    aria-label="Open meeting"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--rams-red)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#25272C]"
                  >
                    View details
                    <ArrowIcon />
                  </Link>
                  <Link
                    href={`${basePath}/calendar`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/35 px-4 py-2 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#25272C]"
                  >
                    Open in calendar
                    <ExternalIcon />
                  </Link>
                </div>
              </article>
            ) : (
              <div className="relative z-10 flex min-h-[13.5rem] flex-col justify-center px-5 py-6 sm:px-7 lg:px-8">
                <p
                  id="next-meeting-heading"
                  className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#F1B9BB]"
                >
                  Next meeting
                </p>
                <h2 className="mt-2 font-display text-[1.7rem] font-semibold tracking-[-0.02em] text-white">
                  No upcoming meetings
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#C9C1BA]">
                  The agenda is clear. Schedule a session or use the calendar to
                  choose a date.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {canCreate && (
                    <Link
                      href={`${basePath}/new`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 py-2 text-xs font-semibold text-[#272421] transition hover:bg-[#F3ECE2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#25272C]"
                    >
                      Schedule meeting
                    </Link>
                  )}
                  <Link
                    href={`${basePath}/calendar`}
                    className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/35 px-4 py-2 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#25272C]"
                  >
                    Open calendar
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section
            aria-label="Meeting summary"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-1 2xl:grid-rows-2 2xl:gap-4"
          >
            <article className="flex items-center gap-4 rounded-xl border border-[#E4DFD8] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(31,35,40,0.035)] 2xl:min-h-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FBF1F1] text-[var(--rams-red)]">
                <CalendarIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[1.85rem] font-semibold leading-none tracking-[-0.04em] text-[var(--rams-charcoal)]">
                  {loading ? "…" : summary.thisMonth}
                </p>
                <p className="mt-1 text-[0.76rem] font-semibold leading-5 text-[#6B6A64]">
                  Meetings this month
                </p>
              </div>
            </article>

            <article className="flex items-center gap-4 rounded-xl border border-[#E4DFD8] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(31,35,40,0.035)] 2xl:min-h-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F3F1EC] text-[#6B6A64]">
                <PeopleIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-[1.85rem] font-semibold leading-none tracking-[-0.04em] text-[var(--rams-charcoal)]">
                  {loading ? "…" : summary.upcoming.length}
                </p>
                <p className="mt-1 text-[0.76rem] font-semibold leading-5 text-[#6B6A64]">
                  Still upcoming
                </p>
              </div>
            </article>
          </section>
        </div>

        <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_minmax(390px,0.95fr)]">
          <section
            aria-labelledby="month-calendar-heading"
            className="min-w-0 overflow-hidden rounded-xl border border-[#E4DFD8] bg-white shadow-[0_8px_20px_rgba(31,35,40,0.025)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEAE4] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="text-[var(--rams-red)]">
                  <CalendarIcon className="h-6 w-6" />
                </span>
                <h2
                  id="month-calendar-heading"
                  className="font-display text-[1.12rem] font-semibold tracking-[-0.02em] text-[var(--rams-charcoal)]"
                >
                  {summary.monthLabel || "This month"}
                </h2>
                <span className="text-[0.72rem] tabular-nums text-[#8A867D]">
                  {loading ? "" : `${summary.thisMonth} scheduled`}
                </span>
              </div>
              <Link
                href={`${basePath}/calendar`}
                className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--rams-red)] underline-offset-4 transition hover:underline"
              >
                View full calendar
                <ArrowIcon />
              </Link>
            </div>

            <div className="grid grid-cols-7 border-b border-[#EEEAE4] bg-[#FBFAF8]">
              {WEEKDAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="py-2.5 text-center text-[0.56rem] font-bold uppercase tracking-[0.12em] text-[#7D7972]"
                >
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.slice(0, 1)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-[#EEEAE4]">
              {loading
                ? Array.from({ length: 42 }).map((_, index) => (
                    <div key={index} className="min-h-[5.4rem] bg-white" />
                  ))
                : summary.monthDays.map((day) => {
                    const dayMeetings = summary.meetingsByDay[day.key] ?? [];
                    const isToday = day.key === summary.todayKey;
                    return (
                      <div
                        key={day.key}
                        className={`min-h-[5.4rem] bg-white p-1.5 sm:min-h-[5.8rem] sm:p-2 ${
                          day.inMonth ? "" : "bg-[#FBFAF8]"
                        }`}
                      >
                        <span
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[0.66rem] font-semibold tabular-nums ${
                            isToday
                              ? "bg-[var(--rams-red)] text-white"
                              : day.inMonth
                                ? "text-[#4B4A45]"
                                : "text-[#C9C3B8]"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>

                        <div className="mt-1 space-y-1">
                          {dayMeetings.slice(0, 2).map((meeting) => (
                            <Link
                              key={meeting._id}
                              href={`${basePath}/${meeting._id}`}
                              className="flex items-center gap-1 truncate rounded bg-[#F5F0EB] px-1.5 py-0.5 text-[0.55rem] font-medium leading-4 text-[#4B4A45] transition hover:bg-[#EDE4DA]"
                            >
                              {meeting.canViewDetails ? (
                                <>
                                  <ModeGlyph mode={meeting.mode} />
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
                                className={`truncate ${
                                  meeting.involvesHighlightedUser
                                    ? "text-[var(--rams-red)]"
                                    : ""
                                }`}
                              >
                                {formatTime(meeting.startAt)} {meeting.title}
                              </span>
                            </Link>
                          ))}
                          {dayMeetings.length > 2 && (
                            <span className="block px-1 text-[0.56rem] text-[#A8A399]">
                              +{dayMeetings.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>

            <div className="flex items-center justify-between px-5 py-3 text-[0.62rem] text-[#A8A399] sm:px-6">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--rams-red)]"
                  aria-hidden="true"
                />
                Scheduled meeting
              </span>
              <span className="tabular-nums">
                {loading ? "" : `${summary.thisMonth} this month`}
              </span>
            </div>
          </section>

          <aside className="min-w-0 space-y-6" aria-label="Workspace shortcuts">
            <section className="overflow-hidden rounded-xl border border-[#E4DFD8] bg-white shadow-[0_8px_20px_rgba(31,35,40,0.025)]">
              <div className="flex items-center justify-between gap-3 border-b border-[#EEEAE4] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--rams-red)]">
                    <ListIcon className="h-6 w-6" />
                  </span>
                  <h2 className="font-display text-[1.12rem] font-semibold tracking-[-0.02em] text-[var(--rams-charcoal)]">
                    {upcomingLabel}
                  </h2>
                </div>
                {canViewMine && (
                  <Link
                    href={`${basePath}/mine`}
                    className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--rams-red)] underline-offset-4 transition hover:underline"
                  >
                    View all
                    <ArrowIcon />
                  </Link>
                )}
              </div>

              {loading ? (
                <div className="space-y-3 px-5 py-5 sm:px-6">
                  <div className="h-14 rounded-md bg-[#F5F0EB]" />
                  <div className="h-14 rounded-md bg-[#F5F0EB]" />
                </div>
              ) : agenda.length > 0 ? (
                <div>
                  {agenda.slice(0, 5).map((meeting) => {
                    const startsAt = new Date(meeting.startAt);
                    const weekday = startsAt.toLocaleDateString(undefined, {
                      weekday: "short",
                    });
                    const dayLabel = startsAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <Link
                        key={meeting._id}
                        href={`${basePath}/${meeting._id}`}
                        className="group flex items-start gap-3.5 border-b border-[#EEEAE4] px-5 py-4 last:border-b-0 hover:bg-[#FBFAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)] sm:px-6"
                      >
                        <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-[#FBFAF8] px-2 py-2 ring-1 ring-inset ring-[#EEEAE4]">
                          <span className="text-[0.54rem] font-bold uppercase tracking-[0.12em] text-[#8A867D]">
                            {weekday}
                          </span>
                          <span className="mt-0.5 font-display text-[1rem] font-semibold leading-none text-[var(--rams-charcoal)]">
                            {dayLabel}
                          </span>
                          <span className="mt-1 text-[0.62rem] font-semibold tabular-nums text-[#6B6A64]">
                            {formatTime(meeting.startAt)}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">
                          <span
                            className={`block text-[0.84rem] font-semibold leading-5 ${
                              meeting.involvesHighlightedUser
                                ? "text-[var(--rams-red)]"
                                : "text-[var(--rams-charcoal)]"
                            }`}
                          >
                            {meeting.title}
                          </span>
                          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.65rem] text-[#7D7972]">
                            <span className="inline-flex items-center gap-1">
                              <PeopleIcon className="h-3.5 w-3.5 shrink-0" />
                              {meetingGroupLabel(meeting)}
                            </span>
                            {meeting.canViewDetails && (
                              <>
                                <MeetingModeBadge mode={meeting.mode} />
                                {meeting.clientName?.trim() && (
                                  <span className="truncate">
                                    {meeting.clientName}
                                  </span>
                                )}
                                {meeting.mode === "OFFLINE" &&
                                  meeting.location?.trim() && (
                                    <span className="truncate">
                                      {meeting.location}
                                    </span>
                                  )}
                                <MeetingHighlightBadge
                                  involvesHighlightedUser={
                                    meeting.involvesHighlightedUser
                                  }
                                />
                              </>
                            )}
                          </span>
                        </span>
                        <span
                          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A8A399] transition group-hover:bg-white group-hover:text-[var(--rams-red)]"
                          aria-hidden="true"
                        >
                          <ArrowIcon className="h-4 w-4" />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-7 sm:px-6">
                  <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                    {next ? "No later meetings" : emptyAgendaLabel}
                  </p>
                  <p className="mt-1.5 text-[0.7rem] leading-5 text-[#6B6A64]">
                    {next
                      ? "The featured session is the only meeting ahead."
                      : "Use the calendar to choose a date for the next session."}
                  </p>
                </div>
              )}
            </section>

            <section
              aria-label="Quick access"
              className={`grid gap-3 ${canViewMine ? "sm:grid-cols-2" : ""}`}
            >
              <Link
                href={`${basePath}/calendar`}
                aria-label="Open monthly calendar"
                className="group flex min-h-[5.5rem] items-center gap-4 rounded-xl border border-[#E4DFD8] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(31,35,40,0.025)] transition hover:border-[#D6CEC4] hover:bg-[#FBFAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FBF1F1] text-[var(--rams-red)]">
                  <CalendarIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[var(--rams-charcoal)]">
                    Open calendar
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] leading-5 text-[#6B6A64]">
                    {calendarCopy}
                  </span>
                </span>
                <ArrowIcon className="h-4 w-4 shrink-0 text-[#A8A399] transition group-hover:translate-x-0.5 group-hover:text-[var(--rams-red)]" />
              </Link>
              {canViewMine && (
                <Link
                  href={`${basePath}/mine`}
                  aria-label={mineLabel}
                  className="group flex min-h-[5.5rem] items-center gap-4 rounded-xl border border-[#E4DFD8] bg-white px-5 py-4 shadow-[0_8px_20px_rgba(31,35,40,0.025)] transition hover:border-[#D6CEC4] hover:bg-[#FBFAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3F1EC] text-[#6B6A64]">
                    <PeopleIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--rams-charcoal)]">
                      {mineLabel}
                    </span>
                    <span className="mt-0.5 block text-[0.7rem] leading-5 text-[#6B6A64]">
                      Your meetings and participation
                    </span>
                  </span>
                  <ArrowIcon className="h-4 w-4 shrink-0 text-[#A8A399] transition group-hover:translate-x-0.5 group-hover:text-[var(--rams-red)]" />
                </Link>
              )}
            </section>
          </aside>
        </div>

        <div className="mt-5 text-right text-[0.62rem] text-[#A8A399]">
          {loading
            ? ""
            : `${monthMeetingDays} active day${monthMeetingDays === 1 ? "" : "s"} this month`}
        </div>
      </div>
    </div>
  );
}
