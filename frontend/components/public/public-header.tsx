"use client";

import Image from "next/image";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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

function MobileBrand({
  laboratory,
  darkHero = false,
}: {
  laboratory: string;
  darkHero?: boolean;
}) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative h-10 w-[62px] shrink-0">
          <Image
            src={assetPath("/assets/ITSLogoFIX.png")}
            alt=""
            fill
            sizes="62px"
            className="object-contain"
            priority
          />
        </div>
        <span
          data-testid="mobile-logo-separator"
          aria-hidden="true"
          className={`h-10 w-px shrink-0 ${
            darkHero
              ? "bg-white/70 shadow-[0_0_1px_rgba(255,255,255,0.35)]"
              : "bg-[var(--border)]"
          }`}
        />
        <div className="relative h-12 w-12 shrink-0">
          <Image
            src={assetPath("/assets/RamsLogoFIX.png")}
            alt=""
            fill
            sizes="48px"
            className="object-contain"
            priority
          />
        </div>
      </div>
      <span
        className={`truncate font-display text-sm font-bold tracking-[-0.01em] ${
          darkHero ? "text-white" : "text-[var(--navy)]"
        }`}
      >
        {laboratory}
      </span>
    </>
  );
}

export default function PublicHeader() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const a11y = useTranslations("a11y");
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const keepFocusInDrawer = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const { isAtTop, heroTone } = useHeroContext();
  const isDarkHero = isAtTop && heroTone === "dark";

  useEffect(() => {
    if (!open) return;

    // Focus immediately for the common case, then retry on the next frame
    // after the drawer's visibility class applies; focusing a still-hidden
    // element is ignored by some browsers.
    closeButtonRef.current?.focus();
    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    // The drawer fades/slides in; retry after the visibility transition so
    // browsers that ignore focus on hidden elements still land in the dialog.
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 220);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-[background-color,color,box-shadow,border-color,backdrop-filter] duration-300 ease-out ${
        isAtTop
          ? `border-transparent bg-transparent shadow-none ${
              isDarkHero ? "text-white" : "text-[var(--navy)]"
            }`
          : "border-[#E1E7EE] bg-white/95 text-[var(--charcoal)] shadow-[0_6px_24px_rgba(11,32,56,0.08)] backdrop-blur-[14px]"
      }`}
    >
      <div className="public-shell hidden h-[4.5rem] items-center justify-between gap-6 px-4 sm:px-6 lg:px-10 min-[1920px]:px-14 xl:flex">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label={a11y("home")}
        >
          <div className="relative h-16 w-[100px] shrink-0">
            <Image
              src={assetPath("/assets/ITSLogoFIX.png")}
              alt=""
              fill
              sizes="100px"
              className="object-contain"
              priority
            />
          </div>
          <span
            data-testid="desktop-logo-separator"
            aria-hidden="true"
            className={`h-14 w-px shrink-0 transition-colors duration-300 ${
              isDarkHero
                ? "bg-white/70 shadow-[0_0_1px_rgba(255,255,255,0.35)]"
                : "bg-[var(--border)]"
            }`}
          />
          <div className="relative h-16 w-16 shrink-0">
            <Image
              src={assetPath("/assets/RamsLogoFIX.png")}
              alt=""
              fill
              sizes="72px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center leading-none">
            <span
              className={`font-display text-[1.35rem] font-bold tracking-[-0.025em] transition-[color] duration-300 ${isDarkHero ? "text-white" : "text-[var(--navy)]"}`}
            >
              {brand("laboratory")}
            </span>
            <span
              className={`mt-1 hidden text-[0.7rem] font-medium tracking-[0.01em] transition-[color] duration-300 2xl:block ${isDarkHero ? "text-white/70" : "text-[var(--gray)]"}`}
            >
              {brand("technicalLine")}
            </span>
          </div>
        </Link>

        <nav
          className="hidden h-full items-center gap-5 xl:flex xl:gap-6"
          aria-label={a11y("primaryNav")}
        >
          {links.map(([key, href]) => (
            <Link
              key={key}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={`relative flex h-full items-center whitespace-nowrap text-[0.9rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[var(--rams-red)] after:absolute after:bottom-6 after:left-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:origin-center after:scale-x-0 after:bg-[var(--rams-red)] after:transition-transform after:duration-200 hover:after:scale-x-100 ${isActive(pathname, href) ? "text-[var(--rams-red)] after:scale-x-100" : isDarkHero ? "text-white hover:text-white/80" : isAtTop ? "text-[var(--navy)] hover:text-[var(--rams-red)]" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href={contactLink[1]}
            aria-label={a11y("contactUs")}
            aria-current={
              isActive(pathname, contactLink[1]) ? "page" : undefined
            }
            className={`relative flex h-full items-center whitespace-nowrap px-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[var(--rams-red)] after:absolute after:bottom-6 after:left-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:origin-center after:scale-x-0 after:bg-[var(--rams-red)] after:transition-transform after:duration-200 hover:after:scale-x-100 ${isActive(pathname, contactLink[1]) ? "text-[var(--maroon)] after:scale-x-100" : isDarkHero ? "text-white hover:text-white/80" : "text-[var(--maroon)] hover:text-[var(--maroon)]"}`}
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
            className={`flex items-center gap-1 pl-4 transition-[border-color] duration-300 ${
              isDarkHero
                ? "border-l border-white/20"
                : "border-l border-[var(--border)]"
            }`}
          >
            <Suspense>
              <LanguageSwitcher dark={isDarkHero} />
            </Suspense>
          </div>
        </nav>
      </div>

      <div
        data-testid="mobile-header"
        className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8 lg:px-10 xl:hidden"
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
          aria-label={a11y("home")}
        >
          <MobileBrand laboratory={brand("laboratory")} darkHero={isDarkHero} />
        </Link>
        <button
          type="button"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-md border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)] ${
            isDarkHero
              ? "border-white/60 bg-white/10 text-white hover:border-white hover:text-white"
              : "border-[var(--border)] bg-white/70 text-[var(--navy)] hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
          }`}
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
        ref={drawerRef}
        id="mobile-public-navigation"
        data-testid="mobile-public-navigation"
        className={`fixed inset-x-0 top-0 flex h-dvh flex-col bg-white px-5 text-[var(--charcoal)] transition-[transform,visibility] duration-200 ease-out xl:hidden ${open ? "visible translate-x-0" : "invisible pointer-events-none translate-x-full"}`}
        aria-label={a11y("mobileNav")}
        aria-hidden={!open}
        onKeyDown={keepFocusInDrawer}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)]">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center gap-2"
            aria-label={a11y("home")}
          >
            <MobileBrand laboratory={brand("laboratory")} />
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--charcoal)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)]"
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
