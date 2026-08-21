"use client";

import { useEffect } from "react";

export default function SuccessToast({
  message,
  onClose,
  durationMs = 4500,
}: {
  message: string;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onClose]);

  return (
    <div
      className="fixed right-4 top-4 z-50 flex max-w-xs items-start gap-3 rounded-xl border-y border-r border-y-gray-200 border-r-gray-200 border-l-4 border-l-lime-500 bg-white p-4 shadow-lg dark:border-y-gray-700 dark:border-r-gray-700 dark:bg-gray-800"
      role="status"
      aria-live="polite"
    >
      <div className="shrink-0 text-lime-500" aria-hidden="true">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Success!</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50 dark:hover:text-gray-300"
        aria-label="Dismiss success notification"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
