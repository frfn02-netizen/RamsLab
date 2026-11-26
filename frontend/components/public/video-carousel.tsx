"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Play,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "@/lib/youtube";

export interface CmsVideoItem {
  id?: string;
  youtubeUrl: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  displayOrder: number;
  featured: boolean;
  published: boolean;
}

export interface VideoCarouselProps {
  videos: CmsVideoItem[];
}

type PreparedVideo = CmsVideoItem & { videoId: string };
type VideoCopy = "left" | "middle" | "right";
type TrackVideo = {
  item: PreparedVideo;
  realIndex: number;
  copy: VideoCopy;
  key: string;
};

const CARD_WIDTH_CLASS =
  "w-[300px] shrink-0 sm:w-[360px] lg:w-[390px] xl:w-[400px] 2xl:w-[460px]";

const MOTION_CLASS =
  "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

const FALLBACK_TITLE_KEY = "titleFallback";

function prepareVideos(videos: CmsVideoItem[]): PreparedVideo[] {
  return videos
    .filter((video) => video.published !== false)
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .flatMap((video) => {
      const videoId = extractYouTubeId(video.youtubeUrl);
      return videoId ? [{ ...video, videoId }] : [];
    });
}

function cardMetrics(viewportWidth: number) {
  if (viewportWidth >= 1536) return { cardWidth: 460, gap: 24 };
  if (viewportWidth >= 1280) return { cardWidth: 400, gap: 24 };
  if (viewportWidth >= 1024) return { cardWidth: 390, gap: 24 };
  if (viewportWidth >= 640) return { cardWidth: 360, gap: 24 };
  return { cardWidth: 300, gap: 24 };
}

