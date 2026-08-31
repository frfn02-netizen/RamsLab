"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import DeleteButton from "@/components/dashboard/delete-button";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import SuccessToast from "@/components/dashboard/success-toast";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  Pagination,
  inputClass,
} from "@/components/ui";
import { deleteAlumni, getAlumniList } from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Alumni } from "@/types/alumni";

const limit = 10;

function formatStatus(status: Alumni["currentStatus"]) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AlumniPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<Alumni[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Alumni | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlumni() {
      setLoading(true);
      setError(null);

      try {
        const result = await getAlumniList({
          page,
          limit,
          search,
        });

        if (!cancelled) {
          setItems(result.data);
          setTotal(result.total);
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

    void loadAlumni();

    return () => {
      cancelled = true;
    };
  }, [page, search]);

  function remove(item: Alumni) {
    setPendingDelete(item);
  }

  async function confirmDelete(item: Alumni) {
    setDeletingId(item._id);
    setError(null);
    setSuccess(null);

    try {
      await deleteAlumni(item._id);

      setItems((current) =>
        current.filter((currentItem) => currentItem._id !== item._id),
      );

      setTotal((current) => Math.max(0, current - 1));
      setSuccess(`${item.fullName} was deleted successfully.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      {success && (
        <SuccessToast message={success} onClose={() => setSuccess(null)} />
      )}

      {pendingDelete && (
        <DeleteConfirmationModal
          personType="alumni"
          personName={pendingDelete.fullName}
          deleting={deletingId === pendingDelete._id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete(pendingDelete)}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="People"
          title="Alumni"
          description="Browse alumni profiles and their current professional journey."
          action={
            user?.role === "ADMIN" ? (
              <LinkButton href="/dashboard/alumni/new">Add alumni</LinkButton>
            ) : undefined
          }
        />

        <Card className="p-4">
          <label
            htmlFor="alumni-search"
            className="mb-2 block text-sm font-semibold"
          >
            Search alumni
          </label>

          <input
            id="alumni-search"
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Name, NIM, or program"
            className={`${inputClass} max-w-md`}
          />
        </Card>

        {error && items.length === 0 ? (
          <ErrorState message={error} onRetry={() => setPage(page)} />
        ) : (
          <>
            {error && (
              <ErrorState message={error} onRetry={() => setPage(page)} />
            )}

            {loading && items.length === 0 ? (
              <Card>
                <LoadingState label="Loading alumni" />
              </Card>
            ) : items.length === 0 ? (
              <EmptyState
                title={search ? "No matching alumni" : "No alumni found"}
                description={
                  search
                    ? `No alumni matched “${search}”.`
                    : "There are no alumni records available yet."
                }
                action={
                  user?.role === "ADMIN" ? (
                    <LinkButton href="/dashboard/alumni/new">
                      Create the first profile
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
                          "Alumni",
                          "NIM",
                          "Program",
                          "Graduation",
                          "Status",
                          "Company",
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
                      {items.map((item) => (
                        <tr
                          key={item._id}
                          className={loading ? "opacity-60" : ""}
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold">{item.fullName}</p>

                            <p className="mt-1 text-xs text-[var(--rams-gray)]">
                              {item.currentPosition ?? "Position not provided"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-sm">{item.nim}</td>

                          <td className="px-5 py-4 text-sm">{item.program}</td>

                          <td className="px-5 py-4 text-sm">
                            {item.graduationYear}
                          </td>

                          <td className="px-5 py-4">
                            <Badge
                              tone={
                                item.currentStatus === "SEEKING_JOB"
                                  ? "amber"
                                  : "neutral"
                              }
                            >
                              {formatStatus(item.currentStatus)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-sm">
                            {item.currentCompany ?? "—"}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex w-full items-center justify-center gap-3">
                              <Link
                                href={`/dashboard/alumni/${item._id}`}
                                className="text-sm font-bold text-[var(--rams-red)] hover:text-[var(--rams-red-dark)]"
                              >
                                View
                              </Link>

                              {user?.role === "ADMIN" && (
                                <DeleteButton
                                  variant="danger"
                                  disabled={deletingId === item._id}
                                  onClick={() => void remove(item)}
                                >
                                  {deletingId === item._id
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

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  disabled={loading || deletingId !== null}
                  onPageChange={setPage}
                />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
