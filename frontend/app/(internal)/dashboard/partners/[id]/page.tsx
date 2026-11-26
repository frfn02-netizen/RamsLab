import PartnerDetail from "@/components/dashboard/partner-detail";

export default async function PartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  const type = query.type === "INDUSTRIAL" ? "INDUSTRIAL" : "UNIVERSITY";

  return <PartnerDetail id={id} type={type} />;
}
