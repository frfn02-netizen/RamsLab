import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

import PublicContainer from "@/components/public/public-container";
import RevealOnScroll from "@/components/public/reveal-on-scroll";
import { getPublicResearch } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";

import type { Locale } from "@/i18n/routing";
import type { PublicResearchArea } from "@/types/modules";

function cloudinaryDownloadUrl(url: string, filename: string): string {
  if (!url.includes("res.cloudinary.com/")) return url;
  const baseName = filename.replace(/\.[^.]+$/, "");
  return url.replace(
    "/image/upload/",
    `/image/upload/fl_attachment:${baseName}/`,
  );
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "research" });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/research",
  });
}

export default async function ResearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === "id" ? "id" : "en";

  const t = await getTranslations({ locale, namespace: "research" });
  const brand = await getTranslations({ locale, namespace: "brand" });

  let researchAreas: PublicResearchArea[] = [];
  let researchUnavailable = false;

  try {
    researchAreas = await getPublicResearch();
  } catch {
    researchUnavailable = true;
  }

  return (
    <>
      {/* HERO */}
      <section className="border-b border-[var(--border)] bg-white">
        <PublicContainer className="py-14 sm:py-20 lg:py-20">
          <div className="hero-entrance max-w-3xl">
            <div className="flex items-center gap-2 text-sm text-[var(--gray)]">
              <Link
                href="/"
                className="transition hover:text-[var(--rams-red)]"
              >
                {brand("laboratory")}
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-[var(--navy)]">{t("heroTitle")}</span>
            </div>
            <p className="eyebrow mt-10 text-[var(--rams-red)]">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--navy)] sm:text-5xl lg:text-[3.8rem]">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--slate)] sm:text-lg">
              {t("heroDescription")}
            </p>
          </div>
        </PublicContainer>
      </section>

      {/* RESEARCH AREAS */}
      <section className="bg-white py-16 sm:py-24">
        <PublicContainer>
          {researchUnavailable ? (
            <div className="border border-red-200 bg-red-50 p-7">
              <p className="eyebrow text-[var(--rams-red)]">
                {t("apiUnavailable")}
              </p>
              <p className="mt-3 text-sm leading-6 text-red-950">
                {t("apiError")}
              </p>
            </div>
          ) : researchAreas.length === 0 ? (
            <div className="border border-dashed border-[var(--border)] bg-[var(--background-light)] p-9 text-center">
              <p className="eyebrow text-[var(--ais-blue)]">
                {t("emptyLabel")}
              </p>
              <h2 className="mt-3 font-display text-xl font-semibold text-[var(--navy)]">
                {t("emptyTitle")}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">
                {t("emptyDescription")}
              </p>
            </div>
          ) : (
            researchAreas.map((area, index) => {
              const title = area.title[locale];
              const description = area.description[locale];
              const isEven = index % 2 === 0;

              return (
                <RevealOnScroll key={area.code} stagger={80}>
                  <article
                    className={`grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:gap-20 ${index > 0 ? "border-t border-[var(--border)]" : ""}`}
                  >
                    {/* Image column */}
                    <div
                      className={`${isEven ? "order-1" : "order-1 lg:order-2"}`}
                    >
                      {area.downloadablePng ? (
                        <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-lg border border-[var(--border)] sm:max-w-[300px]">
                          <Image
                            src={area.downloadablePng}
                            alt={title}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 280px, 300px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mx-auto flex aspect-[9/16] w-full max-w-[280px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background-light)] sm:max-w-[300px]">
                          <span className="font-display text-7xl font-bold tracking-tight text-[var(--navy)]/10">
                            0{index + 1}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Text column */}
                    <div
                      className={`${isEven ? "order-2" : "order-2 lg:order-1"}`}
                    >
                      <span className="font-display text-sm font-bold text-[var(--rams-red)]">
                        0{index + 1}
                      </span>

                      <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">
                        {title}
                      </h2>

                      <p className="mt-6 max-w-xl text-base leading-7 text-[var(--gray)] sm:text-lg">
                        {description}
                      </p>

                      {area.downloadablePng && (
                        <a
                          href={cloudinaryDownloadUrl(
                            area.downloadablePng,
                            `${area.slug}.png`,
                          )}
                          download
                          className="mt-8 inline-flex items-center gap-2 border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--navy)] transition hover:border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                          </svg>
                          Download Research Profile
                        </a>
                      )}
                    </div>
                  </article>
                </RevealOnScroll>
              );
            })
          )}
        </PublicContainer>
      </section>

      {/* CLOSING CTA */}
      <section className="bg-[var(--navy)] py-20 text-white sm:py-28">
        <PublicContainer>
          <RevealOnScroll className="mx-auto max-w-3xl text-center">
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--rams-red)]">
              {brand("laboratory")}
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl">
              {t("ctaTitle")}
            </h2>
            <p className="mt-6 text-lg text-white/70">{t("ctaText")}</p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/about"
                className="bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
              >
                {t("ctaSecondary")} &rarr;
              </Link>
            </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>
    </>
  );
}
