"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button as UiButton,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { deleteStudent, getStudentList } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import SuccessToast from "@/components/dashboard/success-toast";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import DeleteButton from "@/components/dashboard/delete-button";

const Button = DeleteButton;
import type { Student, StudentType } from "@/types/modules";
import { useEffect, useMemo, useState } from "react";

const typeLabel = (type: StudentType) =>
  type === "PHD_STUDENT"
    ? "Ph.D. Student"
    : type === "MASTER_STUDENT"
      ? "Master Student"
      : type === "INTERNSHIP_STUDENT"
        ? "Vocational Intern"
        : "Undergraduate Student";

type VisibilityFilter = "all" | "public" | "hidden";

export default function StudentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<StudentType | "all">(
    "all",
  );
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  useEffect(() => {
    let cancelled = false;
    getStudentList()
      .then((result) => {
        if (!cancelled) setItems(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(getUserFacingError(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const nameMatch = item.fullName.toLowerCase().includes(q);
        const programMatch = item.program?.toLowerCase().includes(q) ?? false;
        const specMatch = item.specialization.some((s) =>
          s.toLowerCase().includes(q),
        );
        if (!nameMatch && !programMatch && !specMatch) return false;
      }
      if (categoryFilter !== "all" && item.studentType !== categoryFilter)
        return false;
      if (visibilityFilter === "public" && !item.isPublic) return false;
      if (visibilityFilter === "hidden" && item.isPublic) return false;
      return true;
    });
  }, [items, searchQuery, categoryFilter, visibilityFilter]);

  function resetFilters() {
    setSearchQuery("");
    setCategoryFilter("all");
    setVisibilityFilter("all");
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    categoryFilter !== "all" ||
    visibilityFilter !== "all";

  async function remove(item: Student) {
    setDeletingId(item._id);
    setError(null);
    setSuccess(null);
    try {
      await deleteStudent(item._id);
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
          personType="student"
          personName={pendingDelete.fullName}
          deleting={deletingId === pendingDelete._id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void remove(pendingDelete)}
        />
      )}
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="People"
          title="Students"
          description="Manage Ph.D., master, undergraduate, and vocational intern profiles for the public People directory."
          action={
            user?.role === "ADMIN" ? (
              <LinkButton href="/dashboard/students/new">
                Add student
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
            <LoadingState label="Loading students" />
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Student profiles will appear in the public People directory when they are created and published."
            action={
              user?.role === "ADMIN" ? (
                <LinkButton href="/dashboard/students/new">
                  Create the first profile
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <>
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="search"
                  placeholder="Search by name..."
                  aria-label="Search students"
                  className={`${inputClass} sm:max-w-xs`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  aria-label="Category"
                  className={inputClass}
                  style={{ width: "auto", minWidth: "10rem" }}
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as StudentType | "all")
                  }
                >
                  <option value="all">All categories</option>
                  <option value="PHD_STUDENT">Ph.D. Student</option>
                  <option value="MASTER_STUDENT">Master Student</option>
                  <option value="UNDERGRADUATE_STUDENT">
                    Undergraduate Student
                  </option>
                  <option value="INTERNSHIP_STUDENT">Vocational Intern</option>
                </select>
                <select
                  aria-label="Visibility"
                  className={inputClass}
                  style={{ width: "auto", minWidth: "9rem" }}
                  value={visibilityFilter}
                  onChange={(e) =>
                    setVisibilityFilter(e.target.value as VisibilityFilter)
                  }
                >
                  <option value="all">All</option>
                  <option value="public">Public</option>
                  <option value="hidden">Hidden</option>
                </select>
                {hasActiveFilters && (
                  <UiButton variant="secondary" onClick={resetFilters}>
                    Reset
                  </UiButton>
                )}
              </div>
            </Card>
            {filtered.length === 0 ? (
              <EmptyState
                title="No students match the selected filters."
                description="Try adjusting your search or filter criteria."
                action={
                  <UiButton variant="secondary" onClick={resetFilters}>
                    Reset filters
                  </UiButton>
                }
              />
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
                      <tr>
                        {[
                          "Name",
                          "Type",
                          "Program",
                          "Specialization",
                          "Visibility",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] ${heading === "Action" ? "text-center" : ""}`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/8">
                      {filtered.map((item) => (
                        <tr key={item._id}>
                          <td className="px-5 py-4">
                            <Link
                              href={`/dashboard/students/${item._id}`}
                              className="font-semibold hover:text-[var(--rams-red)]"
                            >
                              {item.fullName}
                            </Link>
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone="neutral">
                              {typeLabel(item.studentType)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {item.program ?? "—"}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            {item.specialization.join(" · ") || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone={item.isPublic ? "green" : "neutral"}>
                              {item.isPublic ? "Public" : "Private"}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex w-full items-center justify-center gap-3">
                              <Link
                                href={`/dashboard/students/${item._id}`}
                                className="text-sm font-bold text-[var(--rams-red)]"
                              >
                                Edit
                              </Link>
                              {user?.role === "ADMIN" && (
                                <Button
                                  variant="danger"
                                  disabled={deletingId === item._id}
                                  onClick={() => setPendingDelete(item)}
                                >
                                  {deletingId === item._id
                                    ? "Deleting…"
                                    : "Delete"}
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
          </>
        )}
      </div>
    </div>
  );
}
