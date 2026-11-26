"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { useToast } from "@/components/providers/toast-providers";
import { getUserFacingError } from "@/lib/api/errors";
import { createInternalAccount } from "@/lib/api/modules";
import { dosenCopy } from "@/lib/dosen-copy";

type CreatedAccount = {
  email: string;
  role: "ADMIN" | "DOSEN";
  temporaryPassword: string;
};

export default function AddInternalAccount() {
  const { error: notifyError } = useToast();
  const copy = dosenCopy();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "DOSEN" as "ADMIN" | "DOSEN",
  });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, saving]);

  function close() {
    if (saving) return;
    setOpen(false);
    setCreated(null);
    setCopied(false);
    setShowPassword(true);
    setForm({ fullName: "", email: "", role: "DOSEN" });
  }

  async function copyPassword() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError("Could not copy the password. Select it manually.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await createInternalAccount({
        fullName: form.fullName,
        email: form.email,
        role: form.role,
      });
      setCreated({
        email: result.email,
        role: result.role,
        temporaryPassword: result.temporaryPassword,
      });
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {copy.addInternalAccount}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-internal-account-title"
            className="w-full max-w-md border border-black/8 bg-white p-6 shadow-2xl"
          >
            <h2
              id="add-internal-account-title"
              className="text-xl font-bold text-[var(--rams-charcoal)]"
            >
              {created
                ? copy.internalAccountCreatedTitle
                : copy.internalAccountTitle}
            </h2>

            {created ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-[var(--rams-gray)]">
                  {copy.internalAccountCreatedHint}
                </p>
                <dl className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
                      Email
                    </dt>
                    <dd className="mt-1 break-all text-sm text-amber-900">
                      {created.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
                      {copy.internalAccountRole}
                    </dt>
                    <dd className="mt-1 text-sm text-amber-900">
                      {created.role === "ADMIN"
                        ? copy.internalAccountRoleAdmin
                        : copy.internalAccountRoleDosen}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
                      Temporary password
                    </dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2">
                      <code className="rounded bg-white px-3 py-2 text-sm font-semibold text-[var(--rams-charcoal)]">
                        {showPassword ? created.temporaryPassword : "••••••••"}
                      </code>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void copyPassword()}
                      >
                        {copied ? copy.copied : copy.copyPassword}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? copy.hidePassword : copy.showPassword}
                      </Button>
                    </dd>
                  </div>
                </dl>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={close}>
                    {copy.internalAccountClose}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-[var(--rams-gray)]">
                  {copy.internalAccountDescription}
                </p>
                <Field
                  label={copy.internalAccountName}
                  htmlFor="internal-account-name"
                >
                  <input
                    id="internal-account-name"
                    required
                    minLength={2}
                    className={inputClass}
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        fullName: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field
                  label={copy.internalAccountEmail}
                  htmlFor="internal-account-email"
                >
                  <input
                    id="internal-account-email"
                    required
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field
                  label={copy.internalAccountRole}
                  htmlFor="internal-account-role"
                >
                  <select
                    id="internal-account-role"
                    className={inputClass}
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value as "ADMIN" | "DOSEN",
                      }))
                    }
                  >
                    <option value="DOSEN">
                      {copy.internalAccountRoleDosen}
                    </option>
                    <option value="ADMIN">
                      {copy.internalAccountRoleAdmin}
                    </option>
                  </select>
                </Field>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={close}
                  >
                    {copy.internalAccountCancel}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? copy.internalAccountCreating
                      : copy.internalAccountSubmit}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
