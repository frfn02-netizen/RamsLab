import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Publications from "@/components/public/publications";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publications" });
  return localizedMetadata({ locale: locale as Locale, title: t("heroTitle"), description: t("heroDescription"), path: "/publications" });
}

function PublicationsFallback() {
  return <section className="min-h-[42rem] bg-[var(--background-light)]" aria-busy="true" />;
}

export default function PublicationsPage() {
  return <Suspense fallback={<PublicationsFallback />}><Publications /></Suspense>;
}
