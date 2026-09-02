"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  inputClass,
} from "@/components/ui";
import {
  deleteResearchArea,
  getResearchAreaById,
  uploadResearchAreaImage,
  updateResearchArea,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { ResearchArea, ResearchAreaInput } from "@/types/modules";

import { formToInput } from "./research-area-form";

type FormState = ReturnType<typeof formToInput> & {
  order: number;
};

function ResearchImageField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [preview, setPreview] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be 3 MB or smaller.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const uploaded = await uploadResearchAreaImage(id, file);
      onChange(uploaded.url);
    } catch {
      setError("Image upload failed. The existing image is still safe.");
      setPreview(value);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <img
          src={preview}
          alt="Research area preview"
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="grid h-44 place-items-center bg-[var(--rams-gray-light)] text-sm text-[var(--rams-gray)]">
          No image selected.
        </div>
      )}
      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold">
        {uploading ? "Uploading…" : "Change image"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={select}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-sm text-[var(--rams-red)]">{error}</p>}
    </div>
  );
}

function toForm(area: ResearchArea): FormState {
  return {
    ...area,
    image: area.image ?? "",
    order: area.order,
    published: area.published,
    title: {
      ...area.title,
    },
    description: {
      ...area.description,
    },
    methods: {
      en: [...area.methods.en] as [string, string, string],
      id: [...area.methods.id] as [string, string, string],
    },
    applications: {
      ...area.applications,
    },
  };
}

export default function ResearchAreaDetail({ id }: { id: string }) {
  const router = useRouter();

  const [area, setArea] = useState<ResearchArea | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getResearchAreaById(id)
      .then((result) => {
        if (cancelled) return;

        setArea(result);
        setForm(toForm(result));
        setDirty(false);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!dirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  function confirmNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (
      dirty &&
      !window.confirm("You have unsaved changes. Leave this page?")
    ) {
      event.preventDefault();
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setDirty(true);

    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  function updateText(
    locale: "en" | "id",
    key: "title" | "description" | "applications",
    value: string,
  ) {
    setDirty(true);

    setForm((current) =>
      current
        ? {
            ...current,
            [key]: {
              ...current[key],
              [locale]: value,
            },
          }
        : current,
    );
  }

  function updateMethod(locale: "en" | "id", index: number, value: string) {
    setDirty(true);

    setForm((current) => {
      if (!current) return current;

      const methods = [...current.methods[locale]] as [string, string, string];

      methods[index] = value;

      return {
        ...current,
        methods: {
          ...current.methods,
          [locale]: methods,
        },
      };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateResearchArea(id, form as ResearchAreaInput);

      setArea(result);
      setForm(toForm(result));
      setEditing(false);
      setDirty(false);
      setSuccess("Research area saved successfully.");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !area ||
      !window.confirm(`Delete “${area.code}”? This cannot be undone.`)
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteResearchArea(area._id);
      router.push("/dashboard/research");
    } catch (reason) {
      setError(getUserFacingError(reason));
      setDeleting(false);
    }
  }

  if (!area && !error) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading research area" />
      </div>
    );
  }

  if (error && !area) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />

        <Link
          href="/dashboard/research"
          className="mt-5 inline-block text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to research areas
        </Link>
      </div>
    );
  }

  if (!area || !form) {
    return null;
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/research"
          onClick={confirmNavigation}
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← All research areas
        </Link>

        {error && <ErrorState message={error} />}

        {success && (
          <div
            className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            role="status"
          >
            {success}
          </div>
        )}

        {dirty && (
          <p className="text-xs font-semibold text-amber-700" role="status">
            Unsaved changes
          </p>
        )}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="red">{area.code}</Badge>

              <Badge tone={area.published ? "green" : "neutral"}>
                {area.published ? "Published" : "Draft"}
              </Badge>

              <span className="text-sm text-[var(--rams-gray)]">
                Order {area.order}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-bold leading-tight">
              {area.title.en}
            </h1>

            <p className="mt-2 text-sm text-[var(--rams-gray)]">
              {area.title.id} · /{area.slug}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (
                  editing &&
                  dirty &&
                  !window.confirm("Discard unsaved changes?")
                ) {
                  return;
                }

                if (editing && area) {
                  setForm(toForm(area));
                }

                setDirty(false);
                setEditing((value) => !value);
              }}
            >
              {editing ? "Cancel" : "Edit"}
            </Button>

            <Button
              variant="danger"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </header>

        {editing ? (
          <ResearchEditForm
            id={id}
            form={form}
            update={update}
            updateText={updateText}
            updateMethod={updateMethod}
            onSubmit={save}
            saving={saving}
          />
        ) : (
          <Card className="space-y-7 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Description
              </p>

              <p className="mt-2 whitespace-pre-wrap leading-7">
                {area.description.en}
              </p>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--rams-gray)]">
                {area.description.id}
              </p>
            </div>

            <div className="grid gap-7 border-t border-black/8 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  English methods
                </p>

                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                  {area.methods.en.map((method) => (
                    <li key={method}>{method}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Indonesian methods
                </p>

                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                  {area.methods.id.map((method) => (
                    <li key={method}>{method}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-7 border-t border-black/8 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  English applications
                </p>

                <p className="mt-2 font-semibold">{area.applications.en}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Indonesian applications
                </p>

                <p className="mt-2 font-semibold">{area.applications.id}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ResearchEditForm({
  id,
  form,
  update,
  updateText,
  updateMethod,
  onSubmit,
  saving,
}: {
  id: string;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateText: (
    locale: "en" | "id",
    key: "title" | "description" | "applications",
    value: string,
  ) => void;
  updateMethod: (locale: "en" | "id", index: number, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Code">
            <input
              required
              className={inputClass}
              value={form.code}
              onChange={(event) => update("code", event.target.value)}
            />
          </Field>

          <Field label="Slug">
            <input
              required
              className={inputClass}
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
            />
          </Field>

          <Field label="Order">
            <input
              required
              type="number"
              min="0"
              step="1"
              className={inputClass}
              value={form.order}
              onChange={(event) => update("order", Number(event.target.value))}
            />
          </Field>

          <Field label="Image">
            <ResearchImageField
              id={id}
              value={form.image ?? ""}
              onChange={(value) => update("image", value)}
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => update("published", event.target.checked)}
          />
          Published
        </label>

        {(["en", "id"] as const).map((locale) => (
          <section
            key={locale}
            className="space-y-5 border-t border-black/8 pt-7"
          >
            <h2 className="text-lg font-bold">
              {locale === "en" ? "English" : "Indonesian"}
            </h2>

            <Field label="Title">
              <input
                required
                className={inputClass}
                value={form.title[locale]}
                onChange={(event) =>
                  updateText(locale, "title", event.target.value)
                }
              />
            </Field>

            <Field label="Description">
              <textarea
                required
                className={`${inputClass} min-h-28`}
                value={form.description[locale]}
                onChange={(event) =>
                  updateText(locale, "description", event.target.value)
                }
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              {form.methods[locale].map((method, index) => (
                <Field key={index} label={`Method ${index + 1}`}>
                  <input
                    required
                    className={inputClass}
                    value={method}
                    onChange={(event) =>
                      updateMethod(locale, index, event.target.value)
                    }
                  />
                </Field>
              ))}
            </div>

            <Field label="Applications">
              <input
                required
                className={inputClass}
                value={form.applications[locale]}
                onChange={(event) =>
                  updateText(locale, "applications", event.target.value)
                }
              />
            </Field>
          </section>
        ))}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
