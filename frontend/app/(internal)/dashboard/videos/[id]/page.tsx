import VideoForm from "@/components/dashboard/video-form";
export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VideoForm id={id} />;
}
