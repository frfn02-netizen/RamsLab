"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import { assetPath } from "@/lib/asset-path";
import {
  isMeetingsNavItemActive,
  visibleMeetingsNavItems,
} from "./workspace-nav";

const NAV_ICONS: Record<string, string> = {
  "/meetings":
    "M3 3h5.5v5.5H3zM11.5 3H17v5.5h-5.5zM3 11.5h5.5V17H3zM11.5 11.5H17V17h-5.5z",
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

function initialsOf(value: string | undefined) {
  const source = (value ?? "").trim();
  if (!source) return "RM";
  const local = source.split("@")[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = (
    parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  ).toUpperCase();
  return letters || "RM";
}

function WorkspaceIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`relative shrink-0 overflow-hidden rounded-md border border-[#E7E2D8] bg-white ${
          compact ? "h-8 w-8" : "h-9 w-9"
        }`}
      >
        <Image
          src={assetPath("/assets/RamsLogoFIX.png")}
          alt="RAMS Laboratory"
          fill
          sizes={compact ? "32px" : "36px"}
          className="object-contain p-1"
        />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
          RAMS
        </p>
        <p className="truncate text-[0.92rem] font-semibold leading-tight text-[var(--rams-charcoal)]">
          Meetings
        </p>
      </div>
    </div>
  );
}

function WorkspaceNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = visibleMeetingsNavItems(user?.role);

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active = isMeetingsNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150 ${
              active
                ? "bg-[#FBE6E3] font-semibold text-[var(--rams-charcoal)]"
                : "text-[#6B6A64] hover:bg-[#F7F1EC] hover:text-[var(--rams-charcoal)]"
            }`}
          >
            {active && (
              <span
                className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--rams-red)]"
                aria-hidden="true"
              />
            )}
            <span
              className={active ? "text-[var(--rams-red)]" : "text-[#A8A399]"}
            >
              <NavIcon href={item.href} />
            </span>
            <span className="truncate text-[0.82rem]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function WorkspaceNavigation({
  onNavigate,
  showDashboardLink,
}: {
  onNavigate?: () => void;
  showDashboardLink: boolean;
}) {
  return (
    <nav
      aria-label="Meetings workspace navigation"
      className="hide-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4"
    >
      <p className="mb-2 px-3 text-[0.56rem] font-bold uppercase tracking-[0.18em] text-[#A8A399]">
        Workspace
      </p>
      <WorkspaceNavLinks onNavigate={onNavigate} />
      {showDashboardLink && (
        <div className="mt-4 border-t border-[#EDE8DE] pt-3">
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-[0.72rem] font-medium text-[#8A867D] transition-colors hover:bg-[#F5F2EC] hover:text-[var(--rams-charcoal)]"
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
        </div>
      )}
    </nav>
  );
}

export default function MeetingsWorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeMobile = () => setMobileOpen(false);
  const showDashboardLink = user?.role === "ADMIN";

  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="dashboard-shell flex h-[100dvh] overflow-hidden bg-[#F7F5F1] text-[var(--rams-charcoal)]">
      <aside className="hidden h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden border-r border-[#E7E2D8] bg-[#FBFAF7] lg:flex">
        <div className="shrink-0 px-4 pb-4 pt-5">
          <Link
            href="/meetings"
            aria-label="Meetings workspace home"
            className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
          >
            <WorkspaceIdentity />
          </Link>
        </div>

        <WorkspaceNavigation showDashboardLink={showDashboardLink} />

        <footer className="shrink-0 border-t border-[#E7E2D8] px-3 py-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1EDE5] text-[0.56rem] font-bold uppercase tracking-wide text-[#6B6A64]">
              {initialsOf(user?.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.68rem] font-medium text-[var(--rams-charcoal)]">
                {user?.email ?? "Authenticated user"}
              </p>
              <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#A8A399]">
                {user?.role ?? "User"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void logout()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#A8A399] transition hover:bg-[#F1EDE5] hover:text-[var(--rams-charcoal)]"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12 4.5H5.5a1 1 0 00-1 1v9a1 1 0 001 1H12M13.5 13l3-3-3-3M16.5 10h-7" />
              </svg>
            </button>
          </div>
        </footer>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[#E7E2D8] bg-white px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open meetings navigation"
              aria-expanded={mobileOpen}
              aria-controls="meetings-workspace-mobile-navigation"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E7E2D8] text-[#6B6A64] transition hover:text-[var(--rams-charcoal)] lg:hidden"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              >
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              </svg>
            </button>
            <p className="hidden text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#A8A399] sm:block">
              RAMS Meetings
            </p>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-48 truncate text-[0.72rem] font-medium text-[var(--rams-charcoal)]">
                {user?.email ?? "Authenticated user"}
              </p>
              <p className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#A8A399]">
                {user?.role ?? "User"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="hidden h-8 items-center rounded-md border border-[#E7E2D8] px-2.5 text-[0.7rem] font-semibold text-[#6B6A64] transition hover:border-[#D8D0C2] hover:text-[var(--rams-charcoal)] sm:inline-flex"
            >
              Sign out
            </button>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1EDE5] text-[0.56rem] font-bold uppercase tracking-wide text-[#6B6A64] sm:hidden"
              aria-hidden="true"
            >
              {initialsOf(user?.email)}
            </span>
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
            className="absolute inset-0 bg-[#2B2723]/50"
          />
          <div
            id="meetings-workspace-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Meetings workspace navigation"
            className="absolute inset-y-0 left-0 flex w-[272px] max-w-[86vw] flex-col overflow-hidden overscroll-contain border-r border-[#E7E2D8] bg-[#FBFAF7] text-[var(--rams-charcoal)] shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4">
              <Link
                href="/meetings"
                aria-label="Meetings workspace home"
                onClick={closeMobile}
                className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rams-red)]"
              >
                <WorkspaceIdentity compact />
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close meetings navigation"
                onClick={closeMobile}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E7E2D8] text-[#8A867D] transition hover:text-[var(--rams-charcoal)]"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <WorkspaceNavigation
              onNavigate={closeMobile}
              showDashboardLink={showDashboardLink}
            />

            <div className="shrink-0 border-t border-[#E7E2D8] px-4 py-3">
              <p className="truncate text-[0.7rem] font-medium text-[var(--rams-charcoal)]">
                {user?.email ?? "Authenticated user"}
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-[0.56rem] font-bold uppercase tracking-[0.14em] text-[#A8A399]">
                  {user?.role ?? "User"}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="text-[0.68rem] font-semibold text-[#8A867D] transition hover:text-[var(--rams-charcoal)]"
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
