"use client";

import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { assetPath } from "@/lib/asset-path";
import LanguageSwitcher from "./language-switcher";
import { useHeroContext } from "./hero-context";

const links = [
  ["people", "/team"],
  ["research", "/research"],
  ["publications", "/publications"],
  ["events", "/events"],
  ["publicService", "/public-service"],
  ["partners", "/partners"],
] as const;
const contactLink = ["contactUs", "/contact"] as const;

function isActive(pathname: string, href: string) {
  if (href === "/publications") return pathname.startsWith("/publications");
  if (href === "/partners") return pathname.startsWith("/partners");
  if (href === "/events") return pathname.startsWith("/events");
  if (href === "/public-service") return pathname.startsWith("/public-service");
  return pathname === href;
}

export default function PublicHeader() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const a11y = useTranslations("a11y");
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { isAtTop } = useHeroContext();

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-white/45 bg-white/85 text-[var(--charcoal)] shadow-[0_1px_8px_rgba(11,32,56,0.05)] backdrop-blur-md transition-[background-color,color,box-shadow,border-color] duration-300 lg:border-b-2 lg:backdrop-blur-none ${
        isAtTop
          ? "lg:border-transparent lg:bg-transparent lg:text-white lg:shadow-none"
          : "lg:border-[var(--ais-blue)] lg:bg-white lg:text-[var(--charcoal)] lg:shadow-[0_4px_18px_rgba(11,32,56,0.08)]"
      }`}
    >
      <div className="mx-auto hidden min-h-[4.5rem] max-w-[1380px] items-center justify-between gap-5 px-4 sm:px-6 lg:flex lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label={a11y("home")}
        >
          <div className="relative h-14 w-[86px] shrink-0">
            <Image
              src={assetPath("/assets/ITSLogoFIX.png")}
              alt=""
              fill
              sizes="86px"
              className="object-contain"
              priority
            />
          </div>
          <span
            data-testid="desktop-logo-separator"
            aria-hidden="true"
            className={`h-12 w-px shrink-0 ${
              isAtTop ? "bg-white/35" : "bg-[var(--border)]"
            }`}
          />
          <div className="relative h-[80px] w-[80px] shrink-0 sm:h-[94px] sm:w-[94px]">
            <Image
              src={assetPath("/assets/RamsLogoFIX.png")}
              alt=""
              fill
              sizes="94px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span
              className={`font-display text-[1.35rem] font-bold sm:text-2xl lg:text-[1.65rem] transition-[color] duration-300 ${isAtTop ? "text-white" : "text-[var(--navy)]"}`}
            >
              {brand("laboratory")}
            </span>
            <span
              className={`text-[0.78rem] sm:text-sm transition-[color] duration-300 ${isAtTop ? "text-white/70" : "text-[var(--gray)]"}`}
            >
              {brand("technicalLine")}
            </span>
          </div>
        </Link>

        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label={a11y("primaryNav")}
        >
          {links.map(([key, href]) => (
            <Link
              key={key}
              href={href}
              className={`text-[0.95rem] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${isActive(pathname, href) ? "text-[var(--rams-red)]" : isAtTop ? "text-white hover:text-white/80" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href={contactLink[1]}
            aria-label={a11y("contactUs")}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${isActive(pathname, contactLink[1]) ? "text-[var(--maroon)]" : isAtTop ? "text-white hover:text-[var(--maroon)]" : "text-[var(--maroon)] hover:text-[var(--maroon)]"}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </Link>
          <div
            className={`flex items-center gap-1 pl-5 transition-[border-color] duration-300 ${isAtTop ? "border-l border-white/20" : "border-l border-[var(--border)]"}`}
          >
            <Suspense>
              <LanguageSwitcher dark={isAtTop} />
            </Suspense>
          </div>
        </nav>
      </div>

      <div
        data-testid="mobile-header"
        className="flex h-16 items-center justify-between gap-3 px-4 lg:hidden"
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label={a11y("home")}
        >
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src={assetPath("/assets/RamsLogoFIX.png")}
              alt=""
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <span className="truncate font-display text-base font-bold tracking-[-0.01em] text-[var(--navy)]">
            {brand("laboratory")}
          </span>
        </Link>
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/70 bg-white/60 text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)]"
          aria-expanded={open}
          aria-controls="mobile-public-navigation"
          aria-label={a11y("openMenu")}
          onClick={() => setOpen(true)}
        >
          <span
            className="flex h-5 w-5 flex-col justify-center gap-1.5"
            aria-hidden="true"
          >
            <span className="h-px w-5 bg-current" />
            <span className="h-px w-5 bg-current" />
            <span className="h-px w-5 bg-current" />
          </span>
        </button>
      </div>

      <nav
        id="mobile-public-navigation"
        data-testid="mobile-public-navigation"
        className={`fixed inset-x-0 top-0 flex h-dvh flex-col bg-white px-5 text-[var(--charcoal)] transition-[transform,visibility] duration-200 ease-out lg:hidden ${open ? "visible translate-x-0" : "invisible pointer-events-none translate-x-full"}`}
        aria-label={a11y("mobileNav")}
        aria-hidden={!open}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)]">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center gap-2.5"
            aria-label={a11y("home")}
          >
            <div className="relative h-10 w-10 shrink-0">
              <Image
                src={assetPath("/assets/RamsLogoFIX.png")}
                alt=""
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <span className="truncate font-display text-base font-bold tracking-[-0.01em] text-[var(--navy)]">
              {brand("laboratory")}
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--charcoal)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)]"
            aria-label={a11y("closeMenu")}
            onClick={() => setOpen(false)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <div className="grid">
            {links.map(([key, href]) => (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={`border-b border-[var(--border)] py-4 text-base font-semibold transition-colors hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rams-red)] ${isActive(pathname, href) ? "text-[var(--rams-red)]" : "text-[var(--charcoal)]"}`}
              >
                {t(key)}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 border-t border-[var(--border)] pt-5">
            <span aria-hidden="true" className="text-base leading-none">
              🌐
            </span>
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </div>

        <p className="shrink-0 border-t border-[var(--border)] py-5 text-xs font-medium leading-5 text-[var(--rams-gray)]">
          {brand("technicalLine")}
        </p>
      </nav>
    </header>
  );
}
