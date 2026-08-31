"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  const visibleItems = items.filter((item) => {
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
            onChange={(event) => setSearch(event.target.value)}
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
        ) : visibleItems.length === 0 ? (
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
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-left">
                <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                  <tr>
                    {[
                      "Name",
                      "Employee ID",
                      "Position",
                      "Specialization",
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
                  {visibleItems.map((item) => (
                    <tr key={item._id}>
                      <td className="px-5 py-4">
                        <Link
                          href={`/dashboard/dosen/${item._id}`}
                          className="font-semibold hover:text-[var(--rams-red)]"
                        >
                          {item.fullName}
                        </Link>

                        <p className="mt-1 text-xs text-[var(--rams-gray)]">
                          {item.email ?? "Email not provided"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {item.employeeId ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {item.position ?? item.title ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.specialization.map((value) => (
                            <Badge key={value}>{value}</Badge>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge tone={item.isPublic ? "green" : "neutral"}>
                          {item.isPublic ? "Public" : "Private"}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex w-full items-center justify-center gap-3">
                          <Link
                            href={`/dashboard/dosen/${item._id}`}
                            className="text-sm font-bold text-[var(--rams-red)]"
                          >
                            View
                          </Link>

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
