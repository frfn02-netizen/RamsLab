"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
import { deleteExpert, getExpertList } from "@/lib/api/modules";
import type { Expert } from "@/types/modules";

export default function ExpertsPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getExpertList();
        if (!cancelled) {
          setItems(data);
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

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function removeExpert(expert: Expert) {
    if (!window.confirm(`Delete "${expert.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteExpert(expert._id);
      setItems((current) => current.filter((item) => item._id !== expert._id));
    } catch (reason) {
      setError(getUserFacingError(reason));
    }
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-10">
        <PageHeader
          eyebrow="People"
          title="Experts"
          description="Manage expert profiles displayed in the public-facing experts section."
          action={
            isAdmin ? (
              <LinkButton href="/dashboard/experts/new">
                Add expert
              </LinkButton>
            ) : undefined
          }
        />

        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {loading ? (
          <Card>
            <LoadingState label="Loading experts" />
          </Card>
        ) : !items.length ? (
          <EmptyState
            title="No experts"
            description="There are no expert profiles yet. Add one to get started."
            action={
              isAdmin ? (
                <LinkButton href="/dashboard/experts/new">
                  Add expert
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {["Expert", "Affiliation", "Visibility", "Order", "Action"].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] ${heading === "Action" ? "text-center" : ""}`}
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/8">
                  {items.map((expert) => (
                    <tr key={expert._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/experts/${expert._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {expert.name}
                        </Link>

                        {expert.title && (
                          <p className="mt-1 text-xs text-[var(--rams-gray)]">
                            {expert.title}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {expert.institution ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <Badge tone={expert.published ? "green" : "neutral"}>
                          {expert.published ? "Published" : "Draft"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-sm">{expert.order}</td>

                      <td className="px-5 py-4 text-center">
                        {isAdmin && (
                          <div className="flex justify-center gap-2">
                            <Link
                              href={`/dashboard/experts/${expert._id}`}
                              className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--background-light)]"
                            >
                              Edit
                            </Link>
                            <Button
                              variant="danger"
                              onClick={() => void removeExpert(expert)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
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
