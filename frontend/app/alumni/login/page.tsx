"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { getUserFacingError } from "@/lib/api/errors";
import type { AuthUser } from "@/types/auth";

function LoginContent() {
  const router = useRouter();
  const { user, status, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = (account: AuthUser) =>
    account.mustChangePassword
      ? "/change-password"
      : account.role === "ALUMNI"
        ? "/alumni/dashboard"
        : "/dashboard";

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(destination(user));
  }, [router, status, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const authenticatedUser = await login({ email, password });
      router.replace(destination(authenticatedUser));
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative isolate flex min-h-[16rem] items-end overflow-hidden bg-[var(--navy)] p-6 sm:min-h-[20rem] sm:p-10 lg:min-h-screen lg:items-center lg:p-14">
        <div className="relative z-10 max-w-lg">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-red-200">
            Alumni Network
          </p>
          <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            Welcome back to the RAMS Alumni Portal
          </h2>
          <span
            className="mt-7 block h-0.5 w-12 bg-[var(--rams-red)]"
            aria-hidden="true"
          />
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
            Sign in to manage your alumni profile and stay connected with the
            laboratory community.
          </p>
        </div>
      </section>

      <section className="flex min-h-[34rem] items-center justify-center bg-white px-5 py-12 sm:px-8 lg:min-h-screen lg:px-12 xl:px-20">
        <div className="w-full max-w-[28rem]">
          <div className="hero-entrance">
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--rams-red)]">
              RAMS Platform
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--charcoal)] sm:text-4xl">
              Alumni Sign In
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--gray)]">
              Use your alumni account to continue.
            </p>

            <form
              onSubmit={submit}
              className="mt-9 space-y-5 border border-[#D3DBE2] bg-white p-6 shadow-[0_14px_34px_rgba(11,32,56,0.06)] sm:p-8"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="block w-full border border-[#D3DBE2] bg-white px-3.5 py-2.5 text-sm text-[var(--charcoal)] outline-none transition-colors focus:border-[var(--rams-red)] focus:ring-1 focus:ring-[var(--rams-red)]"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full border border-[#D3DBE2] bg-white px-3.5 py-2.5 text-sm text-[var(--charcoal)] outline-none transition-colors focus:border-[var(--rams-red)] focus:ring-1 focus:ring-[var(--rams-red)]"
                />
              </div>
              {error && (
                <p
                  className="border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center bg-[var(--rams-red)] text-sm font-bold text-white transition-colors hover:bg-[var(--rams-red-dark)] disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--gray)]">
              Don&apos;t have an account?{" "}
              <Link
                href="/alumni/register"
                className="font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
              >
                Create Alumni Account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AlumniLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
          <p className="text-sm text-[var(--gray)]" role="status">
            Loading…
          </p>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
