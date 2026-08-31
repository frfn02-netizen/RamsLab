"use client";

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
} from "@/components/ui";
import { deleteStudent, getStudentList } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import SuccessToast from "@/components/dashboard/success-toast";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import DeleteButton from "@/components/dashboard/delete-button";

const Button = DeleteButton;
import type { Student } from "@/types/modules";
import { useEffect, useState } from "react";

const typeLabel = (type: Student["studentType"]) =>
  type === "PHD_STUDENT" ? "Ph.D. Student" : "Undergraduate Student";

export default function StudentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

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
          description="Manage Ph.D. and undergraduate student profiles for the public People directory."
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
                  {items.map((item) => (
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
