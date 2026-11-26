import SiteContentEditor from "@/components/dashboard/site-content-editor";
import { notFound } from "next/navigation";
import { isSiteContentKey } from "@/types/site-content";

export default async function DashboardContentEditorPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  if (!isSiteContentKey(key)) {
    notFound();
  }

  return <SiteContentEditor keyName={key} />;
}
