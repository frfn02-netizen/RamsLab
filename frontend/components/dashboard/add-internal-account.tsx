"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field } from "@/components/ui";
import CustomSelect from "@/components/ui/custom-select";
import { useToast } from "@/components/providers/toast-providers";
import { getUserFacingError } from "@/lib/api/errors";
import { createInternalAccount } from "@/lib/api/modules";
import { dosenCopy } from "@/lib/dosen-copy";

type CreatedAccount = {
  email: string;
  role: "ADMIN" | "DOSEN";
  temporaryPassword: string;
};

const fieldClass =
  "min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2.5 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-red-700 focus:bg-white focus:ring-2 focus:ring-red-700/15";

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
      // A nested dropdown handles Escape first and prevents the default. Do not
      // close the whole dialog on that same key press.
      if (event.defaultPrevented) return;
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/45 p-4 backdrop-blur-[2px]"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-internal-account-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 pb-4 pt-6">
              <div className="min-w-0">
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-red-700">
                  {copy.internalAccountEyebrow}
                </p>
                <h2
                  id="add-internal-account-title"
                  className="mt-2 font-display text-xl font-semibold tracking-tight text-stone-950"
                >
                  {created
                    ? copy.internalAccountCreatedTitle
                    : copy.internalAccountTitle}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-stone-600">
                  {created
                    ? copy.internalAccountCreatedHint
                    : copy.internalAccountDescription}
                </p>
              </div>
              <button
                type="button"
                aria-label={copy.internalAccountCloseLabel}
                disabled={saving}
                onClick={close}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-stone-200 text-lg leading-none text-stone-500 transition hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </header>

            {created ? (
              <>
                <div className="px-6 py-5">
                  <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-5">
                    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      {copy.internalAccountReceiptEyebrow}
                    </p>

                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                          {copy.internalAccountEmailLabel}
                        </p>
                        <p className="mt-1 break-all text-sm font-medium text-stone-950">
                          {created.email}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-red-700">
                        {created.role}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        {copy.internalAccountPasswordLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm font-semibold tracking-[0.08em] text-stone-950">
                          {showPassword
                            ? created.temporaryPassword
                            : "••••••••"}
                        </code>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void copyPassword()}
                        >
                          {copied ? copy.copied : copy.copyPassword}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="mt-2 text-xs font-semibold text-stone-500 underline-offset-4 transition hover:text-stone-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700/30"
                      >
                        {showPassword ? copy.hidePassword : copy.showPassword}
                      </button>
                    </div>

                    <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-5 text-stone-500">
                      {copy.internalAccountReceiptReminder}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-stone-200 bg-stone-50 px-6 py-4">
                  <Button type="button" variant="secondary" onClick={close}>
                    {copy.internalAccountClose}
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={submit}>
                <div className="space-y-4 px-6 py-5">
                  <Field
                    label={copy.internalAccountName}
                    htmlFor="internal-account-name"
                  >
                    <input
                      id="internal-account-name"
                      required
                      minLength={2}
                      autoComplete="name"
                      className={fieldClass}
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
                      className={fieldClass}
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
                    <CustomSelect
                      id="internal-account-role"
                      value={form.role}
                      onChange={(next) =>
                        setForm((current) => ({
                          ...current,
                          role: next as "ADMIN" | "DOSEN",
                        }))
                      }
                      options={[
                        {
                          value: "DOSEN",
                          label: copy.internalAccountRoleDosen,
                          description: copy.internalAccountRoleDosenHint,
                        },
                        {
                          value: "ADMIN",
                          label: copy.internalAccountRoleAdmin,
                          description: copy.internalAccountRoleAdminHint,
                        },
                      ]}
                      ariaDescribedby="internal-account-role-help"
                      triggerClassName="min-h-11 rounded-xl border-stone-200 bg-stone-50/70 px-3.5 focus-visible:border-red-700 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-700/15"
                    />
                    <p
                      id="internal-account-role-help"
                      className="mt-1.5 text-xs leading-5 text-stone-500"
                    >
                      {form.role === "ADMIN"
                        ? copy.internalAccountRoleAdminHint
                        : copy.internalAccountRoleDosenHint}
                    </p>
                  </Field>

                  <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-600"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-950">
                        {copy.internalAccountNoticeTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-900/80">
                        {copy.internalAccountNoticeBody}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-stone-200 bg-stone-50 px-6 py-4">
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
