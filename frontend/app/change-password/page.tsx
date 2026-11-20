"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import PasswordInput from "@/components/password-input";
import {
  Button,
  Card,
  Field,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { changePassword } from "@/lib/api/auth";
import { getUserFacingError } from "@/lib/api/errors";
import { defaultAuthenticatedDestination } from "@/lib/authz";

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth();
  const { error: notifyError } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(
    null,
  );
  const [completed, setCompleted] = useState(false);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    setFieldError(null);
    setNewPasswordError(null);

    if (newPassword.length < 8) {
      setNewPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setNewPasswordError(
        "New password must be different from the current password.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError("New password and confirmation do not match.");
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
      });
      await refresh();
      setReauthRequired(response.reauthenticate === true);
      setCompleted(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (reason) {
      const message = getUserFacingError(reason);
      if (/different from the current password/i.test(message)) {
        setNewPasswordError(message);
      } else {
        notifyError(message);
      }
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }

  if (completed) {
    return (
      <main className="min-h-screen bg-[var(--background-light)] p-5 sm:p-8">
        <div className="mx-auto max-w-xl space-y-7">
          <Card className="p-6">
            <div role="status">
            <h1 className="text-2xl font-bold text-[var(--charcoal)]">
              Password updated
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--gray)]">
              {reauthRequired
                ? "Your password was changed and all sessions were signed out. Sign in again with your new password."
                : "Your password was changed and your other sessions were signed out."}
            </p>
            <div className="mt-6">
              {reauthRequired ? (
                <LinkButton href="/login">Sign in again</LinkButton>
              ) : (
                <LinkButton
                  href={
                    user
                      ? defaultAuthenticatedDestination(user)
                      : "/login"
                  }
                >
                  Continue to your workspace
                </LinkButton>
              )}
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
          eyebrow="Account security"
          title="Change your password"
          description="Choose a new password. If this is your first sign-in, use the temporary password you received as the current password."
        />
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Current password" htmlFor="current-password">
              <PasswordInput
                id="current-password"
                label="current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            <Field
              label="New password"
              htmlFor="new-password"
              error={newPasswordError ?? undefined}
            >
              <PasswordInput
                id="new-password"
                label="new password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setNewPasswordError(null);
                }}
                autoComplete="new-password"
                required
                minLength={8}
                ariaDescribedBy="new-password-help"
              />
              <p
                id="new-password-help"
                className="mt-1 text-xs text-[var(--gray)]"
              >
                Use at least 8 characters. Longer is better.
              </p>
            </Field>

            <Field
              label="Confirm new password"
              htmlFor="confirm-password"
              error={fieldError ?? undefined}
            >
              <PasswordInput
                id="confirm-password"
                label="confirmation password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setFieldError(null);
                }}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 pt-5">
              <Link
                href={
                  user
                    ? defaultAuthenticatedDestination(user)
                    : "/login"
                }
                className="text-sm font-semibold text-[var(--gray)]"
              >
                Cancel
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Updating..." : "Change password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
