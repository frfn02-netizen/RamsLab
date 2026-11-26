import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { assetPath } from "@/lib/asset-path";
import type { HomePageData } from "@/lib/public/server-data";
import { getResearchImageStyles } from "@/lib/research-image";
import EcosystemCarousel from "./ecosystem-carousel";
import HomeIntroduction, { HeadOfLaboratorySection } from "./home-introduction";
import HomeMaritimeCta from "./home-maritime-cta";
import HomePartnersSection from "./home-partners";
import HomePeopleSection from "./home-people";
import HomeVideoSection from "./home-video-section";
import PublicContainer from "./public-container";
import ResearchHighlights from "./research-highlights";
import RevealOnScroll from "./reveal-on-scroll";

const researchImages = [
  assetPath("/assets/offshore.jpg"),
  assetPath("/assets/vessel.jpeg"),
  assetPath("/assets/port.jpeg"),
  assetPath("/assets/upscalemedia-transformed.jpeg"),
] as const;

const principleSlugs = {
  R: "reliability",
  A: "availability",
  M: "management",
  S: "safety",
} as const;

type PrincipleSlug = (typeof principleSlugs)[keyof typeof principleSlugs];

// Older CMS records still carry the original English-only pillar copy. Prefer
// localized message copy for those values while preserving admin edits.
const legacyPrincipleCopy: Record<
  PrincipleSlug,
  { title: string; description: string }
> = {
  reliability: {
    title: "Reliability",
    description: "modeling and predicting system behavior",
  },
  availability: {
    title: "Availability",
    description: "ensuring systems are ready when needed",
  },
  management: {
    title: "Management",
    description: "optimizing management strategies",
  },
  safety: {
    title: "Safety",
    description: "reducing risks in complex environments",
  },
};

