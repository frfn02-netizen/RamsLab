import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicDosenProfile from "@/components/public/public-dosen-profile";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "team" });

  return localizedMetadata({
    locale: locale as Locale,
    title: `${t("heroEyebrow")} | RAMS Laboratory`,
    description: t("heroDescription"),
    path: "/team",
  });
}

export default async function PublicDosenProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  return <PublicDosenProfile id={id} />;
}
