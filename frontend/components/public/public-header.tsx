"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "./language-switcher";

const links = [
  ["people", "/team"],
  ["research", "/research"],
  ["publications", "/publications"],
  ["events", "/events"],
  ["publicService", "/public-service"],
] as const;
const contactLink = ["contactUs", "/contact"] as const;

function isActive(pathname: string, href: string) {
  if (href === "/publications") return pathname.startsWith("/publications");
  if (href === "/projects") return pathname.startsWith("/projects");
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

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[var(--ais-blue)] bg-white text-[var(--charcoal)] shadow-[0_4px_18px_rgba(11,32,56,0.08)]">
      <div className="mx-auto flex min-h-20 max-w-[1380px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label={a11y("home")}
        >
          <div className="relative h-12 w-[104px] shrink-0 sm:h-16 sm:w-[128px]">
            <Image
              src="/assets/rams-logo.png"
              alt=""
              fill
              sizes="80px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold text-[var(--navy)] sm:text-2xl">
              {brand("laboratory")}
            </span>
            <span className="text-[0.72rem] text-[var(--gray)] sm:text-xs">
              {brand("technicalLine")}
            </span>
          </div>
        </Link>

        <nav
          className="hidden items-center gap-6 lg:flex"
          aria-label={a11y("primaryNav")}
        >
          {links.map(([key, href]) => (
            <Link
              key={key}
              href={href}
              className={`text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${isActive(pathname, href) ? "text-[var(--rams-red)]" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href={contactLink[1]}
            className={`inline-flex min-h-11 items-center border border-[var(--rams-red)] px-4 text-base font-semibold text-[var(--rams-red)] transition hover:bg-[var(--rams-red)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)] ${isActive(pathname, contactLink[1]) ? "bg-[var(--rams-red)] text-white" : ""}`}
          >
            {t(contactLink[0])}
          </Link>
          <div className="flex items-center gap-1 border-l border-[var(--border)] pl-4">
            <LanguageSwitcher />
          </div>
        </nav>

        <div className="flex items-center lg:hidden">
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[var(--border)] text-[var(--charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rams-red)]"
            aria-expanded={open}
            aria-controls="mobile-public-navigation"
            aria-label={open ? a11y("closeMenu") : a11y("openMenu")}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{a11y("menu")}</span>
            <span
              className="flex h-5 w-5 flex-col justify-center gap-1"
              aria-hidden="true"
            >
              <span className="h-px w-5 bg-[var(--charcoal)]" />
              <span className="h-px w-5 bg-[var(--charcoal)]" />
              <span className="h-px w-5 bg-[var(--charcoal)]" />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-public-navigation"
          className="absolute left-3 right-3 top-[calc(100%+0.75rem)] border border-[var(--ais-blue)] bg-[var(--background-light)] p-5 shadow-[0_16px_35px_rgba(11,32,56,0.18)] sm:left-6 sm:right-6 lg:hidden"
          aria-label={a11y("mobileNav")}
        >
          <div className="grid gap-3">
            {links.map(([key, href]) => (
              <Link
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className={`py-1 text-base font-semibold transition hover:text-[var(--rams-red)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rams-red)] ${isActive(pathname, href) ? "text-[var(--rams-red)]" : "text-[var(--charcoal)]"}`}
              >
                {t(key)}
              </Link>
            ))}
            <Link
              href={contactLink[1]}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex min-h-11 w-fit items-center border border-[var(--rams-red)] px-4 text-base font-semibold text-[var(--rams-red)] transition hover:bg-[var(--rams-red)] hover:text-white"
            >
              {t(contactLink[0])}
            </Link>
          </div>
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}
