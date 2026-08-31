import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ResearchAreaCode } from "./content";

export default function ResearchCard({ code }: { code: ResearchAreaCode }) {
  const t = useTranslations("research.areas");
  const common = useTranslations("common");
  return (
    <Link
      href={`/research#${code.toLowerCase()}`}
      className="public-card-interaction group border border-[var(--border)] border-t-4 border-t-[var(--rams-red)] bg-white p-6 hover:border-t-[var(--ais-blue)]"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-semibold text-[var(--rams-red)]">
          {code}
        </span>
        <span
          className="public-card-arrow text-sm text-[var(--gray)]"
          aria-hidden="true"
        >
          ↗
        </span>
      </div>
      <h3 className="public-card-title mt-7 font-display text-xl font-semibold text-[var(--navy)]">
        {t(`${code}.title`)}
      </h3>
      <p className="mt-3 text-sm leading-6 text-[var(--slate)]">
        {t(`${code}.description`)}
      </p>
      <p className="mt-6 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--gray)]">
        {t(`${code}.applications`)}
      </p>
      <span className="sr-only">{common("readMore")}</span>
    </Link>
  );
}
