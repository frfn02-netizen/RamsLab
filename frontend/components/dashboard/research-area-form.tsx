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
  image: string;
  titleEn: string;
  titleId: string;
  descriptionEn: string;
  descriptionId: string;
  methodsEn: [string, string, string];
  methodsId: [string, string, string];
  applicationsEn: string;
  applicationsId: string;
};

export const emptyResearchAreaForm: FormState = {
  code: "",
  slug: "",
  order: "0",
  published: true,
  image: "",
  titleEn: "",
  titleId: "",
  descriptionEn: "",
  descriptionId: "",
  methodsEn: ["", "", ""],
  methodsId: ["", "", ""],
  applicationsEn: "",
  applicationsId: "",
};

export function formToInput(form: FormState): ResearchAreaInput {
  return {
    code: form.code.trim(),
    slug: form.slug.trim(),
    order: Number(form.order),
    published: form.published,
    image: form.image.trim() || undefined,
    title: {
      en: form.titleEn.trim(),
      id: form.titleId.trim(),
    },
    description: {
      en: form.descriptionEn.trim(),
      id: form.descriptionId.trim(),
    },
    methods: {
      en: form.methodsEn.map((item) => item.trim()) as [string, string, string],
      id: form.methodsId.map((item) => item.trim()) as [string, string, string],
    },
    applications: {
      en: form.applicationsEn.trim(),
      id: form.applicationsId.trim(),
    },
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};

  if (!/^[A-Z][A-Z0-9_]*$/.test(form.code.trim())) {
    errors.code = "Use an uppercase identifier.";
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
    errors.slug = "Use lowercase URL-safe words separated by hyphens.";
  }

  if (!/^\d+$/.test(form.order) || Number(form.order) < 0) {
    errors.order = "Order must be a non-negative integer.";
  }

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

  form.methodsEn.forEach((item, index) => {
    if (!item.trim()) {
      errors[`methodEn${index}`] = "Required.";
    }
  });

  form.methodsId.forEach((item, index) => {
    if (!item.trim()) {
      errors[`methodId${index}`] = "Required.";
    }
  });

  if (!form.applicationsEn.trim()) {
    errors.applicationsEn = "English applications are required.";
  }

  if (!form.applicationsId.trim()) {
    errors.applicationsId = "Indonesian applications are required.";
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

  const updateMethod = (locale: "en" | "id", index: number, value: string) => {
    setDirty(true);

    setForm((current) => ({
      ...current,
      [locale === "en" ? "methodsEn" : "methodsId"]: (locale === "en"
        ? current.methodsEn
        : current.methodsId
      ).map((item, itemIndex) => (itemIndex === index ? value : item)) as [
        string,
        string,
        string,
      ],
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
          ← Research Areas
        </Link>

        <PageHeader
          eyebrow="Research"
          title="Add research area"
          description="Create a bilingual research area record for the public Research page."
        />

        {dirty && (
          <p className="text-xs font-semibold text-amber-700" role="status">
            Unsaved changes
          </p>
        )}

        {error && <ErrorState message={error} />}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-8">
            <section className="space-y-5">
              <h2 className="text-lg font-bold">Basic</h2>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Code" error={errors.code}>
                  <input
                    required
                    className={inputClass}
                    value={form.code}
                    onChange={(event) => update("code", event.target.value)}
                  />
                </Field>

                <Field label="Slug" error={errors.slug}>
                  <input
                    required
                    className={inputClass}
                    value={form.slug}
                    onChange={(event) => update("slug", event.target.value)}
                  />
                </Field>

                <Field label="Order" error={errors.order}>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={form.order}
                    onChange={(event) => update("order", event.target.value)}
                  />
                </Field>

                <Field label="Image URL (optional)">
                  <input
                    type="url"
                    className={inputClass}
                    value={form.image}
                    onChange={(event) => update("image", event.target.value)}
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

            <LocaleFields
              locale="English"
              title={form.titleEn}
              description={form.descriptionEn}
              applications={form.applicationsEn}
              methods={form.methodsEn}
              errors={errors}
              titleKey="titleEn"
              descriptionKey="descriptionEn"
              applicationsKey="applicationsEn"
              onText={(key, value) => update(key, value)}
              onMethod={(index, value) => updateMethod("en", index, value)}
            />

            <LocaleFields
              locale="Indonesian"
              title={form.titleId}
              description={form.descriptionId}
              applications={form.applicationsId}
              methods={form.methodsId}
              errors={errors}
              titleKey="titleId"
              descriptionKey="descriptionId"
              applicationsKey="applicationsId"
              onText={(key, value) => update(key, value)}
              onMethod={(index, value) => updateMethod("id", index, value)}
            />

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create research area"}
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

function LocaleFields({
  locale,
  title,
  description,
  applications,
  methods,
  errors,
  titleKey,
  descriptionKey,
  applicationsKey,
  onText,
  onMethod,
}: {
  locale: string;
  title: string;
  description: string;
  applications: string;
  methods: [string, string, string];
  errors: Record<string, string>;
  titleKey: "titleEn" | "titleId";
  descriptionKey: "descriptionEn" | "descriptionId";
  applicationsKey: "applicationsEn" | "applicationsId";
  onText: (
    key:
      | "titleEn"
      | "titleId"
      | "descriptionEn"
      | "descriptionId"
      | "applicationsEn"
      | "applicationsId",
    value: string,
  ) => void;
  onMethod: (index: number, value: string) => void;
}) {
  const suffix = locale === "English" ? "En" : "Id";

  return (
    <section className="space-y-5 border-t border-black/8 pt-7">
      <h2 className="text-lg font-bold">{locale}</h2>

      <Field label="Title" error={errors[titleKey]}>
        <input
          required
          className={inputClass}
          value={title}
          onChange={(event) => onText(titleKey, event.target.value)}
        />
      </Field>

      <Field label="Description" error={errors[descriptionKey]}>
        <textarea
          required
          className={`${inputClass} min-h-28`}
          value={description}
          onChange={(event) => onText(descriptionKey, event.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        {methods.map((method, index) => (
          <Field
            key={index}
            label={`Method ${index + 1}`}
            error={errors[`method${suffix}${index}`]}
          >
            <input
              required
              className={inputClass}
              value={method}
              onChange={(event) => onMethod(index, event.target.value)}
            />
          </Field>
        ))}
      </div>

      <Field label="Applications" error={errors[applicationsKey]}>
        <input
          required
          className={inputClass}
          value={applications}
          onChange={(event) => onText(applicationsKey, event.target.value)}
        />
      </Field>
    </section>
  );
}
