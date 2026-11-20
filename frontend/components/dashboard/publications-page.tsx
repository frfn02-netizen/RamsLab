"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import {
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { TableSkeleton } from "@/components/skeletons";
import { getPublications, deletePublication } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import { canManagePublication, hasPermission } from "@/lib/authz";
import type { Publication } from "@/types/modules";

import DeleteButton from "./delete-button";

export default function PublicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { success, error: notifyError } = useToast();
  const savedNoticeShown = useRef(false);

  const [publications, setPublications] = useState<Publication[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showSavedNotice = searchParams.get("saved") === "1";

  const load = useCallback(
    async (value = search) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getPublications({
          search: value,
          limit: 100,
        });

        setPublications(result.data);
      } catch (reason) {
        setError(getUserFacingError(reason));
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!showSavedNotice || savedNoticeShown.current) {
      return;
    }

    savedNoticeShown.current = true;
    success("Publication saved successfully.");
    router.replace("/dashboard/publications", {
      scroll: false,
    });
  }, [router, showSavedNotice, success]);

  async function remove(publication: Publication) {
    const confirmed = window.confirm(
      `Delete “${publication.title}”? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(publication._id);

    try {
      await deletePublication(publication._id);

      setPublications((current) =>
        current.filter((item) => item._id !== publication._id),
      );
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setDeletingId(null);
    }
  }

  const canCreate = hasPermission(user?.role, "publication.create");

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="Research"
          title="Publications"
          description="Manage the publication records used by the public RAMS Publications page."
          action={
            canCreate ? (
              <LinkButton href="/dashboard/publications/new">
                Add publication
              </LinkButton>
            ) : undefined
          }
        />

        <Card className="p-4">
          <label htmlFor="admin-publication-search" className="sr-only">
            Search publications
          </label>

          <input
            id="admin-publication-search"
            type="search"
            className={inputClass}
            placeholder="Search publications, authors, topics…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Card>

        {error && <ErrorState message={error} onRetry={() => void load()} />}

        {loading ? (
          <TableSkeleton rows={6} columns={6} minWidth="min-w-[980px]" />
        ) : publications.length === 0 ? (
          <EmptyState
            title={search ? "No publications found" : "No publications yet"}
            description={
              search
                ? "Try another search."
                : "Create the first publication record for the public page."
            }
            action={
              canCreate && !search ? (
                <LinkButton href="/dashboard/publications/new">
                  Add publication
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {[
                      "Title",
                      "Type",
                      "Year",
                      "Journal",
                      "Authors",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] ${
                          heading === "Action" ? "text-center" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/8">
                  {publications.map((publication) => (
                    <tr key={publication._id}>
                      <td className="max-w-md px-5 py-4">
                        {canManagePublication(user) ? (
                          <Link
                            href={`/dashboard/publications/${publication._id}/edit`}
                            className="font-semibold hover:text-[var(--rams-red)]"
                          >
                            {publication.title}
                          </Link>
                        ) : (
                          <p className="font-semibold">{publication.title}</p>
                        )}

                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {publication.doi ?? "No DOI"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-[var(--rams-gray)]">
                        {publication.publicationType || "Article"}
                      </td>

                      <td className="px-5 py-4 text-sm">{publication.year}</td>

                      <td className="px-5 py-4 text-sm">
                        {publication.journal}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-[var(--rams-gray)]">
                        {publication.authors.join(", ")}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex w-full items-center justify-center gap-2">
                          {canManagePublication(user) && (
                            <>
                              <LinkButton
                                href={`/dashboard/publications/${publication._id}/edit`}
                                variant="secondary"
                              >
                                Edit
                              </LinkButton>

                              <DeleteButton
                                variant="danger"
                                disabled={deletingId === publication._id}
                                onClick={() => void remove(publication)}
                              >
                                {deletingId === publication._id
                                  ? "Deleting…"
                                  : "Delete"}
                              </DeleteButton>
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
