"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";

const navigation = [
  ["Dashboard", "/dashboard"],
  ["Homepage", "/dashboard/content/homepage"],
  ["Publications", "/dashboard/content/publications"],
  ["Contact", "/dashboard/content/contact"],
  ["Footer", "/dashboard/content/footer"],
  ["Research Areas", "/dashboard/research"],
  ["Projects", "/dashboard/projects"],
  ["Dosen", "/dashboard/dosen"],
  ["Students", "/dashboard/students"],
  ["Alumni", "/dashboard/alumni"],
  ["Partners", "/dashboard/partners"],
  ["Tracking", "/dashboard/tracking"],
] as const;

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative flex min-h-16 shrink-0 items-center justify-between border-b border-[#D9E2EA] bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--rams-charcoal)]">
            Management console
          </p>
          <p className="hidden truncate text-xs text-[var(--rams-gray)] sm:block">
            Research and academic Management
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
          aria-expanded={open}
          aria-controls="mobile-dashboard-navigation"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-[#C6D4DF] px-3 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] lg:hidden"
        >
          Menu
        </button>
        <button
          type="button"
          aria-label="Logout"
          onClick={() => void logout()}
          className="group relative hidden h-[45px] w-[45px] shrink-0 items-center justify-start overflow-hidden rounded-full border-0 bg-[rgb(255,65,65)] p-0 text-white shadow-[2px_2px_10px_rgba(0,0,0,0.199)] transition-[width,border-radius,transform] duration-300 hover:w-[125px] hover:rounded-[40px] active:translate-x-[2px] active:translate-y-[2px] sm:flex"
        >
          <span className="flex h-full w-full shrink-0 items-center justify-center transition-[width,padding] duration-300 group-hover:w-[30%] group-hover:pl-5">
            <svg
              className="w-[17px] shrink-0 fill-white"
              viewBox="0 0 512 512"
              aria-hidden="true"
            >
              <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
            </svg>
          </span>
          <span className="absolute right-0 w-0 overflow-hidden whitespace-nowrap text-center text-[1.2em] font-semibold opacity-0 transition-[width,opacity,padding] duration-300 group-hover:w-[70%] group-hover:pr-[10px] group-hover:opacity-100">
            Logout
          </span>
        </button>
      </div>

      {open && (
        <nav
          id="mobile-dashboard-navigation"
          className="absolute right-4 top-14 z-20 w-56 border border-[#D9E2EA] bg-white p-2 shadow-[0_12px_30px_rgba(16,38,61,0.12)] lg:hidden"
          aria-label="Dashboard navigation"
        >
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:bg-[var(--rams-gray-light)] hover:text-[var(--rams-red)]"
            >
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-1 w-full border-t border-[#D9E2EA] px-3 py-2.5 text-left text-sm font-semibold text-[var(--rams-red)]"
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
