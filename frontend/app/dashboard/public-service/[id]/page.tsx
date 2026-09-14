import ProjectForm from "@/components/dashboard/public-service/project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectForm id={id} />;
}
