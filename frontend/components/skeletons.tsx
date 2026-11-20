import type { ReactNode } from "react";

import { Card } from "@/components/ui";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("skeleton rounded-md", className)} />
  );
}

export function SkeletonLines({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cx("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cx(
            "skeleton h-3 rounded-md",
            index === lines - 1 && lines > 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

const SUMMARY_COLUMNS = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";

export function StatCardsSkeleton({
  count = 4,
  columns = SUMMARY_COLUMNS,
  variant = "summary",
}: {
  count?: number;
  columns?: string;
  variant?: "summary" | "dashboard";
}) {
  return (
    <div className={columns} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className={
            variant === "dashboard"
              ? "min-h-[10.5rem] p-6"
              : "rounded-[16px] border-[#E7EBF1] p-5 shadow-[0_10px_28px_rgba(11,32,56,0.06)]"
          }
        >
          {variant === "dashboard" ? (
            <>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-7 h-10 w-20" />
              <Skeleton className="mt-3 h-3 w-36" />
              <Skeleton className="mt-6 h-px w-12" />
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  minWidth = "min-w-[760px]",
  firstColumnWide = true,
}: {
  rows?: number;
  columns?: number;
  minWidth?: string;
  firstColumnWide?: boolean;
}) {
  return (
    <Card>
      <div className="overflow-hidden">
        <table className={`w-full ${minWidth} text-left`}>
          <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-5 py-4">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/8">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, columnIndex) => (
                  <td key={columnIndex} className="px-5 py-4">
                    <Skeleton
                      className={cx(
                        "h-4",
                        columnIndex === 0 && firstColumnWide ? "w-40" : "w-20",
                      )}
                    />
                    {columnIndex === 0 && firstColumnWide ? (
                      <Skeleton className="mt-2 h-3 w-24" />
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ProfileCardsSkeleton({
  count = 10,
  columns = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={columns} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="h-full overflow-hidden p-0">
          <Skeleton className="aspect-[5/3] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <SkeletonLines lines={2} />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MediaCardsSkeleton({
  count = 6,
  columns = "grid gap-5 sm:grid-cols-2",
  aspect = "aspect-[16/9]",
}: {
  count?: number;
  columns?: string;
  aspect?: string;
}) {
  return (
    <div className={columns} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden p-0">
          <Skeleton className={cx("w-full rounded-none", aspect)} />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-40" />
            <SkeletonLines lines={2} />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PartnerCardsSkeleton({
  count = 6,
  columns = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={columns} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-24 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <SkeletonLines lines={2} className="mt-5" />
        </Card>
      ))}
    </div>
  );
}

export function PublicationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-4 h-5 w-4/5" />
          <SkeletonLines lines={2} className="mt-3" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ContentCardsSkeleton({
  count = 4,
  columns = "grid gap-5 md:grid-cols-2",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={columns} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-40" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <SkeletonLines lines={2} className="mt-5" />
          <Skeleton className="mt-4 h-3 w-40" />
          <Skeleton className="mt-6 h-10 w-32" />
        </Card>
      ))}
    </div>
  );
}

export function FormSkeleton({
  fields = 6,
  columns = "sm:grid-cols-2",
  actionCount = 2,
}: {
  fields?: number;
  columns?: string;
  actionCount?: number;
}) {
  return (
    <div className="flex justify-center p-5 sm:p-7 lg:p-9">
      <div className="w-full max-w-3xl space-y-7">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Card className="p-6">
          <div className={cx("grid gap-5", columns)}>
            {Array.from({ length: fields }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-3 border-t border-black/8 pt-7">
            {Array.from({ length: actionCount }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-28" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DetailSkeleton({
  sections = 3,
  columns = "sm:grid-cols-2",
}: {
  sections?: number;
  columns?: string;
}) {
  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl space-y-8">
        <Skeleton className="h-4 w-28" />
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-8 w-64 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </Card>
        {Array.from({ length: sections }).map((_, sectionIndex) => (
          <Card key={sectionIndex} className="p-6">
            <Skeleton className="h-6 w-40" />
            <div className={cx("mt-5 grid gap-5", columns)}>
              {Array.from({ length: 4 }).map((_, fieldIndex) => (
                <div key={fieldIndex} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TimelineSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-6" aria-hidden="true">
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <SkeletonLines lines={2} />
            <Skeleton className="h-3 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function SkeletonStatus({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status">
      {label}
    </span>
  );
}

export function SkeletonGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-label={label}>
      <SkeletonStatus label={label} />
      {children}
    </div>
  );
}

export function AuthLoadingSkeleton({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cx(
        "flex min-h-screen items-center justify-center p-6",
        className,
      )}
    >
      <div className="w-full max-w-md space-y-4" aria-hidden="true">
        <Skeleton className="mx-auto h-12 w-12 rounded-full" />
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto h-3 w-64 max-w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
