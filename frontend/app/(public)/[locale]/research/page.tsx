import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import PublicContainer from "@/components/public/public-container";
import FeaturedProjects from "@/components/public/featured-projects";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import RevealOnScroll from "@/components/public/reveal-on-scroll";
import { getPublicResearch } from "@/lib/api/modules";
import type { PublicResearchArea } from "@/types/modules";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "research" });
  return localizedMetadata({ locale: locale as Locale, title: t("heroTitle"), description: t("heroDescription"), path: "/research" });
}

export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
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
  const localized = (area: PublicResearchArea) => ({
    title: area.title[locale],
    description: area.description[locale],
    methods: area.methods[locale],
    applications: area.applications[locale],
  });

  return (
    <>
      {/* SECTION 1: HERO */}
      <section className="bg-white py-16 sm:py-24">
        <PublicContainer className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="hero-entrance max-w-2xl">
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-[var(--navy)] sm:text-5xl lg:text-[3.4rem]">
              {t("heroTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--gray)]">{t("heroDescription")}</p>
            <Link href="#areas" className="mt-8 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">
              {t("heroCta")} →
            </Link>
          </div>
          <figure>
            <div className="relative aspect-[4/3] w-full overflow-hidden border border-[var(--border)] lg:aspect-[7/8]">
              <Image src="/assets/research-marine.jpg" alt={t("heroImageAlt")} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <figcaption className="flex items-baseline justify-between border border-t-0 border-[var(--border)] px-4 py-3 text-xs text-[var(--gray)]">
              <span>{brand("laboratory")}</span>
              <span>{brand("institution")}</span>
            </figcaption>
          </figure>
        </PublicContainer>
      </section>

      {/* SECTION 2: RESEARCH AREAS INDEX */}
      <section id="areas" className="scroll-mt-20 bg-[var(--background-light)] py-20 sm:py-28">
        <PublicContainer>
          <RevealOnScroll className="max-w-2xl">
            <p className="eyebrow">{t("indexEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">{t("indexTitle")}</h2>
            <p className="mt-4 text-lg text-[var(--gray)]">{t("indexDescription")}</p>
          </RevealOnScroll>
          <RevealOnScroll className="mt-14" stagger={90}>
          {researchUnavailable ? <div className="border border-red-200 bg-red-50 p-7"><p className="eyebrow text-[var(--rams-red)]">{t("apiUnavailable")}</p><p className="mt-3 text-sm leading-6 text-red-950">{t("apiError")}</p></div> : researchAreas.length === 0 ? <div className="border border-dashed border-[var(--border)] bg-white p-9 text-center"><p className="eyebrow text-[var(--ais-blue)]">{t("emptyLabel")}</p><h2 className="mt-3 font-display text-xl font-semibold text-[var(--navy)]">{t("emptyTitle")}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">{t("emptyDescription")}</p></div> : <ol className="reveal-stagger-list border-t border-[var(--border)]">
            {researchAreas.map((area, index) => {
              const content = localized(area);
              return (
              <li key={area.code} className="border-b border-[var(--border)] transition hover:bg-white">
                <Link href={`#${area.code.toLowerCase()}`} className="group grid gap-3 py-8 sm:grid-cols-[5.5rem_1fr_auto] sm:items-baseline sm:gap-8 sm:py-10">
                  <span className="font-display text-5xl font-bold tracking-tight text-[var(--rams-red)] transition group-hover:text-[var(--rams-red-dark)]">
                    0{index + 1}
                  </span>
                  <span>
                    <span className="block font-display text-2xl font-bold text-[var(--navy)] transition group-hover:text-[var(--rams-red)]">
                      {content.title}
                    </span>
                    <span className="mt-3 block max-w-2xl text-sm leading-6 text-[var(--gray)]">
                      {content.description}
                    </span>
                  </span>
                  <span className="hidden text-sm font-semibold text-[var(--gray)] transition group-hover:text-[var(--rams-red)] sm:block" aria-hidden="true">
                    {t("details")} →
                  </span>
                </Link>
              </li>
              );
            })}
          </ol>}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* SECTION 3: RESEARCH AREA DETAIL */}
      <section className="bg-white py-20 sm:py-28">
        <PublicContainer>
          <RevealOnScroll stagger={90}>
          {researchAreas.map((area, index) => {
            const content = localized(area);
            return <article key={area.code} id={area.code.toLowerCase()} className="scroll-mt-20 grid gap-10 border-t border-[var(--border)] py-16 lg:grid-cols-2 lg:gap-20 lg:py-20">
              <div>
                <p className="flex items-baseline gap-3">
                  <span className="font-display text-xl font-bold text-[var(--rams-red)]">0{index + 1}</span>
                  <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--gray)]">
                    {area.code} — {t("areaLabel")}
                  </span>
                </p>
                <h2 className="mt-5 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">
                  {content.title}
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--gray)]">{content.description}</p>
              </div>
              <div className="lg:border-l lg:border-[var(--border)] lg:pl-12">
                <div>
                  <p className="eyebrow">{t("methodology")}</p>
                  <ul className="mt-6 space-y-4">
                    {content.methods.map((method) => (
                      <li key={method} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[var(--rams-red)]" aria-hidden="true" />
                        <span className="text-sm leading-6 text-[var(--navy)]">{method}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 border-t border-[var(--border)] pt-8">
                  <p className="eyebrow">{t("applications")}</p>
                  <p className="mt-4 font-display text-lg font-semibold tracking-wide text-[var(--navy)]">{content.applications}</p>
                </div>
              </div>
            </article>;
          })}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* SECTION 4: HOW WE RESEARCH */}
      <section className="bg-[var(--background-light)] py-20 sm:py-28">
        <PublicContainer>
          <RevealOnScroll className="max-w-2xl">
            <p className="eyebrow">{t("processEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">{t("processTitle")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--gray)]">{t("processDescription")}</p>
          </RevealOnScroll>
          <RevealOnScroll className="mt-14" stagger={100}>
          <ol className="reveal-stagger-list grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
            {(["understand", "analyse", "model", "decide"] as const).map((step, index) => (
              <li key={step} className="relative bg-white p-8">
                {index < 3 && (
                  <span className="absolute right-5 top-1/2 z-10 hidden -translate-y-1/2 text-2xl font-light text-[var(--gray)] lg:block" aria-hidden="true">→</span>
                )}
                <span className="font-display text-lg font-bold text-[var(--rams-red)]">0{index + 1}</span>
                <h3 className="mt-5 font-display text-xl font-bold text-[var(--navy)]">{t(`process.${step}.title`)}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--gray)]">{t(`process.${step}.text`)}</p>
              </li>
            ))}
          </ol>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* SECTION 5: RESEARCH IN CONTEXT */}
      <section className="bg-white py-20 sm:py-28">
        <PublicContainer>
          <RevealOnScroll className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20" stagger={120}>
          <div className="relative h-[320px] w-full overflow-hidden border border-[var(--border)] sm:h-[440px]">
            <Image src="/assets/vessel.jpg" alt={t("contextImageAlt")} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <p className="eyebrow">{t("contextEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">{t("contextTitle")}</h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">{t("applicationText")}</p>
            <ul className="mt-10 grid gap-x-8 gap-y-4 border-t border-[var(--border)] pt-8 sm:grid-cols-2">
              {(["marine", "offshore", "traffic", "industrial", "maintenance", "safety"] as const).map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 bg-[var(--rams-red)]" aria-hidden="true" />
                  <span className="text-sm font-semibold text-[var(--navy)]">{t(`contextItems.${item}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* SECTION 6: FEATURED PROJECTS (API) */}
      <FeaturedProjects />

      {/* SECTION 7: RESEARCH / INDUSTRY CONNECTION */}
      <section className="bg-[var(--navy)] py-20 text-white sm:py-28">
        <PublicContainer>
          <RevealOnScroll className="grid gap-12 lg:grid-cols-2 lg:gap-20" stagger={120}>
          <div className="max-w-xl">
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--rams-red)]">{t("industryEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] sm:text-4xl">{t("industryTitle")}</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/70">{t("industryDescription")}</p>
          </div>
          <ol className="border-t border-white/15">
            {(["reliability", "safety", "maintenance", "decision"] as const).map((point, index) => (
              <li key={point} className="flex gap-6 border-b border-white/15 py-6">
                <span className="pt-1 font-display text-sm font-bold text-[var(--rams-red)]">0{index + 1}</span>
                <p className="font-display text-lg font-semibold leading-snug text-white/90">{t(`industryPoints.${point}`)}</p>
              </li>
            ))}
          </ol>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {/* SECTION 8: CLOSING CTA */}
      <section className="bg-[var(--navy-deep)] py-20 text-white sm:py-28">
        <PublicContainer>
          <RevealOnScroll className="mx-auto max-w-3xl text-center">
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--rams-red)]">{brand("laboratory")}</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl">{t("ctaTitle")}</h2>
          <p className="mt-6 text-lg text-white/70">{t("ctaText")}</p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/projects" className="bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">
              {t("ctaPrimary")} →
            </Link>
            <Link href="/about" className="border border-white/40 px-8 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">
              {t("ctaSecondary")} →
            </Link>
          </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>
    </>
  );
}
