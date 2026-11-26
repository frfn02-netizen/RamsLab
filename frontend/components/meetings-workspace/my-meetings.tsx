"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import MeetingHighlightBadge from "@/components/meetings-workspace/meeting-highlight-badge";
import MeetingModeBadge from "@/components/meetings-workspace/meeting-mode-badge";
import { SkeletonLines } from "@/components/skeletons";
import { ErrorState } from "@/components/ui";
import CustomSelect from "@/components/ui/custom-select";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetings } from "@/lib/api/meetings";
import { assetPath } from "@/lib/asset-path";
import { canCreateMeetings } from "@/lib/authz";
import { formatTimeRange } from "@/lib/meetings/calendar";
import { meetingModeLabel, safeHttpUrl } from "@/lib/meetings/mode";
import { getMeetingStatus, meetingStatusLabel } from "@/lib/meetings/status";
import type { Meeting, MeetingStatus } from "@/types/meetings";

const PAST_LIMIT = 10;

type MeetingGroup = {
  all: Meeting[];
  upcoming: Meeting[];
  ongoing: Meeting[];
  past: Meeting[];
  cancelled: Meeting[];
};

type TimeFilter = "all" | "month" | "next30";

function Icon({
  path,
  className = "h-5 w-5",
}: {
  path: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  calendar:
    "M4 4.5h12a1 1 0 011 1V16a1 1 0 01-1 1H4a1 1 0 01-1-1V5.5a1 1 0 011-1zM6 2.5v3M14 2.5v3M3 8.5h14M7 12h.01M10 12h.01M13 12h.01",
  clock: "M10 17a7 7 0 100-14 7 7 0 000 14zm0-11v4l2.5 1.5",
  location:
    "M10 17.5s5.5-4.6 5.5-8.5a5.5 5.5 0 10-11 0c0 3.9 5.5 8.5 5.5 8.5zm0-6.3a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4",
  filter: "M3 4h14l-5.5 6.2V15l-3 1v-5.8L3 4z",
  history: "M4 10a6 6 0 106 6M4 5v5h5M10 6v4l2.5 1.5",
  layers: "M10 3l7 3.5-7 3.5-7-3.5L10 3zm-7 7 7 3.5 7-3.5M3 13.5l7 3.5 7-3.5",
  people:
    "M7.5 9.5a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5zM2.5 17c0-2.4 2.24-4.25 5-4.25s5 1.85 5 4.25M13.5 5.5a2.5 2.5 0 010 4.7M15 12.8c1.55.7 2.5 2.05 2.5 4.2",
  search: "M8.75 14.5a5.75 5.75 0 100-11.5 5.75 5.75 0 000 11.5zM13 13l4 4",
  arrow: "M4 10h11M11 6l4 4-4 4",
  chevron: "M7.5 5l5 5-5 5",
};

function formatDateParts(value: string) {
  const date = new Date(value);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" })
      .format(date)
      .toUpperCase(),
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat("en-US", { month: "short" })
      .format(date)
      .toUpperCase(),
  };
}

function participantCount(meeting: Meeting) {
  return Math.max(meeting.participants.length, meeting.participantIds.length);
}

function participantLabel(meeting: Meeting) {
  const count = participantCount(meeting);
  return `${count} participant${count === 1 ? "" : "s"}`;
}

