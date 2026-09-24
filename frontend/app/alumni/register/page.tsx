"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { getUserFacingError } from "@/lib/api/errors";

function RegisterContent() {
  const router = useRouter();
  const { user, status, register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && user) {
      if (user.role === "ALUMNI") router.replace("/alumni/dashboard");
      else router.replace("/dashboard");
    }
  }, [status, user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      nextErrors.fullName = "Full name must be at least 2 characters.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextErrors.email = "Enter a valid email address.";
    if (password.length < 8)
      nextErrors.password = "Password must be at least 8 characters.";
    if (password.length > 128)
      nextErrors.password = "Password must be 128 characters or fewer.";
    if (password !== confirmPassword)
      nextErrors.confirmPassword = "Passwords do not match.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      window.sessionStorage.setItem(
        "rams_alumni_registration_notice",
        "Account created successfully. Please complete your alumni profile. Your profile will be reviewed by an administrator before publication.",
      );
      router.replace("/alumni/dashboard");
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
            Join the RAMS Laboratory Alumni Network
          </h2>
          <span
            className="mt-7 block h-0.5 w-12 bg-[var(--rams-red)]"
            aria-hidden="true"
          />
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
            Create your account to connect with the laboratory community and
            keep your professional profile current.
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
              Create Alumni Account
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--gray)]">
              Fill in your details to join the alumni network.
            </p>

            <form
              onSubmit={submit}
              className="mt-9 space-y-5 border border-[#D3DBE2] bg-white p-6 shadow-[0_14px_34px_rgba(11,32,56,0.06)] sm:p-8"
            >
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setFieldErrors((c) => ({ ...c, fullName: undefined }));
                  }}
                  className="block w-full border border-[#D3DBE2] bg-white px-3.5 py-2.5 text-sm text-[var(--charcoal)] outline-none transition-colors focus:border-[var(--rams-red)] focus:ring-1 focus:ring-[var(--rams-red)]"
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((c) => ({ ...c, email: undefined }));
                  }}
                  className="block w-full border border-[#D3DBE2] bg-white px-3.5 py-2.5 text-sm text-[var(--charcoal)] outline-none transition-colors focus:border-[var(--rams-red)] focus:ring-1 focus:ring-[var(--rams-red)]"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.email}
                  </p>
                )}
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((c) => ({ ...c, password: undefined }));
                  }}
                  className="block w-full border border-[#D3DBE2] bg-white px-3.5 py-2.5 text-sm text-[var(--charcoal)] outline-none transition-colors focus:border-[var(--rams-red)] focus:ring-1 focus:ring-[var(--rams-red)]"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setFieldErrors((c) => ({
                      ...c,
                      confirmPassword: undefined,
                    }));
                  }}
                  className="block w-full border border-[#D3DBE2] bg-white px-3.5 py-2.5 text-sm text-[var(--charcoal)] outline-none transition-colors focus:border-[var(--rams-red)] focus:ring-1 focus:ring-[var(--rams-red)]"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
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
                {submitting ? "Creating Account…" : "Create Alumni Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--gray)]">
              Already have an account?{" "}
              <Link
                href="/alumni/login"
                className="font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AlumniRegisterPage() {
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
      <RegisterContent />
    </Suspense>
  );
}
