"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/providers/toast-providers";
import { Badge, Button, ErrorState, PageHeader, inputClass } from "@/components/ui";
import { SkeletonLines } from "@/components/skeletons";
import { getUserFacingError } from "@/lib/api/errors";
import {
  addLabMembership,
  deactivateLabMembership,
  getLabMemberships,
  searchLabMembershipCandidates,
  updateLabMembershipStatus,
} from "@/lib/api/lab-memberships";
import type {
  LabMembershipCandidate,
  LabMembershipRecord,
  LabMembershipStatus,
} from "@/types/lab-membership";

const PANEL = "rounded-xl border border-[#E3DED7] bg-white shadow-[0_8px_22px_rgba(31,35,40,0.025)]";

function displayName(user: LabMembershipRecord["user"]) {
  return user?.displayName?.trim() || user?.email || "Unavailable account";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LabMembershipsPage() {
  const { success, error: notifyError } = useToast();
  const [members, setMembers] = useState<LabMembershipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LabMembershipStatus | "">("");
  const [reloadKey, setReloadKey] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidates, setCandidates] = useState<LabMembershipCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] =
    useState<LabMembershipRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      getLabMemberships({
        q: query.trim() || undefined,
        status: statusFilter || undefined,
        limit: 100,
        offset: 0,
      })
        .then((page) => {
          if (cancelled) return;
          setMembers(page.items);
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
  }, [query, reloadKey, statusFilter]);

  useEffect(() => {
    const term = candidateQuery.trim();
    let cancelled = false;

    if (term.length < 2) {
      const clearTimer = window.setTimeout(() => {
        if (cancelled) return;
        setCandidates([]);
        setCandidateError(null);
        setCandidateLoading(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(clearTimer);
      };
    }

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setCandidateLoading(true);
      setCandidateError(null);
      searchLabMembershipCandidates({ q: term, limit: 10 })
        .then((results) => {
          if (!cancelled) setCandidates(results);
        })
        .catch((reason) => {
          if (!cancelled) setCandidateError(getUserFacingError(reason));
        })
        .finally(() => {
          if (!cancelled) setCandidateLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [candidateQuery]);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  async function loadMore() {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getLabMemberships({
        q: query.trim() || undefined,
        status: statusFilter || undefined,
        limit: 100,
        offset: nextOffset,
      });
      setMembers((current) => [...current, ...page.items]);
      setHasMore(page.pagination.hasMore);
      setNextOffset(page.pagination.nextOffset);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setLoadingMore(false);
    }
  }

  async function addMember(candidate: LabMembershipCandidate) {
    setBusyUserId(candidate.id);
    try {
      await addLabMembership(candidate.id);
      success(`${candidate.displayName?.trim() || candidate.email} added to the lab.`);
      setCandidates((current) =>
        current.filter((item) => item.id !== candidate.id),
      );
      setCandidateQuery("");
      reload();
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setBusyUserId(null);
    }
  }

  async function setStatus(
    membership: LabMembershipRecord,
    status: LabMembershipStatus,
  ) {
    setBusyUserId(membership.userId);
    try {
      await updateLabMembershipStatus(membership.userId, status);
      success(
        status === "ACTIVE"
          ? "Lab membership reactivated."
          : "Lab membership deactivated.",
      );
      setConfirmDeactivate(null);
      reload();
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setBusyUserId(null);
    }
  }

  async function confirmDeactivation() {
    if (!confirmDeactivate) return;
    setBusyUserId(confirmDeactivate.userId);
    try {
      await deactivateLabMembership(confirmDeactivate.userId);
      success("Lab membership deactivated.");
      setConfirmDeactivate(null);
      reload();
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
          title="Lab membership records"
          description="Maintain historical lab membership records. Shared agenda access now comes from an active RAMS account, not from lab membership."
        />

        <section className={`${PANEL} mt-7 p-5 sm:p-6`}>
          <div className="flex flex-col gap-3 border-b border-[#EEEAE4] pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                Add lab member
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#6B6A64]">
                Search active RAMS accounts. Adding an inactive previous record
                reactivates it without changing agenda access.
              </p>
            </div>
            <input
              type="search"
              className={`${inputClass} lg:max-w-sm`}
              placeholder="Search name or email"
              aria-label="Search eligible accounts"
              value={candidateQuery}
              onChange={(event) => setCandidateQuery(event.target.value)}
            />
          </div>

          {candidateError && (
            <p role="alert" className="mt-4 text-sm text-[#8B3732]">
              {candidateError}
            </p>
          )}
          {candidateLoading ? (
            <p className="mt-4 text-sm text-[#6B6A64]">Searching accounts…</p>
          ) : candidates.length > 0 ? (
            <ul className="mt-4 divide-y divide-[#EEEAE4] rounded-lg border border-[#E7E2D8]">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                      {candidate.displayName?.trim() || candidate.email}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#6B6A64]">
                      {candidate.email}
                    </span>
                  </span>
                  <Badge>{candidate.role}</Badge>
                  <Button
                    type="button"
                    disabled={busyUserId === candidate.id}
                    onClick={() => void addMember(candidate)}
                  >
                    {busyUserId === candidate.id ? "Adding…" : "Add member"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : candidateQuery.trim().length >= 2 ? (
            <p className="mt-4 text-sm text-[#6B6A64]">
              No eligible active accounts match this search.
            </p>
          ) : null}
        </section>

        <section className={`${PANEL} mt-6 overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-[#EEEAE4] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[var(--rams-charcoal)]">
                Membership records
              </h2>
              <p className="mt-1 text-xs text-[#6B6A64]">
                {members.length} loaded record{members.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                className={inputClass}
                placeholder="Filter loaded members"
                aria-label="Filter lab members"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                className={inputClass}
                aria-label="Filter by membership status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as LabMembershipStatus | "")
                }
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="p-5">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : loading ? (
            <div className="p-5">
              <SkeletonLines lines={5} />
            </div>
          ) : members.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                No membership records
              </p>
              <p className="mt-1 text-xs text-[#6B6A64]">
                Add confirmed lab members from the search above.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#EEEAE4]">
              {members.map((membership) => (
                <li
                  key={membership.userId}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                      {displayName(membership.user)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#6B6A64]">
                      {membership.user?.email ?? "No email"} ·{" "}
                      {membership.user?.role ?? "UNKNOWN"}
                    </p>
                    <p className="mt-1 text-[0.7rem] text-[#8A867D]">
                      Joined {formatDate(membership.joinedAt)}
                      {membership.createdBy
                        ? ` · Added by ${displayName(membership.createdBy)}`
                        : ""}
                      {membership.updatedBy
                        ? ` · Updated by ${displayName(membership.updatedBy)}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={membership.status === "ACTIVE" ? "green" : "neutral"}>
                    {membership.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                  {membership.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyUserId === membership.userId}
                      onClick={() => setConfirmDeactivate(membership)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={busyUserId === membership.userId}
                      onClick={() => void setStatus(membership, "ACTIVE")}
                    >
                      {busyUserId === membership.userId
                        ? "Reactivating…"
                        : "Reactivate"}
                    </Button>
                  )}
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
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </section>
      </div>

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-membership-title"
            className="w-full max-w-md rounded-xl border border-[#E3DED7] bg-white p-6 shadow-2xl"
          >
            <h2
              id="deactivate-membership-title"
              className="text-lg font-semibold text-[var(--rams-charcoal)]"
            >
              Deactivate lab membership?
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5F5A54]">
              {displayName(confirmDeactivate.user)} will be marked inactive in
              the membership record. Shared agenda access is not affected, and
              membership history is preserved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={busyUserId === confirmDeactivate.userId}
                onClick={() => setConfirmDeactivate(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={busyUserId === confirmDeactivate.userId}
                onClick={() => void confirmDeactivation()}
              >
                {busyUserId === confirmDeactivate.userId
                  ? "Deactivating…"
                  : "Deactivate"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
