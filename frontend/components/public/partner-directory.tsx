"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicPartners } from "@/lib/api/modules";
import type { Partner } from "@/types/modules";
import PartnerCard from "./partner-card";
import RevealOnScroll from "./reveal-on-scroll";
import { PublicError, PublicLoading } from "./public-states";

export default function PartnerDirectory() {
  const t = useTranslations("partners");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    Promise.all([
      getPublicPartners("UNIVERSITY"),
      getPublicPartners("INDUSTRIAL"),
    ])
      .then(([university, industrial]) =>
        setPartners([...university, ...industrial].slice(0, 6)),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="mt-20">
      <RevealOnScroll className="flex items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <p className="eyebrow">{t("directory")}</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--navy)]">
            {t("selected")}
          </h2>
        </div>
        <span className="text-sm text-[var(--gray)]">
          {loading ? t("loading") : `${partners.length} ${t("directory")}`}
        </span>
      </RevealOnScroll>
      <div className="mt-8">
        {loading ? (
          <PublicLoading label={t("loading")} />
        ) : error ? (
          <PublicError message={t("noDescription")} />
        ) : partners.length > 0 ? (
          <RevealOnScroll
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            stagger={100}
          >
            {partners.map((partner) => (
              <PartnerCard key={partner._id} partner={partner} />
            ))}
          </RevealOnScroll>
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
