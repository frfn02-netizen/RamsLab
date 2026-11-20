"use client";

import type { SVGProps } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastProps {
  variant: ToastVariant;
  title: string;
  description?: string;
  closing?: boolean;
  onClose: () => void;
}

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  error:
    "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  warning:
    "M12 9v3.75m9 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
  info: "M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
};

const TOAST_STYLES: Record<
  ToastVariant,
  { accent: string; iconBg: string; iconColor: string }
> = {
  success: {
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  error: {
    accent: "border-l-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  warning: {
    accent: "border-l-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  info: {
    accent: "border-l-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
};

function ToastIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
      {...props}
    />
  );
}

export function Toast({
  variant,
  title,
  description,
  closing = false,
  onClose,
}: ToastProps) {
  const config = TOAST_STYLES[variant];

  return (
    <li
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`pointer-events-auto box-border flex w-full min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-lg shadow-neutral-950/10 ${config.accent} ${
        closing
          ? "animate-[toast-out_250ms_ease-in_forwards]"
          : "animate-[toast-in_300ms_ease-out]"
      }`}
      style={{ backgroundColor: "#ffffff", boxSizing: "border-box" }}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${config.iconBg} ${config.iconColor}`}
      >
        <ToastIcon className="size-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={TOAST_ICONS[variant]}
          />
        </ToastIcon>
      </span>
      <div className="min-w-0 flex-1 break-words">
        <p className="break-words text-sm font-semibold text-neutral-900">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 break-words text-sm leading-5 text-neutral-600">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={`Dismiss ${variant} notification`}
        className="shrink-0 self-start rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
      >
        <ToastIcon className="size-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </ToastIcon>
      </button>
    </li>
  );
}
