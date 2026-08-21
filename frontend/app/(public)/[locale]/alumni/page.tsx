import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import AlumniDirectory from "@/components/public/alumni-directory";
import CtaSection from "@/components/public/cta-section";
import PageHero from "@/components/public/page-hero";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "alumni" });
  return localizedMetadata({ locale: locale as Locale, title: t("heroTitle"), description: t("heroDescription"), path: "/alumni" });
}

export default function AlumniPage() {
  const t = useTranslations("alumni");
  const home = useTranslations("home");
  return <><PageHero eyebrow={t("heroEyebrow")} title={t("heroTitle")} description={t("heroDescription")} current={t("heroEyebrow")} /><AlumniDirectory /><CtaSection title={t("ctaTitle")} description={home("ctaDescription")} primary={home("primaryCta")} secondary={home("researchLink")} /></>;
}
