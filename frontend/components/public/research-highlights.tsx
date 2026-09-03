"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getPublicResearchHighlights } from "@/lib/api/modules";
import type { ResearchHighlight } from "@/types/modules";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";
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
      <section className="bg-[var(--background-light)] py-20">
        <PublicContainer>
          <PublicLoading label={t("researchHighlights.loading")} />
        </PublicContainer>
      </section>
    );
  }
  if (error) {
    return (
      <section className="bg-[var(--background-light)] py-20">
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
      className="border-y border-[var(--border)] bg-[var(--background-light)] py-20 sm:py-24"
      aria-labelledby="research-highlights-title"
    >
      <PublicContainer>
        <RevealOnScroll>
          <p className="eyebrow text-[var(--rams-red)]">
            {t("researchHighlights.eyebrow")}
          </p>
          <h2
            id="research-highlights-title"
            className="mt-3 font-display text-4xl font-bold tracking-tight text-[var(--navy)] sm:text-5xl"
          >
            {t("researchHighlights.title")}
          </h2>
        </RevealOnScroll>

        <div
          className="mt-10 grid overflow-hidden border border-[var(--border)] bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
          aria-roledescription="carousel"
          aria-label={t("researchHighlights.carouselLabel")}
        >
          <div className="relative aspect-[4/3] min-h-64 bg-[var(--navy)] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[480px]">
            {item.image?.url ? (
              <img
                src={item.image.url}
                alt={imageAlt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,var(--navy),#183c59)] p-8 text-center">
                <span
                  className="font-display text-5xl font-bold tracking-tight text-white/15 sm:text-7xl"
                  aria-hidden="true"
                >
                  RAMS
                </span>
                <span className="sr-only">
                  {t("researchHighlights.noImage")}
                </span>
              </div>
            )}
          </div>
          <div
            className="flex flex-col justify-between p-7 sm:p-10 lg:p-14"
            aria-live="polite"
          >
            <div>
              <p className="eyebrow text-[var(--rams-red)]">
                {t("researchHighlights.question")}
              </p>
              <h3 className="mt-5 max-w-xl font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-[var(--navy)] sm:text-4xl">
                {headline}
              </h3>
              <div className="mt-8 border-t border-[var(--border)] pt-6">
                <p className="text-sm font-semibold leading-6 text-[var(--navy)]">
                  {publication.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--gray)]">
                  {publication.authors.join(", ")} · {publication.year}
                  {publication.journal ? ` · ${publication.journal}` : ""}
                </p>
              </div>
            </div>
            {publication.pdfUrl ? (
              <a
                href={publication.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex w-fit items-center border-b-2 border-[var(--rams-red)] pb-1 text-sm font-bold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]"
              >
                {t("researchHighlights.readPaper")} →
              </a>
            ) : null}
          </div>
        </div>

        <div
          className="mt-7 flex items-center justify-between gap-5"
          role="group"
          aria-label={t("researchHighlights.controls")}
        >
          <div className="flex items-center gap-2">
            {items.map((highlight, index) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => interact(index)}
                aria-label={t("researchHighlights.goTo", { number: index + 1 })}
                aria-current={index === active ? "true" : undefined}
                className={`h-2.5 rounded-full transition-all ${index === active ? "w-8 bg-[var(--rams-red)]" : "w-2.5 bg-[var(--navy)]/20 hover:bg-[var(--rams-red)]"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-[var(--navy)]">
            <button
              type="button"
              onClick={() => interact(active - 1)}
              aria-label={t("researchHighlights.previous")}
              className="border border-[var(--border)] p-3 transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
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
              className="border border-[var(--border)] p-3 transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
            >
              <Arrow direction="next" />
            </button>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
