"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicHomepageVideos } from "@/lib/api/modules";
import type { PublicHomepageVideo } from "@/types/modules";
import {
  Skeleton,
  SkeletonGroup,
  SkeletonLines,
} from "@/components/skeletons";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M1 8h14M9 2l6 6-6 6" />
    </svg>
  );
}

function ChevronIcon({
  direction,
  className,
}: {
  direction: "left" | "right";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {direction === "left" ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function VideoFallback() {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-[var(--navy)]">
      <span className="text-center">
        <svg
          viewBox="0 0 68 48"
          fill="none"
          className="mx-auto h-12 w-16"
          aria-hidden="true"
        >
          <path
            d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26Z"
            fill="rgba(255,255,255,0.12)"
          />
          <path d="M45 24 27 14v20" fill="var(--rams-red)" />
        </svg>
        <span className="mt-2 block text-[0.65rem] font-medium uppercase tracking-wider text-white/40">
          RAMS Laboratory
        </span>
      </span>
    </span>
  );
}

function VideoSlide({
  video,
  index,
  total,
  active,
  onPlay,
}: {
  video: PublicHomepageVideo;
  index: number;
  total: number;
  active: boolean;
  onPlay: () => void;
}) {
  const t = useTranslations("home.video");
  const [imageFailed, setImageFailed] = useState(false);
  const title = video.title?.trim() || t("featured");
  const duration = video.duration?.trim();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} / ${total}`}
      data-active={active ? "true" : "false"}
      className={`w-[86%] max-w-[980px] shrink-0 snap-center transition-[transform,opacity] duration-500 ease-out sm:w-[78%] lg:w-[70%] xl:w-[64%] ${
        active
          ? "scale-100 opacity-100"
          : "scale-[0.94] opacity-65 hover:opacity-85"
      }`}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={`${t("playVideo")}: ${title}`}
        className={`group relative block w-full overflow-hidden rounded-[16px] border border-black/10 bg-[var(--navy)] text-left transition-shadow duration-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${
          active
            ? "shadow-[0_24px_60px_rgba(11,32,56,0.2)]"
            : "shadow-[0_12px_36px_rgba(11,32,56,0.12)]"
        }`}
      >
        <span className="relative block aspect-video w-full overflow-hidden">
          {video.thumbnailUrl && !imageFailed ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={video.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <VideoFallback />
          )}

          <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          {video.isFeatured && (
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-[var(--rams-red)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white shadow-[0_4px_14px_rgba(181,18,27,0.35)]">
              <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
              {t("featured")}
            </span>
          )}

          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition-transform duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
              <PlayIcon className="ml-1 h-7 w-7 sm:h-8 sm:w-8" />
            </span>
          </span>

          <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
            <span className="min-w-0">
              <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/65">
                {t("watchOnYouTube")}
              </span>
              <span className="mt-1.5 line-clamp-2 block font-display text-lg font-semibold leading-snug text-white sm:text-xl">
                {title}
              </span>
            </span>
            {duration ? (
              <span className="shrink-0 rounded-md bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {duration}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </div>
  );
}

function VideoModal({
  video,
  onClose,
}: {
  video: PublicHomepageVideo;
  onClose: () => void;
}) {
  const t = useTranslations("home.video");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={video.title ?? t("videoDialog")}
        className="relative w-full max-w-4xl overflow-hidden rounded-[16px] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("closeVideo")}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="aspect-video w-full bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?autoplay=1&rel=0`}
            title={video.title ?? t("videoDialog")}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        {(video.title || video.duration) && (
          <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
            <p className="truncate text-sm font-semibold text-white">
              {video.title ?? t("featured")}
            </p>
            {video.duration ? (
              <span className="shrink-0 text-xs font-semibold text-white/60">
                {video.duration}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCarousel({
  videos,
  onPlay,
}: {
  videos: PublicHomepageVideo[];
  onPlay: (video: PublicHomepageVideo) => void;
}) {
  const t = useTranslations("home.video");
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const getClosestIndex = useCallback(() => {
    const container = containerRef.current;
    if (!container || container.children.length === 0) return 0;

    const containerRect = container.getBoundingClientRect();
    const center = containerRect.left + container.clientWidth / 2;
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    Array.from(container.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const childCenter = rect.left + rect.width / 2;
      const distance = Math.abs(childCenter - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });

    return closest;
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current;
      const slide = container?.children[index] as HTMLElement | undefined;
      if (!container || !slide) return;

      const containerRect = container.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();
      const target =
        container.scrollLeft +
        (slideRect.left - containerRect.left) -
        (container.clientWidth - slide.clientWidth) / 2;
      const maxScroll = container.scrollWidth - container.clientWidth;

      container.scrollTo({
        left: Math.max(0, Math.min(target, maxScroll)),
        behavior,
      });
    },
    [],
  );

  const goTo = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(index, videos.length - 1));
      setActiveIndex(nextIndex);
      scrollToIndex(nextIndex);
    },
    [scrollToIndex, videos.length],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        setActiveIndex(getClosestIndex());
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, [getClosestIndex]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const container = containerRef.current;
    if (!container) return;

    dragRef.current = {
      active: true,
      startX: event.clientX,
      startScroll: container.scrollLeft,
      moved: false,
    };
    container.style.scrollSnapType = "none";
    container.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag.active || !container) return;

    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 4) drag.moved = true;
    container.scrollLeft = drag.startScroll - delta;
    event.preventDefault();
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag.active || !container) return;

    drag.active = false;
    container.style.scrollSnapType = "";

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);

      const index = getClosestIndex();
      setActiveIndex(index);
      scrollToIndex(index);
    }
  };

  const handleCardClick = (video: PublicHomepageVideo) => {
    if (suppressClickRef.current) return;
    onPlay(video);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/videos"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--rams-red-dark)]"
        >
          {t("allVideos")}
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label={t("previousVideo")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--navy)]/15 bg-white text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)]"
          >
            <ChevronIcon direction="left" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === videos.length - 1}
            aria-label={t("nextVideo")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--navy)]/15 bg-white text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)]"
          >
            <ChevronIcon direction="right" className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="hide-scrollbar mt-6 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 active:cursor-grabbing sm:gap-6"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDragStart={(event) => event.preventDefault()}
      >
        {videos.map((video, index) => (
          <VideoSlide
            key={video.id}
            video={video}
            index={index}
            total={videos.length}
            active={index === activeIndex}
            onPlay={() => handleCardClick(video)}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {videos.map((video, index) => (
          <button
            key={video.id}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`${t("goToVideo")} ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
            className={`h-2 rounded-full transition-[width,background-color] duration-300 ${
              index === activeIndex
                ? "w-6 bg-[var(--rams-red)]"
                : "w-2 bg-[var(--navy)]/20 hover:bg-[var(--navy)]/35"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function HomeVideoSection() {
  const t = useTranslations("home.video");
  const [videos, setVideos] = useState<PublicHomepageVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<PublicHomepageVideo | null>(
    null,
  );
  const closeModal = useCallback(() => setActiveVideo(null), []);

  useEffect(() => {
    getPublicHomepageVideos()
      .then(setVideos)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="relative overflow-hidden bg-[#F7F9FB] py-16 sm:py-20">
        <PublicContainer>
          <SkeletonGroup label={t("loading")}>
            <div className="max-w-2xl space-y-5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-12 w-full max-w-md" />
              <SkeletonLines lines={2} />
            </div>
            <Skeleton className="mt-8 aspect-video w-[86%] rounded-[16px] sm:w-[78%] lg:w-[70%]" />
          </SkeletonGroup>
        </PublicContainer>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-[#F7F9FB] py-16 sm:py-20">
        <PublicContainer>
          <div className="rounded-[16px] border border-[var(--border)] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[var(--gray)]">
              {t("error")}
            </p>
          </div>
        </PublicContainer>
      </section>
    );
  }

  if (videos.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[#F7F9FB] py-16 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(11,32,56,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,32,56,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full border border-[var(--rams-red)]/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[var(--rams-red)]/5 blur-3xl"
      />

      <PublicContainer className="relative">
        <RevealOnScroll className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--rams-red)]">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-[var(--navy)] sm:text-5xl">
            {t("title")}
          </h2>
          <span className="mt-6 block h-0.5 w-12 bg-[var(--rams-red)]" />
          <p className="mt-6 text-base leading-8 text-[var(--gray)] sm:text-lg">
            {t("description")}
          </p>
        </RevealOnScroll>

        <div className="mt-8">
          <VideoCarousel videos={videos} onPlay={setActiveVideo} />
        </div>
      </PublicContainer>

      {activeVideo &&
        typeof document !== "undefined" &&
        createPortal(
          <VideoModal video={activeVideo} onClose={closeModal} />,
          document.body,
        )}
    </section>
  );
}
