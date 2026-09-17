"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPublicEvents } from "@/lib/api/modules";
import type { PublicEvent } from "@/types/modules";
import PublicContainer from "../public-container";
import PageHero from "../page-hero";

export default function PublicEventsPage() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("events");
  const common = useTranslations("common");
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  useEffect(() => {
    getPublicEvents()
      .then(setEvents)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <PageHero
        eyebrow=""
        title={t("title")}
        description={t("description")}
      />
      <PublicContainer className="max-w-4xl py-16 sm:py-20">
        {loading ? (
          <p className="text-sm font-semibold text-[var(--rams-gray)]">
            {common("loading")}
          </p>
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">
            {common("requestUnavailable")}
          </p>
        ) : events.length === 0 ? (
          <p className="text-sm font-semibold text-[var(--rams-gray)]">
            {common("noPublishedRecords")}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {events.map((event) => (
              <article
                key={event.id}
                className="border border-[var(--border)] bg-white p-4 shadow-[0_8px_24px_rgba(11,32,56,0.05)]"
              >
                {event.image?.url && (
                  <div className="relative mb-4 aspect-[16/9] overflow-hidden bg-[var(--rams-gray-light)]">
                    <Image
                      src={event.image.url}
                      alt={localized(event.image.alt) || localized(event.title)}
                      fill
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--rams-red)]">
                  {event.eventDate && (
                    <time dateTime={event.eventDate}>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(new Date(event.eventDate))}
                    </time>
                  )}
                  {localized(event.location) && (
                    <span>{localized(event.location)}</span>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-bold text-[var(--navy)]">
                  {localized(event.title)}
                </h2>
                {localized(event.description) && (
                  <p className="mt-2 text-sm leading-6 text-[var(--rams-gray)]">
                    {localized(event.description)}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </PublicContainer>
    </main>
  );
}
