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
  createPublicService,
  getPublicService,
  updatePublicService,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type {
  PublicServiceCompany,
  PublicServiceInput,
  PublicServiceJob,
} from "@/types/modules";

type CompanyForm = PublicServiceCompany & { id?: string };
type JobForm = PublicServiceJob & { id?: string };

type FormState = {
  code: string;
  titleEn: string;
  titleId: string;
  descriptionEn: string;
  descriptionId: string;
  order: string;
  published: boolean;
  companies: CompanyForm[];
  jobs: JobForm[];
};

const emptyForm: FormState = {
  code: "",
  titleEn: "",
  titleId: "",
  descriptionEn: "",
  descriptionId: "",
  order: "0",
  published: false,
  companies: [],
  jobs: [],
};

function emptyCompany(order: number): CompanyForm {
  return {
    name: "",
    description: { en: "", id: "" },
    order,
    published: true,
  };
}

function emptyJob(order: number): JobForm {
  return {
    name: { en: "", id: "" },
    description: { en: "", id: "" },
    order,
    published: true,
  };
}

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
    order: Number(form.order),
    published: form.published,
    companies: form.companies
      .filter((company) => company.name.trim())
      .map((company, index) => ({
        ...company,
        name: company.name.trim(),
        description: company.description,
        order: index,
      })),
    jobs: form.jobs
      .filter((job) => job.name.en.trim() || job.name.id.trim())
      .map((job, index) => ({
        ...job,
        name: { en: job.name.en.trim(), id: job.name.id.trim() },
        description: job.description,
        order: index,
      })),
  };
}

export default function ServiceForm({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          companies: service.companies,
          jobs: service.jobs,
        }),
      )
      .catch((reason) => setError(getUserFacingError(reason)))
      .finally(() => setLoading(false));
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.titleEn.trim() || !form.titleId.trim()) {
      setError("English and Indonesian service titles are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = id
        ? await updatePublicService(id, toInput(form))
        : await createPublicService(toInput(form));
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
      <div className="mx-auto max-w-5xl space-y-7">
        <Link
          href="/dashboard/public-service"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Public Service
        </Link>
        <PageHeader
          eyebrow="Public Service"
          title={id ? "Edit service" : "Add service"}
          description="Manage the service summary plus companies and jobs shown when a visitor opens the service details."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-8">
            <section className="grid gap-5 sm:grid-cols-2">
              <Field label="Code">
                <input
                  className={inputClass}
                  value={form.code}
                  onChange={(event) => update("code", event.target.value)}
                />
              </Field>
              <Field label="Order">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={form.order}
                  onChange={(event) => update("order", event.target.value)}
                />
              </Field>
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
            </section>
            <BilingualTextareas
              title="Description"
              en={form.descriptionEn}
              idValue={form.descriptionId}
              onEn={(value) => update("descriptionEn", value)}
              onId={(value) => update("descriptionId", value)}
            />
            <NestedCompanies
              companies={form.companies}
              onChange={(companies) => update("companies", companies)}
            />
            <NestedJobs
              jobs={form.jobs}
              onChange={(jobs) => update("jobs", jobs)}
            />
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => update("published", event.target.checked)}
              />
              Published
            </label>
            <div className="flex justify-end gap-3 border-t border-black/8 pt-5">
              <Link
                href="/dashboard/public-service"
                className="px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </Link>
              <Button disabled={saving}>
                {saving ? "Saving..." : "Save service"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function BilingualTextareas({
  title,
  en,
  idValue,
  onEn,
  onId,
}: {
  title: string;
  en: string;
  idValue: string;
  onEn: (value: string) => void;
  onId: (value: string) => void;
}) {
  return (
    <section className="grid gap-5 sm:grid-cols-2">
      <Field label={`${title} (English)`}>
        <textarea
          className={inputClass}
          rows={4}
          value={en}
          onChange={(event) => onEn(event.target.value)}
        />
      </Field>
      <Field label={`${title} (Indonesian)`}>
        <textarea
          className={inputClass}
          rows={4}
          value={idValue}
          onChange={(event) => onId(event.target.value)}
        />
      </Field>
    </section>
  );
}

function NestedCompanies({
  companies,
  onChange,
}: {
  companies: CompanyForm[];
  onChange: (companies: CompanyForm[]) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Companies</h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange([...companies, emptyCompany(companies.length)])
          }
        >
          Add company
        </Button>
      </div>
      <div className="space-y-4">
        {companies.map((company, index) => (
          <div
            key={company.id ?? index}
            className="grid gap-4 border border-black/10 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Company name">
                <input
                  className={inputClass}
                  value={company.name}
                  onChange={(event) =>
                    onChange(
                      companies.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <label className="flex items-end gap-2 pb-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={company.published}
                  onChange={(event) =>
                    onChange(
                      companies.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, published: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Published
              </label>
            </div>
            <BilingualNestedDescription
              value={company.description ?? { en: "", id: "" }}
              onChange={(description) =>
                onChange(
                  companies.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description } : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                onChange(
                  companies.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remove company
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function NestedJobs({
  jobs,
  onChange,
}: {
  jobs: JobForm[];
  onChange: (jobs: JobForm[]) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Jobs / Services</h2>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onChange([...jobs, emptyJob(jobs.length)])}
        >
          Add job
        </Button>
      </div>
      <div className="space-y-4">
        {jobs.map((job, index) => (
          <div
            key={job.id ?? index}
            className="grid gap-4 border border-black/10 p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job/service name (English)">
                <input
                  className={inputClass}
                  value={job.name.en}
                  onChange={(event) =>
                    onChange(
                      jobs.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              name: { ...item.name, en: event.target.value },
                            }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Job/service name (Indonesian)">
                <input
                  className={inputClass}
                  value={job.name.id}
                  onChange={(event) =>
                    onChange(
                      jobs.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              name: { ...item.name, id: event.target.value },
                            }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
            </div>
            <BilingualNestedDescription
              value={job.description ?? { en: "", id: "" }}
              onChange={(description) =>
                onChange(
                  jobs.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description } : item,
                  ),
                )
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={job.published}
                  onChange={(event) =>
                    onChange(
                      jobs.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, published: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                Published
              </label>
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  onChange(jobs.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                Remove job
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BilingualNestedDescription({
  value,
  onChange,
}: {
  value: { en: string; id: string };
  onChange: (value: { en: string; id: string }) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Description (English)">
        <textarea
          className={inputClass}
          rows={3}
          value={value.en}
          onChange={(event) => onChange({ ...value, en: event.target.value })}
        />
      </Field>
      <Field label="Description (Indonesian)">
        <textarea
          className={inputClass}
          rows={3}
          value={value.id}
          onChange={(event) => onChange({ ...value, id: event.target.value })}
        />
      </Field>
    </div>
  );
}
