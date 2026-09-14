"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  getAlumniAuditLogs,
  getAlumniById,
  type AlumniAuditLog,
} from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";
import type { Alumni } from "@/types/alumni";

const dateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const fieldLabel = (field: string) =>
  field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

export default function AdminAlumniAuditHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [logs, setLogs] = useState<
    (AlumniAuditLog & { userName?: string; alumniFullName?: string })[]
  >([]);
  const [alumni, setAlumni] = useState<Alumni | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAlumniAuditLogs(id), getAlumniById(id)])
      .then(([auditLogs, alumniData]) => {
        if (!cancelled) {
          setLogs(auditLogs);
          setAlumni(alumniData);
        }
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
  }, [id]);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <Link
          href={`/dashboard/alumni/${id}`}
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to alumni
        </Link>

        <div>
          <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
            Alumni · Change History
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--charcoal)]">
            {alumni?.fullName ?? "Alumni Profile"}
          </h1>
        </div>

        {error && (
          <p className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--rams-gray)]">Loading history…</p>
        ) : logs.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--rams-gray)]">
            No changes have been recorded yet.
          </p>
        ) : (
          <div className="space-y-6">
            {logs.map((log) => (
              <div
                key={log._id}
                className="border border-[var(--border)] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]">
                    Profile Updated
                  </p>
                  <p className="text-sm text-[var(--rams-gray)]">
                    {dateLabel(log.createdAt)}
                  </p>
                </div>
                {log.userName && (
                  <p className="mt-2 text-sm text-[var(--rams-gray)]">
                    Edited by:{" "}
                    <span className="font-semibold text-[var(--charcoal)]">
                      {log.userName}
                    </span>
                  </p>
                )}
                <div className="mt-4 space-y-3">
                  {Object.entries(log.changes).map(([field, change]) => (
                    <div key={field}>
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                        {fieldLabel(field)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--charcoal)]">
                        <span className="text-[var(--rams-gray)] line-through">
                          {change.oldValue == null
                            ? "—"
                            : typeof change.oldValue === "object"
                              ? JSON.stringify(change.oldValue)
                              : String(change.oldValue)}
                        </span>
                        <span className="mx-2 text-[var(--rams-gray)]">→</span>
                        <span>
                          {change.newValue == null
                            ? "—"
                            : typeof change.newValue === "object"
                              ? JSON.stringify(change.newValue)
                              : String(change.newValue)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
