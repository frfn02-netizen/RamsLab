"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { getMyAuditLogs, type AlumniAuditLog } from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";

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

export default function AlumniHistoryPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [logs, setLogs] = useState<AlumniAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/alumni/login");
    else if (status === "authenticated" && user?.role !== "ALUMNI")
      router.replace("/dashboard");
  }, [status, user, router]);

  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "ALUMNI") return;
    let cancelled = false;
    getMyAuditLogs()
      .then((result) => {
        if (!cancelled) setLogs(result);
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
  }, [status, user]);

  if (status === "loading" || !user || user.role !== "ALUMNI") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <p className="text-sm text-[var(--gray)]" role="status">
          Checking your session…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <div className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--navy)]"
            >
              RAMS Platform
            </Link>
            <span className="text-sm font-semibold text-[var(--rams-red)]">
              Alumni Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/alumni/dashboard"
              className="text-sm font-semibold text-[var(--gray)] hover:text-[var(--navy)]"
            >
              My Profile
            </Link>
            <span className="text-sm text-[var(--gray)]">{user.email}</span>
            <button
              onClick={() => void logout()}
              className="text-sm font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <Link
          href="/alumni/dashboard"
          className="text-sm font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
        >
          ← Back to profile
        </Link>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.03em] text-[var(--navy)]">
          Change History
        </h1>
        <p className="mt-2 text-sm text-[var(--gray)]">
          A record of changes made to your alumni profile.
        </p>

        {error && (
          <p className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-[var(--gray)]">Loading history…</p>
        ) : logs.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-semibold text-[var(--navy)]">
              No changes recorded yet
            </p>
            <p className="mt-2 text-sm text-[var(--gray)]">
              Your profile update history will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {logs.map((log) => (
              <div
                key={log._id}
                className="border border-[var(--border)] bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]">
                    Profile Updated
                  </p>
                  <p className="text-sm text-[var(--gray)]">
                    {dateLabel(log.createdAt)}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {Object.entries(log.changes).map(([field, change]) => (
                    <div key={field}>
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--gray)]">
                        {fieldLabel(field)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--slate)]">
                        <span className="text-[var(--gray)] line-through">
                          {change.oldValue == null
                            ? "—"
                            : typeof change.oldValue === "object"
                              ? JSON.stringify(change.oldValue)
                              : String(change.oldValue)}
                        </span>
                        <span className="mx-2 text-[var(--gray)]">→</span>
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
