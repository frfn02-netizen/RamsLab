import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Partner } from "@/types/modules";
import { safeHttpUrl } from "@/lib/safe-url";

export default function PartnerCard({ partner }: { partner: Partner }) {
  const t = useTranslations("common");
  const website = safeHttpUrl(partner.website);
  return (
    <article className="public-card-interaction group flex flex-col border border-[var(--border)] bg-white p-6 hover:border-[var(--ais-blue)]">
      <div className="flex items-start justify-between gap-4">
        {partner.logo ? (
          <div className="flex h-[120px] w-full max-w-[200px] flex-shrink-0 items-center justify-start bg-white p-2">
            <Image
              src={partner.logo}
              alt={partner.name}
              width={200}
              height={120}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <span className="grid h-14 w-14 place-items-center border border-[var(--ais-blue)]/30 bg-[var(--paper)] font-display text-lg font-semibold text-[var(--ais-blue)]">
            {partner.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="eyebrow text-[var(--gray)]">
          {partner.type === "UNIVERSITY" ? t("academic") : t("industrial")}
        </span>
      </div>
      <h2 className="mt-5 font-display text-lg font-semibold leading-tight text-[var(--navy)]">
        {partner.name}
      </h2>
      {partner.country && (
        <p className="mt-1.5 text-sm text-[var(--ais-blue)]">
          {partner.country}
        </p>
      )}
      <div className="mt-auto pt-4">
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noreferrer"
            className="public-card-arrow inline-block text-sm font-semibold text-[var(--rams-red)]"
          >
            {t("visitWebsite")} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
