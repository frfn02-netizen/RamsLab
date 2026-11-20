"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { visibleDashboardNavigationItems } from "./dashboard-navigation";

export default function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigation = visibleDashboardNavigationItems(user?.role);
  const currentPage =
    navigation.find(
      ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
    )?.label ?? "Dashboard";
  const profileInitial = user?.email?.charAt(0).toUpperCase() ?? "R";

  return (
    <header className="relative flex min-h-[4.5rem] shrink-0 items-center justify-between border-b border-[#dedbd5] bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <span
          className="h-9 w-1 shrink-0 bg-[var(--rams-red)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--rams-gray)]">
            RAMS management console
          </p>
          <p className="mt-0.5 truncate font-display text-lg font-semibold tracking-[-0.02em] text-[var(--rams-charcoal)]">
            {currentPage}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="max-w-52 truncate text-sm font-semibold text-[var(--rams-charcoal)]">
            {user?.email ?? "Authenticated user"}
          </p>
          <span className="mt-1 inline-flex text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]">
            {user?.role ?? "User"}
          </span>
        </div>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--rams-charcoal)] text-sm font-bold text-white sm:hidden"
          aria-hidden="true"
        >
          {profileInitial}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-dashboard-navigation"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-11 items-center rounded-md border border-[#d7d0c8] px-3 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2 lg:hidden"
        >
          Menu
        </button>
        <button
          type="button"
          aria-label="Log out"
          onClick={() => void logout()}
          className="hidden min-h-11 shrink-0 items-center gap-2 rounded-md border border-[#d7d0c8] bg-white px-3 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)] focus-visible:ring-offset-2 sm:inline-flex"
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 3H4.5A1.5 1.5 0 003 4.5v11A1.5 1.5 0 004.5 17H8M12.5 6.5L16 10l-3.5 3.5M16 10H8" />
          </svg>
          Log out
        </button>
      </div>

      {open && (
        <nav
          id="mobile-dashboard-navigation"
          className="absolute right-4 top-[4.25rem] z-20 w-[min(18rem,calc(100vw-2rem))] border border-[#dedbd5] bg-white p-2 shadow-[0_14px_34px_rgba(37,39,44,0.14)] lg:hidden"
          aria-label="Dashboard navigation"
        >
          {navigation.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center px-3 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:bg-[var(--rams-gray-light)] hover:text-[var(--rams-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)]"
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-1 min-h-11 w-full border-t border-[#dedbd5] px-3 text-left text-sm font-semibold text-[var(--rams-red)] transition hover:bg-[#fff6f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rams-red)]"
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}
