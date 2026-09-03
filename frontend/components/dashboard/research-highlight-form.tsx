"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import {
  createResearchHighlight,
  getPublications,
  getResearchHighlight,
  removeResearchHighlightImage,
  updateResearchHighlight,
  uploadResearchHighlightImage,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type {
  Publication,
  ResearchHighlight,
  ResearchHighlightInput,
} from "@/types/modules";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
type FormState = {
  en: string;
  id: string;
  publicationId: string;
  order: string;
  published: boolean;
};
const empty: FormState = {
  en: "",
  id: "",
  publicationId: "",
  order: "0",
  published: true,
};

export default function ResearchHighlightForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [highlight, setHighlight] = useState<ResearchHighlight | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemoving, setImageRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const [publicationList, loaded] = await Promise.all([
          getPublications({ limit: 200, sort: "newest" }),
          id ? getResearchHighlight(id) : Promise.resolve(null),
        ]);
        setPublications(publicationList);
        if (loaded) {
          setHighlight(loaded);
          setForm({
            en: loaded.headline.en,
            id: loaded.headline.id,
            publicationId: loaded.publicationId ?? loaded.publication.id,
            order: String(loaded.order),
            published: loaded.published,
          });
        }
      } catch (reason) {
        setError(getUserFacingError(reason));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageError(null);
    setSelectedFile(null);
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be 3 MB or smaller.");
      event.target.value = "";
      return;
    }
    setSelectedFile(file);
  }

  async function removeImage() {
    if (!id || !highlight?.image) {
      setSelectedFile(null);
      setImageError(null);
      return;
    }
    setImageRemoving(true);
    setImageError(null);
    try {
      setHighlight(await removeResearchHighlightImage(id));
    } catch (reason) {
      setImageError(getUserFacingError(reason));
    } finally {
      setImageRemoving(false);
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.en.trim()) next.en = "English headline is required.";
    if (!form.id.trim()) next.id = "Indonesian headline is required.";
    if (!form.publicationId) next.publicationId = "Select a publication.";
    if (!/^\d+$/.test(form.order) || Number(form.order) < 0)
      next.order = "Order must be a non-negative integer.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate() || saving || imageUploading) return;
    setSaving(true);
    setError(null);
    const input: ResearchHighlightInput = {
      headline: { en: form.en.trim(), id: form.id.trim() },
      publicationId: form.publicationId,
      order: Number(form.order),
      published: form.published,
    };
    try {
      const saved = id
        ? await updateResearchHighlight(id, input)
        : await createResearchHighlight(input);
      setHighlight(saved);
      if (selectedFile) {
        setImageUploading(true);
        setImageError(null);
        try {
          setHighlight(
            await uploadResearchHighlightImage(saved.id, selectedFile),
          );
        } catch (reason) {
          setError(
            `Highlight saved, but image upload failed: ${getUserFacingError(reason)}`,
          );
          return;
        } finally {
          setImageUploading(false);
        }
      }
      router.push("/dashboard/research-highlights");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <Card>
          <LoadingState label="Loading highlight" />
        </Card>
      </div>
    );
  const currentImage = previewUrl ?? highlight?.image?.url ?? null;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/research-highlights"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Research Highlights
        </Link>
        <PageHeader
          eyebrow="Research"
          title={id ? "Edit research highlight" : "Create research highlight"}
          description="Link a bilingual question to an existing publication."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-8">
            <section className="space-y-5">
              <h2 className="text-lg font-bold">Highlight</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Headline — English" error={errors.en}>
                  <input
                    className={inputClass}
                    value={form.en}
                    onChange={(event) => update("en", event.target.value)}
                  />
                </Field>
                <Field label="Headline — Indonesian" error={errors.id}>
                  <input
                    className={inputClass}
                    value={form.id}
                    onChange={(event) => update("id", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Publication" error={errors.publicationId}>
                <select
                  className={inputClass}
                  value={form.publicationId}
                  onChange={(event) =>
                    update("publicationId", event.target.value)
                  }
                >
                  <option value="">Select a publication</option>
                  {publications.map((publication) => (
                    <option key={publication._id} value={publication._id}>
                      {publication.title} ({publication.year})
                    </option>
                  ))}
                </select>
              </Field>
            </section>
            <section className="space-y-5">
              <h2 className="text-lg font-bold">Display</h2>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-4">
                  <Field label="Research Highlight image">
                    <input
                      className="block w-full text-sm text-[var(--rams-gray)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--rams-red)] file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-[var(--rams-red-dark)]"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={chooseImage}
                      disabled={saving || imageUploading || imageRemoving}
                      aria-describedby="research-highlight-image-help"
                    />
                  </Field>
                  <p
                    id="research-highlight-image-help"
                    className="text-xs leading-5 text-[var(--rams-gray)]"
                  >
                    JPEG, PNG, or WebP only. Maximum file size: 3 MB.
                  </p>
                  {selectedFile && (
                    <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                  {imageError && (
                    <p
                      className="text-sm font-semibold text-red-700"
                      role="alert"
                    >
                      {imageError}
                    </p>
                  )}
                  {id && highlight?.image && !selectedFile && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void removeImage()}
                      disabled={imageRemoving || saving}
                    >
                      {imageRemoving ? "Removing…" : "Remove current image"}
                    </Button>
                  )}
                </div>
                <div className="overflow-hidden border border-black/10 bg-[var(--rams-gray-light)]">
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt="Research Highlight preview"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-xs text-[var(--rams-gray)]">
                      No image selected
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Order" error={errors.order}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="1"
                    value={form.order}
                    onChange={(event) => update("order", event.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-3 pt-7 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(event) =>
                      update("published", event.target.checked)
                    }
                  />{" "}
                  Published
                </label>
              </div>
            </section>
            <div className="flex flex-wrap justify-end gap-3">
              <Link
                href="/dashboard/research-highlights"
                className="inline-flex min-h-10 items-center rounded-md border border-black/10 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                disabled={saving || imageUploading || imageRemoving}
              >
                {imageUploading
                  ? "Uploading image…"
                  : saving
                    ? "Saving…"
                    : id
                      ? "Save changes"
                      : "Create highlight"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
