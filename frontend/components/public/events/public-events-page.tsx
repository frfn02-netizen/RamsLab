"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { assetPath } from "@/lib/asset-path";
import type { PublicEvent } from "@/types/modules";

export default function PublicEventsPage({
  initialEvents,
}: {
  initialEvents: PublicEvent[];
}) {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("events");
  const common = useTranslations("common");
  const events = initialEvents;
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      video.autoplay = false;
      video.pause();
      return;
    }

    void video.play().catch(() => {});
  }, []);

  const toggleMuted = () => {
    const video = videoRef.current;
    const nextMuted = !isVideoMuted;
    setIsVideoMuted(nextMuted);
    if (video) {
      video.muted = nextMuted;
      video.defaultMuted = nextMuted;
    }
  };

  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="grid grid-cols-1 gap-6 border-b border-stone-200 py-8 lg:grid-cols-12 lg:items-end lg:py-10">
          <div className="lg:col-span-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-[1.12] tracking-tight text-stone-900 sm:text-4xl">
              {t("title")}
            </h1>
          </div>
          <div className="lg:col-span-6">
            <p className="max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base lg:ml-auto">
              {t("description")}
            </p>
          </div>
        </header>

        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-stone-200 bg-stone-950 lg:aspect-[21/9]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={assetPath("/assets/0722.mp4")}
            poster={assetPath("/assets/engineers.jpg")}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
            className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-stone-950/80 text-white shadow-sm transition-colors hover:bg-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {isVideoMuted ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path d="m16 9 5 5m0-5-5 5" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18 6a8 8 0 0 1 0 12" />
              </svg>
            )}
          </button>
        </div>

        {events.length === 0 ? (
          <div className="mt-10 pb-16">
            <p className="rounded-xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center text-sm font-semibold text-stone-500">
              {common("noPublishedRecords")}
            </p>
          </div>
        ) : (
          <section className="mt-10 pb-16" aria-label={t("title")}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => {
                const title = localized(event.title);
                const location = localized(event.location);
                const dateLabel = event.eventDate
                  ? new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                    }).format(new Date(event.eventDate))
                  : "";
                const description = localized(event.description);

                return (
                  <article
                    key={event.id}
                    className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white transition-all duration-200 hover:border-stone-300 hover:shadow-sm"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
                      {event.image?.url ? (
                        <Image
                          src={event.image.url}
                          alt={localized(event.image.alt) || title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      {(dateLabel || location) && (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-700">
                          {dateLabel ? (
                            <time dateTime={event.eventDate ?? undefined}>
                              {dateLabel}
                            </time>
                          ) : null}
                          {dateLabel && location ? (
                            <span aria-hidden="true"> · </span>
                          ) : null}
                          {location ? <span>{location}</span> : null}
                        </p>
                      )}

                      <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug text-stone-900 transition-colors group-hover:text-red-700">
                        {title}
                      </h2>

                      {description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
                          {description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
