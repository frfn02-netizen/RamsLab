"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicProject, getPublicProjects } from "@/lib/api/modules";
import type { Project } from "@/types/modules";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";
import ProjectCard from "./project-card";
import RevealOnScroll from "./reveal-on-scroll";

export default function PublicProjectDetail({
  slug,
  initialProject,
}: {
  slug: string;
  initialProject?: Project | null;
}) {
  const t = useTranslations("projects");
  const common = useTranslations("common");
  const [project, setProject] = useState<Project | null>(
    initialProject ?? null,
  );
  const [related, setRelated] = useState<Project[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!initialProject);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublicProject(slug)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (initialProject) return;
    getPublicProject(slug)
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [initialProject, slug]);

  useEffect(() => {
    getPublicProjects()
      .then((items) =>
        setRelated(items.filter((item) => item.slug !== slug).slice(0, 3)),
      )
      .catch(() => undefined);
  }, [slug]);

  const category = (value: Project["category"]) =>
    value === "RESEARCH"
      ? common("researchCategory")
      : value === "CONSULTING"
        ? common("consultingCategory")
        : value === "DEVELOPMENT"
          ? common("developmentCategory")
          : common("otherCategory");

  const status = (value: Project["status"]) =>
    value === "PLANNING"
      ? common("planning")
      : value === "ONGOING"
        ? common("ongoing")
        : common("completed");

  if (loading) {
    return (
      <section className="bg-[var(--paper)]">
        <PublicContainer className="py-20">
          <PublicLoading label={common("loading")} />
        </PublicContainer>
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className="bg-[var(--paper)]">
        <PublicContainer className="py-20">
          <PublicError
            message={error ? t("error") : t("notFound")}
            onRetry={load}
          />
        </PublicContainer>
      </section>
    );
  }

  return (
    <>
      <section className="public-grid-dark bg-[var(--navy)] text-white">
        <PublicContainer className="py-14 sm:py-20">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-white/45">
            <Link href="/projects" className="transition hover:text-white">
              {common("projects")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--ais-blue-light)]">{project.slug}</span>
          </div>
          <div className="hero-entrance mt-12 max-w-4xl">
            <div className="flex flex-wrap items-center gap-4">
              <span className="eyebrow text-[var(--rams-red-light)]">
                {category(project.category)}
              </span>
              <span className="font-mono text-xs text-white/45">
                {project.year}
              </span>
            </div>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.03] tracking-[-0.05em] sm:text-6xl">
              {project.title}
            </h1>
          </div>
        </PublicContainer>
      </section>

      <section className="bg-[var(--paper)]">
        <PublicContainer>
          <RevealOnScroll
            className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.2fr_.8fr] lg:gap-20"
            stagger={120}
          >
            <article>
              <p className="eyebrow text-[var(--ais-blue)]">
                {t("detailDescription")}
              </p>
              <p className="mt-6 whitespace-pre-wrap text-lg leading-8 text-[var(--navy)]">
                {project.description}
              </p>
              {project.technologies.length > 0 && (
                <div className="mt-12 border-t border-[var(--border)] pt-7">
                  <p className="eyebrow text-[var(--gray)]">
                    {t("technicalDetails")}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.technologies.map((technology) => (
                      <span
                        key={technology}
                        className="border border-[var(--border)] bg-white px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-[var(--slate)]"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
            <aside className="public-card-interaction h-fit border border-[var(--border)] bg-white p-6 sm:p-8">
              <p className="eyebrow text-[var(--rams-red)]">{t("metadata")}</p>
              <dl className="mt-6 divide-y divide-[var(--border)]">
                {[
                  [common("category"), category(project.category)],
                  [common("year"), String(project.year)],
                  [common("status"), status(project.status)],
                  [t("slug"), project.slug],
                ].map(([key, value]) => (
                  <div key={key} className="py-4 first:pt-0 last:pb-0">
                    <dt className="font-mono text-[0.6rem] uppercase tracking-[0.11em] text-[var(--gray)]">
                      {key}
                    </dt>
                    <dd className="mt-2 text-sm font-semibold text-[var(--navy)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-7 border-t border-[var(--border)] pt-5 text-xs leading-5 text-[var(--gray)]">
                {t("partnerNote")}
              </p>
            </aside>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      {related.length > 0 && (
        <section className="border-t border-[var(--border)] bg-white">
          <PublicContainer className="py-16 sm:py-20">
            <RevealOnScroll className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow text-[var(--ais-blue)]">
                  {t("relatedEyebrow")}
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)]">
                  {t("relatedTitle")}
                </h2>
              </div>
              <Link
                href="/projects"
                className="text-sm font-semibold text-[var(--rams-red)]"
              >
                {common("allProjects")} ↗
              </Link>
            </RevealOnScroll>
            <RevealOnScroll
              className="mt-10 grid gap-4 md:grid-cols-3"
              stagger={100}
            >
              {related.map((item) => (
                <ProjectCard key={item._id} project={item} />
              ))}
            </RevealOnScroll>
          </PublicContainer>
        </section>
      )}
    </>
  );
}
