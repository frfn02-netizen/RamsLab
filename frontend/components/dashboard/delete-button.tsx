"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type DeleteButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  ariaLabel?: string;
  variant?: "danger";
};

export default function DeleteButton({
  children: _children,
  ariaLabel = "Delete",
  variant: _variant,
  className = "",
  type = "button",
  ...props
}: DeleteButtonProps) {
  return <button
    {...props}
    type={type}
    aria-label={ariaLabel}
    className={`group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border-2 border-red-800 bg-[var(--rams-red)] text-white transition-colors duration-300 hover:bg-[var(--rams-red-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    <svg width={16} height={16} viewBox="0 0 24 24" fill="white" stroke="none" strokeWidth={0} aria-hidden="true" className="group-active:scale-90">
      <g className="origin-[12px_6px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:-rotate-12">
        <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" />
      </g>
      <path d="M6 9h12l-.8 11.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8L6 9Z" />
      <g className="transition-transform duration-300 group-hover:translate-y-0.5">
        <rect x="9" y="11" width="2" height="8" />
        <rect x="13" y="11" width="2" height="8" />
      </g>
    </svg>
  </button>;
}
