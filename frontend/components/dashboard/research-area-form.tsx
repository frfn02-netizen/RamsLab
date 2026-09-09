"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type MouseEvent } from "react";

import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { createResearchArea } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { ResearchAreaInput } from "@/types/modules";

type FormState = {
  code: string;
  slug: string;
  order: string;
  published: boolean;
  titleEn: string;
  titleId: string;
  descriptionEn: string;
  descriptionId: string;
};

export const emptyResearchAreaForm: FormState = {
  code: "",
  slug: "",
  order: "0",
  published: true,
  titleEn: "",
  titleId: "",
  descriptionEn: "",
  descriptionId: "",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formToInput(form: FormState): ResearchAreaInput {
  const titleEn = form.titleEn.trim();
  const autoCode =
    form.code.trim() ||
    titleEn
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 50) ||
    "RESEARCH";
  const autoSlug = form.slug.trim() || slugify(titleEn) || "research-area";

  return {
    code: autoCode,
    slug: autoSlug,
    order: Number(form.order) || 0,
    published: form.published,
    title: {
      en: titleEn,
      id: form.titleId.trim(),
    },
    description: {
      en: form.descriptionEn.trim(),
      id: form.descriptionId.trim(),
    },
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};

  if (!form.titleEn.trim()) {
    errors.titleEn = "English title is required.";
  }

  if (!form.titleId.trim()) {
    errors.titleId = "Indonesian title is required.";
  }

  if (!form.descriptionEn.trim()) {
    errors.descriptionEn = "English description is required.";
  }

  if (!form.descriptionId.trim()) {
    errors.descriptionId = "Indonesian description is required.";
  }

  return errors;
}

export default function ResearchAreaForm() {
  const router = useRouter();

  const [form, setForm] = useState(emptyResearchAreaForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      return;
    }

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

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setDirty(true);

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(form);

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createResearchArea(formToInput(form));

      setDirty(false);
      router.push(`/dashboard/research/${created._id}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/research"
          onClick={confirmNavigation}
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          &larr; Research Areas
        </Link>

        <PageHeader
          eyebrow="Research"
          title="Create Research Area"
          description="Add a new research area to the public Research page."
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
                  onChange={(event) =>
                    update("published", event.target.checked)
                  }
                />
                Published
              </label>
            </div>

            <section className="space-y-5 border-t border-black/8 pt-7">
              <h2 className="text-lg font-bold">English</h2>

              <Field label="Title" error={errors.titleEn}>
                <input
                  required
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

              <Field label="Title" error={errors.titleId}>
                <input
                  required
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

            <div className="border-t border-black/8 pt-7">
              <p className="text-sm text-[var(--rams-gray)]">
                Research Profile PNG can be uploaded after the research area is
                created.
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving\u2026" : "Create Research Area"}
              </Button>

              <Link
                href="/dashboard/research"
                onClick={confirmNavigation}
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
