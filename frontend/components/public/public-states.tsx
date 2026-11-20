import { useTranslations } from "next-intl";
import {
  MediaCardsSkeleton,
  PartnerCardsSkeleton,
  ProfileCardsSkeleton,
  PublicationListSkeleton,
  Skeleton,
  SkeletonGroup,
  SkeletonLines,
} from "@/components/skeletons";

type PublicLoadingVariant =
  "cards" | "people" | "partners" | "list" | "profile";

export function PublicLoading({
  label,
  variant = "cards",
}: {
  label?: string;
  variant?: PublicLoadingVariant;
}) {
  const common = useTranslations("common");
  const statusLabel = label ?? common("loading");

  return (
    <SkeletonGroup label={statusLabel}>
      {variant === "people" ? (
        <ProfileCardsSkeleton
          count={10}
          columns="grid gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        />
      ) : variant === "partners" ? (
        <PartnerCardsSkeleton count={6} />
      ) : variant === "list" ? (
        <PublicationListSkeleton count={4} />
      ) : variant === "profile" ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)]">
            <Skeleton className="aspect-[4/5] w-full rounded-[3px]" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-2/3" />
              <SkeletonLines lines={4} className="max-w-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <SkeletonLines lines={5} />
        </div>
      ) : (
        <MediaCardsSkeleton
          count={6}
          columns="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        />
      )}
    </SkeletonGroup>
  );
}

export function PublicError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const common = useTranslations("common");
  return (
    <div className="border border-red-200 bg-red-50 p-7" role="alert">
      <p className="eyebrow text-[var(--rams-red)]">
        {common("requestUnavailable")}
      </p>
      <p className="mt-3 text-sm leading-6 text-red-950">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 border border-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-[var(--rams-red)] hover:bg-white"
        >
          {common("tryAgain")}
        </button>
      )}
    </div>
  );
}

export function PublicEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const common = useTranslations("common");
  return (
    <div className="border border-dashed border-[var(--border)] bg-white p-9 text-center">
      <p className="eyebrow text-[var(--ais-blue)]">
        {common("noPublishedRecords")}
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold text-[var(--navy)]">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">
        {description}
      </p>
    </div>
  );
}
