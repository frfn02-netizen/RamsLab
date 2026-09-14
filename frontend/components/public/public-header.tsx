"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
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
  const { isAtTop } = useHeroContext();

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,color,box-shadow,border-color] duration-300 ${
        isAtTop
          ? "border-b-2 border-transparent bg-transparent text-white shadow-none"
          : "border-b-2 border-[var(--ais-blue)] bg-white text-[var(--charcoal)] shadow-[0_4px_18px_rgba(11,32,56,0.08)]"
      }`}
    >
      <div className="mx-auto flex min-h-[4.5rem] max-w-[1380px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label={a11y("home")}
        >
          {/* buat gedein logo rams yang di navbar */}
          <div className="relative h-[80px] w-[80px] shrink-0 sm:h-[94px] sm:w-[94px]">
            <Image
              src="/assets/rams-logo.png"
              alt=""
              fill
              sizes="94px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span
              className={`font-display text-[1.35rem] font-bold sm:text-2xl lg:text-[1.65rem] transition-[color] duration-300 ${
                isAtTop ? "text-white" : "text-[var(--navy)]"
              }`}
            >
              {brand("laboratory")}
            </span>
            <span
              className={`text-[0.78rem] sm:text-sm transition-[color] duration-300 ${
                isAtTop ? "text-white/70" : "text-[var(--gray)]"
              }`}
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
              className={`text-[0.95rem] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${
                isActive(pathname, href)
                  ? "text-[var(--rams-red)]"
                  : isAtTop
                    ? "text-white hover:text-white/80"
                    : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"
              }`}
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href={contactLink[1]}
            aria-label={a11y("contactUs")}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${
              isActive(pathname, contactLink[1])
                ? "text-[var(--maroon)]"
                : isAtTop
                  ? "text-white hover:text-[var(--maroon)]"
                  : "text-[var(--maroon)] hover:text-[var(--maroon)]"
            }`}
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
            className={`flex items-center gap-1 pl-5 transition-[border-color] duration-300 ${
              isAtTop
                ? "border-l border-white/20"
                : "border-l border-[var(--border)]"
            }`}
          >
            <LanguageSwitcher dark={isAtTop} />
          </div>
        </nav>

        <div className="flex items-center lg:hidden">
          <button
            type="button"
            className={`grid min-h-12 min-w-12 place-items-center rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)] ${
              isAtTop
                ? "border-white/30 text-white hover:border-white hover:text-white"
                : "border-[var(--border)] text-[var(--charcoal)] hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
            }`}
            aria-expanded={open}
            aria-controls="mobile-public-navigation"
            aria-label={open ? a11y("closeMenu") : a11y("openMenu")}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{a11y("menu")}</span>
            <span
              className="flex h-6 w-6 flex-col justify-center gap-1.5"
              aria-hidden="true"
            >
              <span
                className={`h-px w-6 transition-[background-color] duration-300 ${
                  isAtTop ? "bg-white" : "bg-[var(--charcoal)]"
                }`}
              />
              <span
                className={`h-px w-6 transition-[background-color] duration-300 ${
                  isAtTop ? "bg-white" : "bg-[var(--charcoal)]"
                }`}
              />
              <span
                className={`h-px w-6 transition-[background-color] duration-300 ${
                  isAtTop ? "bg-white" : "bg-[var(--charcoal)]"
                }`}
              />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-public-navigation"
          className={`absolute left-3 right-3 top-[calc(100%+0.75rem)] border p-5 shadow-[0_16px_35px_rgba(11,32,56,0.18)] sm:left-6 sm:right-6 lg:hidden ${
            isAtTop
              ? "border-white/20 bg-[var(--navy-deep)]"
              : "border-[var(--ais-blue)] bg-[var(--background-light)]"
          }`}
          aria-label={a11y("mobileNav")}
        >
          <div className="grid gap-3">
            {links.map(([key, href]) => (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className={`py-1 text-base font-semibold transition hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rams-red)] ${
                  isActive(pathname, href)
                    ? "text-[var(--rams-red)]"
                    : isAtTop
                      ? "text-white"
                      : "text-[var(--charcoal)]"
                }`}
              >
                {t(key)}
              </Link>
            ))}
            <Link
              href={contactLink[1]}
              onClick={() => setOpen(false)}
              aria-label={a11y("contactUs")}
              className={`mt-2 transition-colors hover:text-[var(--maroon)] ${
                isAtTop ? "text-white" : "text-[var(--maroon)]"
              }`}
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
          </div>
          <div
            className={`mt-4 pt-4 transition-[border-color] duration-300 ${
              isAtTop
                ? "border-t border-white/20"
                : "border-t border-[var(--border)]"
            }`}
          >
            <LanguageSwitcher dark={isAtTop} />
          </div>
        </nav>
      )}
    </header>
  );
}
