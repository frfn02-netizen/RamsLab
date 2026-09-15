"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getPublicHomepageVideos } from "@/lib/api/modules";
import type { PublicHomepageVideo } from "@/types/modules";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 68 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26Z"
        fill="rgba(255,255,255,0.9)"
      />
      <path d="M45 24 27 14v20" fill="var(--rams-red)" />
    </svg>
  );
}

function YoutubeFallbackVisual({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-[var(--navy)] ${className}`}
    >
      <div className="text-center">
        <svg
          viewBox="0 0 68 48"
          fill="none"
          className="mx-auto h-10 w-14"
          aria-hidden="true"
        >
          <path
            d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26Z"
            fill="rgba(255,255,255,0.12)"
          />
          <path d="M45 24 27 14v20" fill="var(--rams-red)" />
        </svg>
        <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-wider text-white/40">
          RAMS Laboratory
        </p>
      </div>
    </div>
  );
}

export default function HomeVideoSection() {
  const t = useTranslations("home.video");
  const [videos, setVideos] = useState<PublicHomepageVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublicHomepageVideos()
      .then(setVideos)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-[var(--background-light)] py-20 sm:py-24">
        <PublicContainer>
          <div className="flex min-h-[20rem] items-center justify-center">
            <p className="text-sm text-[var(--gray)]">Loading videos…</p>
          </div>
        </PublicContainer>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-[var(--background-light)] py-20 sm:py-24">
        <PublicContainer>
          <div className="flex min-h-[12rem] items-center justify-center">
            <p className="text-sm text-[var(--gray)]">
              Unable to load videos at this time.
            </p>
          </div>
        </PublicContainer>
      </section>
    );
  }

  if (videos.length === 0) return null;

  const featured = videos.find((v) => v.isFeatured) ?? videos[0];
  const latest = videos.filter((v) => v.id !== featured.id);

  return (
    <section className="bg-[var(--background-light)] py-20 sm:py-24">
      <PublicContainer>
        <RevealOnScroll className="mb-12 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--rams-red)]">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--navy)] sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--gray)] sm:text-lg">
            {t("description")}
          </p>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <a
              href={featured.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden border border-[var(--border)] bg-white"
            >
              {featured.thumbnailUrl ? (
                <div className="relative aspect-video w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={featured.thumbnailUrl}
                    alt={featured.title || "YouTube video"}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <YoutubeFallbackVisual className="aspect-video w-full" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                <PlayIcon className="h-14 w-18 drop-shadow-md sm:h-16 sm:w-20" />
              </div>
            </a>

            <div className="flex flex-col justify-center">
              {featured.title && (
                <h3 className="font-display text-xl font-bold text-[var(--navy)] sm:text-2xl">
                  {featured.title}
                </h3>
              )}
              <a
                href={featured.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--rams-red-dark)] sm:mt-6"
              >
                {t("watchOnYouTube")}
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M1 8h14M9 2l6 6-6 6" />
                </svg>
              </a>
            </div>
          </div>
        </RevealOnScroll>

        {latest.length > 0 && (
          <RevealOnScroll className="mt-14">
            <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-[var(--gray)]">
              {t("latestVideos")}
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((video) => (
                <a
                  key={video.id}
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block border border-[var(--border)] bg-white transition-colors hover:border-[var(--rams-red)]"
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                    {video.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title || "YouTube video"}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <YoutubeFallbackVisual className="h-full w-full" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                      <PlayIcon className="h-10 w-14 drop-shadow-md" />
                    </div>
                  </div>
                  {video.title && (
                    <div className="px-4 py-3.5">
                      <h4 className="text-sm font-semibold leading-snug text-[var(--navy)] line-clamp-2">
                        {video.title}
                      </h4>
                    </div>
                  )}
                </a>
              ))}
            </div>
          </RevealOnScroll>
        )}
      </PublicContainer>
    </section>
  );
}
