"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import { Skeleton } from "@/components/skeletons";
import { getDashboardStats } from "@/lib/api/dashboard";
import { getUserFacingError } from "@/lib/api/errors";
import { getMeetingAgenda } from "@/lib/api/meetings";
import { getPartners, getPublications } from "@/lib/api/modules";
import { hasPermission } from "@/lib/authz";
import { assetPath } from "@/lib/asset-path";
import { formatTimeRange } from "@/lib/meetings/calendar";
import type { DashboardStats } from "@/types/dashboard";
import type { MeetingCalendarEvent } from "@/types/meetings";
import type { UserRole } from "@/types/auth";
import type {
  Partner,
  PublicationListResponse,
} from "@/types/modules";

type DashboardErrors = {
  stats: string | null;
  meetings: string | null;
  publications: string | null;
  partners: string | null;
};

type ActivityItem = {
  id: string;
  label: string;
  title: string;
  date: string;
  href: string;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatContentKey(key: DashboardStats["latestSiteContentKey"]) {
  if (!key) return "Site content";

  return key
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRole(role: string | undefined) {
  if (!role) return "RAMS workspace";
  if (role === "ADMIN") return "Administrator workspace";
  if (role === "DOSEN") return "Lecturer workspace";
  return `${role.toLowerCase()} workspace`;
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateParts(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", number: "--", month: "---" };
  }

  return {
    day: new Intl.DateTimeFormat("en-US", { weekday: "short" })
      .format(date)
      .toUpperCase(),
    number: String(date.getDate()),
    month: new Intl.DateTimeFormat("en-US", { month: "short" })
      .format(date)
      .toUpperCase(),
  };
}

function getSettledError<T>(result: PromiseSettledResult<T>) {
  return result.status === "rejected" ? getUserFacingError(result.reason) : null;
}

async function settle<T>(promise: Promise<T>): Promise<PromiseSettledResult<T>> {
  try {
    return { status: "fulfilled", value: await promise };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function UsersIcon() {
  return (
    <Icon>
      <path d="M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="7" r="3" />
      <path d="M16 4.5a3 3 0 0 1 0 5.8M18 14.5a4.5 4.5 0 0 1 2 3.8V20" />
    </Icon>
  );
}

function AlumniIcon() {
  return (
    <Icon>
      <path d="m3 9 9-4 9 4-9 4-9-4Z" />
      <path d="M6 11.2v4.3c2.8 2.1 9.2 2.1 12 0v-4.3M21 9v6" />
    </Icon>
  );
}

function DosenIcon() {
  return (
    <Icon>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M19 9v6M16 12h6" />
    </Icon>
  );
}

function PublicationIcon() {
  return (
    <Icon>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5V4.5Z" />
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 7H19M9 11h6M9 14h6" />
    </Icon>
  );
}

function ProjectIcon() {
  return (
    <Icon>
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4M4 17l8 4 8-4" />
    </Icon>
  );
}

function PartnerIcon() {
  return (
    <Icon>
      <path d="M8.5 12.5 11 15a2.1 2.1 0 0 0 3 0l4-4a2.1 2.1 0 0 0-3-3l-1.5 1.5" />
      <path d="m15.5 11.5-2.5-2.5a2.1 2.1 0 0 0-3 0l-4 4a2.1 2.1 0 0 0 3 3l1.5-1.5M8 5l2-2 2 2M16 19l-2 2-2-2" />
    </Icon>
  );
}

function CalendarIcon({ className = "" }: { className?: string } = {}) {
  return (
    <Icon className={className}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M7.5 3v4M16.5 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </Icon>
  );
}

function ClockIcon() {
  return (
    <Icon className="h-4 w-4">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

function PeopleIcon() {
  return (
    <Icon className="h-4 w-4">
      <circle cx="9" cy="8" r="2.5" />
      <path d="M4.5 17c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M16 6.5a2.5 2.5 0 0 1 0 5M16 13.2c2 .3 3.5 1.6 3.5 3.8" />
    </Icon>
  );
}

function ArrowIcon() {
  return (
    <Icon className="h-4 w-4">
      <path d="M5 12h13M13 7l5 5-5 5" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function MetricIcon({ kind }: { kind: "users" | "alumni" | "dosen" | "publication" | "project" | "partner" }) {
  const icons = {
    users: <UsersIcon />,
    alumni: <AlumniIcon />,
    dosen: <DosenIcon />,
    publication: <PublicationIcon />,
    project: <ProjectIcon />,
    partner: <PartnerIcon />,
  };

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0eb] text-[var(--rams-red)]">
      {icons[kind]}
    </span>
  );
}

function Panel({
  eyebrow,
  title,
  action,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#e5dfd8] bg-white/80 p-5 shadow-[0_12px_30px_rgba(52,44,38,0.045)] sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#eee9e4] pb-4">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--rams-red)]">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.03em] text-[var(--rams-charcoal)]">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-[var(--rams-red)] transition-colors hover:bg-[#fff0eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
    >
      {children}
      <ArrowIcon />
    </Link>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-[#f1c9c0] bg-[#fff6f3] p-4 text-sm text-[#8f211d]">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
      >
        Try again
      </button>
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-[#e5dfd8] bg-white p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-5 h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ role }: { role: string | undefined }) {
  return (
    <section className="relative isolate min-h-[250px] overflow-hidden rounded-2xl border border-[#eadfd7] bg-[#fffaf4] shadow-[0_16px_38px_rgba(52,44,38,0.06)] sm:min-h-[280px]">
      <Image
        src={assetPath("/assets/upscalemedia-transformed.jpeg")}
        alt="Marine research environment at a working port"
        width={1200}
        height={800}
        priority
        sizes="(max-width: 1024px) 100vw, 75vw"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fffaf4] via-[#fffaf4]/95 to-[#fffaf4]/35" />
      <div className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-[#f5c8bf]/40 blur-2xl" />
      <div className="relative flex min-h-[250px] max-w-2xl flex-col justify-center px-6 py-8 sm:min-h-[280px] sm:px-8 lg:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--rams-red)]">
          RAMS Lab
        </p>
        <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-[#151515] sm:text-5xl">
          Welcome back to your research workspace.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-[#514b47] sm:text-lg">
          Manage research, publications, people, and partnerships in one integrated platform.
        </p>
        <p className="mt-5 text-sm font-semibold text-[#6d625c]">{formatRole(role)}</p>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  kind,
}: {
  label: string;
  value: number;
  detail: ReactNode;
  kind: "users" | "alumni" | "dosen" | "publication" | "project" | "partner";
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#e5dfd8] bg-white/85 p-4 shadow-[0_10px_22px_rgba(52,44,38,0.035)] transition-shadow hover:shadow-[0_14px_28px_rgba(52,44,38,0.08)] sm:p-5">
      <MetricIcon kind={kind} />
      <p className="mt-4 font-display text-3xl font-semibold leading-none tracking-[-0.06em] text-[#171717]">
        {formatNumber(value)}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#292522]">{label}</p>
      <p className="mt-1 truncate text-xs text-[#766e68]">{detail}</p>
    </article>
  );
}

function UpcomingMeetings({
  meetings,
  error,
  onRetry,
}: {
  meetings: MeetingCalendarEvent[] | null;
  error: string | null;
  onRetry: () => void;
}) {
  const [now] = useState(() => Date.now());
  const upcomingMeetings = useMemo(() => {
    if (!meetings) return [];

    return meetings
      .filter(
        (meeting) =>
          meeting.status !== "CANCELLED" &&
          new Date(meeting.endAt).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      )
      .slice(0, 3);
  }, [meetings, now]);

  return (
    <Panel
      eyebrow="Workspace"
      title="Upcoming Meetings"
      action={<SectionLink href="/meetings/calendar">View calendar</SectionLink>}
      className="lg:col-span-7"
    >
      {error ? (
        <InlineError message={error} onRetry={onRetry} />
      ) : meetings === null ? (
        <div className="space-y-3" aria-label="Loading meetings" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : upcomingMeetings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#ded7d0] bg-[#fffaf6] p-6 text-center">
          <CalendarIcon className="mx-auto text-[var(--rams-red)]" />
          <p className="mt-3 font-semibold text-[#26211f]">No upcoming meetings</p>
          <p className="mt-1 text-sm text-[#766e68]">Schedule the next research conversation when you are ready.</p>
          <div className="mt-4 flex justify-center gap-2">
            <SectionLink href="/meetings/new">Schedule meeting</SectionLink>
            <SectionLink href="/meetings/calendar">Open calendar</SectionLink>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#eee9e4]">
          {upcomingMeetings.map((meeting) => {
            const date = formatDateParts(meeting.startAt);
            const start = new Date(meeting.startAt).getTime();
            const end = new Date(meeting.endAt).getTime();
            const inProgress = now >= start && now <= end;
            const creatorName = meeting.createdBy?.displayName;

            return (
              <Link
                key={meeting._id}
                href={`/meetings/${encodeURIComponent(meeting._id)}`}
                className="group flex gap-4 py-3.5 first:pt-0 last:pb-0 focus-visible:outline-none"
              >
                <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-[#fff1ed] px-2 py-2 text-center text-[var(--rams-red)] transition-colors group-hover:bg-[#ffe5df]">
                  <span className="text-[0.65rem] font-bold tracking-[0.12em]">{date.day}</span>
                  <span className="mt-0.5 font-display text-2xl font-semibold leading-none">{date.number}</span>
                  <span className="mt-1 text-[0.65rem] font-bold tracking-[0.12em]">{date.month}</span>
                </span>
                <span className="min-w-0 flex-1 self-center">
                  <span className="block truncate font-semibold text-[#211d1b] group-hover:text-[var(--rams-red)]">
                    {meeting.title}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#766e68]">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon />
                      {formatTimeRange(meeting.startAt, meeting.endAt)}
                    </span>
                    {creatorName && (
                      <span className="inline-flex items-center gap-1.5">
                        <PeopleIcon />
                        {creatorName}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className={`self-center rounded-full px-2.5 py-1 text-[0.68rem] font-bold ${
                    inProgress
                      ? "bg-[#e8f6ea] text-[#26773b]"
                      : "bg-[#f8efed] text-[#a33b31]"
                  }`}
                >
                  {inProgress ? "In progress" : "Upcoming"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function QuickActions({ role }: { role: UserRole | undefined }) {
  const actions = [
    {
      label: "Schedule meeting",
      detail: "Create a new meeting",
      href: "/meetings/new",
      icon: <CalendarIcon />,
    },
    ...(hasPermission(role, "publication.create")
      ? [
          {
            label: "Add publication",
            detail: "Record new research",
            href: "/dashboard/publications/new",
            icon: <PublicationIcon />,
          },
        ]
      : []),
    ...(role === "ADMIN"
      ? [
          {
            label: "Add person",
            detail: "Manage a lecturer profile",
            href: "/dashboard/dosen/new",
            icon: <DosenIcon />,
          },
          {
            label: "Manage content",
            detail: "Update the public site",
            href: "/dashboard/content",
            icon: <PlusIcon />,
          },
        ]
      : [
          {
            label: "Research areas",
            detail: "Review research topics",
            href: "/dashboard/research",
            icon: <ProjectIcon />,
          },
        ]),
  ];

  return (
    <Panel eyebrow="Shortcuts" title="Quick Actions" className="lg:col-span-5">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex min-h-28 flex-col items-center justify-center rounded-xl border border-[#e9e2dc] bg-[#fffdfa] p-4 text-center transition-colors hover:border-[#e7b1a7] hover:bg-[#fff3ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
          >
            <span className="text-[var(--rams-red)] transition-transform group-hover:-translate-y-0.5">
              {action.icon}
            </span>
            <span className="mt-3 text-sm font-semibold text-[#211d1b]">{action.label}</span>
            <span className="mt-1 text-[0.68rem] text-[#8a817a]">{action.detail}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function ResearchPublications({
  stats,
  data,
  error,
  onRetry,
}: {
  stats: DashboardStats;
  data: PublicationListResponse | null;
  error: string | null;
  onRetry: () => void;
}) {
  const yearCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const publication of data?.data ?? []) {
      counts.set(publication.year, (counts.get(publication.year) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort(([a], [b]) => a - b)
      .slice(-7)
      .map(([year, count]) => ({ year, count }));
  }, [data]);

  const maxCount = Math.max(...yearCounts.map((item) => item.count), 1);
  const total = data?.total ?? stats.publications;
  const isPartial = data ? data.data.length < data.total : false;

  return (
    <Panel
      eyebrow="Research"
      title="Research Publications"
      action={<SectionLink href="/dashboard/publications">View publications</SectionLink>}
      className="lg:col-span-7"
    >
      {error ? (
        <InlineError message={error} onRetry={onRetry} />
      ) : data === null ? (
        <div className="space-y-4" aria-label="Loading publications" aria-busy="true">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-display text-4xl font-semibold leading-none tracking-[-0.06em] text-[#171717]">
                {formatNumber(total)}
              </p>
              <p className="mt-2 text-sm text-[#766e68]">Total publication records</p>
            </div>
            <div className="flex gap-4 text-xs text-[#766e68]">
              <div>
                <p className="font-display text-lg font-semibold text-[#211d1b]">{formatNumber(stats.publishedResearchAreas)}</p>
                <p>Published Research</p>
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-[#211d1b]">{formatNumber(stats.unpublishedResearchAreas)}</p>
                <p>Unpublished Research</p>
              </div>
            </div>
          </div>

          {yearCounts.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-[#ded7d0] bg-[#fffaf6] p-6 text-center text-sm text-[#766e68]">
              No publication records are available yet.
            </div>
          ) : (
            <div className="mt-7">
              <div className="flex h-44 items-end gap-2 border-b border-[#ded7d0] px-1 sm:gap-4">
                {yearCounts.map((item) => (
                  <div key={item.year} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-semibold text-[#4f4742]">{item.count}</span>
                    <div
                      className="w-full max-w-10 rounded-t-md bg-[#e9aaa0] transition-colors hover:bg-[var(--rams-red)]"
                      style={{ height: `${(item.count / maxCount) * 72}%` }}
                      title={`${item.count} publication${item.count === 1 ? "" : "s"} in ${item.year}`}
                      role="img"
                      aria-label={`${item.count} publications in ${item.year}`}
                    />
                    <span className="text-[0.68rem] text-[#766e68]">{item.year}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#8a817a]">
                {isPartial
                  ? `Showing the latest ${formatNumber(data.data.length)} of ${formatNumber(data.total)} records returned by the API.`
                  : "Records grouped by publication year."}
              </p>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function RecentActivity({
  stats,
  publications,
  partners,
  error,
  onRetry,
}: {
  stats: DashboardStats;
  publications: PublicationListResponse | null;
  partners: Partner[];
  error: string | null;
  onRetry: () => void;
}) {
  const activities = useMemo<ActivityItem[]>(() => {
    const result: ActivityItem[] = [];

    if (stats.latestSiteContentUpdatedAt) {
      result.push({
        id: `site-${stats.latestSiteContentUpdatedAt}`,
        label: "Site content updated",
        title: formatContentKey(stats.latestSiteContentKey),
        date: stats.latestSiteContentUpdatedAt,
        href: "/dashboard/content",
      });
    }

    const latestPublication = [...(publications?.data ?? [])].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
    if (latestPublication) {
      result.push({
        id: `publication-${latestPublication._id}`,
        label: "Publication record updated",
        title: latestPublication.title,
        date: latestPublication.updatedAt,
        href: `/dashboard/publications/${encodeURIComponent(latestPublication._id)}`,
      });
    }

    const latestPartner = [...partners].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];
    if (latestPartner) {
      result.push({
        id: `partner-${latestPartner._id}`,
        label: "Partner record updated",
        title: latestPartner.name,
        date: latestPartner.updatedAt,
        href: "/dashboard/partners",
      });
    }

    return result
      .filter((item) => !Number.isNaN(new Date(item.date).getTime()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [partners, publications, stats]);

  return (
    <Panel eyebrow="Workspace history" title="Recent Activity" className="lg:col-span-5">
      {error && activities.length === 0 ? (
        <InlineError message={error} onRetry={onRetry} />
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#ded7d0] bg-[#fffaf6] p-6 text-center text-sm text-[#766e68]">
          No recent updates are available.
        </div>
      ) : (
        <div>
          {error ? (
            <p className="mb-4 rounded-lg bg-[#fff7f4] px-3 py-2 text-xs text-[#8f211d]">
              Some activity sources could not be loaded. Showing the records that are available.
            </p>
          ) : null}
          <div className="relative space-y-0 before:absolute before:bottom-4 before:left-[9px] before:top-4 before:w-px before:bg-[#e7d9d3]">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={activity.href}
                className="group relative flex gap-4 py-3 first:pt-0 last:pb-0 focus-visible:outline-none"
              >
                <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-[var(--rams-red)] ring-1 ring-[#e5b4ac]" />
                <span className="min-w-0 flex-1 border-b border-[#f0ebe7] pb-3 last:border-0">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm font-semibold text-[#211d1b] group-hover:text-[var(--rams-red)]">
                      {activity.label}
                    </span>
                    <span className="text-[0.68rem] text-[#8a817a]">{formatDate(activity.date)}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#766e68]">{activity.title}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function DashboardPage() {
  const { user, status } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [meetings, setMeetings] = useState<MeetingCalendarEvent[] | null>(null);
  const [publications, setPublications] = useState<PublicationListResponse | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [errors, setErrors] = useState<DashboardErrors>({
    stats: null,
    meetings: null,
    publications: null,
    partners: null,
  });
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    let cancelled = false;

    const universityPartnersRequest =
      user.role === "ADMIN" ? getPartners("UNIVERSITY") : Promise.resolve(null);
    const industrialPartnersRequest =
      user.role === "ADMIN" ? getPartners("INDUSTRIAL") : Promise.resolve(null);

    Promise.all([
      settle(getDashboardStats()),
      settle(getMeetingAgenda({ limit: 200 })),
      settle(getPublications({ limit: 200, sort: "newest" })),
      settle(universityPartnersRequest),
      settle(industrialPartnersRequest),
    ]).then(
      ([statsResult, meetingsResult, publicationsResult, universityResult, industrialResult]) => {
        if (cancelled) return;

        if (statsResult.status === "fulfilled") setStats(statsResult.value);
        if (meetingsResult.status === "fulfilled")
          setMeetings(meetingsResult.value.items);
        if (publicationsResult.status === "fulfilled") setPublications(publicationsResult.value);

        const partnerLists: Partner[] = [];
        if (universityResult.status === "fulfilled" && universityResult.value) {
          partnerLists.push(...universityResult.value);
        }
        if (industrialResult.status === "fulfilled" && industrialResult.value) {
          partnerLists.push(...industrialResult.value);
        }
        setPartners(partnerLists);
        setErrors({
          stats: getSettledError(statsResult),
          meetings: getSettledError(meetingsResult),
          publications: getSettledError(publicationsResult),
          partners:
            getSettledError(universityResult) ?? getSettledError(industrialResult),
        });
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [reloadKey, status, user]);

  if (status === "loading" || loading) return <DashboardLoadingState />;
  if (status !== "authenticated" || !user) return null;

  const reload = () => {
    setLoading(true);
    setStats(null);
    setMeetings(null);
    setPublications(null);
    setPartners([]);
    setErrors({ stats: null, meetings: null, publications: null, partners: null });
    setReloadKey((value) => value + 1);
  };

  if (!stats) {
    return (
      <div className="rounded-2xl border border-[#f1c9c0] bg-[#fff6f3] p-6 text-[#8f211d]">
        <h1 className="font-display text-2xl font-semibold text-[#5f1915]">Dashboard unavailable</h1>
        <p className="mt-2 text-sm">{errors.stats ?? "The dashboard data could not be loaded."}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-overview w-full space-y-6 p-4 pb-8 sm:p-6 lg:p-8">
      <Hero role={user.role} />

      <section aria-label="Workspace metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Users" value={stats.users} detail="Registered accounts" kind="users" />
        <MetricCard label="Alumni" value={stats.alumni} detail="Alumni records" kind="alumni" />
        <MetricCard label="Dosen" value={stats.dosen} detail="Lecturer profiles" kind="dosen" />
        <MetricCard label="Publications" value={stats.publications} detail="Research records" kind="publication" />
        <MetricCard label="Projects" value={stats.projects} detail="Research projects" kind="project" />
        <MetricCard
          label="Partners"
          value={stats.universityPartners + stats.industrialPartners}
          detail={`${formatNumber(stats.universityPartners)} university · ${formatNumber(stats.industrialPartners)} industrial`}
          kind="partner"
        />
      </section>

      {errors.stats ? <InlineError message={errors.stats} onRetry={reload} /> : null}

      <div className="grid gap-5 lg:grid-cols-12">
        <UpcomingMeetings meetings={meetings} error={errors.meetings} onRetry={reload} />
        <QuickActions role={user.role} />
        <ResearchPublications
          stats={stats}
          data={publications}
          error={errors.publications}
          onRetry={reload}
        />
        <RecentActivity
          stats={stats}
          publications={publications}
          partners={partners}
          error={errors.partners ?? errors.publications}
          onRetry={reload}
        />
      </div>
    </div>
  );
}
