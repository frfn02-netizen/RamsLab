"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { assetPath } from "@/lib/asset-path";
import type { PublicEvent } from "@/types/modules";
import PublicContainer from "../public-container";
import PageHero from "../page-hero";

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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isVideoMuted;
    void video.play();
    setIsVideoPlaying(true);
  };

  return (
    <div>
      <PageHero eyebrow="" title={t("title")} description={t("description")} />
      <PublicContainer className="max-w-4xl py-16 sm:py-20 lg:py-24">
        <div className="relative mb-10 aspect-video w-full overflow-hidden border border-[var(--border)] bg-[var(--rams-gray-light)] shadow-[0_8px_24px_rgba(11,32,56,0.05)]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={assetPath("/assets/0722.mp4")}
            poster={assetPath("/assets/engineers.jpg")}
            muted={isVideoMuted}
            loop
            playsInline
            preload="none"
            controls={isVideoPlaying}
            onPlay={() => setIsVideoPlaying(true)}
          />
          {!isVideoPlaying && (
            <button
              type="button"
              onClick={playVideo}
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center bg-[var(--navy)]/25 text-white transition-colors hover:bg-[var(--navy)]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/60 bg-[var(--navy)]/80 shadow-lg">
                <svg
                  viewBox="0 0 24 24"
                  className="ml-1 h-7 w-7"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
          {isVideoPlaying && (
            <button
              type="button"
              onClick={() => setIsVideoMuted((muted) => !muted)}
              aria-label={isVideoMuted ? "Unmute video" : "Mute video"}
              className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-[var(--navy)]/85 text-white shadow-sm transition-colors hover:bg-[var(--navy)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
          )}
        </div>
        {events.length === 0 ? (
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
    </div>
  );
}
