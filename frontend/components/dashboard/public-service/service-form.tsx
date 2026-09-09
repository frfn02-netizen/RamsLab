"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
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
  createPublicService,
  getPublicService,
  updatePublicService,
  uploadPublicServiceImage,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PublicServiceInput } from "@/types/modules";

type FormState = {
  code: string;
  titleEn: string;
  titleId: string;
  descriptionEn: string;
  descriptionId: string;
  order: string;
  published: boolean;
  images: string[];
};

const emptyForm: FormState = {
  code: "",
  titleEn: "",
  titleId: "",
  descriptionEn: "",
  descriptionId: "",
  order: "0",
  published: false,
  images: [],
};

function toInput(form: FormState): PublicServiceInput {
  return {
    code: form.code.trim() || undefined,
    title: { en: form.titleEn.trim(), id: form.titleId.trim() },
    description:
      form.descriptionEn.trim() || form.descriptionId.trim()
        ? {
            en: form.descriptionEn.trim(),
            id: form.descriptionId.trim(),
          }
        : undefined,
    images: form.images,
    order: Number(form.order),
    published: form.published,
    companies: [],
    jobs: [],
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};
  if (!form.descriptionEn.trim()) {
    errors.descriptionEn = "English description is required.";
  }
  if (!form.descriptionId.trim()) {
    errors.descriptionId = "Indonesian description is required.";
  }
  return errors;
}

export default function ServiceForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPublicService(id)
      .then((service) =>
        setForm({
          code: service.code ?? "",
          titleEn: service.title.en,
          titleId: service.title.id,
          descriptionEn:
            service.description?.en ??
            service.shortDescription?.en ??
            service.detailedDescription?.en ??
            "",
          descriptionId:
            service.description?.id ??
            service.shortDescription?.id ??
            service.detailedDescription?.id ??
            "",
          order: String(service.order),
          published: service.published,
          images: service.images ?? [],
        }),
      )
      .catch((reason) => setError(getUserFacingError(reason)))
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setError(null);
    try {
      const saved = id
        ? await updatePublicService(id, toInput(form))
        : await createPublicService(toInput(form));
      setDirty(false);
      router.push(`/dashboard/public-service/services/${saved._id}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <Card>
          <LoadingState label="Loading service" />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/public-service"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          &larr; Public Service
        </Link>
        <PageHeader
          eyebrow="Public Service"
          title={id ? "Edit Service" : "Create Service"}
          description="Document a public service activity with description and images."
        />
        {dirty && (
          <p className="text-xs font-semibold text-amber-700" role="status">
            Unsaved changes
          </p>
        )}
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-8">
            <div className="space-y-5">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => update("published", event.target.checked)}
                />
                Published
              </label>
            </div>

            <section className="space-y-5 border-t border-black/8 pt-7">
              <h2 className="text-lg font-bold">English</h2>
              <Field label="Title (optional)">
                <input
                  className={inputClass}
                  value={form.titleEn}
                  onChange={(event) => update("titleEn", event.target.value)}
                />
              </Field>
              <Field label="Description" error={errors.descriptionEn}>
                <textarea
                  required
                  className={`${inputClass} min-h-28`}
                  value={form.descriptionEn}
                  onChange={(event) =>
                    update("descriptionEn", event.target.value)
                  }
                />
              </Field>
            </section>

            <section className="space-y-5 border-t border-black/8 pt-7">
              <h2 className="text-lg font-bold">Indonesian</h2>
              <Field label="Title (optional)">
                <input
                  className={inputClass}
                  value={form.titleId}
                  onChange={(event) => update("titleId", event.target.value)}
                />
              </Field>
              <Field label="Description" error={errors.descriptionId}>
                <textarea
                  required
                  className={`${inputClass} min-h-28`}
                  value={form.descriptionId}
                  onChange={(event) =>
                    update("descriptionId", event.target.value)
                  }
                />
              </Field>
            </section>

            <section className="space-y-4 border-t border-black/8 pt-7">
              <div>
                <p className="text-sm font-bold">Documentation</p>
                <p className="mt-1 text-xs text-[var(--rams-gray)]">
                  Upload images documenting the public service activity.
                </p>
              </div>
              <DocumentationUploader
                serviceId={id ?? null}
                images={form.images}
                onChange={(images) => {
                  setDirty(true);
                  setForm((current) => ({ ...current, images }));
                }}
              />
            </section>

            <div className="flex gap-3 border-t border-black/8 pt-7">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving\u2026" : id ? "Save Service" : "Create Service"}
              </Button>
              <Link
                href="/dashboard/public-service"
                className="inline-flex min-h-10 items-center px-4 text-sm font-semibold text-[var(--rams-gray)]"
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

function DocumentationUploader({
  serviceId,
  images,
  onChange,
}: {
  serviceId: string | null;
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || !serviceId) return;

    setUploading(true);
    setUploadError(null);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp" && file.type !== "image/gif") {
        setUploadError("Only JPG, PNG, WebP, and GIF files are supported.");
        setUploading(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Each image must be 5 MB or smaller.");
        setUploading(false);
        return;
      }
      try {
        const uploaded = await uploadPublicServiceImage(serviceId, file);
        newUrls.push(uploaded.url);
      } catch {
        setUploadError("One or more uploads failed. Please try again.");
        setUploading(false);
        return;
      }
    }

    onChange([...images, ...newUrls]);
    setUploading(false);
    event.target.value = "";
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {images.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative h-24 w-24 overflow-hidden border border-[var(--border)]"
          >
            <img
              src={url}
              alt={`Documentation ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {uploadError && (
        <p className="text-sm text-[var(--rams-red)]">{uploadError}</p>
      )}
      {serviceId && (
        <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--rams-gray-light)]">
          {uploading ? "Uploading\u2026" : "Upload Images"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
      {!serviceId && (
        <p className="text-xs text-[var(--rams-gray)]">
          Save the service first, then upload documentation images.
        </p>
      )}
    </div>
  );
}
