"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, inputClass } from "@/components/ui";

type RejectAlumniModalProps = {
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export default function RejectAlumniModal({
  submitting,
  onCancel,
  onConfirm,
}: RejectAlumniModalProps) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [submitting, onCancel]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError("Rejection reason is required.");
      return;
    }

    setValidationError(null);
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-alumni-title"
        className="w-full max-w-md border border-black/8 bg-white p-6 shadow-2xl"
      >
        <h2
          id="reject-alumni-title"
          className="text-xl font-bold text-[var(--rams-charcoal)]"
        >
          Reject Alumni Profile
        </h2>

        <p className="mt-4 text-sm leading-6 text-[var(--rams-gray)]">
          Please provide a reason for rejecting this profile. This reason will
          be shown to the alumni.
        </p>

        <form onSubmit={submit} className="mt-5">
          <Field
            label="Reason"
            htmlFor="reject-reason"
            error={validationError ?? undefined}
          >
            <textarea
              id="reject-reason"
              rows={4}
              className={`${inputClass} min-h-28 resize-y`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (validationError) setValidationError(null);
              }}
            />
          </Field>

          <div className="mt-7 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </Button>

            <Button type="submit" variant="danger" disabled={submitting}>
              {submitting ? "Rejecting…" : "Reject profile"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
