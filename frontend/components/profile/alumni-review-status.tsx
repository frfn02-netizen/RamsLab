"use client";

import { useSyncExternalStore } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";

import { Badge, Card } from "@/components/ui";
import type { AlumniReviewStatus } from "@/types/alumni";
import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";

type Locale = "en" | "id";

type AlumniReviewStatusProps = {
  reviewStatus?: AlumniReviewStatus;
  reviewNote?: string | null;
};

const MESSAGES: Record<Locale, object> = {
  en: { alumniReview: enMessages.alumniReview },
  id: { alumniReview: idMessages.alumniReview },
};

// The alumni pages live outside the `[locale]` route segment, so there is no
// next-intl provider to inherit a locale from. The language switcher stores
// the chosen locale in a cookie, which is the best signal available here.
function readLocale(): Locale {
  if (typeof document === "undefined") return "en";
  const match = /(?:^|;\s*)NEXT_LOCALE=(en|id)(?:;|$)/.exec(document.cookie);
  return match?.[1] === "id" ? "id" : "en";
}

// Cookies do not emit change events; React re-reads the store on render.
function subscribeToLocale() {
  return () => {};
}

function readServerLocale(): Locale {
  return "en";
}

function ReviewStatusContent({
  reviewStatus,
  reviewNote,
}: AlumniReviewStatusProps) {
  const t = useTranslations("alumniReview");

  const rejected = reviewStatus === "REJECTED";
  const statusLabel =
    reviewStatus === "APPROVED"
      ? t("statusApproved")
      : rejected
        ? t("statusRejected")
        : t("statusPending");
  const tone =
    reviewStatus === "APPROVED" ? "green" : rejected ? "red" : "neutral";
  const note = reviewNote?.trim();

  return (
    <Card
      className={`p-5 sm:p-6 ${rejected ? "border-red-300" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
          {t("statusTitle")}
        </p>
        <Badge tone={tone}>{statusLabel}</Badge>
      </div>

      {rejected && (
        <div className="mt-4 space-y-3">
          <h2 className="text-lg font-semibold text-[var(--rams-red)]">
            {t("rejectedTitle")}
          </h2>

          {note && (
            <div className="rounded-md border border-red-200 bg-red-50/50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                {t("reasonLabel")}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--rams-charcoal)]">
                {note}
              </p>
            </div>
          )}

          <p className="text-sm leading-6 text-[var(--rams-gray)]">
            {t("resubmitHint")}
          </p>
        </div>
      )}
    </Card>
  );
}

export default function AlumniReviewStatus(props: AlumniReviewStatusProps) {
  // The server renders the English copy; React re-renders with the stored
  // locale once the client store differs from the server snapshot, so the
  // hydration stays consistent.
  const locale = useSyncExternalStore(
    subscribeToLocale,
    readLocale,
    readServerLocale,
  );

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <ReviewStatusContent {...props} />
    </NextIntlClientProvider>
  );
}
