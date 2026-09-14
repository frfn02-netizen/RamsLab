"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { deleteVideo, getVideos } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { HomepageVideo } from "@/types/modules";

export default function VideosPage() {
  const [videos, setVideos] = useState<HomepageVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setVideos(await getVideos());
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function remove(video: HomepageVideo) {
    if (!window.confirm(`Delete this video? This cannot be undone.`)) {
      return;
    }
    setBusyId(video._id);
    setError(null);
    setSuccess(null);
    try {
      await deleteVideo(video._id);
      setVideos((current) => current.filter((item) => item._id !== video._id));
      setSuccess("Video was deleted.");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="HOMEPAGE"
          title="Videos"
          description="Manage YouTube videos shown on the public homepage."
          action={
            <LinkButton href="/dashboard/videos/new">Add video</LinkButton>
          }
        />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {success && (
          <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}
        {loading ? (
          <Card>
            <LoadingState label="Loading videos" />
          </Card>
        ) : videos.length === 0 ? (
          <EmptyState
            title="No videos found"
            description="Add a YouTube video to display it on the homepage."
            action={
              <LinkButton href="/dashboard/videos/new">Add video</LinkButton>
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {["Title", "YouTube URL", "Visibility", "Action"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] last:text-center"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/8">
                  {videos.map((video) => (
                    <tr key={video._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/videos/${video._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {video.title || "Untitled"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <a
                          href={video.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--rams-red)] hover:underline"
                        >
                          {video.youtubeVideoId}
                        </a>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={video.published ? "green" : "neutral"}>
                          {video.published ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-center gap-2">
                          <LinkButton
                            href={`/dashboard/videos/${video._id}`}
                            variant="secondary"
                          >
                            Edit
                          </LinkButton>
                          <Button
                            variant="danger"
                            disabled={busyId === video._id}
                            onClick={() => void remove(video)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
