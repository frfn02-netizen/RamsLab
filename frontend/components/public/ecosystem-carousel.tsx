"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type EcosystemCard = {
  key: string;
  logo: string;
  logoAlt: string;
  name: string;
  description: string;
  href: string | null;
};

export default function EcosystemCarousel({
  cards,
}: {
  cards: EcosystemCard[];
}) {
  const count = cards.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const swipedRef = useRef(false);
  const pausedByInteraction = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const navigate = useCallback(
    (next: number) => {
      const target = ((next % count) + count) % count;
      if (target === activeIndex) return;
      setActiveIndex(target);
    },
    [activeIndex, count],
  );

  const goNext = useCallback(
    () => navigate(activeIndex + 1),
    [navigate, activeIndex],
  );
  const goPrev = useCallback(
    () => navigate(activeIndex - 1),
    [navigate, activeIndex],
  );

  useEffect(() => {
    if (isPaused || prefersReducedMotion.current) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, 6000);
    return () => clearInterval(id);
  }, [isPaused, count]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        pausedByInteraction.current = true;
        setIsPaused(true);
      } else if (pausedByInteraction.current) {
        pausedByInteraction.current = false;
        setIsPaused(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handlePointerEnter = useCallback(() => setIsPaused(true), []);
  const handlePointerLeave = useCallback(() => setIsPaused(false), []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    swipedRef.current = false;
    setIsPaused(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (swipedRef.current) return;
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        swipedRef.current = true;
        if (dx > 0) goPrev();
        else goNext();
      }
    },
    [goNext, goPrev],
  );

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setIsPaused(false), 3000);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goNext, goPrev],
  );

  return (
    <div
      className="ecosystem-carousel-shell mt-8"
      role="region"
      aria-label="Research ecosystem carousel"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        onClick={goPrev}
        className="ecosystem-carousel-btn ecosystem-carousel-btn--prev"
        aria-label="Previous ecosystem partner"
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

      <div className="ecosystem-carousel-viewport">
        {cards.map((card, i) => {
          let rel = (((i - activeIndex) % count) + count) % count;
          if (rel > count / 2) rel -= count;
          const pos = rel === 0 ? "center" : rel < 0 ? "left" : "right";

          const inner = (
            <div className="ecosystem-card-inner">
              <div className="ecosystem-card-logo-wrap">
                <Image
                  src={card.logo}
                  alt={card.logoAlt}
                  fill
                  sizes="180px"
                  className="object-contain"
                />
              </div>
              <div className="ecosystem-card-divider" />
              <div className="ecosystem-card-text">
                <p className="ecosystem-card-name">{card.name}</p>
                <p className="ecosystem-card-desc">{card.description}</p>
              </div>
            </div>
          );

          return (
            <div
              key={card.key}
              className={`ecosystem-carousel-card${!hasMounted ? " no-transition" : ""}${pos === "center" ? "" : " cursor-pointer"}`}
              data-pos={pos}
              onClick={() => {
                if (pos !== "center") navigate(i);
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${card.name} — ${pos === "center" ? "current slide" : pos === "left" ? "previous slide" : "next slide"}`}
            >
              <div className="ecosystem-card-frame">
                {card.href ? (
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full"
                    tabIndex={pos === "center" ? 0 : -1}
                    aria-label={card.logoAlt}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="h-full">{inner}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={goNext}
        className="ecosystem-carousel-btn ecosystem-carousel-btn--next"
        aria-label="Next ecosystem partner"
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

      <div
        className="ecosystem-carousel-dots"
        role="tablist"
        aria-label="Carousel navigation"
      >
        {cards.map((card, i) => (
          <button
            key={card.key}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            aria-current={i === activeIndex ? "true" : undefined}
            aria-label={`Go to ${card.name}`}
            className="ecosystem-carousel-dot"
            data-active={i === activeIndex}
            onClick={() => navigate(i)}
          />
        ))}
      </div>
    </div>
  );
}
