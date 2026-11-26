"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import DeleteButton from "@/components/dashboard/delete-button";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  inputClass,
} from "@/components/ui";
import { StatCardsSkeleton, TableSkeleton } from "@/components/skeletons";
import {
  deleteAlumni,
  getAlumniList,
  getAlumniStats,
  type AlumniStats,
} from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";
import {
  formatMissingPublishFields,
  getMissingPublishFields,
} from "@/lib/alumni-publish";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Alumni, AlumniReviewStatus } from "@/types/alumni";

const limit = 10;

type ReviewFilter = "ALL" | AlumniReviewStatus;

const reviewFilters: { value: ReviewFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
];

function reviewState(item: Alumni) {
  if (item.reviewStatus === "APPROVED") {
    return { label: "Approved", tone: "green" } as const;
  }
  if (item.reviewStatus === "REJECTED") {
    return { label: "Rejected", tone: "amber" } as const;
  }
  return { label: "Pending review", tone: "neutral" } as const;
}

function missingPublishText(item: Alumni) {
  const missing = getMissingPublishFields(item);
  if (missing.length === 0) return null;
  return `Missing: ${formatMissingPublishFields(missing)}`;
}

type StatIcon = ComponentType<SVGProps<SVGSVGElement>>;

const statCards: {
  key: keyof AlumniStats;
  label: string;
  icon: StatIcon;
  color: string;
  tint: string;
  decor: string;
}[] = [
  {
    key: "total",
    label: "Total Alumni",
    icon: UsersIcon,
    color: "#2563EB",
    tint: "#E8F1FF",
    decor: "#BFD7FF",
  },
  {
    key: "approved",
    label: "Approved",
    icon: CircleCheckIcon,
    color: "#168A5B",
    tint: "#E8F8EF",
    decor: "#BFE9D2",
  },
  {
    key: "pending",
    label: "Pending",
    icon: ClockIcon,
    color: "#C47F0A",
    tint: "#FFF4DF",
    decor: "#FFE2AD",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: XIcon,
    color: "#C53030",
    tint: "#FDEBEC",
    decor: "#F8C9CB",
  },
];

function StatIconBase({
  children,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <StatIconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </StatIconBase>
  );
}

function CircleCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <StatIconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </StatIconBase>
  );
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <StatIconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </StatIconBase>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <StatIconBase {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </StatIconBase>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  tint,
  decor,
}: {
  label: string;
  value: number;
  icon: StatIcon;
  color: string;
  tint: string;
  decor: string;
}) {
  return (
    <article className="relative h-full overflow-hidden rounded-[16px] border border-[#E7EBF1] bg-white p-5 shadow-[0_10px_28px_rgba(11,32,56,0.06)]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full opacity-80"
        style={{
          background: `radial-gradient(circle at center, ${decor} 0%, transparent 70%)`,
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-2 h-16 w-16 rounded-full opacity-70"
        style={{
          background: `radial-gradient(circle at center, ${decor} 0%, transparent 72%)`,
        }}
      />

      <div className="relative z-10 flex items-center gap-4">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: tint, color }}
        >
          <Icon className="size-6" />
        </span>

        <div className="min-w-0">
          <p className="text-[2rem] font-bold leading-none tracking-tight tabular-nums text-[var(--navy)]">
            {value.toLocaleString("en-US")}
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--rams-gray)]">
            {label}
          </p>
        </div>
      </div>
    </article>
  );
}

