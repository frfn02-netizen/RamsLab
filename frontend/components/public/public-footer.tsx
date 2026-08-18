"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicSiteContent } from "@/lib/api/modules";
import type { FooterContent } from "@/types/site-content";
import LanguageSwitcher from "./language-switcher";
import PublicContainer from "./public-container";

const navigation = ["about", "research", "projects", "partners", "team", "contact"] as const;
const hrefs = { about: "/about", research: "/research", projects: "/projects", partners: "/partners", team: "/team", contact: "/contact" } as const;

export default function PublicFooter() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const brand = useTranslations("brand");
  const language = useTranslations("language");
  const common = useTranslations("common");
  const [content, setContent] = useState<FooterContent | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { getPublicSiteContent("footer").then(setContent).catch(() => setError(true)); }, []);
  const localized = (value: { en: string; id: string }) => value[locale];

  return <footer className="bg-[var(--navy)] text-white">
    <PublicContainer className="py-14 sm:py-16">
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1.15fr]">
        <div>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-24 shrink-0">
              <Image src="/assets/rams-logo.png" alt={brand("laboratory")} fill sizes="96px" className="object-contain" priority />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white">{brand("laboratory")}</p>
              <p className="mt-2 text-xs leading-5 text-white/65">{brand("technicalLine")}</p>
            </div>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-7 text-white/70">{content ? localized(content.description) : error ? common("requestUnavailable") : common("loading")}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t("navigate")}</p>
          <nav className="mt-5 grid gap-3 text-sm text-white/65" aria-label={t("navigate")}>
            {navigation.map((key) => <Link key={key} href={hrefs[key]} className="w-fit transition-colors duration-200 hover:text-[var(--rams-red)]">{nav(key)}</Link>)}
          </nav>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t("contact")}</p>
          <div className="mt-5 grid gap-4 text-sm text-white/65">
            {content ? <a href={`mailto:${localized(content.email)}`} className="w-fit transition-colors duration-200 hover:text-[var(--rams-red)]">{localized(content.email)}</a> : <span>{error ? common("requestUnavailable") : common("loading")}</span>}
            <span>{content ? localized(content.socialText) : error ? common("requestUnavailable") : common("loading")}</span>
            <address className="not-italic leading-7">{content ? content.addressLines.map((line) => <span key={line.en} className="block">{localized(line)}</span>) : error ? common("requestUnavailable") : common("loading")}</address>
            <div className="flex items-center gap-3">
              <span>{language("label")}</span>
              <span className="bg-white px-2 py-1"><LanguageSwitcher /></span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14 border-t border-white/15 pt-8" aria-labelledby="footer-ecosystem-title">
        <p id="footer-ecosystem-title" className="text-sm font-semibold uppercase tracking-[0.16em] text-white">{t("ecosystem")}</p>
        <div className="mt-5 grid grid-cols-1 gap-5 text-sm text-white/75 sm:grid-cols-3 sm:divide-x sm:divide-white/15">
          <div className="public-logo-interaction flex min-w-0 flex-col items-center gap-2 text-center sm:justify-center sm:pr-5">
            <div className="relative h-32 w-32 shrink-0">
              <Image src="/assets/rams-logo.png" alt={brand("laboratory")} fill sizes="128px" className="object-contain" />
            </div>
            <span className="leading-5">{brand("laboratory")}</span>
          </div>
          <div className="public-logo-interaction flex min-w-0 flex-col items-center gap-2 text-center sm:justify-center sm:px-5">
            <div className="relative h-32 w-32 shrink-0">
              <Image src="/assets/logo ais part2.png" alt={brand("ais")} fill sizes="128px" className="object-contain" />
            </div>
            <span className="leading-5">{brand("ais")}</span>
          </div>
          <div className="public-logo-interaction flex min-w-0 flex-col items-center gap-2 text-center sm:justify-center sm:pl-5">
            <div className="relative h-32 w-32 shrink-0">
              <Image src="/assets/logo pu-kekal part2.png" alt={brand("pui")} fill sizes="128px" className="object-contain" />
            </div>
            <span className="leading-5">{brand("pui")}</span>
          </div>
        </div>
      </section>

      <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} {content ? localized(content.copyright) : ""}</span>
        <span>{content ? localized(content.institution) : ""}</span>
      </div>
    </PublicContainer>
  </footer>;
}
