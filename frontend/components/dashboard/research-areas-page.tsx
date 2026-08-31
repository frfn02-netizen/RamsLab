"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";

import DeleteButton from "@/components/dashboard/delete-button";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button as RamsButton,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import {
  deleteResearchArea,
  getResearchAreas,
  updateResearchArea,
} from "@/lib/api/modules";
import type { ResearchArea } from "@/types/modules";

function Button({ variant, ...props }: ComponentProps<typeof RamsButton>) {
  return variant === "danger" ? (
    <DeleteButton {...props} />
  ) : (
    <RamsButton variant={variant} {...props} />
  );
}

export default function ResearchAreasPage() {
  const { user } = useAuth();

  const [areas, setAreas] = useState<ResearchArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      setAreas(await getResearchAreas());
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    getResearchAreas()
      .then((result) => {
        if (!cancelled) {
          setAreas(result);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function togglePublished(area: ResearchArea) {
    setBusyId(area._id);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateResearchArea(area._id, {
        published: !area.published,
      });

      setAreas((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );

      setSuccess(
        `${area.code} is now ${
          updated.published ? "published" : "unpublished"
        }.`,
      );
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function move(area: ResearchArea, direction: -1 | 1) {
    const index = areas.findIndex((item) => item._id === area._id);
    const other = areas[index + direction];

    if (!other) {
      return;
    }

    setBusyId(area._id);
    setError(null);
    setSuccess(null);

    try {
      const [updatedArea, updatedOther] = await Promise.all([
        updateResearchArea(area._id, {
          order: other.order,
        }),
        updateResearchArea(other._id, {
          order: area.order,
        }),
      ]);

      setAreas((current) =>
        current
          .map((item) =>
            item._id === updatedArea._id
              ? updatedArea
              : item._id === updatedOther._id
                ? updatedOther
                : item,
          )
          .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code)),
      );

      setSuccess("Research area order updated.");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(area: ResearchArea) {
    if (!window.confirm(`Delete “${area.code}”? This cannot be undone.`)) {
      return;
    }

    setBusyId(area._id);
    setError(null);
    setSuccess(null);

    try {
      await deleteResearchArea(area._id);

      setAreas((current) => current.filter((item) => item._id !== area._id));

      setSuccess(`${area.code} was deleted.`);
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
          eyebrow="Research"
          title="Research Areas"
          description="Manage the bilingual research areas displayed on the public Research page."
          action={
            user?.role === "ADMIN" ? (
              <LinkButton href="/dashboard/research/new">
                Add research area
              </LinkButton>
            ) : undefined
          }
        />

        {error && <ErrorState message={error} onRetry={() => void load()} />}

        {success && (
          <div
            className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"
            role="status"
          >
            {success}
          </div>
        )}

        {loading ? (
          <Card>
            <LoadingState label="Loading research areas" />
          </Card>
        ) : areas.length === 0 ? (
          <EmptyState
            title="No research areas found"
            description="There are no research area records yet."
            action={
              user?.role === "ADMIN" ? (
                <LinkButton href="/dashboard/research/new">
                  Create a research area
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {[
                      "Code",
                      "Title",
                      "Order",
                      "Visibility",
                      "Updated",
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
                  {areas.map((area, index) => (
                    <tr key={area._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/research/${area._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {area.code}
                        </Link>

                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {area.slug}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/research/${area._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {area.title.en}
                        </Link>

                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {area.title.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {area.order}

                        <div className="mt-2 flex gap-1">
                          {user?.role === "ADMIN" && (
                            <>
                              <Button
                                variant="secondary"
                                className="min-h-8 px-2 text-xs"
                                disabled={busyId !== null || index === 0}
                                onClick={() => void move(area, -1)}
                              >
                                ↑
                              </Button>

                              <Button
                                variant="secondary"
                                className="min-h-8 px-2 text-xs"
                                disabled={
                                  busyId !== null || index === areas.length - 1
                                }
                                onClick={() => void move(area, 1)}
                              >
                                ↓
                              </Button>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge tone={area.published ? "green" : "neutral"}>
                          {area.published ? "Published" : "Draft"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-xs text-[var(--rams-gray)]">
                        {new Date(area.updatedAt).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex w-full flex-wrap items-center justify-center gap-2">
                          {user?.role === "ADMIN" && (
                            <>
                              <LinkButton
                                href={`/dashboard/research/${area._id}`}
                                variant="secondary"
                              >
                                Edit
                              </LinkButton>

                              <Button
                                variant="secondary"
                                disabled={busyId === area._id}
                                onClick={() => void togglePublished(area)}
                              >
                                {area.published ? "Unpublish" : "Publish"}
                              </Button>

                              <Button
                                variant="danger"
                                disabled={busyId === area._id}
                                onClick={() => void remove(area)}
                              >
                                Delete
                              </Button>
                            </>
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
