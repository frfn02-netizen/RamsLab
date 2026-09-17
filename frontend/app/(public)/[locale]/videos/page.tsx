import { getTranslations } from "next-intl/server";
import PublicVideosPage from "@/components/public/public-videos-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "videos" });
  return {
    title: t("metaTitle"),
    description: t("description"),
  };
}

export default function VideosRoutePage() {
  return <PublicVideosPage />;
}
