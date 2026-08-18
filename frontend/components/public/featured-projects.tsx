"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicProjects } from "@/lib/api/modules";
import type { Project } from "@/types/modules";
import PublicContainer from "./public-container";
import ProjectCard from "./project-card";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";

export default function FeaturedProjects() {
  const t = useTranslations("research");
  const common = useTranslations("common");
  const projectsT = useTranslations("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    getPublicProjects()
      .then((items) => {
        setProjects(items.slice(0, 3));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [attempt]);

  function handleRetry() {
    setLoading(true);
    setError(false);
    setAttempt((value) => value + 1);
  }

  return (
    <section className="border-t border-[var(--border)] bg-[var(--background-light)] py-20 sm:py-28">
      <PublicContainer>
        <RevealOnScroll className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">{t("featuredEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">{t("featuredTitle")}</h2>
            <p className="mt-4 text-lg text-[var(--gray)]">{t("featuredDescription")}</p>
          </div>
          <Link href="/projects" className="shrink-0 text-sm font-semibold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]">
            {common("allProjects")} →
          </Link>
        </RevealOnScroll>
        <div className="mt-12">
          {loading ? (
            <PublicLoading label={projectsT("loading")} />
          ) : error ? (
            <PublicError message={projectsT("error")} onRetry={handleRetry} />
          ) : projects.length === 0 ? (
            <PublicEmpty title={projectsT("noTitle")} description={projectsT("noDescription")} />
          ) : (
            <RevealOnScroll className="grid gap-6 lg:grid-cols-3" stagger={100}>
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </RevealOnScroll>
          )}
        </div>
      </PublicContainer>
    </section>
  );
}
