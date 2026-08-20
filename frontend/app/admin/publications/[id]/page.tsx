import { redirect } from "next/navigation";

export default async function AdminPublicationAlias({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/publications/${encodeURIComponent(id)}/edit`);
}
