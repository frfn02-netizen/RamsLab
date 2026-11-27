"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import { getUserFacingError } from "@/lib/api/errors";
import { AuthLoadingSkeleton } from "@/components/skeletons";
import { assetPath } from "@/lib/asset-path";
import PasswordInput from "@/components/password-input";
import { Button, inputClass } from "@/components/ui";
import { authorizedLoginDestination } from "@/lib/authz";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status, login } = useAuth();
  const { error: notifyError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const next = searchParams.get("callbackUrl") ?? searchParams.get("next");
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(authorizedLoginDestination(user, next));
    }
  }, [router, status, user, next]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const authenticatedUser = await login({ email, password });
      router.replace(authorizedLoginDestination(authenticatedUser, next));
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-2">
      <section className="relative isolate min-h-[21rem] overflow-hidden bg-[var(--navy)] text-white sm:min-h-[25rem] lg:min-h-screen">
        <Image
          src={assetPath("/assets/vessel.jpeg")}
          alt="Marine engineering research vessel"
          fill
          priority
          sizes="(max-width: 1023px) 100vw, 55vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-[var(--navy)]/75"
          aria-hidden="true"
        />
        <div className="relative z-10 flex min-h-[21rem] flex-col justify-between p-6 sm:min-h-[25rem] sm:p-10 lg:min-h-screen lg:p-14 xl:p-16">
          <div className="hero-entrance">
            <div>
              <div className="relative h-24 w-24 bg-white p-2 sm:h-28 sm:w-28">
                <Image
                  src={assetPath("/assets/RamsLogoFIX.png")}
                  alt="RAMS Laboratory"
                  fill
                  sizes="100%"
                  className="object-contain"
                />
              </div>
              <p className="mt-7 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                RAMS Laboratory
              </p>
              <p className="mt-2 max-w-[18rem] text-sm leading-6 text-white/65">
                Reliability · Safety · Marine Systems
              </p>
            </div>

            <div className="mt-16 max-w-xl sm:mt-24">
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-red-200">
                Institutional access
              </p>
              <h2 className="mt-5 max-w-lg font-display text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
                Research and engineering for reliability, safety, Management,
                and marine systems.
              </h2>
              <span
                className="mt-7 block h-0.5 w-12 bg-[var(--rams-red)]"
                aria-hidden="true"
              />
              <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
                Institut Teknologi Sepuluh Nopember
              </p>
            </div>
          </div>

          <p className="hero-entrance mt-12 text-xs uppercase tracking-[0.16em] text-white/45">
            Authorized users only
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
              Sign in
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--gray)]">
              Use your RAMS account to continue to the administrative workspace.
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
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[var(--charcoal)]"
                >
                  Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
                <div className="mt-2 flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[var(--rams-red)] hover:text-[var(--rams-red-dark)]"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthLoadingSkeleton
          label="Loading sign in"
          className="bg-[var(--navy)]"
        />
      }
    >
      <LoginContent />
    </Suspense>
  );
}
