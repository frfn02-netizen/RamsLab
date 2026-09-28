"use client";

import { useEffect } from "react";

export default function SuccessToast({
  message,
  onClose,
  durationMs = 6500,
  variant = "success",
}: {
  message: string;
  onClose: () => void;
  durationMs?: number;
  variant?: "success" | "error";
}) {
  const isError = variant === "error";

  useEffect(() => {
    const timeout = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onClose]);

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex max-w-xs items-start gap-3 rounded-xl border-y border-r border-y-gray-200 border-r-gray-200 border-l-4 ${
        isError ? "border-l-red-500" : "border-l-lime-500"
      } bg-white p-4 shadow-lg dark:border-y-gray-700 dark:border-r-gray-700 dark:bg-gray-800`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <div
        className={`shrink-0 ${isError ? "text-red-500" : "text-lime-500"}`}
        aria-hidden="true"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isError ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
      </div>
      <div className="flex-1">
        <p
          className={`text-sm font-medium ${
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {isError ? "Error!" : "Success!"}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={`shrink-0 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 ${
          isError ? "focus:ring-red-500/50" : "focus:ring-lime-500/50"
        } dark:hover:text-gray-300`}
        aria-label={
          isError
            ? "Dismiss error notification"
            : "Dismiss success notification"
        }
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
