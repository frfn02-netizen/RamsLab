"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import PasswordInput from "@/components/password-input";
import {
  Button,
  Card,
  Field,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { resetPassword } from "@/lib/api/auth";
import { getUserFacingError } from "@/lib/api/errors";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);

    if (newPassword.length < 8) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("Password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setCompleted(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-[var(--background-light)] p-5 sm:p-8">
        <div className="mx-auto max-w-xl space-y-7">
          <PageHeader
            eyebrow="Account recovery"
            title="Reset password"
            description="This reset link is missing a token."
          />
          <Card className="p-6">
            <p className="text-sm leading-6 text-[var(--gray)]">
              Request a new password reset link to continue.
            </p>
            <div className="mt-6">
              <LinkButton href="/forgot-password">
                Request a new link
              </LinkButton>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="min-h-screen bg-[var(--background-light)] p-5 sm:p-8">
        <div className="mx-auto max-w-xl space-y-7">
          <Card className="p-6">
            <div role="status">
            <h1 className="text-2xl font-bold text-[var(--charcoal)]">
              Password reset
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--gray)]">
              Your password was reset and all previous sessions were signed
              out. Sign in with your new password.
            </p>
            <div className="mt-6">
              <LinkButton href="/login">Sign in</LinkButton>
            </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background-light)] p-5 sm:p-8">
      <div className="mx-auto max-w-xl space-y-7">
        <PageHeader
          eyebrow="Account recovery"
          title="Choose a new password"
          description="This link can be used once. If it has expired, request a new one."
        />
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <Field label="New password" htmlFor="reset-password">
              <PasswordInput
                id="reset-password"
                label="new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                ariaDescribedBy="reset-password-help"
              />
              <p
                id="reset-password-help"
                className="mt-1 text-xs text-[var(--gray)]"
              >
                Use at least 8 characters. Longer is better.
              </p>
            </Field>

            <Field
              label="Confirm new password"
              htmlFor="reset-password-confirm"
              error={fieldError ?? undefined}
            >
              <PasswordInput
                id="reset-password-confirm"
                label="confirmation password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>

            {error && (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-[var(--gray)]"
              >
                Request a new link
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Resetting..." : "Reset password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
