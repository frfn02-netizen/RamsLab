"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { useToast } from "@/components/providers/toast-providers";
import { Button } from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { resetUserPassword } from "@/lib/api/modules";
import type { UserRole } from "@/types/auth";

export default function ResetPasswordPanel({
  userId,
  email,
  name,
  targetRole,
}: {
  userId?: string;
  email?: string;
  name: string;
  targetRole?: UserRole;
}) {
  const { user } = useAuth();
  const { success, error: notifyError } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(true);
  const [cleared, setCleared] = useState(false);

  if (!userId || userId === user?.id || targetRole === "ADMIN") return null;

  async function reset() {
    setResetting(true);
    try {
      const result = await resetUserPassword(userId!);
      setTemporaryPassword(result.temporaryPassword);
      setCleared(false);
      setShowTemporaryPassword(true);
      setConfirming(false);
      success("Password reset. Existing sessions were signed out.");
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setResetting(false);
    }
  }

  async function copy() {
    if (!temporaryPassword || cleared) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError("Could not copy the password. Select it manually.");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-[var(--rams-gray)]">
        Reset the sign-in password for {name}
        {email ? ` (${email})` : ""}. Existing sessions will be signed out, and
        the account must choose a new password at the next sign-in.
      </p>

      {cleared ? (
        <div className="space-y-3 border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            Temporary password cleared
          </p>
          <p className="text-xs leading-5 text-amber-900">
            The password is no longer shown on this page. Generate another one
            if you did not copy it.
          </p>
          <Button
            variant="secondary"
            disabled={resetting}
            onClick={() => void reset()}
          >
            {resetting ? "Generating..." : "Generate another password"}
          </Button>
        </div>
      ) : temporaryPassword ? (
        <div
          className="space-y-3 border border-amber-300 bg-amber-50 p-4"
          aria-live="polite"
        >
          <p className="text-sm font-bold text-amber-900">
            Temporary password, shown once
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded bg-white px-3 py-2 text-sm font-semibold text-[var(--rams-charcoal)]">
              {showTemporaryPassword ? temporaryPassword : "••••••••"}
            </code>
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy password"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowTemporaryPassword((current) => !current)}
            >
              {showTemporaryPassword ? "Hide password" : "Show password"}
            </Button>
            <Button variant="secondary" onClick={() => setCleared(true)}>
              Clear password
            </Button>
          </div>
          <p className="text-xs leading-5 text-amber-900">
            Give this password to the account owner through a secure channel.
            It cannot be displayed again after you leave this page.
          </p>
        </div>
      ) : confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-[var(--rams-charcoal)]">
            Reset this password and sign out all sessions?
          </p>
          <Button
            variant="danger"
            disabled={resetting}
            onClick={() => void reset()}
          >
            {resetting ? "Resetting..." : "Confirm reset"}
          </Button>
          <Button
            variant="secondary"
            disabled={resetting}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Reset password
        </Button>
      )}
    </div>
  );
}
