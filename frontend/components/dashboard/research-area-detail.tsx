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
  uploadResearchAreaPng,
  updateResearchArea,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { ResearchArea, ResearchAreaInput } from "@/types/modules";

import { formToInput } from "./research-area-form";

type FormState = ReturnType<typeof formToInput> & {
  order: number;
};

function ResearchPngField({
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
  const [filename, setFilename] = useState<string | null>(null);

  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") {
      setError("Please choose a PNG file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("PNG must be 3 MB or smaller.");
      return;
    }
    setError(null);
    setFilename(file.name);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const uploaded = await uploadResearchAreaPng(id, file);
      onChange(uploaded.url);
    } catch {
      setError("PNG upload failed. The existing file is still safe.");
      setPreview(value);
      setFilename(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="grid h-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--rams-gray-light)]">
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 text-sm font-semibold text-[var(--rams-red)] underline"
          >
            {filename ?? "View current PNG"}
          </a>
        </div>
      ) : (
        <div className="grid h-10 place-items-center rounded-md border border-dashed border-[var(--border)] bg-[var(--rams-gray-light)] text-sm text-[var(--rams-gray)]">
          No PNG selected.
        </div>
      )}
      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[var(--border)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--rams-gray-light)]">
        {uploading ? "Uploading\u2026" : "Upload PNG"}
        <input
          type="file"
          accept=".png,image/png"
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
    downloadablePng: area.downloadablePng ?? "",
    order: area.order,
    published: area.published,
    title: {
      ...area.title,
    },
    description: {
      ...area.description,
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
    key: "title" | "description",
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
      !window.confirm(`Delete \u201c${area.code}\u201d? This cannot be undone.`)
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
          &larr; Back to research areas
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
          &larr; All research areas
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
              {area.title.id} &middot; /{area.slug}
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
              {deleting ? "Deleting\u2026" : "Delete"}
            </Button>
          </div>
        </header>

        {editing ? (
          <ResearchEditForm
            id={id}
            form={form}
            update={update}
            updateText={updateText}
            onSubmit={save}
            saving={saving}
          />
        ) : (
          <Card className="space-y-7 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Research Profile PNG
              </p>
              {area.downloadablePng ? (
                <a
                  href={area.downloadablePng}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-semibold text-[var(--rams-red)] underline"
                >
                  View PNG
                </a>
              ) : (
                <p className="mt-2 text-sm text-[var(--rams-gray)]">
                  No PNG uploaded
                </p>
              )}
            </div>

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
  onSubmit,
  saving,
}: {
  id: string;
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateText: (
    locale: "en" | "id",
    key: "title" | "description",
    value: string,
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-3">
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
                onChange={(event) =>
                  update("order", Number(event.target.value))
                }
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
        </div>

        <section className="space-y-5 border-t border-black/8 pt-7">
          <h2 className="text-lg font-bold">English</h2>

          <Field label="Title">
            <input
              required
              className={inputClass}
              value={form.title.en}
              onChange={(event) =>
                updateText("en", "title", event.target.value)
              }
            />
          </Field>

          <Field label="Description">
            <textarea
              required
              className={`${inputClass} min-h-28`}
              value={form.description.en}
              onChange={(event) =>
                updateText("en", "description", event.target.value)
              }
            />
          </Field>
        </section>

        <section className="space-y-5 border-t border-black/8 pt-7">
          <h2 className="text-lg font-bold">Indonesian</h2>

          <Field label="Title">
            <input
              required
              className={inputClass}
              value={form.title.id}
              onChange={(event) =>
                updateText("id", "title", event.target.value)
              }
            />
          </Field>

          <Field label="Description">
            <textarea
              required
              className={`${inputClass} min-h-28`}
              value={form.description.id}
              onChange={(event) =>
                updateText("id", "description", event.target.value)
              }
            />
          </Field>
        </section>

        <section className="border-t border-black/8 pt-7">
          <p className="mb-2 text-sm font-bold">Research Profile PNG</p>
          <ResearchPngField
            id={id}
            value={form.downloadablePng ?? ""}
            onChange={(value) => update("downloadablePng", value)}
          />
          <p className="mt-3 text-xs text-[var(--rams-gray)]">
            Upload the PNG used as the research visual and downloadable research
            profile.
          </p>
        </section>

        <div className="flex gap-3 border-t border-black/8 pt-7">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving\u2026" : "Save Research Area"}
          </Button>

          <Link
            href="/dashboard/research"
            className="inline-flex min-h-10 items-center px-4 text-sm font-semibold text-[var(--rams-gray)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  );
}
