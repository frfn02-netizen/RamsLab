"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import DeleteButton from "@/components/dashboard/delete-button";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import SuccessToast from "@/components/dashboard/success-toast";
import { deleteDosen, getDosenList } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { Dosen } from "@/types/modules";

const Button = DeleteButton;

export default function DosenPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Dosen | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [
      item.fullName,
      item.employeeId,
      item.title,
      item.position,
      item.email,
      ...item.specialization,
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(query));
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
  );
  const firstShown =
    filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const lastShown = Math.min(safeCurrentPage * pageSize, filteredItems.length);

  useEffect(() => {
    let cancelled = false;

    async function loadDosen() {
      try {
        const result = await getDosenList();

        if (!cancelled) {
          setItems(result);
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

    void loadDosen();

    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(item: Dosen) {
    setDeletingId(item._id);
    setError(null);
    setSuccess(null);

    try {
      await deleteDosen(item._id);

      setItems((current) =>
        current.filter((currentItem) => currentItem._id !== item._id),
      );

      setSuccess(`${item.fullName} was deleted successfully.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      {success && (
        <SuccessToast message={success} onClose={() => setSuccess(null)} />
      )}

      {pendingDelete && (
        <DeleteConfirmationModal
          personType="dosen"
          personName={pendingDelete.fullName}
          deleting={deletingId === pendingDelete._id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void remove(pendingDelete)}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="People"
          title="Dosen"
          description="Browse lecturer profiles and areas of specialization."
          action={
            user?.role === "ADMIN" ? (
              <LinkButton href="/dashboard/dosen/new">Add dosen</LinkButton>
            ) : undefined
          }
        />

        <Card className="p-4">
          <label
            htmlFor="dosen-search"
            className="mb-2 block text-sm font-semibold"
          >
            Search dosen
          </label>

          <input
            id="dosen-search"
            type="search"
            className={`${inputClass} max-w-md`}
            placeholder="Name, employee ID, position, or specialization"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
          />
        </Card>

        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {loading ? (
          <Card>
            <LoadingState label="Loading dosen" />
          </Card>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={search.trim() ? "No matching dosen found" : "No dosen found"}
            description={
              search.trim()
                ? "Try a different search term."
                : "There are no lecturer records available yet."
            }
            action={
              !search.trim() && user?.role === "ADMIN" ? (
                <LinkButton href="/dashboard/dosen/new">
                  Create the first profile
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {paginatedItems.map((item) => {
                const initials = item.fullName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("");

                return (
                  <Card
                    key={item._id}
                    className="flex h-full min-w-0 flex-col overflow-hidden p-0"
                  >
                    <div className="relative aspect-[5/3] bg-[var(--rams-charcoal)]">
                      {item.photo ? (
                        <Image
                          src={item.photo}
                          alt={item.fullName}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-4xl font-semibold text-white/85">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/dosen/${item._id}`}
                            className="block truncate font-display text-lg font-semibold text-[var(--rams-charcoal)] hover:text-[var(--rams-red)]"
                          >
                            {item.fullName}
                          </Link>
                          {(item.title || item.position) && (
                            <p className="mt-1 text-sm text-[var(--rams-gray)]">
                              {[item.title, item.position]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <Badge tone={item.isPublic ? "green" : "neutral"}>
                          {item.isPublic ? "Public" : "Private"}
                        </Badge>
                      </div>

                      {(item.department || item.faculty) && (
                        <p className="mt-3 line-clamp-2 text-sm text-[var(--rams-gray)]">
                          {[item.department, item.faculty]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {(item.employeeId || item.nip || item.nidn) && (
                        <p className="mt-2 text-xs leading-5 text-[var(--rams-gray)]">
                          {[
                            item.employeeId && `ID ${item.employeeId}`,
                            item.nip && `NIP ${item.nip}`,
                            item.nidn && `NIDN ${item.nidn}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {item.specialization.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.specialization.slice(0, 3).map((value) => (
                            <Badge key={value}>{value}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center gap-3 border-t border-black/8 pt-4">
                        {user?.role === "ADMIN" && (
                          <Link
                            href={`/dashboard/dosen/${item._id}/edit`}
                            className="inline-flex items-center text-sm font-bold text-[var(--rams-charcoal)] hover:text-[var(--rams-red)]"
                          >
                            Edit
                          </Link>
                        )}
                        {user?.role === "ADMIN" && (
                          <Button
                            variant="danger"
                            disabled={deletingId === item._id}
                            onClick={() => setPendingDelete(item)}
                          >
                            {deletingId === item._id ? "Deleting…" : "Delete"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {filteredItems.length > 0 && totalPages > 1 && (
              <div className="mt-6 flex flex-col gap-4 rounded-lg border border-black/8 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[var(--rams-gray)]">
                  Showing {firstShown} to {lastShown} of {filteredItems.length}{" "}
                  dosen
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="dosen-page-size" className="sr-only">
                    Dosen per page
                  </label>
                  <select
                    id="dosen-page-size"
                    className="rounded-md border border-black/15 bg-white px-2 py-2 font-semibold text-[var(--rams-charcoal)]"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    className="rounded-md border border-black/15 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ←
                  </button>
                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      aria-label={`Page ${page}`}
                      aria-current={
                        page === safeCurrentPage ? "page" : undefined
                      }
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-md border px-3 py-2 font-bold ${page === safeCurrentPage ? "border-[var(--rams-red)] bg-[var(--rams-red)] text-white" : "border-black/15 text-[var(--rams-charcoal)]"}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="rounded-md border border-black/15 px-3 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
