"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  getPublicPublicationPdfUrl,
  getPublicResearchHighlights,
} from "@/lib/api/modules";
import type { ResearchHighlight } from "@/types/modules";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";

const AUTOPLAY_MS = 7000;

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return <span aria-hidden="true">{direction === "previous" ? "←" : "→"}</span>;
}

export default function ResearchHighlights() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("home");
  const [items, setItems] = useState<ResearchHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getPublicResearchHighlights()
        .then(setItems)
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActive((current) => (current + 1) % items.length);
      }
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion]);

  function interact(next: number) {
    setActive((next + items.length) % items.length);
    setPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setPaused(false), AUTOPLAY_MS * 2);
  }

  if (loading) {
    return (
      <section className="min-h-[75svh] bg-[var(--navy-deep)] py-20 text-white">
        <PublicContainer>
          <PublicLoading label={t("researchHighlights.loading")} />
        </PublicContainer>
      </section>
    );
  }
  if (error) {
    return (
      <section className="min-h-[75svh] bg-[var(--navy-deep)] py-20 text-white">
        <PublicContainer>
          <PublicError message={t("researchHighlights.error")} />
        </PublicContainer>
      </section>
    );
  }
  if (!items.length) return null;

  const item = items[active] ?? items[0];
  const headline = item.headline[locale];
  const publication = item.publication;
  const imageAlt = `${t("researchHighlights.imageAlt")} — ${headline}`;

  return (
    <section
      className="relative min-h-[75svh] overflow-hidden bg-[var(--navy-deep)] text-white sm:min-h-[calc(100svh-5rem)]"
      aria-label={t("researchHighlights.carouselLabel")}
    >
      <div className="absolute inset-0 bg-[var(--navy)]">
        {item.image?.url ? (
          <Image
            src={item.image.url}
            alt={imageAlt}
            fill
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center bg-[linear-gradient(135deg,var(--navy),#183c59)]"
            aria-hidden="true"
          >
            <span className="font-display text-7xl font-bold tracking-tight text-white/10 sm:text-[10rem]">
              RAMS
            </span>
          </div>
        )}
      </div>
      <div
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,24,38,0.96)_0%,rgba(8,24,38,0.82)_34%,rgba(8,24,38,0.48)_66%,rgba(8,24,38,0.3)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgba(8,24,38,0.72),transparent_42%)]"
        aria-hidden="true"
      />

      <PublicContainer className="relative z-10 flex min-h-[75svh] flex-col justify-between py-12 sm:min-h-[calc(100svh-5rem)] sm:py-16 lg:py-20">
        <div
          key={item.id}
          className="research-highlight-enter max-w-3xl py-16 sm:py-20 lg:max-w-[55%]"
          aria-live="polite"
          aria-roledescription="slide"
          aria-label={`${active + 1} / ${items.length}`}
        >
          <p className="eyebrow !text-[var(--rams-red)]">
            {t("researchHighlights.question")}
          </p>
          <h2 className="mt-5 font-display text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            {headline}
          </h2>
          <div className="mt-8 max-w-2xl border-t border-white/30 pt-5">
            <p className="text-base font-semibold leading-6 text-white">
              {publication.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {publication.authors.join(", ")} · {publication.year}
              {publication.journal ? ` · ${publication.journal}` : ""}
            </p>
          </div>
          {publication.pdfUrl ? (
            <a
              href={getPublicPublicationPdfUrl(publication.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-9 inline-flex w-fit border-b-2 border-[var(--rams-red-light)] pb-1 text-sm font-bold text-white transition hover:border-white"
            >
              {t("researchHighlights.readPaper")} →
            </a>
          ) : null}
        </div>

        <div
          className="flex items-center justify-between gap-5"
          role="group"
          aria-label={t("researchHighlights.controls")}
        >
          <div
            className="flex items-center gap-2"
            aria-label={t("researchHighlights.indicators")}
          >
            {items.map((highlight, index) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => interact(index)}
                aria-label={t("researchHighlights.goTo", {
                  number: index + 1,
                })}
                aria-current={index === active ? "true" : undefined}
                className={`h-2.5 rounded-full transition-all ${index === active ? "w-8 bg-[var(--rams-red-light)]" : "w-2.5 bg-white/40 hover:bg-white"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-white">
            <button
              type="button"
              onClick={() => interact(active - 1)}
              aria-label={t("researchHighlights.previous")}
              className="p-2 transition hover:text-[var(--rams-red-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rams-red-light)]"
            >
              <Arrow direction="previous" />
            </button>
            <span className="min-w-14 text-center tabular-nums">
              {active + 1} / {items.length}
            </span>
            <button
              type="button"
              onClick={() => interact(active + 1)}
              aria-label={t("researchHighlights.next")}
              className="p-2 transition hover:text-[var(--rams-red-light)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rams-red-light)]"
            >
              <Arrow direction="next" />
            </button>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
