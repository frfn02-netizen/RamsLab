import { useTranslations } from "next-intl";
import type { Partner } from "@/types/modules";
import { safeHttpUrl } from "@/lib/safe-url";

export default function PartnerCard({ partner }: { partner: Partner }) {
  const t = useTranslations("common");
  const website = safeHttpUrl(partner.website);
  return (
    <article className="public-card-interaction group border border-[var(--border)] bg-white p-6 hover:border-[var(--ais-blue)]">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-10 w-10 place-items-center border border-[var(--ais-blue)]/30 bg-[var(--paper)] font-display text-sm font-semibold text-[var(--ais-blue)]">
          {partner.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="eyebrow text-[var(--gray)]">
          {partner.type === "UNIVERSITY" ? t("academic") : t("industrial")}
        </span>
      </div>
      <h2 className="public-card-title mt-7 font-display text-lg font-semibold leading-tight text-[var(--navy)]">
        {partner.name}
      </h2>
      {partner.country && (
        <p className="mt-2 text-xs font-medium text-[var(--ais-blue)]">
          {partner.country}
        </p>
      )}
      {partner.description && (
        <p className="mt-4 text-sm leading-6 text-[var(--slate)]">
          {partner.description}
        </p>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noreferrer"
          className="public-card-arrow mt-5 inline-block text-sm font-semibold text-[var(--rams-red)]"
        >
          {t("visitWebsite")} <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  );
}
