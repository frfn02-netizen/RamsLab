"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicResearch, getPublicSiteContent } from "@/lib/api/modules";
import type { PublicResearchArea } from "@/types/modules";
import type { HomepageContent } from "@/types/site-content";
import { getResearchImageStyles } from "@/lib/research-image";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import HomePartnersSection from "./home-partners";
import HomeMaritimeCta from "./home-maritime-cta";
import HomeVideoSection from "./home-video-section";
import ResearchHighlights from "./research-highlights";
import HomeIntroduction, { HeadOfLaboratorySection } from "./home-introduction";
import HomePeopleSection from "./home-people";

const researchImages = [
  "/assets/offshore.jpg",
  "/assets/vessel.jpeg",
  "/assets/port.jpeg",
  "/assets/upscalemedia-transformed.jpeg",
] as const;

type EcosystemCard = {
  key: string;
  logo: string;
  logoAlt: string;
  name: string;
  description: string;
  href: string | null;
};

function EcosystemCarousel({ cards }: { cards: EcosystemCard[] }) {
  const count = cards.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const swipedRef = useRef(false);
  const pausedByInteraction = useRef(false);
  const hasMounted = useRef(false);
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
    requestAnimationFrame(() => {
      hasMounted.current = true;
    });
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
      className="ecosystem-carousel-shell mt-12"
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
              className={`ecosystem-carousel-card${!hasMounted.current ? " no-transition" : ""}${pos === "center" ? "" : " cursor-pointer"}`}
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

export default function PublicHome() {
  const locale = useLocale() === "id" ? "id" : "en";
  const brand = useTranslations("brand");
  const common = useTranslations("common");
  const research = useTranslations("home.research");
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [researchAreas, setResearchAreas] = useState<PublicResearchArea[]>([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchError, setResearchError] = useState(false);

  useEffect(() => {
    getPublicSiteContent("homepage")
      .then(setContent)
      .catch(() => setContentError(true))
      .finally(() => setContentLoading(false));
    getPublicResearch()
      .then(setResearchAreas)
      .catch(() => setResearchError(true))
      .finally(() => setResearchLoading(false));
  }, []);

  const localized = (value: { en: string; id: string }) => value[locale];

  return (
    <>
      <ResearchHighlights />

      {content && !contentLoading && !contentError && <HomeIntroduction />}

      <HomeVideoSection />

      {content &&
        !contentLoading &&
        !contentError &&
        content.showHeadOfLaboratoryOnHomepage && (
          <HeadOfLaboratorySection content={content} />
        )}

      {content &&
        !contentLoading &&
        !contentError &&
        content.showWhoWeAreOnHomepage && (
          <HomePeopleSection headOfLaboratory={content?.headOfLaboratory} />
        )}

      {/* PRINCIPLES */}
      <section className="bg-white py-20">
        <PublicContainer>
          <RevealOnScroll className="mb-10 max-w-2xl">
            <p className="eyebrow text-[var(--rams-red)]">
              {common("principles")}
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-[var(--navy)] sm:text-5xl">
              {common("principlesTitle")}
            </h2>
          </RevealOnScroll>
          {contentLoading ? (
            <PublicLoading label={common("loading")} />
          ) : contentError || !content ? (
            <PublicError message={common("requestUnavailable")} />
          ) : (
            <RevealOnScroll
              className="rams-principles grid grid-cols-1 border-t border-b border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4"
              stagger={120}
            >
              {content.principles.map((item, i) => (
                <div
                  key={item.key}
                  className={`rams-item relative p-8 ${i < 3 ? "lg:border-r lg:border-[var(--border)]" : ""}`}
                >
                  <span aria-hidden="true" className="rams-accent" />
                  <span className="rams-letter font-display text-4xl font-bold text-[var(--rams-red)]">
                    {item.key}
                  </span>
                  <h3 className="rams-title mt-4 font-bold text-[var(--navy)]">
                    {localized(item.title)}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--gray)]">
                    {localized(item.description)}
                  </p>
                </div>
              ))}
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>

      {/* ECOSYSTEM */}
      {content &&
        !contentLoading &&
        !contentError &&
        content.showEcosystemOnHomepage !== false && (
        <section className="ecosystem-section bg-[var(--background-light)] py-20 sm:py-24">
          <PublicContainer>
            {contentLoading ? (
              <PublicLoading label={common("loading")} />
            ) : contentError || !content ? (
              <PublicError message={common("requestUnavailable")} />
            ) : (
            <>
              <RevealOnScroll className="text-center">
                <div className="ecosystem-heading-wrap">
                  <h2 className="font-display text-3xl font-bold text-[var(--navy)] sm:text-4xl">
                    {localized(content.ecosystem.title)}
                  </h2>
                </div>
              </RevealOnScroll>
              <EcosystemCarousel
                cards={[
                  {
                    key: "rams",
                    logo: "/assets/rams-logo.png",
                    logoAlt: brand("laboratory"),
                    name: brand("laboratory"),
                    description: localized(
                      content.ecosystem.ramsDescription ?? {
                        en: brand("technicalLine"),
                        id: brand("technicalLine"),
                      },
                    ),
                    href: null,
                  },
                  {
                    key: "ais",
                    logo: "/assets/logo ais part2.png",
                    logoAlt: brand("ais"),
                    name: brand("ais"),
                    description: localized(content.ecosystem.aisDescription),
                    href: "https://aisits.vercel.app/",
                  },
                  {
                    key: "pui",
                    logo: "/assets/logo pu-kekal part2.png",
                    logoAlt: brand("pui"),
                    name: brand("pui"),
                    description: localized(
                      content.ecosystem.puiKekalDescription ?? {
                        en: "",
                        id: "",
                      },
                    ),
                    href: "https://www.youtube.com/watch?v=9ry3kKPBAyg&t=72s",
                  },
                ]}
              />
            </>
          )}
        </PublicContainer>
      </section>
      )}

      {/* RESEARCH AREAS */}
      <section className="bg-white py-20">
        <PublicContainer>
          {contentLoading || researchLoading ? (
            <PublicLoading label={common("loading")} />
          ) : contentError || !content ? (
            <PublicError message={common("requestUnavailable")} />
          ) : researchError ? (
            <PublicError message={common("requestUnavailable")} />
          ) : researchAreas.length === 0 ? (
            <PublicEmpty
              title={common("noPublishedRecords")}
              description={common("noPublishedRecords")}
            />
          ) : (
            <>
              <RevealOnScroll className="flex items-end justify-between">
                <div className="max-w-2xl">
                  <h2 className="font-display text-4xl font-bold text-[var(--navy)]">
                    {research("title")}
                  </h2>
                  <p className="mt-4 text-lg text-[var(--gray)]">
                    {research("description")}
                  </p>
                </div>
                <Link
                  href="/research"
                  className="text-sm font-semibold text-[var(--rams-red)]"
                >
                  {research("linkLabel")} →
                </Link>
              </RevealOnScroll>
              <RevealOnScroll
                className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
                stagger={100}
              >
                {researchAreas.slice(0, 4).map((area, index) => {
                  const imageStyles = getResearchImageStyles(area);
                  return (
                    <div
                      key={area.code}
                      className="public-card-interaction group border border-[var(--border)] bg-white p-1 hover:border-[var(--rams-red)]"
                    >
                      <div
                        className="relative w-full overflow-hidden"
                        style={{ aspectRatio: imageStyles.aspectRatio }}
                      >
                        <Image
                          src={area.downloadablePng ?? researchImages[index]}
                          alt={localized(area.title)}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className={
                            imageStyles.fit === "contain"
                              ? "object-contain public-image-zoom"
                              : "public-image-zoom object-cover"
                          }
                          style={{
                            objectPosition: imageStyles.objectPosition,
                            transform: `scale(${imageStyles.scale})`,
                          }}
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="public-card-title font-bold text-[var(--navy)]">
                          {localized(area.title)}
                        </h3>
                        <Link
                          href={`/research#${area.code.toLowerCase()}`}
                          className="public-card-arrow mt-4 inline-block text-sm font-semibold text-[var(--rams-red)]"
                        >
                          {common("explore")} →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </RevealOnScroll>
            </>
          )}
        </PublicContainer>
      </section>

      <HomePartnersSection />

      <HomeMaritimeCta />
    </>
  );
}
