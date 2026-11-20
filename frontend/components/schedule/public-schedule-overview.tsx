"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import MeetingModeBadge from "@/components/meetings-workspace/meeting-mode-badge";
import { useAuth } from "@/components/providers/auth-providers";
import { SkeletonLines } from "@/components/skeletons";
import { ErrorState, inputClass } from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { getPublicSchedule } from "@/lib/api/public-schedule";
import { canAccessSchedulePortal } from "@/lib/authz";
import { formatTimeRange } from "@/lib/meetings/calendar";
import { safeHttpUrl } from "@/lib/meetings/mode";
import { meetingStatusLabel } from "@/lib/meetings/status";
import type {
  PublicScheduleMeeting,
  PublicSchedulePage,
} from "@/types/public-schedule";

const EMPTY_PAGE: PublicSchedulePage = {
  items: [],
  total: 0,
  page: 1,
  limit: 6,
  totalPages: 0,
  hasMore: false,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusTone(status: PublicScheduleMeeting["status"]) {
  if (status === "ONGOING") return "bg-[#FFF3D9] text-[#94631A]";
  if (status === "PAST") return "bg-[#F1F0EE] text-[#69645E]";
  return "bg-[#EAF3E8] text-[#356B35]";
}

export default function PublicScheduleOverview() {
  const { user, status } = useAuth();
  const canManage =
    status === "authenticated" &&
    canAccessSchedulePortal(user?.role, user?.permissions ?? []);
  const from = useMemo(() => new Date().toISOString(), []);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"" | "OFFLINE" | "ONLINE">("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PublicSchedulePage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      getPublicSchedule({
        q: query.trim() || undefined,
        mode: mode || undefined,
        from,
        page,
        limit: 6,
      })
        .then((next) => {
          if (!cancelled) setResult(next);
        })
        .catch((reason) => {
          if (!cancelled) setError(getUserFacingError(reason));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [from, mode, page, query, reloadKey]);

  return (
    <div className="min-h-full bg-[#F8F6F3]">
      <section className="border-b border-[#E7E2D8] bg-[#FBFAF7] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1180px]">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
            Public schedule
          </p>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.045em] text-[var(--rams-charcoal)] sm:text-[3rem]">
                RAMS Laboratory schedule
              </h1>
              <p className="mt-4 text-[0.98rem] leading-7 text-[#5F5A54]">
                Upcoming and historical laboratory activities that are open to
                public view. Private meetings are not listed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/schedule/calendar"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#DCD6CE] bg-white px-4 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)]/45 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
              >
                Open calendar
              </Link>
              {canManage ? (
                <Link
                  href="/schedule/new"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                >
                  Create schedule
                </Link>
              ) : status === "unauthenticated" ? (
                <Link
                  href="/login?next=%2Fschedule%2Fnew"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                >
                  Sign in to create
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <section aria-labelledby="public-schedule-filter-heading">
          <div className="flex flex-col gap-4 rounded-xl border border-[#E7E2D8] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(31,35,40,0.035)] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="public-schedule-filter-heading"
                className="text-sm font-semibold text-[var(--rams-charcoal)]"
              >
                Find an activity
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                Search public titles and clients, or filter by meeting mode.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="block min-w-0 sm:w-[320px]">
                <span className="mb-1.5 block text-xs font-semibold text-[#5F5A54]">
                  Search
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search title or client"
                  className={inputClass}
                />
              </label>
              <label className="block sm:w-[170px]">
                <span className="mb-1.5 block text-xs font-semibold text-[#5F5A54]">
                  Mode
                </span>
                <select
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value as "" | "OFFLINE" | "ONLINE");
                    setPage(1);
                  }}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">All modes</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="ONLINE">Online</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6">
            <ErrorState
              message={error}
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        <section className="mt-8" aria-labelledby="public-schedule-list-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                id="public-schedule-list-heading"
                className="font-display text-xl font-semibold tracking-tight text-[var(--rams-charcoal)]"
              >
                Upcoming activities
              </h2>
              <p className="mt-1 text-xs text-[#6B6A64]">
                {loading
                  ? "Loading schedule"
                  : `${result.total} public activit${result.total === 1 ? "y" : "ies"}`}
              </p>
            </div>
            <Link
              href="/schedule/calendar"
              className="text-xs font-semibold text-[var(--rams-red)] underline-offset-4 hover:underline"
            >
              View calendar
            </Link>
          </div>

          {loading ? (
            <div className="mt-5 rounded-xl border border-[#E7E2D8] bg-white px-5 py-6">
              <SkeletonLines lines={7} />
            </div>
          ) : result.items.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#DCD6CE] bg-white px-5 py-10 text-center">
              <h3 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                No public activities found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B6A64]">
                Try a different search or mode. Past public activities remain
                available in the public calendar.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {result.items.map((meeting) => {
                const meetingLink = safeHttpUrl(meeting.meetingLink);
                return (
                  <li key={meeting.id}>
                    <article className="grid gap-4 rounded-xl border border-[#E7E2D8] bg-white px-5 py-5 transition hover:border-[#D4C9BC] hover:bg-[#FCFBF9] sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-center">
                      <Link
                        href={`/schedule/${meeting.id}`}
                        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                      >
                        <span className="block text-xs font-semibold text-[var(--rams-red)]">
                          {formatDate(meeting.startAt)}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[var(--rams-charcoal)]">
                          {formatTimeRange(meeting.startAt, meeting.endAt)}
                        </span>
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/schedule/${meeting.id}`}
                          className="block truncate text-lg font-semibold tracking-tight text-[var(--rams-charcoal)] hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
                        >
                          {meeting.title}
                        </Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#6B6A64]">
                          <span>{meeting.clientName?.trim() || "Client not specified"}</span>
                          <MeetingModeBadge mode={meeting.mode} />
                          {meeting.location?.trim() && (
                            <span className="truncate">{meeting.location}</span>
                          )}
                          {meeting.primaryPicName && (
                            <span className="truncate">
                              Primary PIC: {meeting.primaryPicName}
                            </span>
                          )}
                          {meeting.additionalPicNames &&
                            meeting.additionalPicNames.length > 0 && (
                              <span>
                                +{meeting.additionalPicNames.length} additional PIC
                                {meeting.additionalPicNames.length === 1 ? "" : "s"}
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusTone(meeting.status)}`}
                        >
                          {meetingStatusLabel(meeting.status)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/schedule/${meeting.id}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#DCD6CE] bg-white px-3 py-2 text-xs font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)]/45 hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                          >
                            View details
                          </Link>
                          {meetingLink && (
                            <a
                              href={meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--rams-red)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2"
                            >
                              {meeting.mode === "ONLINE"
                                ? "Join Google Meet"
                                : "Open Meeting Link"}
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          {result.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={result.page <= 1 || loading}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#DCD6CE] bg-white px-4 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[#C8BDB3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-xs text-[#6B6A64]">
                Page {result.page} of {result.totalPages}
              </p>
              <button
                type="button"
                onClick={() => setPage((value) => value + 1)}
                disabled={!result.hasMore || loading}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#DCD6CE] bg-white px-4 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[#C8BDB3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
