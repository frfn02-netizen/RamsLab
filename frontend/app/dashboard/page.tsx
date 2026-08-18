"use client";

import { useEffect, useState } from "react";

import { getDashboardStats } from "@/lib/api/dashboard";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/components/providers/auth-providers";
import type { DashboardStats } from "@/types/dashboard";

type StatCardProps = {
  label: string;
  value: number;
  accent: "red" | "blue" | "navy";
};

function StatCard({
  label,
  value,
  accent,
}: StatCardProps) {
  return (
    <article className={`dashboard-stat-card dashboard-stat-accent-${accent} p-6`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--rams-gray)]">
        {label}
      </p>

      <p className="mt-7 font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--rams-charcoal)]">
        {value.toLocaleString("en-US")}
      </p>

      <p className="mt-2 text-xs text-[var(--rams-gray)]">Current platform records</p>
      <div className="mt-6 h-px w-12 bg-[var(--rams-gray)]/25" aria-hidden="true" />
    </article>
  );
}

export default function DashboardPage() {
  const {
    user,
    status,
  } = useAuth();

  const [
    stats,
    setStats,
  ] = useState<DashboardStats | null>(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !user
    ) {
      return;
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "DOSEN"
    ) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const result =
          await getDashboardStats();

        if (!cancelled) {
          setStats(result);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (
          error instanceof ApiError
        ) {
          setError(error.message);
        } else {
          setError(
            "Failed to load dashboard"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [status, user]);

  if (status === "loading") {
    return (
      <div className="dashboard-page p-5 sm:p-7 lg:p-9">
        <p className="text-sm text-[var(--rams-gray)]">
          Checking authentication...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-page p-5 sm:p-7 lg:p-9">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700">
            Authentication required.
          </p>
        </div>
      </div>
    );
  }

  if (
    user.role !== "ADMIN" &&
    user.role !== "DOSEN"
  ) {
    return (
      <div className="dashboard-page p-5 sm:p-7 lg:p-9">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-700">
            You do not have permission to
            access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl">
        <div className="mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
            Overview
          </p>

          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--rams-charcoal)]">
            Dashboard
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--rams-gray)]">
            Monitor the current state of
            the RAMS Platform.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Users"
            value={stats?.users ?? 0}
            accent="red"
          />

          <StatCard
            label="Alumni"
            value={stats?.alumni ?? 0}
            accent="blue"
          />

          <StatCard
            label="Dosen"
            value={stats?.dosen ?? 0}
            accent="red"
          />

          <StatCard
            label="Projects"
            value={stats?.projects ?? 0}
            accent="navy"
          />

          <StatCard
            label="University Partners"
            value={
              stats?.universityPartners ?? 0
            }
            accent="blue"
          />

          <StatCard
            label="Industrial Partners"
            value={
              stats?.industrialPartners ?? 0
            }
            accent="red"
          />
        </div>

        {isLoading && (
          <div className="mt-6 rounded-md border border-[#D9E2EA] bg-white p-6 shadow-[0_8px_24px_rgba(16,38,61,0.04)]">
            <p className="text-sm text-[var(--rams-gray)]">
              Loading dashboard statistics...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
