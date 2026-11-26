import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PartnerDirectory from "@/components/public/partner-directory";
import PageHero from "@/components/public/page-hero";
import PublicContainer from "@/components/public/public-container";

import { getPublicPartners } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Partner } from "@/types/modules";
import type { Locale } from "@/i18n/routing";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({
    locale,
    namespace: "partners",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/partners",
  });
}

export default async function PartnersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "partners" });

  const [university, industrial] = await Promise.all([
    getPublicPartners("UNIVERSITY", { next: { revalidate: 300 } }).catch(
      () => [] as Partner[],
    ),
    getPublicPartners("INDUSTRIAL", { next: { revalidate: 300 } }).catch(
      () => [] as Partner[],
    ),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        description={t("heroDescription")}
        current={t("allPartners")}
      />
      <section className="bg-[var(--paper)]">
        <PublicContainer className="py-12 sm:py-16">
          <PartnerDirectory
            initialAcademic={university}
            initialIndustrial={industrial}
          />
        </PublicContainer>
      </section>
    </>
  );
}
