"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-providers";
import { SkeletonLines } from "@/components/skeletons";
import {
  Badge,
  Button,
  ErrorState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import {
  getAgendaCoordinatorStudents,
  setAgendaCoordinatorAccess,
} from "@/lib/api/agenda-coordinators";
import { getUserFacingError } from "@/lib/api/errors";
import type { AgendaCoordinatorStudent } from "@/types/agenda-coordinators";

const PANEL =
  "rounded-xl border border-[#E3DED7] bg-white shadow-[0_8px_22px_rgba(31,35,40,0.025)]";

export default function AgendaCoordinatorsPage() {
  const { success, error: notifyError } = useToast();
  const [students, setStudents] = useState<AgendaCoordinatorStudent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      getAgendaCoordinatorStudents({
        q: query.trim() || undefined,
        limit: 100,
        offset: 0,
      })
        .then((page) => {
          if (cancelled) return;
          setStudents(page.items);
          setHasMore(page.pagination.hasMore);
          setNextOffset(page.pagination.nextOffset);
        })
        .catch((reason) => {
          if (!cancelled) setError(getUserFacingError(reason));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  async function loadMore() {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getAgendaCoordinatorStudents({
        q: query.trim() || undefined,
        limit: 100,
        offset: nextOffset,
      });
      setStudents((current) => [...current, ...page.items]);
      setHasMore(page.pagination.hasMore);
      setNextOffset(page.pagination.nextOffset);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setLoadingMore(false);
    }
  }

  async function updateAccess(student: AgendaCoordinatorStudent) {
    setBusyUserId(student.id);
    try {
      const updated = await setAgendaCoordinatorAccess(
        student.id,
        !student.hasAgendaManage,
      );
      setStudents((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      success(
        updated.hasAgendaManage
          ? `${updated.displayName} can now coordinate the shared agenda.`
          : `${updated.displayName} no longer coordinates the shared agenda.`,
      );
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="People"
          title="Agenda coordinators"
          description="Grant Student accounts permission to create, edit, and cancel shared non-private meetings. This does not grant admin access or private meeting access."
        />

        <section className={`${PANEL} mt-7 overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-[#EEEAE4] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                Student accounts
              </h2>
              <p className="mt-1 text-xs text-[#6B6A64]">
                {students.length} loaded account{students.length === 1 ? "" : "s"}
              </p>
            </div>
            <input
              type="search"
              className={inputClass}
              placeholder="Search name or email"
              aria-label="Search student accounts"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {error ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="p-5">
              <SkeletonLines lines={5} />
            </div>
          ) : students.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                No student accounts found
              </p>
              <p className="mt-1 text-xs text-[#6B6A64]">
                Student accounts will appear here when they exist. Search a
                different name or email to continue.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#EEEAE4]">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                        {student.displayName}
                      </p>
                      <Badge tone={student.isActive ? "green" : "neutral"}>
                        {student.isActive ? "Active account" : "Inactive account"}
                      </Badge>
                      <Badge tone={student.hasAgendaManage ? "red" : "neutral"}>
                        {student.hasAgendaManage
                          ? "Agenda Coordinator"
                          : "Standard student"}
                      </Badge>
                      {student.hasSchedulePortalAccess && (
                        <Badge tone="amber">Schedule Portal</Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-[#6B6A64]">
                      {student.email}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={student.hasAgendaManage ? "secondary" : "primary"}
                    disabled={busyUserId === student.id}
                    onClick={() => void updateAccess(student)}
                  >
                    {busyUserId === student.id
                      ? "Saving..."
                      : student.hasAgendaManage
                        ? "Revoke coordinator"
                        : "Make coordinator"}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="border-t border-[#EEEAE4] px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
