import Image from "next/image";
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
    <article className="group flex h-full flex-col border border-[var(--border)] bg-white transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--rams-red)]/55 hover:shadow-[0_10px_28px_rgba(11,32,56,0.07)]">
      {project.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={project.image}
            alt={project.title}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--rams-red)]">
            {category}
          </span>
          <span className="text-[var(--border)]" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[0.65rem] text-[var(--gray)]">
            {project.year}
          </span>
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold leading-snug tracking-[-0.025em] text-[var(--navy)] transition-colors duration-300 group-hover:text-[var(--rams-red)] sm:text-[1.65rem]">
          {project.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-[var(--slate)]">
          {project.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <span className="flex items-center gap-2 text-xs font-semibold text-[var(--gray)]">
            <i
              className={`inline-block h-2 w-2 rounded-full ${project.status === "COMPLETED" ? "bg-[var(--ais-blue)]" : "bg-[var(--rams-red)]"}`}
            />
            {status}
          </span>
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--rams-red)] transition-colors duration-300 hover:text-[var(--rams-red-dark)]"
          >
            {t("viewProject")}
            <span
              className="transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
