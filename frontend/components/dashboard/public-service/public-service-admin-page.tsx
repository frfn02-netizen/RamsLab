"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import {
  deletePublicServiceProject,
  getPublicServiceProjects,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PublicServiceProject } from "@/types/modules";

function formatPeriodYears(period?: string): string {
  if (!period || typeof period !== "string") return "—";
  const yearPattern = /\b(\d{4})\b/g;
  const years: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = yearPattern.exec(period)) !== null) {
    if (!years.includes(match[1])) years.push(match[1]);
  }
  if (years.length === 0) return "—";
  if (years.length === 1) return years[0];
  return `${years[0]} - ${years[years.length - 1]}`;
}

export default function PublicServiceAdminPage() {
  const [projects, setProjects] = useState<PublicServiceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");

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

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const p of projects) {
      if (p.yearGroup) years.add(p.yearGroup);
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projects.filter((project) => {
      if (selectedYear !== "all" && project.yearGroup !== selectedYear) {
        return false;
      }
      if (q) {
        const haystack = [
          project.title.en,
          project.executingEntity,
          project.client,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [projects, search, selectedYear]);

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
              <>
                <Card className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label
                      htmlFor="admin-ps-search"
                      className="sr-only"
                    >
                      Search public service projects
                    </label>
                    <input
                      id="admin-ps-search"
                      type="search"
                      className={inputClass}
                      placeholder="Search public service projects…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <label htmlFor="admin-ps-year" className="sr-only">
                      Filter by year
                    </label>
                    <select
                      id="admin-ps-year"
                      className={inputClass}
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                    >
                      <option value="all">All years</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>
                {filteredProjects.length === 0 ? (
                  <EmptyState
                    title="No public service projects found."
                    description="Try a different search or year filter."
                  />
                ) : (
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left">
                        <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                          <tr>
                            <th className="w-12 px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                              No.
                            </th>
                            <th className="min-w-0 flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                              Project / Scope of Work
                            </th>
                            <th className="w-[180px] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                              Client
                            </th>
                            <th className="w-[120px] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                              Period
                            </th>
                            <th className="w-[100px] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                              Status
                            </th>
                            <th className="w-[120px] px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/6">
                          {filteredProjects.map((project, index) => (
                            <tr
                              key={project._id}
                              className="transition-colors hover:bg-[var(--rams-gray-light)]/50"
                            >
                              <td className="px-4 py-3.5 text-sm text-[var(--rams-gray)]">
                                {index + 1}
                              </td>
                              <td className="min-w-0 px-4 py-3.5">
                                <Link
                                  href={`/dashboard/public-service/${project._id}`}
                                  className="block text-sm font-semibold leading-snug text-[var(--navy)] hover:text-[var(--rams-red)]"
                                >
                                  <span className="line-clamp-2">
                                    {project.title.en}
                                  </span>
                                </Link>
                              </td>
                              <td className="px-4 py-3.5 text-sm text-[var(--rams-gray)]">
                                <span className="line-clamp-2">
                                  {project.client}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-[var(--rams-gray)]">
                                {formatPeriodYears(project.period)}
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge
                                  tone={project.published ? "green" : "neutral"}
                                >
                                  {project.published ? "Published" : "Draft"}
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <LinkButton
                                    href={`/dashboard/public-service/${project._id}`}
                                    variant="secondary"
                                  >
                                    Edit
                                  </LinkButton>
                                  <Button
                                    variant="danger"
                                    disabled={busyId === project._id}
                                    onClick={() =>
                                      void removeProject(project)
                                    }
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
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
