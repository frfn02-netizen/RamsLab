import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicHome from "@/components/public/home";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return localizedMetadata({ locale: locale as Locale, title: t("headline"), description: t("description"), path: "/" });
}

export default function HomePage() { return <PublicHome />; }
