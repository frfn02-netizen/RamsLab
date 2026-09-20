"use client";

import { useCallback, useEffect, useSyncExternalStore, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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

function YoutubeCard({ video }: { video: PublicHomepageVideo }) {
  return (
    <a
      href={video.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="youtube-carousel-card group block border border-[var(--border)] bg-white transition-colors hover:border-[var(--rams-red)]"
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
        <div className="px-5 py-4">
          <h4 className="text-[0.95rem] font-semibold leading-snug text-[var(--navy)] line-clamp-2">
            {video.title}
          </h4>
        </div>
      )}
    </a>
  );
}

function YoutubeCarousel({
  videos,
  ariaLabel,
}: {
  videos: PublicHomepageVideo[];
  ariaLabel: string;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loopWidthRef = useRef(0);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const manualTransitionRef = useRef(false);
  const manualEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reducedMotion = useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const getMeasurements = useCallback(() => {
    const track = trackRef.current;
    if (!track || videos.length === 0) return null;
    const cards = track.querySelectorAll<HTMLElement>(
      ".youtube-carousel-card",
    );
    if (cards.length === 0) return null;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const cardWidth = cards[0].offsetWidth;
    const setWidth = videos.length * cardWidth + (videos.length - 1) * gap;
    return { cardWidth, gap, setWidth };
  }, [videos.length]);

  const applyOffset = useCallback((offset: number) => {
    const track = trackRef.current;
    if (!track) return;
    offsetRef.current = offset;
    track.style.transform = `translateX(${offset}px)`;
  }, []);

  const normalizeOffset = useCallback(() => {
    const lw = loopWidthRef.current;
    if (lw <= 0) return;
    let o = offsetRef.current;
    while (o > 0) o -= lw;
    while (o < -2 * lw) o += lw;
    if (o !== offsetRef.current) applyOffset(o);
  }, [applyOffset]);

  const startMarquee = useCallback(() => {
    if (
      runningRef.current ||
      manualTransitionRef.current ||
      reducedMotion ||
      videos.length === 0
    ) {
      return;
    }

    runningRef.current = true;
    lastTimeRef.current = performance.now();

    const tick = (now: DOMHighResTimeStamp) => {
      if (!runningRef.current) return;

      if (!pausedRef.current && !hoverRef.current && !focusRef.current) {
        const dt = (now - lastTimeRef.current) / 1000;
        offsetRef.current += 35 * dt;

        const lw = loopWidthRef.current;
        if (lw > 0) {
          if (offsetRef.current > 0) {
            offsetRef.current -= lw;
          } else if (offsetRef.current < -2 * lw) {
            offsetRef.current += lw;
          }
        }

        const track = trackRef.current;
        if (track) {
          track.style.transition = "none";
          track.style.transform = `translateX(${offsetRef.current}px)`;
        }
      }

      lastTimeRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [reducedMotion, videos.length]);

  const stopMarquee = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = 0;
  }, []);

  const resumeMarquee = useCallback(() => {
    manualTransitionRef.current = false;
    pausedRef.current = false;
    runningRef.current = false;
    lastTimeRef.current = performance.now();

    const rafId = requestAnimationFrame(() => {
      startMarquee();
    });

    rafRef.current = rafId;
  }, [startMarquee]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const sync = (initial = false) => {
      const m = getMeasurements();
      if (m && m.setWidth > 0) {
        loopWidthRef.current = m.setWidth;
        if (initial) {
          applyOffset(-m.setWidth);
        } else {
          normalizeOffset();
        }
      }
      vp.style.setProperty("--youtube-viewport-width", `${vp.clientWidth}px`);
    };

    sync(true);

    const ro = new ResizeObserver(() => sync(false));
    ro.observe(vp);
    return () => ro.disconnect();
  }, [getMeasurements, applyOffset, normalizeOffset]);

  useEffect(() => {
    if (!reducedMotion && videos.length > 0) startMarquee();
    return () => stopMarquee();
  }, [reducedMotion, videos.length, startMarquee, stopMarquee]);

  const readCurrentOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return offsetRef.current;
    const cs = getComputedStyle(track).transform;
    if (!cs || cs === "none") return offsetRef.current;
    const m = cs.match(/matrix\(([^)]+)\)/);
    if (m) {
      const v = m[1].split(",").map(Number);
      return v[4] || 0;
    }
    return offsetRef.current;
  }, []);

  const startManualTransition = useCallback(
    (targetOffset: number) => {
      const track = trackRef.current;
      if (!track) return;

      stopMarquee();

      if (manualEndTimerRef.current) {
        clearTimeout(manualEndTimerRef.current);
        manualEndTimerRef.current = null;
      }

      manualTransitionRef.current = true;
      pausedRef.current = true;

      track.style.transition =
        "transform 500ms cubic-bezier(0.22, 0.61, 0.36, 1)";
      track.style.transform = `translateX(${targetOffset}px)`;
      offsetRef.current = targetOffset;

      let completed = false;

      const finishTransition = () => {
        if (completed) return;
        completed = true;

        track.removeEventListener("transitionend", handleTransitionEnd);

        if (manualEndTimerRef.current) {
          clearTimeout(manualEndTimerRef.current);
          manualEndTimerRef.current = null;
        }

        track.style.transition = "none";
        normalizeOffset();
        resumeMarquee();
      };

      const handleTransitionEnd = (event: TransitionEvent) => {
        if (
          event.target === track &&
          event.propertyName === "transform"
        ) {
          finishTransition();
        }
      };

      track.addEventListener("transitionend", handleTransitionEnd);

      manualEndTimerRef.current = setTimeout(() => {
        finishTransition();
      }, 550);
    },
    [stopMarquee, normalizeOffset, resumeMarquee],
  );

  const move = useCallback(
    (direction: 1 | -1) => {
      if (manualTransitionRef.current) return;

      const m = getMeasurements();
      if (!m) return;

      const lw = loopWidthRef.current || m.setWidth;
      if (lw <= 0) return;

      const currentOffset = readCurrentOffset();
      const step = m.cardWidth + m.gap;
      let targetOffset = currentOffset + direction * step;

      if (targetOffset > 0) {
        targetOffset -= lw;
      } else if (targetOffset < -2 * lw) {
        targetOffset += lw;
      }

      startManualTransition(targetOffset);
    },
    [getMeasurements, readCurrentOffset, startManualTransition],
  );

  const handlePointerEnter = useCallback(() => {
    hoverRef.current = true;
  }, []);

  const handlePointerLeave = useCallback(() => {
    hoverRef.current = false;
  }, []);

  const handleFocusIn = useCallback(() => {
    focusRef.current = true;
  }, []);

  const handleFocusOut = useCallback(() => {
    setTimeout(() => {
      if (
        shellRef.current &&
        !shellRef.current.contains(document.activeElement)
      ) {
        focusRef.current = false;
      }
    }, 0);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      }
    },
    [move],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (manualEndTimerRef.current) clearTimeout(manualEndTimerRef.current);
    };
  }, []);

  if (videos.length === 0) return null;

  return (
    <div
      ref={shellRef}
      className="youtube-carousel-shell"
      role="region"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocusIn}
      onBlur={handleFocusOut}
    >
      <button
        type="button"
        onClick={() => move(-1)}
        className="ecosystem-carousel-btn ecosystem-carousel-btn--prev"
        aria-label="Previous videos"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div ref={viewportRef} className="youtube-carousel-viewport">
        <div ref={trackRef} className="youtube-marquee-track">
          {[...videos, ...videos, ...videos].map((video, index) => (
            <YoutubeCard key={`${video.id}-${index}`} video={video} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => move(1)}
        className="ecosystem-carousel-btn ecosystem-carousel-btn--next"
        aria-label="Next videos"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
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
      <section className="bg-[var(--background-light)] py-14 sm:py-16">
        <PublicContainer>
          <div className="flex min-h-[20rem] items-center justify-center">
            <p className="text-sm text-[var(--gray)]">{t("loading")}…</p>
          </div>
        </PublicContainer>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-[var(--background-light)] py-14 sm:py-16">
        <PublicContainer>
          <div className="flex min-h-[12rem] items-center justify-center">
            <p className="text-sm text-[var(--gray)]">{t("error")}</p>
          </div>
        </PublicContainer>
      </section>
    );
  }

  if (videos.length === 0) return null;

  return (
    <section className="bg-[var(--background-light)] py-14 sm:py-16">
      <PublicContainer>
        <RevealOnScroll className="mb-8 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--rams-red)]">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--navy)] sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base leading-7 text-[var(--gray)] sm:text-lg">
            {t("description")}
          </p>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className="mb-4 flex items-end justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gray)]">
              {t("latestVideos")}
            </h3>
            {videos.length > 10 && (
              <Link
                href="/videos"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--rams-red-dark)]"
              >
                {t("viewAll")}
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3"
                  aria-hidden="true"
                >
                  <path d="M1 8h14M9 2l6 6-6 6" />
                </svg>
              </Link>
            )}
          </div>
          <YoutubeCarousel
            videos={videos}
            ariaLabel={t("latestVideos")}
          />
        </RevealOnScroll>
      </PublicContainer>
    </section>
  );
}
