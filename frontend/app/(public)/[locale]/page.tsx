import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicHome from "@/components/public/home";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import { getPublicSiteContent } from "@/lib/api/modules";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  try {
    const content = await getPublicSiteContent("homepage");
    const language = locale === "id" ? "id" : "en";
    return localizedMetadata({ locale: locale as Locale, title: content.hero.headline[language], description: content.hero.description[language], path: "/" });
  } catch {
    const t = await getTranslations({ locale, namespace: "home" });
    return localizedMetadata({ locale: locale as Locale, title: t("headline"), description: t("description"), path: "/" });
  }
}

export default function HomePage() { return <PublicHome />; }
