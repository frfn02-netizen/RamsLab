"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicPartners } from "@/lib/api/modules";
import type { Partner, PartnerType } from "@/types/modules";
import PageHero from "./page-hero";
import PublicContainer from "./public-container";
import PartnerCard from "./partner-card";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";

export default function PublicPartners({ type }: { type: PartnerType }) {
  const t = useTranslations("partners");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const university = type === "UNIVERSITY";
  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublicPartners(type)
      .then(setPartners)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [type]);
  useEffect(() => {
    getPublicPartners(type)
      .then(setPartners)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [type]);
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
        <PublicContainer className="py-16 sm:py-20">
          <RevealOnScroll className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <p className="eyebrow">
                {university ? t("universityEyebrow") : t("industrialEyebrow")}
              </p>
              <p className="mt-3 text-sm text-[var(--slate)]">
                {t("publishedFromApi")}
              </p>
            </div>
            <div className="flex gap-4 text-sm font-semibold">
              <Link
                href="/partners/university"
                className={
                  university ? "text-[var(--rams-red)]" : "text-[var(--gray)]"
                }
              >
                {t("academic")}
              </Link>
              <Link
                href="/partners/industrial"
                className={
                  !university ? "text-[var(--rams-red)]" : "text-[var(--gray)]"
                }
              >
                {t("industry")}
              </Link>
            </div>
          </RevealOnScroll>
          {loading ? (
            <PublicLoading label={t("loading")} />
          ) : error ? (
            <PublicError message={t("noDescription")} onRetry={load} />
          ) : partners.length === 0 ? (
            <PublicEmpty
              title={university ? t("noUniversity") : t("noIndustrial")}
              description={t("noDescription")}
            />
          ) : (
            <RevealOnScroll
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
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
