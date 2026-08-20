"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicProjects, getPublicResearch, getPublicSiteContent } from "@/lib/api/modules";
import type { Project } from "@/types/modules";
import type { ContactContent, HomepageContent } from "@/types/site-content";
import PublicContainer from "./public-container";
import ProjectCard from "./project-card";
import ContactForm from "./contact-form";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";

type ContactIconKind = "location" | "email" | "laboratory";
const researchImages = ["/assets/offshore.jpg", "/assets/vessel.jpg", "/assets/port.jpg", "/assets/marine-infrastructure.jpg"] as const;

function ContactIcon({ kind }: { kind: ContactIconKind }) {
  const paths = {
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="m4 7 8 6 8-6" /></>,
    laboratory: <><path d="M9 3v6l-5.5 9.5A1 1 0 0 0 4.4 20h15.2a1 1 0 0 0 .9-1.5L15 9V3" /><path d="M7 3h10M8 14h8" /></>,
  }[kind];

  return <svg aria-hidden="true" className="homepage-contact-icon h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>;
}

export default function PublicHome() {
  const locale = useLocale() === "id" ? "id" : "en";
  const contact = useTranslations("contact");
  const brand = useTranslations("brand");
  const projectsT = useTranslations("projects");
  const common = useTranslations("common");
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [contactContent, setContactContent] = useState<ContactContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [contactContentLoading, setContactContentLoading] = useState(true);
  const [contactContentError, setContactContentError] = useState(false);
  const [researchAreas, setResearchAreas] = useState<ReadonlyArray<{ _id?: string; code: string; title: { en: string; id: string }; description: { en: string; id: string } }>>([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchError, setResearchError] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(false);

  useEffect(() => {
    getPublicProjects().then((items) => setProjects(items.slice(0, 3))).catch(() => setProjectsError(true)).finally(() => setProjectsLoading(false));
    getPublicSiteContent("homepage").then(setContent).catch(() => setContentError(true)).finally(() => setContentLoading(false));
    getPublicSiteContent("contact").then(setContactContent).catch(() => setContactContentError(true)).finally(() => setContactContentLoading(false));
    getPublicResearch().then(setResearchAreas).catch(() => setResearchError(true)).finally(() => setResearchLoading(false));
  }, []);

  const localized = (value: { en: string; id: string }) => value[locale];

  return <>
    {/* HERO */}
    <section className="relative flex min-h-[75vh] items-center justify-start bg-[var(--navy)] text-white">
      <Image src="/assets/hero.webp" alt={content ? localized(content.hero.headline) : common("requestUnavailable")} fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[var(--navy)]/50" />
      <PublicContainer className="relative z-10 w-full">
        {contentLoading ? <PublicLoading label={common("loading")} /> : contentError || !content ? <PublicError message={common("requestUnavailable")} /> : <div className="hero-entrance max-w-3xl">
          <p className="font-display font-bold uppercase tracking-widest text-[var(--rams-red)]">{brand("laboratory")}</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight tracking-tight text-white sm:text-7xl">{localized(content.hero.headline)}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">{localized(content.hero.description)}</p>
          <div className="mt-10 flex gap-4">
            <Link href="/research" className="bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">{localized(content.hero.primaryCta)} →</Link>
            <Link href="/about" className="border border-white/50 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10">{localized(content.hero.secondaryCta)} →</Link>
          </div>
        </div>}
      </PublicContainer>
    </section>

    {/* PRINCIPLES */}
    <section className="bg-white py-20">
      <PublicContainer>
        {contentLoading ? <PublicLoading label={common("loading")} /> : contentError || !content ? <PublicError message={common("requestUnavailable")} /> : <RevealOnScroll className="rams-principles grid grid-cols-1 border-t border-b border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4" stagger={120}>
          {content.principles.map((item, i) => (
              <div key={item.key} className={`rams-item relative p-8 ${i < 3 ? "lg:border-r lg:border-[var(--border)]" : ""}`}>
              <span aria-hidden="true" className="rams-accent" />
              <span className="rams-letter font-display text-4xl font-bold text-[var(--rams-red)]">
                {item.key}
              </span>
              <h3 className="rams-title mt-4 font-bold text-[var(--navy)]">{localized(item.title)}</h3>
              <p className="mt-2 text-sm text-[var(--gray)]">{localized(item.description)}</p>
            </div>
          ))}
        </RevealOnScroll>}
      </PublicContainer>
    </section>

    {/* ECOSYSTEM */}
    <section className="bg-[var(--background-light)] py-20">
      <PublicContainer>
        {contentLoading ? <PublicLoading label={common("loading")} /> : contentError || !content ? <PublicError message={common("requestUnavailable")} /> : <RevealOnScroll className="text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--navy)]">{localized(content.ecosystem.title)}</h2>
        </RevealOnScroll>}
        <RevealOnScroll className="mt-12 grid grid-cols-1 border-y border-[var(--border)] sm:grid-cols-3" stagger={120}>
          <div className="ecosystem-reveal-item">
            <div className="ecosystem-block group px-6 py-8 text-center sm:px-8 lg:px-12">
              <div className="ecosystem-logo-stage">
                <div className="ecosystem-logo absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2">
                  <Image src="/assets/rams-logo.png" alt={brand("laboratory")} fill sizes="128px" className="object-contain" />
                </div>
              </div>
              <p className="ecosystem-name font-display text-base font-semibold text-[var(--navy)]">{brand("laboratory")}</p>
              <p className="mt-2 text-xs text-[var(--gray)]">{brand("technicalLine")}</p>
            </div>
          </div>
          <div className="ecosystem-reveal-item">
            <div className="ecosystem-block group border-[var(--border)] px-6 py-8 text-center sm:border-l sm:px-8 lg:px-12">
              <div className="ecosystem-logo-stage">
                <div className="ecosystem-logo absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2">
                  <Image src="/assets/logo ais part2.png" alt={brand("ais")} fill sizes="256px" className="object-contain" />
                </div>
              </div>
              <p className="ecosystem-name font-display text-base font-semibold text-[var(--navy)]">{brand("ais")}</p>
              <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[var(--gray)]">{content ? localized(content.ecosystem.aisDescription) : ""}</p>
            </div>
          </div>
          <div className="ecosystem-reveal-item">
            <div className="ecosystem-block group border-[var(--border)] px-6 py-8 text-center sm:border-l sm:px-8 lg:px-12">
              <div className="ecosystem-logo-stage">
                <div className="ecosystem-logo absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2">
                  <Image src="/assets/logo pu-kekal part2.png" alt={brand("pui")} fill sizes="320px" className="object-contain" />
                </div>
              </div>
              <p className="ecosystem-name font-display text-base font-semibold text-[var(--navy)]">{brand("pui")}</p>
            </div>
          </div>
        </RevealOnScroll>
      </PublicContainer>
    </section>

    {/* RESEARCH AREAS */}
    <section className="bg-white py-20">
      <PublicContainer>
        {contentLoading || researchLoading ? <PublicLoading label={common("loading")} /> : contentError || !content ? <PublicError message={common("requestUnavailable")} /> : researchError ? <PublicError message={common("requestUnavailable")} /> : researchAreas.length === 0 ? <PublicEmpty title={common("noPublishedRecords")} description={common("noPublishedRecords")} /> : <><RevealOnScroll className="flex items-end justify-between"><div className="max-w-2xl"><h2 className="font-display text-4xl font-bold text-[var(--navy)]">{localized(content.research.title)}</h2><p className="mt-4 text-lg text-[var(--gray)]">{localized(content.research.description)}</p></div><Link href="/research" className="text-sm font-semibold text-[var(--rams-red)]">{localized(content.research.linkLabel)} →</Link></RevealOnScroll><RevealOnScroll className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4" stagger={100}>{researchAreas.slice(0, 4).map((area, index) => <div key={area.code} className="public-card-interaction group border border-[var(--border)] bg-white p-1 hover:border-[var(--rams-red)]"><div className="relative h-48 w-full overflow-hidden"><Image src={researchImages[index]} alt={localized(area.title)} fill className="public-image-zoom object-cover" /></div><div className="p-6"><h3 className="public-card-title font-bold text-[var(--navy)]">{localized(area.title)}</h3><Link href={`/research#${area.code.toLowerCase()}`} className="public-card-arrow mt-4 inline-block text-sm font-semibold text-[var(--rams-red)]">{common("explore")} →</Link></div></div>)}</RevealOnScroll></>}
      </PublicContainer>
    </section>

    {/* PROJECTS */}
    <section className="border-t border-[var(--border)] bg-[var(--background-light)] py-20">
      <PublicContainer>
        <RevealOnScroll className="flex items-end justify-between">
            <h2 className="font-display text-4xl font-bold text-[var(--navy)]">{content ? localized(content.projects.title) : common("requestUnavailable")}</h2>
            <Link href="/projects" className="text-sm font-semibold text-[var(--rams-red)]">{common("allProjects")} →</Link>
        </RevealOnScroll>
        <div className="mt-12">
            {projectsLoading ? <PublicLoading label={projectsT("loading")} /> : projectsError ? <PublicError message={projectsT("error")} /> : projects.length === 0 ? <PublicEmpty title={projectsT("noTitle")} description={projectsT("noDescription")} /> : <RevealOnScroll className="grid gap-8 lg:grid-cols-3" stagger={100}>{projects.map((project) => <ProjectCard key={project._id} project={project} />)}</RevealOnScroll>}
        </div>
      </PublicContainer>
    </section>

    {/* CTA */}
    <section className="bg-[var(--navy)] py-20 text-white">
      <PublicContainer>
        {contentLoading ? <PublicLoading label={common("loading")} /> : contentError || !content ? <PublicError message={common("requestUnavailable")} /> : <RevealOnScroll className="text-center"><h2 className="whitespace-pre-line font-display text-4xl font-bold">{localized(content.cta.title)}</h2><p className="mt-6 whitespace-pre-line text-lg text-white/80">{localized(content.cta.description)}</p><Link href="/contact" className="mt-10 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">{localized(content.cta.buttonLabel)} →</Link></RevealOnScroll>}
        </PublicContainer>
    </section>

    {/* CONTACT */}
    <section className="bg-[var(--background-light)] py-20 sm:py-24">
      <PublicContainer>
        {contactContentLoading ? <PublicLoading label={common("loading")} /> : contactContentError || !contactContent ? <PublicError message={common("requestUnavailable")} /> : <RevealOnScroll className="max-w-3xl"><p className="eyebrow text-[var(--rams-red)]">{localized(contactContent.homePreview.eyebrow)}</p><h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight tracking-[-0.03em] text-[var(--navy)] sm:text-5xl">{localized(contactContent.homePreview.title)}</h2><p className="mt-5 max-w-2xl text-lg leading-7 text-[var(--gray)]">{localized(contactContent.homePreview.description)}</p></RevealOnScroll>}

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
          <RevealOnScroll className="h-full">
            <ContactForm className="homepage-contact-form h-full" />
          </RevealOnScroll>

          <aside className="grid content-start gap-6">
            <RevealOnScroll className="h-full" delay={120}>
              <div className="homepage-contact-info h-full border border-[#D3DBE2] bg-white">
                <div className="border-b border-[#D3DBE2] px-6 py-6 sm:px-8">
                  <p className="eyebrow text-[var(--rams-red)]">{contact("contactEyebrow")}</p>
                  <h3 className="mt-3 font-display text-2xl font-bold text-[var(--navy)]">{contactContent ? localized(contactContent.details.title) : common("requestUnavailable")}</h3>
                  <span className="mt-4 block h-0.5 w-10 bg-[var(--rams-red)]" aria-hidden="true" />
                </div>
                <div className="divide-y divide-[#D3DBE2]">
                  <div className="homepage-contact-info-row flex gap-4 px-6 py-5 sm:px-8">
                    <ContactIcon kind="location" />
                    <div>
                      <p className="eyebrow">{contact("address")}</p>
                      <address className="homepage-contact-value mt-2 text-sm not-italic leading-6 text-[var(--gray)]">
                        {contactContent?.details.addressLines.map((line) => <span key={line.en} className="block">{localized(line)}</span>)}
                      </address>
                    </div>
                  </div>
                  <div className="homepage-contact-info-row flex gap-4 px-6 py-5 sm:px-8">
                    <ContactIcon kind="email" />
                    <div>
                      <p className="eyebrow">{contact("email")}</p>
                      {contactContent ? <a href={`mailto:${localized(contactContent.details.email)}`} className="homepage-contact-value mt-2 block text-sm font-semibold text-[var(--rams-red)] transition-colors duration-200 hover:text-[var(--rams-red-dark)]">{localized(contactContent.details.email)}</a> : <span className="homepage-contact-value mt-2 block text-sm text-[var(--gray)]">{common("requestUnavailable")}</span>}
                    </div>
                  </div>
                  <div className="homepage-contact-info-row flex gap-4 px-6 py-5 sm:px-8">
                    <ContactIcon kind="laboratory" />
                    <div>
                      <p className="eyebrow">{contact("laboratory")}</p>
                      <p className="homepage-contact-value mt-2 text-sm leading-6 text-[var(--gray)]">
                        {brand("laboratory")}<br />
                        {brand("institution")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={220}>
              <div className="homepage-contact-collaboration bg-[var(--navy)] p-6 text-white sm:p-8">
                <h3 className="font-display text-xl font-bold">{contactContent ? localized(contactContent.collaboration.title) : common("requestUnavailable")}</h3>
                <span className="mt-3 block h-0.5 w-10 bg-[var(--rams-red)]" aria-hidden="true" />
                <p className="mt-4 text-sm leading-6 text-white/70">{contactContent ? localized(contactContent.collaboration.description) : common("requestUnavailable")}</p>
                <Link href="#contact-form" className="mt-6 inline-flex items-center bg-[var(--rams-red)] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--rams-red-dark)]">
                  {contactContent ? localized(contactContent.collaboration.buttonLabel) : common("requestUnavailable")} <span className="ml-2" aria-hidden="true">→</span>
                </Link>
              </div>
            </RevealOnScroll>
          </aside>
        </div>
      </PublicContainer>
    </section>
  </>;
}