function VideoThumbnail({
  item,
  active,
}: {
  item: PreparedVideo;
  active: boolean;
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);

  const sources = useMemo(() => {
    const provided = item.thumbnailUrl?.trim();
    const maxres = getYouTubeThumbnailUrl(item.videoId, "maxres");
    const hq = getYouTubeThumbnailUrl(item.videoId, "hq");
    return [provided, maxres, hq].filter(
      (source, index, all): source is string =>
        Boolean(source) && all.indexOf(source) === index,
    );
  }, [item.thumbnailUrl, item.videoId]);

  const src = sources[sourceIndex];

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !src) return;

    if (image.complete && image.naturalWidth === 0 && image.currentSrc) {
      const frame = requestAnimationFrame(() => {
        setSourceIndex((current) => current + 1);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [src]);

  const mediaOpacity = active
    ? "opacity-100"
    : "opacity-50 group-hover:opacity-80";

  return (
    <div
      className={`h-full w-full transition-opacity duration-500 ${mediaOpacity}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- CMS thumbnails can be arbitrary external URLs.
        <img
          key={src}
          ref={imageRef}
          src={src}
          alt=""
          loading={active ? "eager" : "lazy"}
          fetchPriority={active ? "high" : "auto"}
          decoding="async"
          draggable={false}
          onError={() => setSourceIndex((current) => current + 1)}
          className={`h-full w-full object-cover ${
            active
              ? "transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              : ""
          }`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0B1420] text-slate-500">
          <Play className="h-7 w-7" aria-hidden="true" />
          <span className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.18em]">
            RAMS Laboratory
          </span>
        </div>
      )}
    </div>
  );
}

function VideoCard({
  item,
  index,
  total,
  active,
  clickable,
  focusable,
  ariaHidden,
  copy,
  onActivate,
}: {
  item: PreparedVideo;
  index: number;
  total: number;
  active: boolean;
  clickable: boolean;
  focusable: boolean;
  ariaHidden: boolean;
  copy: VideoCopy;
  onActivate: () => void;
}) {
  const t = useTranslations("home.video");
  const title = item.title?.trim() || t(FALLBACK_TITLE_KEY);

  return (
    <article
      data-active={active ? "true" : "false"}
      data-copy={copy}
      aria-hidden={ariaHidden}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} / ${total}`}
      className={`group relative isolate ${CARD_WIDTH_CLASS} overflow-hidden rounded-2xl border ${MOTION_CLASS} ${
        active
          ? "z-10 scale-100 border-slate-200 bg-white shadow-[0_20px_40px_-15px_rgba(15,23,42,0.12)]"
          : "z-0 scale-[0.94] border-slate-200/70 bg-white/75 hover:bg-white"
      } ${clickable ? "cursor-pointer" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 z-20 h-1 bg-[#D92D20] transition-opacity duration-500 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />

      {clickable ? (
        <div
          data-card-overlay
          aria-hidden="true"
          onClick={onActivate}
          className="absolute inset-0 z-0"
        />
      ) : null}

      <div className="pointer-events-none relative z-10">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-slate-900">
          <VideoThumbnail item={item} active={active} />

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white backdrop-blur-md transition-all duration-300 ${
              active
                ? "opacity-100 group-hover:scale-110 group-hover:border-[#D92D20] group-hover:bg-[#D92D20]"
                : "opacity-0"
            }`}
          >
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          </div>
        </div>

        <div className="flex flex-col items-center p-5 text-center sm:p-6">
          <h3
            className={`line-clamp-2 text-base font-semibold md:text-lg ${
              active ? "text-slate-900" : "text-slate-500"
            }`}
          >
            {title}
          </h3>
          <p
            className={`mt-1 flex items-center justify-center gap-1 text-xs ${
              active ? "text-slate-600" : "text-slate-400"
            }`}
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            RAMS Laboratory • YouTube
          </p>

          <button
            type="button"
            onClick={onActivate}
            tabIndex={focusable ? undefined : -1}
            aria-label={`${t("watchVideo")}: ${title}`}
            className={`pointer-events-auto mt-4 rounded-full border border-transparent px-6 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-slate-900 font-semibold text-white hover:bg-[#D92D20]"
                : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {t("watchVideo")}
          </button>
        </div>
      </div>
    </article>
  );
}

function VideoModal({
  item,
  onClose,
}: {
  item: PreparedVideo;
  onClose: () => void;
}) {
  const t = useTranslations("home.video");
  const closeRef = useRef<HTMLButtonElement>(null);
  const title = item.title?.trim() || t(FALLBACK_TITLE_KEY);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("closeVideo")}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="aspect-video w-full bg-black">
          <iframe
            className="h-full w-full"
            src={getYouTubeEmbedUrl(item.videoId)}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function VideoCarousel({ videos }: VideoCarouselProps) {
  const t = useTranslations("home.video");
  const items = useMemo(() => prepareVideos(videos), [videos]);
  const count = items.length;
  const hasEdgeContext = count >= 3;

  const initialActive = useMemo(() => {
    const featured = items.findIndex((item) => item.featured);
    return featured >= 0 ? featured : 0;
  }, [items]);

  const [trackIndex, setTrackIndex] = useState(() =>
    hasEdgeContext ? count + initialActive : initialActive,
  );
  const [modalItem, setModalItem] = useState<PreparedVideo | null>(null);
  const [visibleRange, setVisibleRange] = useState(2);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isTabHidden, setIsTabHidden] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const baseOffsetRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const gestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    pointerId: -1,
    moved: false,
  });
  const suppressClickRef = useRef(false);

  const active = count ? ((trackIndex % count) + count) % count : 0;

  const autoplayAllowed =
    count > 1 &&
    !isHovered &&
    !isFocusedWithin &&
    !isDragging &&
    modalItem === null &&
    !isTabHidden &&
    !prefersReducedMotion;

  const trackVideos = useMemo<TrackVideo[]>(() => {
    const copies: VideoCopy[] = hasEdgeContext
      ? ["left", "middle", "right"]
      : ["middle"];

    return copies.flatMap((copy) =>
      items.map((item, realIndex) => ({
        item,
        realIndex,
        copy,
        key: `${copy}-${item.id ?? item.videoId}-${realIndex}`,
      })),
    );
  }, [hasEdgeContext, items]);

  const closeModal = useCallback(() => setModalItem(null), []);

  const normalizeTrackPosition = useCallback(
    (index: number) => {
      const normalized = count
        ? count + (((index % count) + count) % count)
        : 0;
      const track = trackRef.current;
      const viewport = viewportRef.current;

      if (track && viewport) {
        const card = track.children[normalized] as HTMLElement | undefined;

        if (card) {
          const offset =
            viewport.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
          track.style.transition = "none";
          track.style.transform = `translate3d(${offset}px, 0, 0)`;
          baseOffsetRef.current = offset;
        }

        setTrackIndex(normalized);
        void track.offsetWidth;
        track.style.transition = "";
      } else {
        setTrackIndex(normalized);
      }

      dragOffsetRef.current = 0;
      return normalized;
    },
    [count],
  );

  const normalizeIfNeeded = useCallback(
    (index: number) => {
      if (!hasEdgeContext || (index >= count && index < 2 * count)) {
        return index;
      }
      return normalizeTrackPosition(index);
    },
    [count, hasEdgeContext, normalizeTrackPosition],
  );

  const moveBy = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      const base = normalizeIfNeeded(trackIndex);
      const next = base + delta;

      if (!hasEdgeContext) {
        setTrackIndex(((next % count) + count) % count);
        return;
      }

      setTrackIndex(next);
    },
    [count, hasEdgeContext, normalizeIfNeeded, trackIndex],
  );

  const goTo = useCallback(
    (index: number) => {
      if (!count) return;
      normalizeIfNeeded(trackIndex);
      setTrackIndex(hasEdgeContext ? count + index : index);
    },
    [count, hasEdgeContext, normalizeIfNeeded, trackIndex],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || !trackVideos.length) return;

    const updateOffset = () => {
      const activeCard = track.children[trackIndex] as HTMLElement | undefined;
      if (!activeCard) return;

      const offset =
        viewport.clientWidth / 2 -
        (activeCard.offsetLeft + activeCard.offsetWidth / 2);
      baseOffsetRef.current = offset;
      const isFirstPosition = track.dataset.ready !== "true";

      if (isFirstPosition) track.style.transition = "none";
      track.style.transform = `translate3d(${offset}px, 0, 0)`;

      if (isFirstPosition) {
        void track.offsetWidth;
        track.style.transition = "";
        track.dataset.ready = "true";
      }
    };

    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(viewport);
    observer.observe(track);

    return () => observer.disconnect();
  }, [trackIndex, trackVideos.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateRange = () => {
      const { cardWidth, gap } = cardMetrics(window.innerWidth);
      const range = Math.max(
        0,
        Math.floor(
          (viewport.clientWidth / 2 + cardWidth / 2) / (cardWidth + gap),
        ),
      );
      setVisibleRange(range);
    };

    const observer = new ResizeObserver(updateRange);
    observer.observe(viewport);
    const frame = requestAnimationFrame(updateRange);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      setIsTabHidden(document.visibilityState === "hidden");
    };
    const frame = requestAnimationFrame(updateVisibility);
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setPrefersReducedMotion(query.matches);
    };
    const frame = requestAnimationFrame(updateMotionPreference);
    query.addEventListener("change", updateMotionPreference);

    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (!autoplayAllowed) return;

    const timer = window.setInterval(() => {
      if (gestureRef.current.active || document.visibilityState === "hidden") {
        return;
      }
      moveBy(1);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [autoplayAllowed, moveBy]);

  const activateCard = useCallback(
    (cardIndex: number, realIndex: number) => {
      if (suppressClickRef.current) return;

      if (cardIndex === trackIndex) {
        setModalItem(items[realIndex] ?? null);
      } else {
        setTrackIndex(cardIndex);
      }
    },
    [items, trackIndex],
  );

  const handleTrackTransitionEnd = (
    event: ReactTransitionEvent<HTMLDivElement>,
  ) => {
    if (
      event.target !== trackRef.current ||
      event.propertyName !== "transform"
    ) {
      return;
    }

    if (hasEdgeContext && (trackIndex < count || trackIndex >= 2 * count)) {
      normalizeTrackPosition(trackIndex);
    }
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    }
  };

  const snapToTrackIndex = (index: number) => {
    const track = trackRef.current;
    const viewport = viewportRef.current;
    if (!track || !viewport) return;

    const card = track.children[index] as HTMLElement | undefined;
    if (!card) return;

    const offset =
      viewport.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
    track.style.transition = "";
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
    baseOffsetRef.current = offset;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    setIsDragging(true);
    dragOffsetRef.current = 0;
    gestureRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    };
    suppressClickRef.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture.active) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.moved) {
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 4) return;
      gesture.moved = true;
      try {
        viewportRef.current?.setPointerCapture(gesture.pointerId);
      } catch {
        gesture.pointerId = -1;
      }
    }

    if (Math.abs(dx) <= Math.abs(dy)) return;

    event.preventDefault();
    dragOffsetRef.current = dx;

    const track = trackRef.current;
    if (track) {
      track.style.transition = "none";
      track.style.transform = `translate3d(${baseOffsetRef.current + dx}px, 0, 0)`;
    }
  };

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture.active) return;

    gesture.active = false;
    setIsDragging(false);
    const dx = event.clientX - gesture.startX;
    const viewport = viewportRef.current;

    if (viewport?.hasPointerCapture(gesture.pointerId)) {
      viewport.releasePointerCapture(gesture.pointerId);
    }

    const moved = gesture.moved;
    gesture.moved = false;

    if (!moved) {
      dragOffsetRef.current = 0;
      return;
    }

    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    dragOffsetRef.current = 0;

    const track = trackRef.current;
    if (track) track.style.transition = "";

    if (dx < -40) {
      moveBy(1);
    } else if (dx > 40) {
      moveBy(-1);
    } else {
      snapToTrackIndex(trackIndex);
    }
  };

  const cancelPointer = () => {
    const gesture = gestureRef.current;
    gesture.active = false;
    gesture.moved = false;
    setIsDragging(false);
    dragOffsetRef.current = 0;
    snapToTrackIndex(trackIndex);
  };

  if (!count) return null;

  return (
    <>
      <style>{`@keyframes video-autoplay-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>

      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocusedWithin(true)}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setIsFocusedWithin(false);
          }
        }}
      >
        <div
          ref={viewportRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("title")}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={cancelPointer}
          className="relative w-full touch-pan-y select-none overflow-hidden py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400/50"
        >
          <div
            ref={trackRef}
            onTransitionEnd={handleTrackTransitionEnd}
            className={`flex w-max items-start gap-6 will-change-transform ${MOTION_CLASS}`}
          >
            {trackVideos.map((video, cardIndex) => {
              const isMiddle = video.copy === "middle";
              const distance = Math.abs(video.realIndex - active);
              const isActive = cardIndex === trackIndex;
              const accessible = isMiddle && distance <= visibleRange;
              const clickable = !isMiddle || distance <= 2;
              const focusable = accessible && distance <= 1;
              const ariaHidden = !accessible;

              return (
                <VideoCard
                  key={video.key}
                  item={video.item}
                  index={video.realIndex}
                  total={count}
                  active={isActive}
                  clickable={clickable}
                  focusable={focusable}
                  ariaHidden={ariaHidden}
                  copy={video.copy}
                  onActivate={() => activateCard(cardIndex, video.realIndex)}
                />
              );
            })}
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-16 bg-gradient-to-r from-[#F8FAFC] to-transparent md:block lg:w-24"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-16 bg-gradient-to-l from-[#F8FAFC] to-transparent md:block lg:w-24"
          />
        </div>

        <div className="mx-auto mt-6 max-w-7xl px-6 sm:mt-8">
          <div className="flex flex-col items-center gap-4 sm:grid sm:grid-cols-3 sm:items-center">
            <Link
              href="/videos"
              className="order-2 inline-flex items-center gap-2 self-start text-sm text-slate-600 transition-colors hover:text-slate-950 sm:order-1 sm:justify-self-start"
            >
              {t("allVideos")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <div className="order-1 flex items-center justify-center gap-3 sm:order-2">
              <button
                type="button"
                onClick={() => moveBy(-1)}
                disabled={count <= 1}
                aria-label={t("previousVideo")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="flex items-center">
                {items.map((item, index) => (
                  <button
                    key={item.id ?? `${item.videoId}-dot`}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`${t("goToVideo")} ${index + 1}`}
                    aria-current={index === active ? "true" : undefined}
                    className={`flex h-9 items-center justify-center ${
                      index === active ? "w-8" : "w-4"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        index === active
                          ? "relative w-8 overflow-hidden bg-slate-200"
                          : "w-1.5 bg-slate-300 hover:bg-slate-400"
                      }`}
                    >
                      {index === active ? (
                        <span
                          key={`${active}-${autoplayAllowed ? "running" : "paused"}`}
                          className="block h-full w-full origin-left bg-[#D92D20]"
                          style={{
                            animation:
                              "video-autoplay-progress 4500ms linear forwards",
                            animationPlayState: autoplayAllowed
                              ? "running"
                              : "paused",
                          }}
                        />
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => moveBy(1)}
                disabled={count <= 1}
                aria-label={t("nextVideo")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalItem ? <VideoModal item={modalItem} onClose={closeModal} /> : null}
    </>
  );
}
