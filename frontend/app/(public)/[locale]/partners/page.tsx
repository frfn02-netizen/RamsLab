import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import PageHero from "@/components/public/page-hero";
import PublicContainer from "@/components/public/public-container";
import PartnerDirectory from "@/components/public/partner-directory";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import RevealOnScroll from "@/components/public/reveal-on-scroll";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const t = await getTranslations({ locale, namespace: "partners" }); return localizedMetadata({ locale: locale as Locale, title: t("heroTitle"), description: t("heroDescription"), path: "/partners" }); }
export default function PartnersPage() { const t = useTranslations("partners"); return <><PageHero eyebrow={t("heroEyebrow")} title={t("heroTitle")} description={t("heroDescription")} current={t("heroEyebrow")} /><section className="bg-[var(--paper)]"><PublicContainer className="py-16 sm:py-20"><RevealOnScroll className="grid gap-4 md:grid-cols-2" stagger={120}><Link href="/partners/university" className="public-card-interaction group border border-[var(--border)] bg-white p-7 hover:border-[var(--ais-blue)]"><p className="eyebrow text-[var(--ais-blue)]">{t("academic")}</p><h2 className="public-card-title mt-6 font-display text-2xl font-semibold text-[var(--navy)]">{t("academicTitle")} <span className="public-card-arrow text-[var(--rams-red)]">↗</span></h2><p className="mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">{t("academicDescription")}</p></Link><Link href="/partners/industrial" className="public-card-interaction group border border-[var(--border)] bg-white p-7 hover:border-[var(--rams-red)]"><p className="eyebrow text-[var(--rams-red)]">{t("industry")}</p><h2 className="public-card-title mt-6 font-display text-2xl font-semibold text-[var(--navy)]">{t("industryTitle")} <span className="public-card-arrow text-[var(--rams-red)]">↗</span></h2><p className="mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">{t("industryDescription")}</p></Link></RevealOnScroll><PartnerDirectory /></PublicContainer></section></>; }
