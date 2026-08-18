import SiteContentEditor from "@/components/dashboard/site-content-editor";

export default async function DashboardContentEditorPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <SiteContentEditor keyName={key} />;
}
