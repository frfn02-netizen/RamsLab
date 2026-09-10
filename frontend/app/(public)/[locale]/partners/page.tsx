import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PartnerDirectory from "@/components/public/partner-directory";
import PublicContainer from "@/components/public/public-container";

import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

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

export default function PartnersPage() {
  return (
    <section className="bg-[var(--paper)]">
      <PublicContainer className="py-16 sm:py-20">
        <PartnerDirectory />
      </PublicContainer>
    </section>
  );
}