function AlumniStatsSummary({
  stats,
  loading,
  error,
  onRetry,
}: {
  stats: AlumniStats | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section aria-label="Alumni statistics" className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md px-2 py-1 font-semibold text-red-800 underline underline-offset-2 transition-colors hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !stats ? (
        <StatCardsSkeleton
          count={4}
          columns="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        />
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={stats[card.key]}
              icon={card.icon}
              color={card.color}
              tint={card.tint}
              decor={card.decor}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function AlumniPage() {
  const { user } = useAuth();
  const { success, error: notifyError } = useToast();

  const [items, setItems] = useState<Alumni[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Alumni | null>(null);
  const [stats, setStats] = useState<AlumniStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getAlumniStats());
      setStatsError(null);
    } catch (reason) {
      setStatsError(getUserFacingError(reason));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    getAlumniStats()
      .then((result) => {
        if (cancelled) return;
        setStats(result);
        setStatsError(null);
      })
      .catch((reason) => {
        if (!cancelled) setStatsError(getUserFacingError(reason));
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAlumni() {
      setLoading(true);
      setError(null);

      try {
        const result = await getAlumniList({
          page,
          limit,
          search,
          // "All" simply omits the parameter so the backend returns every
          // review status (the default behaviour of the endpoint).
          ...(reviewFilter === "ALL" ? {} : { reviewStatus: reviewFilter }),
        });

        if (!cancelled) {
          setItems(result.data);
          setTotal(result.total);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAlumni();

    return () => {
      cancelled = true;
    };
  }, [page, search, reviewFilter]);

  function selectReviewFilter(value: ReviewFilter) {
    setReviewFilter(value);
    setPage(1);
  }

  function remove(item: Alumni) {
    setPendingDelete(item);
  }

  async function confirmDelete(item: Alumni) {
    setDeletingId(item._id);
    // setPendingDelete(null);

    try {
      await deleteAlumni(item._id);

      setItems((current) =>
        current.filter((currentItem) => currentItem._id !== item._id),
      );

      setTotal((current) => Math.max(0, current - 1));
      void loadStats();
      success(`${item.fullName} was deleted successfully.`);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      {pendingDelete && (
        <DeleteConfirmationModal
          personType="alumni"
          personName={pendingDelete.fullName}
          deleting={deletingId === pendingDelete._id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete(pendingDelete)}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="People"
          title="Alumni"
          description="Browse alumni profiles and their current professional journey."
        />

        <AlumniStatsSummary
          stats={stats}
          loading={statsLoading}
          error={statsError}
          onRetry={() => {
            setStatsLoading(true);
            setStatsError(null);
            void loadStats();
          }}
        />

        <Card className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span
                  id="alumni-review-filter-label"
                  className="text-sm font-semibold"
                >
                  Review status
                </span>
              </div>

              <div
                role="group"
                aria-labelledby="alumni-review-filter-label"
                className="flex flex-wrap gap-2"
              >
                {reviewFilters.map((option) => {
                  const active = reviewFilter === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => selectReviewFilter(option.value)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition 
                        focus-visible:outline-none 
                        focus-visible:ring-2 
                        focus-visible:ring-[var(--rams-red)] 
                        focus-visible:ring-offset-2 ${
                          active
                            ? "bg-[var(--rams-red)] text-white"
                            : "border border-black/10 bg-white text-[var(--rams-charcoal)] hover:bg-[var(--rams-gray-light)]"
                        }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full lg:w-[380px] lg:shrink-0">
              <label
                htmlFor="alumni-search"
                className="mb-2 block text-sm font-semibold"
              >
                Search alumni
              </label>

              <input
                id="alumni-search"
                type="search"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                placeholder="Name, NIM, or program"
                className={`${inputClass} w-full`}
              />
            </div>
          </div>
        </Card>

        {error && items.length === 0 ? (
          <ErrorState message={error} onRetry={() => setPage(page)} />
        ) : (
          <>
            {error && (
              <ErrorState message={error} onRetry={() => setPage(page)} />
            )}

            {loading && items.length === 0 ? (
              <TableSkeleton rows={6} columns={7} minWidth="min-w-[760px]" />
            ) : items.length === 0 ? (
              <EmptyState
                title={
                  search || reviewFilter !== "ALL"
                    ? "No matching alumni"
                    : "No alumni found"
                }
                description={
                  search
                    ? `No alumni matched “${search}”.`
                    : reviewFilter !== "ALL"
                      ? `No alumni with the “${reviewFilters.find((option) => option.value === reviewFilter)?.label}” review status.`
                      : "There are no alumni records available yet."
                }
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                      <tr>
                        {[
                          "Alumni",
                          "NIM",
                          "Company",
                          "Position",
                          "Account",
                          "Profile",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] ${
                              heading === "Action" ? "text-center" : ""
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black/8">
                      {items.map((item) => (
                        <tr
                          key={item._id}
                          className={loading ? "opacity-60" : ""}
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold">
                              {item.fullName || "Alumni Account"}
                            </p>

                            <p className="mt-1 text-xs text-[var(--rams-gray)]">
                              {item.accountEmail ??
                                item.currentPosition ??
                                "Profile incomplete"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {item.nim || "Not provided"}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {item.currentCompany || "Not provided"}
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {item.currentPosition || "Not provided"}
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              tone={
                                item.accountActive === false ? "amber" : "green"
                              }
                            >
                              {item.accountActive === false
                                ? "Disabled"
                                : "Active"}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <Badge tone={reviewState(item).tone}>
                                {reviewState(item).label}
                              </Badge>
                              <Badge tone={item.isPublic ? "green" : "neutral"}>
                                {item.isPublic ? "Public" : "Private"}
                              </Badge>
                              {missingPublishText(item) && (
                                <p className="text-xs text-[var(--rams-gray)]">
                                  {missingPublishText(item)}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex w-full items-center justify-center gap-3">
                              <Link
                                href={`/dashboard/alumni/${item._id}`}
                                className="text-sm font-bold text-[var(--rams-red)] hover:text-[var(--rams-red-dark)]"
                              >
                                Edit
                              </Link>

                              {user?.role === "ADMIN" && (
                                <DeleteButton
                                  variant="danger"
                                  disabled={deletingId === item._id}
                                  onClick={() => void remove(item)}
                                >
                                  {deletingId === item._id
                                    ? "Deleting…"
                                    : "Delete"}
                                </DeleteButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  disabled={loading || deletingId !== null}
                  onPageChange={setPage}
                />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
