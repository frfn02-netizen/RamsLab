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
  PageHeader,
  inputClass,
} from "@/components/ui";
import {
  createEvent,
  getEvent,
  updateEvent,
  uploadEventImage,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { CmsEventImage, CmsEventInput } from "@/types/modules";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type FormState = {
  titleEn: string;
  titleId: string;
  descriptionEn: string;
  descriptionId: string;
  imageAltEn: string;
  imageAltId: string;
  eventDate: string;
  locationEn: string;
  locationId: string;
  order: string;
  published: boolean;
};

const emptyForm: FormState = {
  titleEn: "",
  titleId: "",
  descriptionEn: "",
  descriptionId: "",
  imageAltEn: "",
  imageAltId: "",
  eventDate: "",
  locationEn: "",
  locationId: "",
  order: "0",
  published: false,
};

function toInput(form: FormState, image?: CmsEventImage): CmsEventInput {
  const alt =
    form.imageAltEn.trim() || form.imageAltId.trim()
      ? { en: form.imageAltEn.trim(), id: form.imageAltId.trim() }
      : undefined;
  return {
    title: { en: form.titleEn.trim(), id: form.titleId.trim() },
    description:
      form.descriptionEn.trim() || form.descriptionId.trim()
        ? { en: form.descriptionEn.trim(), id: form.descriptionId.trim() }
        : undefined,
    image: image ? { ...image, alt } : undefined,
    eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
    location:
      form.locationEn.trim() || form.locationId.trim()
        ? { en: form.locationEn.trim(), id: form.locationId.trim() }
        : undefined,
    order: Number(form.order),
    published: form.published,
  };
}

export default function EventForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [currentImage, setCurrentImage] = useState<CmsEventImage | undefined>();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getEvent(id)
      .then((event) => {
        setForm({
          titleEn: event.title.en,
          titleId: event.title.id,
          descriptionEn: event.description?.en ?? "",
          descriptionId: event.description?.id ?? "",
          imageAltEn: event.image?.alt?.en ?? "",
          imageAltId: event.image?.alt?.id ?? "",
          eventDate: event.eventDate ? event.eventDate.slice(0, 10) : "",
          locationEn: event.location?.en ?? "",
          locationId: event.location?.id ?? "",
          order: String(event.order),
          published: event.published,
        });
        setCurrentImage(event.image);
      })
      .catch((reason) => setError(getUserFacingError(reason)))
      .finally(() => setLoading(false));
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

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.titleEn.trim() || !form.titleId.trim()) {
      setError("English and Indonesian titles are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = id
        ? await updateEvent(
            id,
            toInput(form, selectedFile ? undefined : currentImage),
          )
        : await createEvent(toInput(form));
      if (selectedFile) {
        const updated = await uploadEventImage(saved._id, selectedFile, {
          en: form.imageAltEn.trim(),
          id: form.imageAltId.trim(),
        });
        setCurrentImage(updated.image);
      }
      router.push(`/dashboard/events/${saved._id}`);
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
          <div className="p-6 text-sm text-[var(--rams-gray)]">
            Loading event...
          </div>
        </Card>
      </div>
    );
  }

  const imagePreview = previewUrl ?? currentImage?.url ?? null;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/events"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Events
        </Link>
        <PageHeader
          eyebrow="CMS"
          title={id ? "Edit event" : "Add event"}
          description="Create bilingual event content for the public Events page."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-8">
            <section className="grid gap-5 sm:grid-cols-2">
              <Field label="English title">
                <input
                  required
                  className={inputClass}
                  value={form.titleEn}
                  onChange={(event) => update("titleEn", event.target.value)}
                />
              </Field>
              <Field label="Indonesian title">
                <input
                  required
                  className={inputClass}
                  value={form.titleId}
                  onChange={(event) => update("titleId", event.target.value)}
                />
              </Field>
              <Field label="Display Order">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={form.order}
                  onChange={(event) => update("order", event.target.value)}
                />
                <p className="mt-1 text-xs text-[var(--rams-gray)]">
                  Lower numbers appear first.
                </p>
              </Field>
              <Field label="Event date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.eventDate}
                  onChange={(event) => update("eventDate", event.target.value)}
                />
              </Field>
              <Field label="English location">
                <input
                  className={inputClass}
                  value={form.locationEn}
                  onChange={(event) => update("locationEn", event.target.value)}
                />
              </Field>
              <Field label="Indonesian location">
                <input
                  className={inputClass}
                  value={form.locationId}
                  onChange={(event) => update("locationId", event.target.value)}
                />
              </Field>
            </section>
            <section className="grid gap-5">
              <Field label="English description">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.descriptionEn}
                  onChange={(event) =>
                    update("descriptionEn", event.target.value)
                  }
                />
              </Field>
              <Field label="Indonesian description">
                <textarea
                  className={inputClass}
                  rows={4}
                  value={form.descriptionId}
                  onChange={(event) =>
                    update("descriptionId", event.target.value)
                  }
                />
              </Field>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-4">
                  <Field label={currentImage ? "Replace photo" : "Event image"}>
                    <input
                      className="block w-full text-sm text-[var(--rams-gray)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--rams-red)] file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-[var(--rams-red-dark)]"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={chooseImage}
                      disabled={saving}
                      aria-describedby="event-image-help"
                    />
                  </Field>
                  <p
                    id="event-image-help"
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
                </div>
                <div className="overflow-hidden border border-black/10 bg-[var(--rams-gray-light)]">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Event preview"
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
                <Field label="English image alt">
                  <input
                    className={inputClass}
                    value={form.imageAltEn}
                    onChange={(event) =>
                      update("imageAltEn", event.target.value)
                    }
                  />
                </Field>
                <Field label="Indonesian image alt">
                  <input
                    className={inputClass}
                    value={form.imageAltId}
                    onChange={(event) =>
                      update("imageAltId", event.target.value)
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) =>
                    update("published", event.target.checked)
                  }
                />
                Published
              </label>
            </section>
            <div className="flex justify-end gap-3 border-t border-black/8 pt-5">
              <Link
                href="/dashboard/events"
                className="px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </Link>
              <Button disabled={saving}>
                {saving ? "Saving..." : "Save event"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
