"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Partner } from "@/types/modules";
import PartnerCard from "./partner-card";
import RevealOnScroll from "./reveal-on-scroll";

const FEATURED_UNIVERSITY = 6;
const FEATURED_INDUSTRIAL = 3;

export default function PartnerDirectory({
  initialAcademic,
  initialIndustrial,
}: {
  initialAcademic: Partner[];
  initialIndustrial: Partner[];
}) {
  const t = useTranslations("partners");
  const academic = initialAcademic;
  const industrial = initialIndustrial;
  const totalPublished = academic.length + industrial.length;
  const featuredAcademic = academic.slice(0, FEATURED_UNIVERSITY);
  const featuredIndustrial = industrial.slice(0, FEATURED_INDUSTRIAL);

  return (
    <div>
      <RevealOnScroll className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="eyebrow text-[var(--gray)]">{t("directory")}</p>
          <h2 className="public-section-title mt-2 text-[var(--navy)]">
            {t("selected")}
          </h2>
        </div>
        <span className="text-sm text-[var(--gray)]">
          {`${totalPublished} ${t("directory")}`}
        </span>
      </RevealOnScroll>

      <div className="mt-6">
        {totalPublished > 0 ? (
          <>
            {featuredAcademic.length > 0 && (
              <RevealOnScroll
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                stagger={100}
              >
                {featuredAcademic.map((partner) => (
                  <PartnerCard key={partner._id} partner={partner} />
                ))}
              </RevealOnScroll>
            )}

            {featuredIndustrial.length > 0 && (
              <RevealOnScroll
                className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4${featuredAcademic.length > 0 ? " mt-8" : ""}`}
                stagger={100}
              >
                {featuredIndustrial.map((partner) => (
                  <PartnerCard key={partner._id} partner={partner} />
                ))}
              </RevealOnScroll>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--slate)]">{t("directoryNote")}</p>
        )}
      </div>

      <RevealOnScroll className="mt-8 flex flex-wrap gap-4 text-sm font-semibold">
        <Link href="/partners/university" className="text-[var(--rams-red)]">
          {t("universityDirectory")} ↗
        </Link>
        <Link href="/partners/industrial" className="text-[var(--rams-red)]">
          {t("industrialDirectory")} ↗
        </Link>
      </RevealOnScroll>
    </div>
  );
}
