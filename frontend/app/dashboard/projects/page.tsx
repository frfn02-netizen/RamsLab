"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import DeleteButton from "@/components/dashboard/delete-button";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { deleteProject, getProjects } from "@/lib/api/modules";
import type { Project, ProjectCategory } from "@/types/modules";

const categories: Array<"ALL" | ProjectCategory> = [
  "ALL",
  "RESEARCH",
  "CONSULTING",
  "DEVELOPMENT",
  "OTHER",
];

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProjectsPage() {
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [category, setCategory] = useState<"ALL" | ProjectCategory>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError(null);

      try {
        const result = await getProjects();

        if (!cancelled) {
          setProjects(result);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  async function removeProject(project: Project) {
    if (!window.confirm(`Delete “${project.title}”? This cannot be undone.`)) {
      return;
    }

    setDeletingId(project._id);

    try {
      await deleteProject(project._id);

      setProjects((current) =>
        current.filter((item) => item._id !== project._id),
      );
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setDeletingId(null);
    }
  }

  const visibleProjects =
    category === "ALL"
      ? projects
      : projects.filter((project) => project.category === category);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="Work"
          title="Projects"
          description="Manage the research and development work represented in RAMS."
          action={
            user?.role === "ADMIN" ? (
              <LinkButton href="/dashboard/projects/new">
                Add project
              </LinkButton>
            ) : undefined
          }
        />

        <Card className="flex flex-wrap gap-2 p-4">
          {categories.map((item) => (
            <Button
              key={item}
              variant={category === item ? "primary" : "secondary"}
              onClick={() => setCategory(item)}
            >
              {item === "ALL" ? "All projects" : label(item)}
            </Button>
          ))}
        </Card>

        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {loading ? (
          <Card>
            <LoadingState label="Loading projects" />
          </Card>
        ) : visibleProjects.length === 0 ? (
          <EmptyState
            title="No projects found"
            description="There are no project records matching this view yet."
            action={
              user?.role === "ADMIN" ? (
                <LinkButton href="/dashboard/projects/new">
                  Create a project
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {[
                      "Project",
                      "Category",
                      "Year",
                      "Status",
                      "Visibility",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] last:text-center"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/8">
                  {visibleProjects.map((project) => (
                    <tr key={project._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/projects/${project._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {project.title}
                        </Link>

                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {project.slug}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Badge tone="red">{label(project.category)}</Badge>
                      </td>

                      <td className="px-5 py-4 text-sm">{project.year}</td>

                      <td className="px-5 py-4 text-sm">
                        {label(project.status)}
                      </td>

                      <td className="px-5 py-4">
                        <Badge tone={project.published ? "green" : "neutral"}>
                          {project.published ? "Published" : "Draft"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex w-full items-center justify-center gap-3">
                          <Link
                            href={`/dashboard/projects/${project._id}`}
                            className="text-sm font-bold text-[var(--rams-red)] hover:text-[var(--rams-red-dark)]"
                          >
                            View
                          </Link>

                          {user?.role === "ADMIN" && (
                            <DeleteButton
                              variant="danger"
                              disabled={deletingId === project._id}
                              onClick={() => void removeProject(project)}
                            >
                              {deletingId === project._id
                                ? "Deleting…"
                                : "Delete"}
                            </DeleteButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
