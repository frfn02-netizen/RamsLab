"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import { assetPath } from "@/lib/asset-path";
import {
  isMeetingsNavItemActive,
  meetingsNavItems,
  meetingsPageTitle,
} from "./workspace-nav";

const NAV_ICONS: Record<string, string> = {
  "/meetings": "M3 3h5.5v5.5H3zM11.5 3H17v5.5h-5.5zM3 11.5h5.5V17H3zM11.5 11.5H17V17h-5.5z",
  "/meetings/calendar":
    "M4 4.5h12a1 1 0 011 1V16a1 1 0 01-1 1H4a1 1 0 01-1-1V5.5a1 1 0 011-1zM6 2.5v3M14 2.5v3M3 8.5h14M7 12h.01M10 12h.01M13 12h.01",
  "/meetings/mine":
    "M7.5 9.5a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5zM2.5 17c0-2.4 2.24-4.25 5-4.25s5 1.85 5 4.25M13.5 5.5h4M13.5 9h4M13.5 12.5h2.5",
};

function NavIcon({ href }: { href: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
      aria-hidden="true"
    >
      <path d={NAV_ICONS[href] ?? NAV_ICONS["/meetings"]} />
    </svg>
  );
}

function WorkspaceIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative h-10 w-12 shrink-0 rounded-sm bg-white p-1">
        <Image
          src={assetPath("/assets/RamsLogoFIX.png")}
          alt="RAMS Laboratory"
          fill
          sizes="48px"
          className="object-contain p-1"
        />
      </span>
      <div className="min-w-0 border-l-2 border-[var(--rams-red)] pl-3">
        <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--rams-red-light)]">
          RAMS
        </p>
        <p className="truncate text-sm font-bold text-white">Meetings</p>
        {!compact && (
          <p className="truncate text-[0.7rem] text-white/45">
            Research workspace
          </p>
        )}
      </div>
    </div>
  );
}

function WorkspaceNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {meetingsNavItems.map((item) => {
        const active = isMeetingsNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-150 ${
              active
                ? "bg-white/10 text-white"
                : "text-white/55 hover:bg-white/5 hover:text-white/85"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-150 ${
                active
                  ? "text-[var(--rams-red-light)]"
                  : "text-white/35 group-hover:text-white/55"
              }`}
            >
              <NavIcon href={item.href} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {item.label}
              </span>
              <span className="mt-0.5 block truncate text-[0.7rem] text-white/40">
                {item.description}
              </span>
            </span>
            {active && (
              <span
                className="ml-auto mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rams-red)]"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}

function BackToDashboardLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M11.5 5l-5 5 5 5M16 5v10" />
      </svg>
      Back to RAMS Dashboard
    </Link>
  );
}

function WorkspaceNavigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav
      aria-label="Meetings workspace navigation"
      className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
    >
      <WorkspaceNavLinks onNavigate={onNavigate} />
      <div className="mt-6 border-t border-white/10 pt-4">
        <BackToDashboardLink onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

export default function MeetingsWorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = meetingsPageTitle(pathname);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--rams-gray-light)] text-[var(--rams-charcoal)]">
      <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[var(--rams-charcoal)] text-white lg:flex">
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <WorkspaceIdentity />
        </div>
        <WorkspaceNavigation />
        <footer className="shrink-0 border-t border-white/10 px-5 py-4">
          <p className="text-[0.7rem] text-white/40">
            Signed in as{" "}
            <span className="font-semibold text-white/65">
              {user?.role ?? "User"}
            </span>
          </p>
        </footer>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[#D9E2EA] bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open meetings navigation"
              aria-expanded={mobileOpen}
              aria-controls="meetings-workspace-mobile-navigation"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#C6D4DF] text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] lg:hidden"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--rams-red)]">
                RAMS Meetings
              </p>
              <p
                className="truncate text-sm font-semibold text-[var(--rams-charcoal)]"
                aria-live="polite"
              >
                {title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-48 truncate text-sm font-semibold text-[var(--rams-charcoal)]">
                {user?.email ?? "Authenticated user"}
              </p>
              <span className="mt-1 inline-flex rounded-full bg-[#FCEAEC] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--rams-red-dark)]">
                {user?.role ?? "User"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden min-h-10 items-center rounded-md border border-[#C6D4DF] px-3 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] sm:inline-flex"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close meetings navigation"
            onClick={closeMobile}
            className="absolute inset-0 bg-[var(--rams-charcoal)]/60"
          />
          <div
            id="meetings-workspace-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Meetings workspace navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-[var(--rams-charcoal)] text-white shadow-[0_20px_60px_rgba(16,38,61,0.45)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-5">
              <WorkspaceIdentity compact />
              <button
                type="button"
                aria-label="Close meetings navigation"
                onClick={closeMobile}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <WorkspaceNavigation onNavigate={closeMobile} />

            <div className="shrink-0 border-t border-white/10 px-5 py-4">
              <p className="truncate text-xs text-white/55">
                {user?.email ?? "Authenticated user"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-white/70">
                  {user?.role ?? "User"}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-xs font-semibold text-white/55 transition hover:text-white"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
