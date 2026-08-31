"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getPublicProjects } from "@/lib/api/modules";
import type { Project } from "@/types/modules";
import PublicContainer from "./public-container";
import ProjectCard from "./project-card";
import PageHero from "./page-hero";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";

export default function PublicProjects() {
  const t = useTranslations("projects");
  const common = useTranslations("common");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublicProjects()
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    getPublicProjects()
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <PageHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        description={t("heroDescription")}
        current={t("heroEyebrow")}
      />
      <section className="bg-[var(--paper)]">
        <PublicContainer className="py-16 sm:py-20">
          <RevealOnScroll className="mb-10 flex flex-col gap-3 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">{t("register")}</p>
              <p className="mt-3 text-sm text-[var(--slate)]">{t("sorted")}</p>
            </div>
            <p className="text-sm text-[var(--gray)]">
              {loading
                ? common("syncing")
                : `${projects.length} ${projects.length === 1 ? common("record") : common("records")}`}
            </p>
          </RevealOnScroll>
          {loading ? (
            <PublicLoading label={t("loading")} />
          ) : error ? (
            <PublicError message={t("error")} onRetry={load} />
          ) : projects.length === 0 ? (
            <PublicEmpty
              title={t("noTitle")}
              description={t("noDescription")}
            />
          ) : (
            <RevealOnScroll
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
              stagger={100}
            >
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>
    </>
  );
}
