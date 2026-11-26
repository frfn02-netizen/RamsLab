import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

import PublicContainer from "@/components/public/public-container";
import { PublicError } from "@/components/public/public-states";
import { getPublicResearch, getPublicSiteContent } from "@/lib/api/modules";
import { assetPath } from "@/lib/asset-path";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import type { PublicResearchArea } from "@/types/modules";
import RevealOnScroll from "@/components/public/reveal-on-scroll";

export const revalidate = 300;

const RESEARCH_FOCUS_VISUALS: ReadonlyArray<{ code: string; image: string }> = [
  { code: "RAM", image: "/assets/vessel.jpeg" },
  { code: "RCM", image: "/assets/engineers.jpg" },
  { code: "RISK", image: "/assets/offshore.jpg" },
];

type FocusCard = {
  code: string;
  title: string;
  description: string;
  image: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({
    locale,
    namespace: "about",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/about",
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "id" ? "id" : "en";

  const common = await getTranslations({
    locale,
    namespace: "common",
  });

  const about = await getTranslations({
    locale,
    namespace: "about",
  });

  let content;

  try {
    content = await getPublicSiteContent("about", {
      next: { revalidate: 300 },
    });
  } catch {
    return (
      <section className="bg-white py-20">
        <PublicContainer>
          <div className="mx-auto max-w-2xl">
            <PublicError message={common("requestUnavailable")} />
          </div>
        </PublicContainer>
      </section>
    );
  }

  let researchAreas: PublicResearchArea[] = [];

  try {
    researchAreas = await getPublicResearch({ next: { revalidate: 300 } });
  } catch {
    researchAreas = [];
  }

  const localized = (value: { en: string; id: string }) => value[locale];

  const researchByCode = new Map(
    researchAreas.map((area) => [area.code, area]),
  );
  const focusCards: FocusCard[] = RESEARCH_FOCUS_VISUALS.flatMap((visual) => {
    const area = researchByCode.get(visual.code);
    if (!area) return [];
    return [
      {
        code: area.code,
        title: area.title[locale],
        description: area.description[locale],
        image: visual.image,
      },
    ];
  });

  return (
    <>
      {/* HERO */}
      <section className="border-b border-[var(--border)] bg-white">
        <PublicContainer className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <div className="hero-entrance">
            <p className="eyebrow text-[var(--rams-red)]">
              {localized(content.hero.eyebrow)}
            </p>

            <h1 className="public-page-title mt-5 max-w-2xl text-[var(--navy)]">
              {localized(content.hero.title)}
            </h1>

            <p className="public-lead mt-6 max-w-xl text-[var(--gray)]">
              {localized(content.hero.description)}
            </p>

            <Link
              href="/research"
              className="mt-9 inline-flex items-center gap-2 bg-[var(--rams-red)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
            >
              {about("exploreWork")} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="group relative aspect-[4/3] w-full overflow-hidden border border-[var(--border)] lg:aspect-[4/5]">
            <Image
              src={assetPath("/assets/research-marine.jpeg")}
              alt={localized(content.hero.title)}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 560px"
              className="public-image-zoom object-cover"
            />
          </div>
        </PublicContainer>
      </section>

      {/* WHAT RAMS MEANS */}
      <section className="bg-white py-14">
        <PublicContainer>
          <RevealOnScroll className="mb-6 max-w-2xl">
            <h2 className="public-section-title text-[var(--navy)]">
              {localized(content.principles.heading)}
            </h2>
          </RevealOnScroll>

          <RevealOnScroll
            className="rams-principles grid grid-cols-1 border-t border-b border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4"
            stagger={120}
          >
            {content.principles.items.map((item) => (
              <article
                key={item.key}
                className="rams-item relative overflow-hidden p-8 lg:p-10"
              >
                <span aria-hidden="true" className="rams-watermark">
                  {item.key}
                </span>
                <span aria-hidden="true" className="rams-accent" />
                <div className="relative">
                  <span aria-hidden="true" className="rams-rule" />
                  <h3 className="rams-title mt-4 font-display text-xl font-bold tracking-tight text-[var(--navy)]">
                    {localized(item.title)}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--gray)]">
                    {localized(item.description)}
                  </p>
                </div>
              </article>
            ))}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* RESEARCH APPROACH */}
      <section className="border-y border-[var(--border)] bg-[var(--background-light)] py-16 sm:py-24">
        <PublicContainer className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <RevealOnScroll className="order-1">
            <div className="group relative aspect-[4/3] w-full overflow-hidden border border-[var(--border)] bg-white">
              <Image
                src={assetPath("/assets/engineers.jpg")}
                alt={localized(content.researchApproach.title)}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="public-image-zoom object-cover"
              />
            </div>
          </RevealOnScroll>

          <RevealOnScroll className="order-2" delay={120}>
            <p className="eyebrow text-[var(--rams-red)]">
              {localized(content.researchApproach.eyebrow)}
            </p>

            <h2 className="public-section-title mt-4 text-[var(--navy)]">
              {localized(content.researchApproach.title)}
            </h2>

            <p className="public-lead mt-6 max-w-xl text-[var(--gray)]">
              {localized(content.researchApproach.description)}
            </p>

            <Link
              href="/research"
              className="mt-9 inline-flex items-center gap-2 border border-[var(--navy)] px-7 py-3.5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
            >
              {about("exploreResearch")} <span aria-hidden="true">→</span>
            </Link>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* RESEARCH FOCUS */}
      <section className="bg-white py-16 sm:py-24">
        <PublicContainer>
          <RevealOnScroll className="max-w-2xl">
            <h2 className="public-section-title text-[var(--navy)]">
              {localized(content.researchFocus.title)}
            </h2>

            <p className="public-lead mt-4 text-[var(--gray)]">
              {localized(content.researchFocus.description)}
            </p>
          </RevealOnScroll>

          {focusCards.length > 0 ? (
            <RevealOnScroll
              className="mt-12 grid gap-10 border-t border-[var(--border)] pt-12 sm:grid-cols-2 lg:grid-cols-3"
              stagger={100}
            >
              {focusCards.map((card) => (
                <article key={card.code} className="flex flex-col">
                  <div className="group relative aspect-[4/3] w-full overflow-hidden border border-[var(--border)]">
                    <Image
                      src={assetPath(card.image)}
                      alt={card.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      className="public-image-zoom object-cover"
                    />
                  </div>

                  <h3 className="mt-5 font-display text-xl font-semibold tracking-[-0.02em] text-[var(--navy)]">
                    {card.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-[var(--gray)]">
                    {card.description}
                  </p>

                  <Link
                    href="/research"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--rams-red)] transition hover:gap-3"
                  >
                    {about("exploreResearch")}
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </RevealOnScroll>
          ) : (
            <RevealOnScroll
              className="mt-12 grid gap-8 border-t border-[var(--border)] pt-12 sm:grid-cols-2 lg:grid-cols-3"
              stagger={100}
            >
              {content.researchFocus.items.map((area, index) => (
                <div key={area.en} className="flex gap-5">
                  <span className="font-display text-2xl font-bold text-[var(--rams-red)]">
                    0{index + 1}
                  </span>

                  <h3 className="text-lg font-semibold text-[var(--navy)]">
                    {localized(area)}
                  </h3>
                </div>
              ))}
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>

      {/* COLLABORATION CTA */}
      <section className="relative isolate overflow-hidden bg-[var(--navy)] text-white">
        <Image
          src={assetPath("/assets/port.jpeg")}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-[var(--navy)]/85"
          aria-hidden="true"
        />

        <PublicContainer className="relative z-10 py-20 sm:py-28">
          <RevealOnScroll className="mx-auto max-w-2xl text-center">
            <h2 className="public-section-title whitespace-pre-line">
              {localized(content.cta.title)}
            </h2>

            <p className="public-lead mt-6 whitespace-pre-line text-white/75">
              {localized(content.cta.description)}
            </p>

            <Link
              href="/contact"
              className="mt-10 inline-flex items-center gap-2 bg-[var(--rams-red)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
            >
              {about("getInTouch")} <span aria-hidden="true">→</span>
            </Link>
          </RevealOnScroll>
        </PublicContainer>
      </section>
    </>
  );
}
