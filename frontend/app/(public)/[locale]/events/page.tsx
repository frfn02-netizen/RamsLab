import { getTranslations } from "next-intl/server";
import PublicEventsPage from "@/components/public/events/public-events-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return {
    title: t("metaTitle"),
    description: t("description"),
  };
}

export default function EventsRoutePage() {
  return <PublicEventsPage />;
}
