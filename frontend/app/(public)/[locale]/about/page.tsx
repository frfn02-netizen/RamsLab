import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

import PublicContainer from "@/components/public/public-container";
import { PublicError } from "@/components/public/public-states";
import { getPublicSiteContent } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import RevealOnScroll from "@/components/public/reveal-on-scroll";

export const dynamic = "force-dynamic";

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

  const brand = await getTranslations({
    locale,
    namespace: "brand",
  });

  let content;

  try {
    content = await getPublicSiteContent("about");
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

  const localized = (value: { en: string; id: string }) => value[locale];

  return (
    <>
      <section className="bg-white py-16 sm:py-24">
        <PublicContainer className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="hero-entrance">
            <p className="eyebrow">{localized(content.hero.eyebrow)}</p>

            <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-[var(--navy)]">
              {localized(content.hero.title)}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">
              {localized(content.hero.description)}
            </p>

            <Link
              href="/research"
              className="mt-8 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
            >
              {common("explore")} →
            </Link>
          </div>

          <div className="group relative h-[400px] w-full overflow-hidden rounded-lg">
            <Image
              src="/assets/research-marine.jpeg"
              alt={localized(content.hero.title)}
              fill
              className="public-image-zoom object-cover"
            />
          </div>
        </PublicContainer>
      </section>

      <section className="bg-[var(--background-light)] py-20">
        <PublicContainer>
          <RevealOnScroll className="text-center">
            <h2 className="font-display text-2xl font-bold text-[var(--navy)]">
              {localized(content.principles.heading)}
            </h2>
          </RevealOnScroll>

          <RevealOnScroll
            className="mt-12 grid grid-cols-1 border-t border-b border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4"
            stagger={120}
          >
            {content.principles.items.map((item, index) => (
              <div
                key={item.key}
                className={`public-card-interaction p-8 ${
                  index < 3 ? "lg:border-r border-[var(--border)]" : ""
                }`}
              >
                <span className="font-display text-4xl font-bold text-[var(--rams-red)]">
                  {item.key}
                </span>

                <h3 className="mt-4 font-bold text-[var(--navy)]">
                  {localized(item.title)}
                </h3>

                <p className="mt-2 text-sm text-[var(--gray)]">
                  {localized(item.description)}
                </p>
              </div>
            ))}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-white py-20">
        <PublicContainer>
          <RevealOnScroll
            className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20"
            stagger={120}
          >
            <div className="group relative h-[400px] w-full overflow-hidden rounded-lg">
              <Image
                src="/assets/engineers.jpg"
                alt={localized(content.researchApproach.title)}
                fill
                className="public-image-zoom object-cover"
              />
            </div>

            <div>
              <p className="eyebrow">
                {localized(content.researchApproach.eyebrow)}
              </p>

              <h2 className="mt-4 font-display text-4xl font-bold text-[var(--navy)]">
                {localized(content.researchApproach.title)}
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">
                {localized(content.researchApproach.description)}
              </p>
            </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-[var(--background-light)] py-20">
        <PublicContainer>
          <RevealOnScroll>
            <h2 className="font-display text-3xl font-bold text-[var(--navy)]">
              {localized(content.researchFocus.title)}
            </h2>

            <p className="mt-4 text-[var(--gray)]">
              {localized(content.researchFocus.description)}
            </p>
          </RevealOnScroll>

          <RevealOnScroll
            className="mt-12 grid gap-8 border-t border-[var(--border)] pt-12 sm:grid-cols-2 lg:grid-cols-3"
            stagger={100}
          >
            {content.researchFocus.items.map((area, index) => (
              <div key={area.en} className="public-card-interaction flex gap-6">
                <span className="font-display text-2xl font-bold text-[var(--gray)]/50">
                  0{index + 1}
                </span>

                <h3 className="text-xl font-bold text-[var(--navy)]">
                  {localized(area)}
                </h3>
              </div>
            ))}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-white py-20">
        <PublicContainer>
          <RevealOnScroll
            className="grid gap-12 lg:grid-cols-2 lg:items-center"
            stagger={120}
          >
            <div>
              <h2 className="font-display text-4xl font-bold text-[var(--navy)]">
                {localized(content.marineContext.title)}
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">
                {localized(content.marineContext.description)}
              </p>
            </div>

            <div className="group relative h-[300px] w-full overflow-hidden rounded-lg">
              <Image
                src="/assets/research-marine.jpeg"
                alt={localized(content.marineContext.title)}
                fill
                className="public-image-zoom object-cover"
              />
            </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-[var(--background-light)] py-16">
        <PublicContainer>
          <RevealOnScroll className="text-center">
            <h2 className="font-display text-2xl font-bold text-[var(--navy)]">
              {localized(content.ecosystem.title)}
            </h2>
          </RevealOnScroll>

          <RevealOnScroll
            className="mt-12 flex flex-wrap items-center justify-center gap-12"
            stagger={120}
          >
            {/* RAMS Laboratory */}
            <div className="public-logo-interaction group relative h-16 w-24">
              <Image
                src="/assets/rams-logo.png"
                alt={brand("laboratory")}
                fill
                className="public-image-zoom object-contain"
              />
            </div>

            {/* AIS */}
            <a
              href="https://aisits.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={brand("ais")}
              className="public-logo-interaction group relative z-10 block h-16 w-24 cursor-pointer"
            >
              <Image
                src="/assets/logo ais part2.png"
                alt={brand("ais")}
                fill
                className="public-image-zoom pointer-events-none object-contain"
              />
            </a>

            {/* PUI */}
            <div className="public-logo-interaction group relative h-16 w-32">
              <Image
                src="/assets/logo pu-kekal part2.png"
                alt={brand("pui")}
                fill
                className="public-image-zoom object-contain"
              />
            </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-white py-20">
        <PublicContainer>
          <RevealOnScroll>
            <h2 className="font-display text-3xl font-bold text-[var(--navy)]">
              {localized(content.profile.title)}
            </h2>
          </RevealOnScroll>

          <RevealOnScroll
            className="mt-10 grid gap-6 border-t border-[var(--border)] pt-10 sm:grid-cols-2 lg:grid-cols-4"
            stagger={100}
          >
            {content.profile.items.map((item) => (
              <div key={item.label.en} className="public-card-interaction">
                <p className="eyebrow">{localized(item.label)}</p>

                <p className="mt-2 text-sm text-[var(--navy)]">
                  {localized(item.value)}
                </p>
              </div>
            ))}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-[var(--navy)] py-20 text-white">
        <PublicContainer>
          <RevealOnScroll className="text-center">
            <h2 className="whitespace-pre-line font-display text-4xl font-bold">
              {localized(content.cta.title)}
            </h2>

            <p className="mt-6 whitespace-pre-line text-lg text-white/80">
              {localized(content.cta.description)}
            </p>

            <Link
              href="/research"
              className="mt-10 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
            >
              {localized(content.cta.buttonLabel)} →
            </Link>
          </RevealOnScroll>
        </PublicContainer>
      </section>
    </>
  );
}
