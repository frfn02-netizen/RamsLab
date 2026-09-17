"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getPublicHomepageVideos } from "@/lib/api/modules";
import type { PublicHomepageVideo } from "@/types/modules";
import PublicContainer from "./public-container";
import PageHero from "./page-hero";

export default function PublicVideosPage() {
  const t = useTranslations("videos");
  const common = useTranslations("common");
  const [videos, setVideos] = useState<PublicHomepageVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublicHomepageVideos()
      .then(setVideos)
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
      <PublicContainer className="py-10 sm:py-14">
        {loading ? (
          <p className="text-sm font-semibold text-[var(--gray)]">
            {common("loading")}
          </p>
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">
            {common("requestUnavailable")}
          </p>
        ) : videos.length === 0 ? (
          <p className="text-sm font-semibold text-[var(--gray)]">
            {common("noPublishedRecords")}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
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
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[var(--navy)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                        RAMS Laboratory
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
                    <svg
                      viewBox="0 0 68 48"
                      fill="none"
                      className="h-10 w-14 drop-shadow-md"
                      aria-hidden="true"
                    >
                      <path
                        d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26Z"
                        fill="rgba(255,255,255,0.9)"
                      />
                      <path d="M45 24 27 14v20" fill="var(--rams-red)" />
                    </svg>
                  </div>
                </div>
                {video.title && (
                  <div className="px-4 py-3.5">
                    <h3 className="text-sm font-semibold leading-snug text-[var(--navy)] line-clamp-2">
                      {video.title}
                    </h3>
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </PublicContainer>
    </main>
  );
}
