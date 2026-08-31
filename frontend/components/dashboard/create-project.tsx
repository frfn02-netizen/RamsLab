"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { createProject } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { ProjectCategory, ProjectStatus } from "@/types/modules";

export default function CreateProject() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    category: "RESEARCH" as ProjectCategory,
    year: String(new Date().getFullYear()),
    status: "PLANNING" as ProjectStatus,
    technologies: "",
    published: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const project = await createProject({
        ...form,
        year: Number(form.year),
        partnerIds: [],
        technologies: form.technologies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      router.push(`/dashboard/projects/${project._id}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <Link
          href="/dashboard/projects"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Projects
        </Link>

        <PageHeader
          eyebrow="Work"
          title="Add project"
          description="Create a project record for the RAMS workspace."
        />

        {error && <ErrorState message={error} />}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Title">
              <input
                required
                minLength={3}
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Slug">
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                className={inputClass}
                placeholder="example-project"
                value={form.slug}
                onChange={(event) =>
                  setForm({
                    ...form,
                    slug: event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Description">
              <textarea
                required
                minLength={10}
                className={`${inputClass} min-h-32`}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category">
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value as ProjectCategory,
                    })
                  }
                >
                  {["RESEARCH", "CONSULTING", "DEVELOPMENT", "OTHER"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as ProjectStatus,
                    })
                  }
                >
                  {["PLANNING", "ONGOING", "COMPLETED"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>

              <Field label="Year">
                <input
                  required
                  type="number"
                  min="1900"
                  max="2100"
                  className={inputClass}
                  value={form.year}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      year: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Technologies">
                <input
                  className={inputClass}
                  placeholder="React, MongoDB"
                  value={form.technologies}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      technologies: event.target.value,
                    })
                  }
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) =>
                  setForm({
                    ...form,
                    published: event.target.checked,
                  })
                }
              />
              Publish this project
            </label>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create project"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