function matchesSearch(meeting: Meeting, query: string) {
  if (!query.trim()) return true;
  const haystack = [
    meeting.title,
    meeting.description,
    meeting.clientName ?? "",
    meetingModeLabel(meeting.mode),
    meeting.location ?? "",
    meeting.createdBy?.email ?? "",
    ...meeting.participants.map((participant) => participant.email),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

function matchesTimeFilter(meeting: Meeting, filter: TimeFilter) {
  if (filter === "all") return true;

  const start = new Date(meeting.startAt).getTime();
  const now = new Date();

  if (filter === "month") {
    return (
      new Date(meeting.startAt).getFullYear() === now.getFullYear() &&
      new Date(meeting.startAt).getMonth() === now.getMonth()
    );
  }

  const end = now.getTime() + 30 * 24 * 60 * 60 * 1000;
  return start >= now.getTime() && start <= end;
}

function DateChip({
  value,
  muted = false,
}: {
  value: string;
  muted?: boolean;
}) {
  const date = formatDateParts(value);

  return (
    <span
      className={`flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-xl border text-center ${
        muted
          ? "border-[#F0ECE4] bg-[#FBFAF7] text-[#55534F]"
          : "border-[#F9D9D5] bg-[#FFF8F6] text-[var(--rams-red)]"
      }`}
    >
      <span className="text-[0.61rem] font-bold tracking-[0.1em]">
        {date.weekday}
      </span>
      <span className="mt-0.5 text-[1.4rem] font-semibold leading-none tracking-[-0.04em]">
        {date.day}
      </span>
      <span className="mt-1 text-[0.6rem] font-bold tracking-[0.1em]">
        {date.month}
      </span>
    </span>
  );
}

function ScheduleStatusPill({ status }: { status: MeetingStatus }) {
  const tone =
    status === "CANCELLED"
      ? "bg-[#FBE4E2] text-[#9F2925]"
      : status === "PAST"
        ? "bg-[#F1F0EE] text-[#69645E]"
        : status === "ONGOING"
          ? "bg-[#FFF3D9] text-[#94631A]"
          : "bg-[#EAF3E8] text-[#356B35]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[0.72rem] font-semibold ${tone}`}
    >
      {meetingStatusLabel(status)}
    </span>
  );
}

function MeetingRow({
  meeting,
  featured = false,
  basePath = "/meetings",
}: {
  meeting: Meeting;
  featured?: boolean;
  basePath?: string;
}) {
  const detailHref = `${basePath}/${meeting._id}`;
  const mode = meeting.mode ?? null;
  const clientName = meeting.clientName?.trim() || null;
  const location = meeting.location?.trim() || null;
  const onlineUrl = mode === "ONLINE" ? safeHttpUrl(meeting.meetingLink) : null;
  const status = getMeetingStatus(meeting);

  return (
    <article
      className={`flex flex-col gap-4 border-b border-[#E9E3DC] px-5 py-4 transition last:border-b-0 sm:flex-row sm:items-center sm:gap-5 sm:px-6 ${
        featured ? "bg-[#FFF3F1]" : "bg-white hover:bg-[#FCFBF9]"
      }`}
    >
      <Link
        href={detailHref}
        aria-label={`Open ${meeting.title}`}
        className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
      >
        <DateChip value={meeting.startAt} muted={!featured} />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={detailHref}
          className={`block truncate text-[1.05rem] font-semibold tracking-[-0.02em] ${
            meeting.involvesHighlightedUser
              ? "text-[var(--rams-red)]"
              : "text-[#15171C]"
          } hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]`}
        >
          {meeting.title}
        </Link>
        <div className="mt-1.5">
          <MeetingHighlightBadge
            involvesHighlightedUser={meeting.involvesHighlightedUser}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.76rem] text-[#55534F]">
          <span
            className={
              clientName ? "font-medium text-[#24262B]" : "text-[#77736D]"
            }
          >
            {clientName ?? "Client not specified"}
          </span>
          <MeetingModeBadge mode={mode} />
          {mode === "OFFLINE" && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Icon
                path={ICONS.location}
                className="h-4 w-4 shrink-0 text-[#55534F]"
              />
              <span className="truncate">
                {location ?? "Location not specified"}
              </span>
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.78rem] text-[#55534F]">
          <span className="inline-flex items-center gap-1.5">
            <Icon path={ICONS.clock} className="h-4 w-4 text-[#55534F]" />
            {formatTimeRange(meeting.startAt, meeting.endAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon path={ICONS.people} className="h-4 w-4 text-[#55534F]" />
            {participantLabel(meeting)}
          </span>
          <ScheduleStatusPill status={status} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:ml-auto">
        {onlineUrl ? (
          <a
            href={onlineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2 ${
              featured
                ? "bg-[var(--rams-red)] text-white hover:bg-[var(--rams-red-dark)]"
                : "border border-[#DED6CD] bg-white text-[#22242A] hover:border-[#C8BDB3] hover:bg-[#FCFBF9]"
            }`}
          >
            {featured && <Icon path={ICONS.arrow} className="h-4 w-4" />}
            {featured ? "Join meeting" : "Join online"}
          </a>
        ) : (
          <Link
            href={detailHref}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2 ${
              featured
                ? "bg-[var(--rams-red)] text-white hover:bg-[var(--rams-red-dark)]"
                : "border border-[#DED6CD] bg-white text-[#22242A] hover:border-[#C8BDB3] hover:bg-[#FCFBF9]"
            }`}
          >
            View details
          </Link>
        )}
      </div>
    </article>
  );
}

function PastMeetingRow({
  meeting,
  basePath = "/meetings",
}: {
  meeting: Meeting;
  basePath?: string;
}) {
  const status = getMeetingStatus(meeting);
  const mode = meeting.mode ?? null;
  const clientName = meeting.clientName?.trim() || null;
  const location = meeting.location?.trim() || null;
  return (
    <Link
      href={`${basePath}/${meeting._id}`}
      className="flex flex-col gap-4 border-b border-[#E9E3DC] bg-white px-5 py-4 transition last:border-b-0 hover:bg-[#FCFBF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)] sm:flex-row sm:items-center sm:gap-5 sm:px-6"
    >
      <DateChip value={meeting.startAt} muted />
      <div className="min-w-0 flex-1">
        <span
          className={`block truncate text-[1rem] font-semibold tracking-[-0.02em] ${
            meeting.involvesHighlightedUser
              ? "text-[var(--rams-red)]"
              : "text-[#24262B]"
          }`}
        >
          {meeting.title}
        </span>
        <span className="mt-1.5 block">
          <MeetingHighlightBadge
            involvesHighlightedUser={meeting.involvesHighlightedUser}
          />
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.76rem] text-[#55534F]">
          <span
            className={
              clientName ? "font-medium text-[#24262B]" : "text-[#77736D]"
            }
          >
            {clientName ?? "Client not specified"}
          </span>
          <MeetingModeBadge mode={mode} />
          {mode === "OFFLINE" && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Icon
                path={ICONS.location}
                className="h-4 w-4 shrink-0 text-[#55534F]"
              />
              <span className="truncate">
                {location ?? "Location not specified"}
              </span>
            </span>
          )}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.78rem] text-[#55534F]">
          <span className="inline-flex items-center gap-1.5">
            <Icon path={ICONS.clock} className="h-4 w-4" />
            {formatTimeRange(meeting.startAt, meeting.endAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon path={ICONS.people} className="h-4 w-4" />
            {participantLabel(meeting)}
          </span>
        </span>
      </div>
      <ScheduleStatusPill status={status} />
      <Icon
        path={ICONS.chevron}
        className="hidden h-5 w-5 shrink-0 text-[#77736D] sm:block"
      />
    </Link>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: string;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#E5DED5] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(46,38,31,0.025)] sm:px-6">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FFF0ED] text-[var(--rams-red)]">
          <Icon path={icon} className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="text-[0.88rem] font-medium text-[#393A3E]">{label}</p>
          <p className="mt-0.5 text-[2rem] font-semibold leading-none tracking-[-0.05em] text-[#14161B]">
            {value}
          </p>
          <p className="mt-1 text-[0.78rem] text-[#55534F]">{detail}</p>
        </div>
      </div>
      <span className="mt-5 block h-0.5 w-12 rounded-full bg-[var(--rams-red)]" />
    </div>
  );
}

function EmptyMeetings({
  title,
  description,
  action = false,
  basePath = "/meetings",
}: {
  title: string;
  description: string;
  action?: boolean;
  basePath?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#DDD5CC] bg-white px-5 py-10 text-center">
      <h2 className="text-sm font-semibold text-[#24262B]">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#6B6A64]">
        {description}
      </p>
      {action && (
        <Link
          href={`${basePath}/new`}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-[var(--rams-red)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
        >
          Schedule a meeting
        </Link>
      )}
    </div>
  );
}

function MeetingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-28 rounded-xl border border-[#E5DED5] bg-white" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-xl border border-[#E5DED5] bg-white"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-[#E5DED5] bg-white px-6 py-5">
        <SkeletonLines lines={8} />
      </div>
    </div>
  );
}

export default function MyMeetings({
  basePath = "/meetings",
  scope = "created",
  title = "My Meetings",
  description = "Your personal agenda of meetings you created.",
  eyebrow = "Meetings",
  emptyDescription = "When you create a meeting, it will appear here with its agenda and attachments.",
  canCreateOverride,
}: {
  basePath?: string;
  scope?: "created" | "accessibles";
  title?: string;
  description?: string;
  eyebrow?: string;
  emptyDescription?: string;
  canCreateOverride?: boolean;
}) {
  const { user } = useAuth();
  const canCreate =
    canCreateOverride ?? canCreateMeetings(user?.role);
  const [groups, setGroups] = useState<MeetingGroup>({
    all: [],
    upcoming: [],
    ongoing: [],
    past: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "ongoing" | "past" | "cancelled"
  >("upcoming");

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      getMeetings()
        .then((data) => {
          if (cancelled) return;
          const userId = user?.id ?? "";
          const mine =
            scope === "created"
              ? data.filter((meeting) => meeting.createdBy?.id === userId)
              : data;
          const upcoming = mine
            .filter((meeting) => getMeetingStatus(meeting) === "UPCOMING")
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            );
          const ongoing = mine
            .filter((meeting) => getMeetingStatus(meeting) === "ONGOING")
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            );
          const past = mine
            .filter((meeting) => getMeetingStatus(meeting) === "PAST")
            .sort(
              (a, b) =>
                new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
            )
            .slice(0, PAST_LIMIT);
          const cancelledMeetings = mine
            .filter((meeting) => getMeetingStatus(meeting) === "CANCELLED")
            .sort(
              (a, b) =>
                new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
            );
          setGroups({
            all: mine,
            upcoming,
            ongoing,
            past,
            cancelled: cancelledMeetings,
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
  }, [reloadKey, scope, user?.id]);

  const filteredGroups = useMemo(() => {
    const filterMeetings = (meetings: Meeting[]) =>
      meetings.filter(
        (meeting) =>
          matchesSearch(meeting, query) &&
          matchesTimeFilter(meeting, timeFilter),
      );

    return {
      upcoming: filterMeetings(groups.upcoming),
      ongoing: filterMeetings(groups.ongoing),
      past: filterMeetings(groups.past),
      cancelled: filterMeetings(groups.cancelled),
    };
  }, [
    groups.cancelled,
    groups.ongoing,
    groups.past,
    groups.upcoming,
    query,
    timeFilter,
  ]);

  const total = groups.all.length;

  const handleTabChange = (
    tab: "upcoming" | "ongoing" | "past" | "cancelled",
  ) => {
    setActiveTab(tab);
    document
      .getElementById(`${tab}-meetings`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1216px]">
        <section className="relative overflow-hidden rounded-2xl px-1 py-2 sm:px-3 sm:py-4">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] bg-cover bg-center opacity-40 lg:block"
            style={{
              backgroundImage: `url("${assetPath(
                "/assets/upscalemedia-transformed.jpeg",
              )}")`,
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] bg-[#F7F5F1]/70 lg:block"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[720px] border-l-[5px] border-[var(--rams-red)] pl-5 sm:pl-6">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--rams-red)]">
                {eyebrow}
              </p>
              <h1 className="mt-2 font-display text-[2.4rem] font-semibold leading-none tracking-[-0.055em] text-[#101217] sm:text-[2.75rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-[620px] text-[0.98rem] leading-6 text-[#55534F]">
                {description}
              </p>
            </div>
            {canCreate && (
              <Link
                href={`${basePath}/new`}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-3 rounded-xl bg-[var(--rams-red)] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(201,28,36,0.15)] transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
              >
                <span className="text-xl font-light leading-none">+</span>
                Schedule meeting
              </Link>
            )}
          </div>
        </section>

        {error && (
          <div className="mt-5">
            <ErrorState
              message={error}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        {loading ? (
          <div className="mt-6">
            <MeetingsSkeleton />
          </div>
        ) : total === 0 ? (
          <div className="mt-6">
            <EmptyMeetings
              title="No meetings yet"
              description={emptyDescription}
              action={canCreate}
              basePath={basePath}
            />
          </div>
        ) : (
          <>
            <section
              className="mt-6 grid gap-4 md:grid-cols-2"
              aria-label="Meeting summary"
            >
              <MetricCard
                icon={ICONS.calendar}
                label="Upcoming"
                value={groups.upcoming.length}
                detail="Meetings ahead"
              />
              <MetricCard
                icon={ICONS.history}
                label="Past"
                value={groups.past.length}
                detail="Scheduled times ended"
              />
            </section>

            <section className="mt-7" aria-label="Meeting filters">
              <div className="flex flex-col gap-4 border-b border-[#E5DED5] pb-1 lg:flex-row lg:items-end lg:justify-between">
                <div
                  role="tablist"
                  aria-label="Meeting status"
                  className="flex gap-7"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "upcoming"}
                    onClick={() => handleTabChange("upcoming")}
                    className={`relative pb-3 text-[1rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] ${
                      activeTab === "upcoming"
                        ? "text-[var(--rams-red)]"
                        : "text-[#77736D] hover:text-[#24262B]"
                    }`}
                  >
                    <span>Upcoming</span>{" "}
                    <span>({filteredGroups.upcoming.length})</span>
                    {activeTab === "upcoming" && (
                      <span className="absolute inset-x-0 bottom-[-1px] h-[3px] rounded-full bg-[var(--rams-red)]" />
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "ongoing"}
                    onClick={() => handleTabChange("ongoing")}
                    className={`relative pb-3 text-[1rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] ${
                      activeTab === "ongoing"
                        ? "text-[var(--rams-red)]"
                        : "text-[#77736D] hover:text-[#24262B]"
                    }`}
                  >
                    <span>Ongoing</span>{" "}
                    <span>({filteredGroups.ongoing.length})</span>
                    {activeTab === "ongoing" && (
                      <span className="absolute inset-x-0 bottom-[-1px] h-[3px] rounded-full bg-[var(--rams-red)]" />
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "past"}
                    onClick={() => handleTabChange("past")}
                    className={`relative pb-3 text-[1rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] ${
                      activeTab === "past"
                        ? "text-[var(--rams-red)]"
                        : "text-[#77736D] hover:text-[#24262B]"
                    }`}
                  >
                    <span>Past</span>{" "}
                    <span>({filteredGroups.past.length})</span>
                    {activeTab === "past" && (
                      <span className="absolute inset-x-0 bottom-[-1px] h-[3px] rounded-full bg-[var(--rams-red)]" />
                    )}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "cancelled"}
                    onClick={() => handleTabChange("cancelled")}
                    className={`relative pb-3 text-[1rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] ${
                      activeTab === "cancelled"
                        ? "text-[var(--rams-red)]"
                        : "text-[#77736D] hover:text-[#24262B]"
                    }`}
                  >
                    <span>Cancelled</span>{" "}
                    <span>({filteredGroups.cancelled.length})</span>
                    {activeTab === "cancelled" && (
                      <span className="absolute inset-x-0 bottom-[-1px] h-[3px] rounded-full bg-[var(--rams-red)]" />
                    )}
                  </button>
                </div>

                <div className="flex flex-col gap-3 pb-3 sm:flex-row">
                  <label className="relative block min-w-0 sm:w-[306px]">
                    <span className="sr-only">Search meetings</span>
                    <Icon
                      path={ICONS.search}
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#77736D]"
                    />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search meetings..."
                      aria-label="Search meetings"
                      className="h-11 w-full rounded-xl border border-[#DED6CD] bg-white pl-11 pr-4 text-sm text-[#24262B] outline-none transition placeholder:text-[#77736D] focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[#F9D9D5]"
                    />
                  </label>
                  <div className="relative block w-full sm:w-[156px]">
                    <Icon
                      path={ICONS.filter}
                      className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-[#55534F]"
                    />
                    <CustomSelect
                      ariaLabel="Meeting time filter"
                      value={timeFilter}
                      onChange={(next) =>
                        setTimeFilter(next as TimeFilter)
                      }
                      options={[
                        { value: "all", label: "All time" },
                        { value: "month", label: "This month" },
                        { value: "next30", label: "Next 30 days" },
                      ]}
                      triggerClassName="min-h-11 rounded-xl pl-11"
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-6 space-y-8">
              <section
                id="upcoming-meetings"
                aria-labelledby="upcoming-meetings-heading"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2
                    id="upcoming-meetings-heading"
                    className="text-[1.05rem] font-semibold text-[#15171C]"
                  >
                    Upcoming
                  </h2>
                  <span className="text-xs text-[#8A867D]">
                    {filteredGroups.upcoming.length} meeting
                    {filteredGroups.upcoming.length === 1 ? "" : "s"} ahead
                  </span>
                </div>
                {filteredGroups.upcoming.length === 0 ? (
                  <EmptyMeetings
                    title="No upcoming meetings"
                    description={
                      query || timeFilter !== "all"
                        ? "Try changing the search or time filter."
                        : "Schedule one to fill the agenda."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E5DED5] bg-white shadow-[0_8px_24px_rgba(46,38,31,0.02)]">
                    {filteredGroups.upcoming.map((meeting, index) => (
                      <MeetingRow
                        key={meeting._id}
                        meeting={meeting}
                        featured={index === 0}
                        basePath={basePath}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                id="ongoing-meetings"
                aria-labelledby="ongoing-meetings-heading"
              >
                <div className="mb-3 flex items-center gap-3">
                  <Icon
                    path={ICONS.clock}
                    className="h-6 w-6 text-[var(--rams-red)]"
                  />
                  <h2
                    id="ongoing-meetings-heading"
                    className="text-[1.05rem] font-semibold text-[#15171C]"
                  >
                    Ongoing
                  </h2>
                  <span className="text-xs text-[#8A867D]">
                    ({filteredGroups.ongoing.length})
                  </span>
                </div>
                {filteredGroups.ongoing.length === 0 ? (
                  <EmptyMeetings
                    title="No ongoing meetings"
                    description={
                      query || timeFilter !== "all"
                        ? "Try changing the search or time filter."
                        : "Meetings currently in progress will appear here."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E5DED5] bg-white shadow-[0_8px_24px_rgba(46,38,31,0.02)]">
                    {filteredGroups.ongoing.map((meeting) => (
                      <MeetingRow
                        key={meeting._id}
                        meeting={meeting}
                        basePath={basePath}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                id="past-meetings"
                aria-labelledby="past-meetings-heading"
              >
                <div className="mb-3 flex items-center gap-3">
                  <Icon
                    path={ICONS.history}
                    className="h-6 w-6 text-[var(--rams-red)]"
                  />
                  <h2
                    id="past-meetings-heading"
                    className="text-[1.05rem] font-semibold text-[#15171C]"
                  >
                    Past
                  </h2>
                  <span className="text-xs text-[#8A867D]">
                    ({filteredGroups.past.length})
                  </span>
                </div>
                {filteredGroups.past.length === 0 ? (
                  <EmptyMeetings
                    title="No past meetings"
                    description={
                      query || timeFilter !== "all"
                        ? "Try changing the search or time filter."
                        : "Meetings whose scheduled time has ended will appear here."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E5DED5] bg-white shadow-[0_8px_24px_rgba(46,38,31,0.02)]">
                    {filteredGroups.past.map((meeting) => (
                      <PastMeetingRow
                        key={meeting._id}
                        meeting={meeting}
                        basePath={basePath}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section
                id="cancelled-meetings"
                aria-labelledby="cancelled-meetings-heading"
              >
                <div className="mb-3 flex items-center gap-3">
                  <Icon
                    path={ICONS.history}
                    className="h-6 w-6 text-[var(--rams-red)]"
                  />
                  <h2
                    id="cancelled-meetings-heading"
                    className="text-[1.05rem] font-semibold text-[#15171C]"
                  >
                    Cancelled
                  </h2>
                  <span className="text-xs text-[#8A867D]">
                    ({filteredGroups.cancelled.length})
                  </span>
                </div>
                {filteredGroups.cancelled.length === 0 ? (
                  <EmptyMeetings
                    title="No cancelled meetings"
                    description={
                      query || timeFilter !== "all"
                        ? "Try changing the search or time filter."
                        : "Explicitly cancelled meetings will appear here."
                    }
                  />
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E5DED5] bg-white shadow-[0_8px_24px_rgba(46,38,31,0.02)]">
                    {filteredGroups.cancelled.map((meeting) => (
                      <PastMeetingRow
                        key={meeting._id}
                        meeting={meeting}
                        basePath={basePath}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
