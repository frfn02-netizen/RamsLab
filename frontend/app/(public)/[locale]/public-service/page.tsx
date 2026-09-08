import { getTranslations } from "next-intl/server";
import PublicServicePage from "@/components/public/public-service/public-service-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicService" });
  return {
    title: t("metaTitle"),
    description: t("description"),
  };
}

export default function PublicServiceRoutePage() {
  return <PublicServicePage />;
}
