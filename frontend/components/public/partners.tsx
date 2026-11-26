"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Partner, PartnerType } from "@/types/modules";
import PageHero from "./page-hero";
import PublicContainer from "./public-container";
import PartnerCard from "./partner-card";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty } from "./public-states";

export default function PublicPartners({
  type,
  initialPartners,
}: {
  type: PartnerType;
  initialPartners: Partner[];
}) {
  const t = useTranslations("partners");
  const partners = initialPartners;
  const university = type === "UNIVERSITY";

  return (
    <>
      <PageHero
        eyebrow={university ? t("universityEyebrow") : t("industrialEyebrow")}
        title={university ? t("universityTitle") : t("industrialTitle")}
        description={
          university ? t("universityDescription") : t("industrialDescription")
        }
        current={t("heroEyebrow")}
      />
      <section className="bg-[var(--paper)]">
        <PublicContainer className="py-10 sm:py-14">
          <RevealOnScroll className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div>
              <h2 className="public-section-title text-[var(--navy)]">
                {university ? t("universityTitle") : t("industrialTitle")}
              </h2>
            </div>
            <span className="text-sm text-[var(--gray)]">
              {`${partners.length} ${t("directory")}`}
            </span>
          </RevealOnScroll>

          <RevealOnScroll className="mb-6 flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/partners" className="text-[var(--rams-red)]">
              ← Back
            </Link>
            {university ? (
              <Link
                href="/partners/industrial"
                className="text-[var(--rams-red)]"
              >
                {t("industrialDirectory")} →
              </Link>
            ) : (
              <Link
                href="/partners/university"
                className="text-[var(--rams-red)]"
              >
                {t("universityDirectory")} →
              </Link>
            )}
          </RevealOnScroll>

          {partners.length === 0 ? (
            <PublicEmpty
              title={university ? t("noUniversity") : t("noIndustrial")}
              description={t("noDescription")}
            />
          ) : (
            <RevealOnScroll
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
              stagger={100}
            >
              {partners.map((partner) => (
                <PartnerCard key={partner._id} partner={partner} />
              ))}
            </RevealOnScroll>
          )}
        </PublicContainer>
      </section>
    </>
  );
}
