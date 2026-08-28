"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function DeleteConfirmationModal({
  personType,
  personName,
  deleting,
  onCancel,
  onConfirm,
}: {
  personType: string;
  personName: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deleting, onCancel]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="delete-confirmation-title" className="w-full max-w-md border border-black/8 bg-white p-6 shadow-2xl">
      <h2 id="delete-confirmation-title" className="text-xl font-bold text-[var(--rams-charcoal)]">Delete {personType}?</h2>
      <p className="mt-4 text-sm leading-6 text-[var(--rams-gray)]">Are you sure you want to delete <span className="font-semibold text-[var(--rams-charcoal)]">“{personName}”</span>? This action cannot be undone.</p>
      <div className="mt-7 flex justify-end gap-3">
        <Button variant="secondary" disabled={deleting} onClick={onCancel}>Cancel</Button>
        <Button variant="danger" disabled={deleting} onClick={onConfirm}>{deleting ? "Deleting…" : "Delete"}</Button>
      </div>
    </section>
  </div>;
}
