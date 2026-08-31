"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  inputClass,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/lib/api/modules";
import type { Project, ProjectCategory, ProjectStatus } from "@/types/modules";

const categories: ProjectCategory[] = [
  "RESEARCH",
  "CONSULTING",
  "DEVELOPMENT",
  "OTHER",
];

const statuses: ProjectStatus[] = ["PLANNING", "ONGOING", "COMPLETED"];

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ProjectDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    category: "RESEARCH" as ProjectCategory,
    year: "",
    status: "PLANNING" as ProjectStatus,
    image: "",
    technologies: "",
    published: false,
  });

  useEffect(() => {
    let cancelled = false;

    getProjectById(id)
      .then((result) => {
        if (cancelled) return;

        setProject(result);

        setForm({
          title: result.title,
          slug: result.slug,
          description: result.description,
          category: result.category,
          year: String(result.year),
          status: result.status,
          image: result.image ?? "",
          technologies: result.technologies.join(", "),
          published: result.published,
        });
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

  const update = (key: string, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const result = await updateProject(id, {
        title: form.title,
        slug: form.slug,
        description: form.description,
        category: form.category,
        year: Number(form.year),
        status: form.status,
        image: form.image || undefined,
        technologies: form.technologies
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        published: form.published,
      });

      setProject(result);
      setEditing(false);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!project) return;

    const confirmed = window.confirm(
      `Delete “${project.title}”? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteProject(project._id);
      router.push("/dashboard/projects");
    } catch (reason) {
      setError(getUserFacingError(reason));
      setDeleting(false);
    }
  }

  if (!project && !error) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading project" />
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />

        <Link
          href="/dashboard/projects"
          className="mt-5 inline-block text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to projects
        </Link>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href="/dashboard/projects"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← All projects
        </Link>

        {error && <ErrorState message={error} />}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="red">{label(project.category)}</Badge>

              <Badge tone={project.published ? "green" : "neutral"}>
                {project.published ? "Published" : "Draft"}
              </Badge>

              <span className="text-sm text-[var(--rams-gray)]">
                {project.year}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-bold leading-tight">
              {project.title}
            </h1>

            <p className="mt-2 text-sm text-[var(--rams-gray)]">
              /{project.slug}
            </p>
          </div>

          {user?.role === "ADMIN" && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditing((value) => !value)}
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
          )}
        </header>

        {editing ? (
          <Card className="p-6">
            <form onSubmit={save} className="space-y-5">
              <Field label="Title">
                <input
                  required
                  minLength={3}
                  className={inputClass}
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </Field>

              <Field label="Slug">
                <input
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  className={inputClass}
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                />
              </Field>

              <Field label="Description">
                <textarea
                  required
                  minLength={10}
                  className={`${inputClass} min-h-32`}
                  value={form.description}
                  onChange={(event) =>
                    update("description", event.target.value)
                  }
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Category">
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(event) =>
                      update("category", event.target.value as ProjectCategory)
                    }
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {label(item)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(event) =>
                      update("status", event.target.value as ProjectStatus)
                    }
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {label(item)}
                      </option>
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
                    onChange={(event) => update("year", event.target.value)}
                  />
                </Field>

                <Field label="Image URL">
                  <input
                    type="url"
                    className={inputClass}
                    value={form.image}
                    onChange={(event) => update("image", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Technologies">
                <input
                  className={inputClass}
                  value={form.technologies}
                  onChange={(event) =>
                    update("technologies", event.target.value)
                  }
                />

                <p className="mt-1 text-xs text-[var(--rams-gray)]">
                  Separate multiple entries with commas.
                </p>
              </Field>

              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) =>
                    update("published", event.target.checked)
                  }
                />
                Publish this project
              </label>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <p className="whitespace-pre-wrap text-base leading-8">
              {project.description}
            </p>

            <div className="mt-8 grid gap-5 border-t border-black/8 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Status
                </p>

                <p className="mt-2 font-semibold">{label(project.status)}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Technologies
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {project.technologies.length ? (
                    project.technologies.map((technology) => (
                      <Badge key={technology}>{technology}</Badge>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--rams-gray)]">
                      None listed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
