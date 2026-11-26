import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AlumniDirectory from "@/components/public/alumni-directory";
import CtaSection from "@/components/public/cta-section";
import PageHero from "@/components/public/page-hero";
import { getPublicAlumniList } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { PublicPerson } from "@/types/people";
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
    namespace: "alumni",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/alumni",
  });
}

export default async function AlumniPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "id" ? "id" : "en";
  const [t, home, common, alumni] = await Promise.all([
    getTranslations({ locale, namespace: "alumni" }),
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "common" }),
    getPublicAlumniList({ next: { revalidate: 300 } }).catch(
      () => [] as PublicPerson[],
    ),
  ]);

  return (
    <>
      <PageHero
        eyebrow={t("heroEyebrow")}
        title={t("heroTitle")}
        description={t("heroDescription")}
        current={t("heroEyebrow")}
      />

      <AlumniDirectory initialRecords={alumni} />

      <CtaSection
        eyebrow={common("nextConversation")}
        title={t("ctaTitle")}
        description={home("ctaDescription")}
        primary={home("primaryCta")}
        primaryHref="/research"
      />
    </>
  );
}
