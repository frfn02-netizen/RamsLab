import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/types/modules";

export default function ProjectCard({ project }: { project: Project }) {
  const t = useTranslations("common");
  const status =
    project.status === "PLANNING"
      ? t("planning")
      : project.status === "ONGOING"
        ? t("ongoing")
        : t("completed");
  const category =
    project.category === "RESEARCH"
      ? t("researchCategory")
      : project.category === "CONSULTING"
        ? t("consultingCategory")
        : project.category === "DEVELOPMENT"
          ? t("developmentCategory")
          : t("otherCategory");
  return (
    <article className="public-card-interaction group flex h-full flex-col border border-[var(--border)] bg-white p-6 hover:border-[var(--rams-red)]">
      <div className="flex items-start justify-between gap-4">
        <span className="eyebrow text-[var(--ais-blue)]">{category}</span>
        <span className="text-xs text-[var(--gray)]">{project.year}</span>
      </div>
      <h2 className="public-card-title mt-8 font-display text-xl font-semibold leading-tight text-[var(--navy)]">
        {project.title}
      </h2>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--slate)]">
        {project.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <span className="flex items-center text-xs text-[var(--gray)]">
          <i
            className={`mr-2 inline-block h-2 w-2 ${project.status === "COMPLETED" ? "bg-[var(--ais-blue)]" : "bg-[var(--rams-red)]"}`}
          />
          {status}
        </span>
        <Link
          href={`/projects/${project.slug}`}
          className="public-card-arrow text-sm font-semibold text-[var(--rams-red)]"
        >
          {t("viewProject")} <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
