"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { createVideo, getVideo, updateVideo } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";

type FormState = {
  youtubeUrl: string;
  title: string;
  thumbnailUrl: string;
  isFeatured: boolean;
  order: string;
  published: boolean;
};

const emptyForm: FormState = {
  youtubeUrl: "",
  title: "",
  thumbnailUrl: "",
  isFeatured: false,
  order: "0",
  published: false,
};

function toInput(form: FormState) {
  return {
    youtubeUrl: form.youtubeUrl.trim(),
    title: form.title.trim() || null,
    thumbnailUrl: form.thumbnailUrl.trim() || null,
    isFeatured: form.isFeatured,
    order: Number(form.order),
    published: form.published,
  };
}

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowed = [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ];
    if (!allowed.includes(host)) return null;
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      const id = parsed.pathname.split("/shorts/")[1]?.split(/[?/]/)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (parsed.pathname.startsWith("/embed/")) {
      const id = parsed.pathname.split("/embed/")[1]?.split(/[?/]/)[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = parsed.searchParams.get("v");
    return v && /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export default function VideoForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getVideo(id)
      .then((video) => {
        setForm({
          youtubeUrl: video.youtubeUrl,
          title: video.title ?? "",
          thumbnailUrl: video.thumbnailUrl ?? "",
          isFeatured: video.isFeatured,
          order: String(video.order),
          published: video.published,
        });
        setVideoId(video.youtubeVideoId);
      })
      .catch((reason) => setError(getUserFacingError(reason)))
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function handleUrlChange(value: string) {
    update("youtubeUrl", value);
    const id = extractVideoId(value);
    setVideoId(id);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.youtubeUrl.trim()) {
      setError("YouTube URL is required.");
      return;
    }
    const id = extractVideoId(form.youtubeUrl.trim());
    if (!id) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = id_param
        ? await updateVideo(id_param, toInput(form))
        : await createVideo(toInput(form));
      if (id_param) {
        router.push(`/dashboard/videos/${saved._id}`);
      } else {
        router.push("/dashboard/videos");
      }
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  const id_param = id;

  if (loading) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <Card>
          <div className="p-6 text-sm text-[var(--rams-gray)]">
            Loading video...
          </div>
        </Card>
      </div>
    );
  }

  const thumbnailPreview =
    form.thumbnailUrl.trim() ||
    (videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : null);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/videos"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Videos
        </Link>
        <PageHeader
          eyebrow={id_param ? "EDIT VIDEO" : "NEW VIDEO"}
          title={id_param ? "Edit video" : "Add a new video"}
          description="Add a YouTube video to display on the public homepage."
        />
        {error && <ErrorState message={error} />}
        <Card>
          <form onSubmit={submit} className="space-y-6 p-6">
            <Field label="YouTube URL">
              <input
                type="text"
                className={inputClass}
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.youtubeUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-[var(--rams-gray)]">
                Supported formats: youtube.com/watch, youtu.be,
                youtube.com/shorts, youtube.com/embed
              </p>
            </Field>

            <Field label="Title (optional)">
              <input
                type="text"
                className={inputClass}
                placeholder="Video title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={500}
              />
            </Field>

            <Field label="Thumbnail URL (optional)">
              <input
                type="text"
                className={inputClass}
                placeholder="https://..."
                value={form.thumbnailUrl}
                onChange={(e) => update("thumbnailUrl", e.target.value)}
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-[var(--rams-gray)]">
                Leave empty to use the YouTube thumbnail automatically.
              </p>
            </Field>

            {thumbnailPreview && (
              <div className="relative h-48 w-full max-w-md overflow-hidden border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Field label="Display order">
                <input
                  type="number"
                  className={inputClass}
                  value={form.order}
                  onChange={(e) => update("order", e.target.value)}
                  min={0}
                  max={100000}
                />
              </Field>
              <div className="flex items-end gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => update("isFeatured", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => update("published", e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Published
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t border-[var(--border)] pt-6">
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : id_param
                    ? "Save changes"
                    : "Create video"}
              </Button>
              <Link
                href="/dashboard/videos"
                className="text-sm font-semibold text-[var(--rams-gray)] hover:text-[var(--navy)]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
