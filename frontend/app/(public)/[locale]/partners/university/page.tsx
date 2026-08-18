import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicPartners from "@/components/public/partners";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const t = await getTranslations({ locale, namespace: "partners" }); return localizedMetadata({ locale: locale as Locale, title: t("universityTitle"), description: t("universityDescription"), path: "/partners/university" }); }
export default function UniversityPartnersPage() { return <PublicPartners type="UNIVERSITY" />; }
