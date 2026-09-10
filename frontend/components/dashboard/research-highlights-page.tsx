"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  Button,
} from "@/components/ui";
import {
  deleteResearchHighlight,
  getResearchHighlights,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { ResearchHighlight } from "@/types/modules";
import DeleteConfirmationModal from "./delete-confirmation-modal";

export default function ResearchHighlightsPage() {
  const [items, setItems] = useState<ResearchHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ResearchHighlight | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getResearchHighlights());
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function remove() {
    if (!deleting) return;
    setDeletingNow(true);
    setError(null);
    try {
      await deleteResearchHighlight(deleting.id);
      setItems((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setDeletingNow(false);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="Research"
          title="Research Highlights"
          description="Manage the questions and publications prepared for the future public highlights section."
          action={
            <LinkButton href="/dashboard/research-highlights/new">
              Create highlight
            </LinkButton>
          }
        />

        {error && <ErrorState message={error} onRetry={() => void load()} />}

        {loading ? (
          <Card>
            <LoadingState label="Loading research highlights" />
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            title="No research highlights yet"
            description="Create a highlight and link it to an existing publication."
            action={
              <LinkButton href="/dashboard/research-highlights/new">
                Create highlight
              </LinkButton>
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {[
                      "Highlight",
                      "Publication",
                      "Order",
                      "Status",
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
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {item.image?.url ? (
                            <img
                              src={item.image.url}
                              alt=""
                              className="h-14 w-20 object-cover"
                            />
                          ) : (
                            <div
                              className="h-14 w-20 bg-[var(--rams-gray-light)]"
                              aria-hidden="true"
                            />
                          )}
                          <div className="min-w-0 text-sm">
                            <Link
                              href={`/dashboard/research-highlights/${item.id}`}
                              className="font-semibold hover:text-[var(--rams-red)]"
                            >
                              {item.headline.en}
                            </Link>
                            <p className="mt-1 text-[var(--rams-gray)]">
                              {item.headline.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-sm">
                        <p className="font-semibold">
                          {item.publication.title}
                        </p>
                        <p className="mt-1 text-[var(--rams-gray)]">
                          {item.publication.year}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm">{item.order}</td>
                      <td className="px-5 py-4">
                        <Badge tone={item.published ? "green" : "neutral"}>
                          {item.published ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <Link
                            href={`/dashboard/research-highlights/${item.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--background-light)]"
                          >
                            Edit
                          </Link>
                          <Button
                            variant="danger"
                            onClick={() => setDeleting(item)}
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
      </div>

      {deleting && (
        <DeleteConfirmationModal
          personType="research highlight"
          personName={deleting.headline.en}
          deleting={deletingNow}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </div>
  );
}
