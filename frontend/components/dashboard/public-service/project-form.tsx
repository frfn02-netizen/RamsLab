"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
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
  createPublicServiceProject,
  getPublicServiceProject,
  updatePublicServiceProject,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PublicServiceProjectInput } from "@/types/modules";

const YEAR_GROUP_OPTIONS = ["2021", "2022", "2023", "2024", "2025", "2026",];

type FormState = {
  yearGroup: string;
  titleEn: string;
  titleId: string;
  client: string;
  period: string;
  order: string;
  published: boolean;
};

const emptyForm: FormState = {
  yearGroup: YEAR_GROUP_OPTIONS[0],
  titleEn: "",
  titleId: "",
  client: "",
  period: "",
  order: "0",
  published: false,
};

function toInput(form: FormState): PublicServiceProjectInput {
  return {
    yearGroup: form.yearGroup,
    title: { en: form.titleEn.trim(), id: form.titleId.trim() },
    executingEntity: "",
    client: form.client.trim(),
    period: form.period.trim(),
    order: Number(form.order),
    published: form.published,
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
  if (!form.client.trim()) {
    errors.client = "Client is required.";
  }
  if (!form.period.trim()) {
    errors.period = "Period is required.";
  }
  return errors;
}

export default function ProjectForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      try {
        const project = await getPublicServiceProject(id!);
        if (cancelled) return;
        setForm({
          yearGroup: project.yearGroup,
          titleEn: project.title.en,
          titleId: project.title.id,
          client: project.client,
          period: project.period,
          order: String(project.order),
          published: project.published,
        });
      } catch (reason) {
        if (!cancelled) setServerError(getUserFacingError(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      if (id) {
        await updatePublicServiceProject(id, toInput(form));
      } else {
        await createPublicServiceProject(toInput(form));
      }
      router.replace("/dashboard/public-service");
      return;
    } catch (reason) {
      setServerError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-3xl">
          <Card>
            <LoadingState label="Loading project" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <PageHeader
          eyebrow="CMS"
          title={id ? "Edit Project" : "New Project"}
          description={
            id
              ? "Update the public service project details."
              : "Create a new public service project."
          }
        />
        {serverError && (
          <ErrorState
            message={serverError}
            onRetry={() => setServerError(null)}
          />
        )}
        <Card>
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="space-y-6 p-6"
          >
            <Field
              label="Year / Project Group"
              htmlFor="yearGroup"
              error={errors.yearGroup}
            >
              <select
                id="yearGroup"
                className={inputClass}
                value={form.yearGroup}
                onChange={(e) => updateField("yearGroup", e.target.value)}
              >
                {YEAR_GROUP_OPTIONS.map((yg) => (
                  <option key={yg} value={yg}>
                    {yg}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field
                label="Project / Scope of Work (EN)"
                htmlFor="titleEn"
                error={errors.titleEn}
              >
                <input
                  id="titleEn"
                  type="text"
                  className={inputClass}
                  value={form.titleEn}
                  onChange={(e) => updateField("titleEn", e.target.value)}
                />
              </Field>
              <Field
                label="Project / Scope of Work (ID)"
                htmlFor="titleId"
                error={errors.titleId}
              >
                <input
                  id="titleId"
                  type="text"
                  className={inputClass}
                  value={form.titleId}
                  onChange={(e) => updateField("titleId", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Client" htmlFor="client" error={errors.client}>
              <input
                id="client"
                type="text"
                className={inputClass}
                value={form.client}
                onChange={(e) => updateField("client", e.target.value)}
              />
            </Field>
            <Field label="Period" htmlFor="period" error={errors.period}>
              <input
                id="period"
                type="text"
                className={inputClass}
                value={form.period}
                onChange={(e) => updateField("period", e.target.value)}
                placeholder="e.g. Jan 2024 - Jun 2024"
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Order" htmlFor="order">
                <input
                  id="order"
                  type="number"
                  className={inputClass}
                  value={form.order}
                  onChange={(e) => updateField("order", e.target.value)}
                  min={0}
                />
              </Field>
              <div className="flex items-end gap-3 pb-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--rams-charcoal)]">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => updateField("published", e.target.checked)}
                    className="h-4 w-4 rounded border-black/20 text-[var(--rams-red)] focus:ring-[var(--rams-red)]"
                  />
                  Published
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-black/8 pt-6">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : id ? "Save changes" : "Create project"}
              </Button>
              <Link
                href="/dashboard/public-service"
                className="text-sm font-semibold text-[var(--rams-gray)] hover:text-[var(--rams-charcoal)]"
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
