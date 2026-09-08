"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getPublicProjects,
  getPublicResearch,
  getPublicSiteContent,
} from "@/lib/api/modules";
import type { Project, PublicResearchArea } from "@/types/modules";
import type { HomepageContent } from "@/types/site-content";
import PublicContainer from "./public-container";
import ProjectCard from "./project-card";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import ResearchHighlights from "./research-highlights";
import HomeIntroduction, { HeadOfLaboratorySection } from "./home-introduction";
import HomePeopleSection from "./home-people";

const researchImages = [
  "/assets/offshore.jpg",
  "/assets/vessel.jpeg",
  "/assets/port.jpeg",
  "/assets/upscalemedia-transformed.jpeg",
] as const;

export default function PublicHome() {
  const locale = useLocale() === "id" ? "id" : "en";
  const brand = useTranslations("brand");
  const projectsT = useTranslations("projects");
  const common = useTranslations("common");
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState(false);
  const [researchAreas, setResearchAreas] = useState<PublicResearchArea[]>([]);
  const [researchLoading, setResearchLoading] = useState(true);
  const [researchError, setResearchError] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState(false);

  useEffect(() => {
    getPublicProjects({ featured: true, limit: 12 })
      .then(setProjects)
      .catch(() => setProjectsError(true))
      .finally(() => setProjectsLoading(false));
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
      <section className="bg-[var(--background-light)] py-20">
        <PublicContainer>
          {contentLoading ? (
            <PublicLoading label={common("loading")} />
          ) : contentError || !content ? (
            <PublicError message={common("requestUnavailable")} />
          ) : (
            <RevealOnScroll className="text-center">
              <h2 className="font-display text-2xl font-bold text-[var(--navy)]">
                {localized(content.ecosystem.title)}
              </h2>
            </RevealOnScroll>
          )}
          <RevealOnScroll
            className="mt-12 grid grid-cols-1 border-y border-[var(--border)] sm:grid-cols-3"
            stagger={120}
          >
            <div className="ecosystem-reveal-item">
              <div className="ecosystem-block group px-6 py-8 text-center sm:px-8 lg:px-12">
                <div className="ecosystem-logo-stage">
                  <div className="ecosystem-logo absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2">
                    <Image
                      src="/assets/rams-logo.png"
                      alt={brand("laboratory")}
                      fill
                      sizes="128px"
                      className="object-contain"
                    />
                  </div>
                </div>
                <p className="ecosystem-name font-display text-base font-semibold text-[var(--navy)]">
                  {brand("laboratory")}
                </p>
                <p className="mt-2 text-xs text-[var(--gray)]">
                  {content
                    ? localized(
                        content.ecosystem.ramsDescription ?? {
                          en: brand("technicalLine"),
                          id: brand("technicalLine"),
                        },
                      )
                    : ""}
                </p>
              </div>
            </div>
            <div className="ecosystem-reveal-item">
              <div className="ecosystem-block group border-[var(--border)] px-6 py-8 text-center sm:border-l sm:px-8 lg:px-12">
                <div className="ecosystem-logo-stage">
                  <a
                    href="https://aisits.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={brand("ais")}
                    className="ecosystem-logo absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Image
                      src="/assets/logo ais part2.png"
                      alt={brand("ais")}
                      fill
                      sizes="256px"
                      className="object-contain"
                    />
                  </a>
                </div>
                <p className="ecosystem-name font-display text-base font-semibold text-[var(--navy)]">
                  {brand("ais")}
                </p>
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[var(--gray)]">
                  {content ? localized(content.ecosystem.aisDescription) : ""}
                </p>
              </div>
            </div>
            <div className="ecosystem-reveal-item">
              <div className="ecosystem-block group border-[var(--border)] px-6 py-8 text-center sm:border-l sm:px-8 lg:px-12">
                <div className="ecosystem-logo-stage">
                  <a
                    href="https://www.youtube.com/watch?v=9ry3kKPBAyg&t=72s"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={brand("pui")}
                    className="ecosystem-logo absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Image
                      src="/assets/logo pu-kekal part2.png"
                      alt={brand("pui")}
                      fill
                      sizes="320px"
                      className="object-contain"
                    />
                  </a>
                </div>
                <p className="ecosystem-name font-display text-base font-semibold text-[var(--navy)]">
                  {brand("pui")}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--gray)]">
                  {content
                    ? localized(
                        content.ecosystem.puiKekalDescription ?? {
                          en: "",
                          id: "",
                        },
                      )
                    : ""}
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

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
                    {localized(content.research.title)}
                  </h2>
                  <p className="mt-4 text-lg text-[var(--gray)]">
                    {localized(content.research.description)}
                  </p>
                </div>
                <Link
                  href="/research"
                  className="text-sm font-semibold text-[var(--rams-red)]"
                >
                  {localized(content.research.linkLabel)} →
                </Link>
              </RevealOnScroll>
              <RevealOnScroll
                className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
                stagger={100}
              >
                {researchAreas.slice(0, 4).map((area, index) => (
                  <div
                    key={area.code}
                    className="public-card-interaction group border border-[var(--border)] bg-white p-1 hover:border-[var(--rams-red)]"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={area.image ?? researchImages[index]}
                        alt={localized(area.title)}
                        fill
                        unoptimized
                        className="public-image-zoom object-cover"
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
                ))}
              </RevealOnScroll>
            </>
          )}
        </PublicContainer>
      </section>

      {/* PROJECTS */}
      <section className="border-t border-[var(--border)] bg-[var(--background-light)] py-20">
        <PublicContainer>
          <RevealOnScroll className="flex items-end justify-between">
            <h2 className="font-display text-4xl font-bold text-[var(--navy)]">
              {content
                ? localized(content.projects.title)
                : common("requestUnavailable")}
            </h2>
            <Link
              href="/projects"
              className="text-sm font-semibold text-[var(--rams-red)]"
            >
              {common("allProjects")} →
            </Link>
          </RevealOnScroll>
          <div className="mt-12">
            {projectsLoading ? (
              <PublicLoading label={projectsT("loading")} />
            ) : projectsError ? (
              <PublicError message={projectsT("error")} />
            ) : projects.length === 0 ? (
              <PublicEmpty
                title={projectsT("noTitle")}
                description={projectsT("noDescription")}
              />
            ) : (
              <RevealOnScroll
                className="grid gap-8 lg:grid-cols-3"
                stagger={100}
              >
                {projects
                  .slice(0, content?.projects.featuredLimit ?? 3)
                  .map((project) => (
                    <ProjectCard key={project._id} project={project} />
                  ))}
              </RevealOnScroll>
            )}
          </div>
        </PublicContainer>
      </section>

      {/* CTA */}
      <section className="bg-[var(--navy)] py-20 text-white">
        <PublicContainer>
          {contentLoading ? (
            <PublicLoading label={common("loading")} />
          ) : contentError || !content ? (
            <PublicError message={common("requestUnavailable")} />
          ) : (
            <RevealOnScroll className="text-center">
              <h2 className="whitespace-pre-line font-display text-4xl font-bold">
                {localized(content.cta.title)}
              </h2>
              <p className="mt-6 whitespace-pre-line text-lg text-white/80">
                {localized(content.cta.description)}
              </p>
              <Link
                href="/contact"
                className="mt-10 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
              >
                {localized(content.cta.buttonLabel)} →
              </Link>
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>
    </>
  );
}
