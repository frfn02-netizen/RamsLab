"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Field,
  LinkButton,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { forgotPassword } from "@/lib/api/auth";
import { getUserFacingError } from "@/lib/api/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background-light)] p-5 sm:p-8">
      <div className="mx-auto max-w-xl space-y-7">
        <PageHeader
          eyebrow="Account recovery"
          title="Forgot password"
          description="Enter the email attached to your RAMS account. If the account exists, password reset instructions will be sent."
        />

        <Card className="p-6">
          {sent ? (
            <div role="status" className="space-y-4">
              <h2 className="text-lg font-bold text-[var(--charcoal)]">
                Check your email
              </h2>
              <p className="text-sm leading-6 text-[var(--gray)]">
                If an account matches that email, password reset instructions
                will be sent. Check your inbox and spam folder.
              </p>
              <LinkButton href="/login">Back to sign in</LinkButton>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <Field label="Email" htmlFor="forgot-email">
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  className={inputClass}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>

              {error && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[var(--gray)]"
                >
                  Back to sign in
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending..." : "Send reset link"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