export default async function PublicHome({
  content,
  researchAreas,
  researchHighlights,
  videos,
  partners,
  people,
}: HomePageData) {
  const locale = (await getLocale()) === "id" ? "id" : "en";
  const brand = await getTranslations({ locale, namespace: "brand" });
  const common = await getTranslations({ locale, namespace: "common" });
  const research = await getTranslations({
    locale,
    namespace: "home.research",
  });
  const framework = await getTranslations({
    locale,
    namespace: "home.principles",
  });
  const localized = (value: { en: string; id: string }) => value[locale];
  const principles = content?.principles ?? [];

  return (
    <>
      <ResearchHighlights items={researchHighlights} />

      <HomeIntroduction />

      <HomeVideoSection videos={videos} />

      {content?.showHeadOfLaboratoryOnHomepage && content.headOfLaboratory ? (
        <HeadOfLaboratorySection content={content} />
      ) : null}

      {content?.showWhoWeAreOnHomepage !== false ? (
        <HomePeopleSection
          headOfLaboratory={content?.headOfLaboratory}
          people={people}
        />
      ) : null}

      <section className="bg-white pt-14 pb-10 sm:pt-16 sm:pb-12 lg:pt-20 lg:pb-14 min-[2000px]:pt-28 min-[2000px]:pb-20">
        <PublicContainer>
          <RevealOnScroll className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
                {framework("eyebrow")}
              </p>
              <h2 className="public-section-title mt-3 text-[var(--navy)]">
                {common("principlesTitle")}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-stone-600 lg:col-span-5 lg:justify-self-end lg:text-right">
              {framework("subtitle")}
            </p>
          </RevealOnScroll>
          {principles.length > 0 ? (
            <RevealOnScroll className="mt-8 grid grid-cols-1 divide-y divide-stone-200 border-y border-stone-200 md:grid-cols-4 md:divide-x md:divide-y-0">
              {principles.map((item, index) => {
                const slug = principleSlugs[item.key];
                const legacy = legacyPrincipleCopy[slug];
                const title = localized(item.title);
                const description = localized(item.description);
                const titleText =
                  title === legacy.title
                    ? framework(`items.${slug}.title`)
                    : title;
                const descriptionText =
                  description.trim().toLowerCase() === legacy.description
                    ? framework(`items.${slug}.description`)
                    : description;

                return (
                  <Link
                    key={item.key}
                    href="/research"
                    className="group relative block overflow-hidden p-6 pb-20 transition-colors hover:bg-stone-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-700 lg:p-7 lg:pb-24"
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-2 right-3 select-none font-bold text-7xl leading-none text-stone-200/70 transition-colors group-hover:text-red-700/15"
                    >
                      {item.key}
                    </span>
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-4">
                        <span
                          aria-hidden="true"
                          className="font-mono text-xs font-semibold tracking-[0.18em] text-red-700"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 shrink-0 text-stone-500 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-red-700"
                          aria-hidden="true"
                        >
                          <path d="M6.5 13.5 13.5 6.5M8 6.5h5.5V12" />
                        </svg>
                      </div>
                      <h3 className="mt-8 font-display text-xl font-semibold tracking-tight text-stone-900 transition-colors group-hover:text-red-700">
                        {titleText}
                      </h3>
                      <p className="mt-3 max-w-[30ch] text-sm leading-6 text-stone-600">
                        {descriptionText}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </RevealOnScroll>
          ) : (
            <RevealOnScroll className="mt-8 border border-dashed border-[var(--border)] bg-white p-8">
              <p className="text-sm leading-6 text-[var(--gray)]">
                {common("requestUnavailable")}
              </p>
              <Link
                href="/about"
                className="mt-4 inline-block text-sm font-semibold text-[var(--rams-red)] underline-offset-4 hover:underline"
              >
                {common("readMore")}
              </Link>
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>

      {content?.showEcosystemOnHomepage !== false && content?.ecosystem ? (
        <section className="ecosystem-section bg-[var(--background-light)] py-14 sm:py-16 lg:py-20 min-[2000px]:py-28">
          <PublicContainer>
            <RevealOnScroll className="text-center">
              <div className="ecosystem-heading-wrap">
                <h2 className="public-section-title text-[var(--navy)]">
                  {localized(content.ecosystem.title)}
                </h2>
              </div>
            </RevealOnScroll>
            <EcosystemCarousel
              cards={[
                {
                  key: "rams",
                  logo: assetPath("/assets/RamsLogoFIX.png"),
                  logoAlt: brand("laboratory"),
                  name: brand("laboratory"),
                  description: localized(
                    content.ecosystem.ramsDescription ?? {
                      en: brand("technicalLine"),
                      id: brand("technicalLine"),
                    },
                  ),
                  href: "https://rams.co.id/",
                },
                {
                  key: "ais",
                  logo: assetPath("/assets/logo ais part2.png"),
                  logoAlt: brand("ais"),
                  name: brand("ais"),
                  description: localized(content.ecosystem.aisDescription),
                  href: "https://aisits.vercel.app/",
                },
                {
                  key: "pui",
                  logo: assetPath("/assets/logo pu-kekal part2.png"),
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
          </PublicContainer>
        </section>
      ) : null}

      <section className="bg-white pt-10 pb-14 sm:pt-12 sm:pb-16 lg:pt-14 lg:pb-20 min-[2000px]:pt-20 min-[2000px]:pb-28">
        <PublicContainer>
          <RevealOnScroll className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="public-section-title text-[var(--navy)]">
                {research("title")}
              </h2>
              <p className="public-lead mt-3 text-[var(--gray)]">
                {research("description")}
              </p>
            </div>
            <Link
              href="/research"
              className="public-meta shrink-0 font-semibold text-[var(--rams-red)]"
            >
              {research("linkLabel")} →
            </Link>
          </RevealOnScroll>

          {researchAreas.length > 0 ? (
            <RevealOnScroll
              className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 min-[2000px]:gap-10"
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
                      <h3 className="public-card-title text-[var(--navy)]">
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
          ) : (
            <RevealOnScroll className="mt-8 border border-dashed border-[var(--border)] bg-white p-8 text-center">
              <p className="text-sm leading-6 text-[var(--gray)]">
                {common("noPublishedRecords")}
              </p>
              <Link
                href="/research"
                className="mt-4 inline-block text-sm font-semibold text-[var(--rams-red)] underline-offset-4 hover:underline"
              >
                {research("linkLabel")}
              </Link>
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>

      <HomePartnersSection partners={partners} />

      <HomeMaritimeCta />
    </>
  );
}
