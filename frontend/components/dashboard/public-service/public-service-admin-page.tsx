"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import {
  deletePublicServiceProject,
  getPublicServiceProjects,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PublicServiceProject } from "@/types/modules";

export default function PublicServiceAdminPage() {
  const [projects, setProjects] = useState<PublicServiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getPublicServiceProjects();
      setProjects(list);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function removeProject(project: PublicServiceProject) {
    if (
      !window.confirm(`Delete "${project.title.en}"? This cannot be undone.`)
    ) {
      return;
    }
    setBusyId(project._id);
    try {
      await deletePublicServiceProject(project._id);
      setProjects((current) =>
        current.filter((item) => item._id !== project._id),
      );
      setSuccess(`${project.title.en} was deleted.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="CMS"
          title="Public Service"
          description="Manage public service and R&D work records shown on the public Public Service page."
        />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {success && (
          <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}
        {loading ? (
          <Card>
            <LoadingState label="Loading public service content" />
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--rams-charcoal)]">
                Projects
              </h2>
              <LinkButton href="/dashboard/public-service/new">
                Add project
              </LinkButton>
            </div>
            {projects.length === 0 ? (
              <EmptyState
                title="No projects found"
                description="Add public service projects to display them on the public page."
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left">
                    <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                      <tr>
                        {[
                          "No.",
                          "Project / Scope of Work",
                          "Period",
                          "Visibility",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] ${heading === "Action" ? "text-center" : ""}`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {projects.map((project, index) => (
                        <tr key={project._id}>
                          <td className="px-5 py-4 text-sm text-[var(--rams-gray)]">
                            {index + 1}
                          </td>
                          <td className="px-5 py-4">
                            <Link
                              href={`/dashboard/public-service/${project._id}`}
                              className="font-semibold hover:text-[var(--rams-red)]"
                            >
                              {project.title.en}
                            </Link>
                            <p className="mt-1 text-xs text-[var(--rams-gray)]">
                              {project.executingEntity} · {project.client}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-[var(--rams-gray)]">
                            {project.period}
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              tone={project.published ? "green" : "neutral"}
                            >
                              {project.published ? "Published" : "Draft"}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <LinkButton
                                href={`/dashboard/public-service/${project._id}`}
                                variant="secondary"
                              >
                                Edit
                              </LinkButton>
                              <Button
                                variant="danger"
                                disabled={busyId === project._id}
                                onClick={() => void removeProject(project)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
