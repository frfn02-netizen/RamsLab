import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PublicPartners from "@/components/public/partners";
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
    title: t("industrialTitle"),
    description: t("industrialDescription"),
    path: "/partners/industrial",
  });
}

export default async function IndustrialPartnersPage() {
  let partners: Partner[] = [];

  try {
    partners = await getPublicPartners("INDUSTRIAL", {
      next: { revalidate: 300 },
    });
  } catch {
    partners = [];
  }

  return <PublicPartners type="INDUSTRIAL" initialPartners={partners} />;
}
