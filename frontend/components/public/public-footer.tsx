"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicSiteContent } from "@/lib/api/modules";
import type { FooterContent } from "@/types/site-content";
import PublicContainer from "./public-container";

const socialLinks = [
  { label: "LinkedIn", href: process.env.NEXT_PUBLIC_RAMS_LINKEDIN_URL ?? "https://www.linkedin.com/company/lab-rams", kind: "linkedin" },
  { label: "YouTube", href: process.env.NEXT_PUBLIC_RAMS_YOUTUBE_URL ?? "https://www.youtube.com/@RamsLaboratory-yt5jo", kind: "youtube" },
  { label: "Instagram", href: process.env.NEXT_PUBLIC_RAMS_INSTAGRAM_URL ?? "https://www.instagram.com/rams_laboratory/", kind: "instagram" },
].filter((link): link is { label: string; href: string; kind: string } => Boolean(link.href));

function SocialIcon({ kind }: { kind: string }) {
  if (kind === "instagram") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
  if (kind === "youtube") return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.1a2.8 2.8 0 0 0-2-2C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.4 4.9a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.8.4-4.9.4-4.9s0-3.1-.4-4.9ZM10 15.5v-7l6 3.5-6 3.5Z" /></svg>;
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.2 3.5A2.7 2.7 0 1 1 5.2 8.9a2.7 2.7 0 0 1 0-5.4ZM2.8 10.8h4.8v10.4H2.8V10.8Zm7.6 0h4.6v1.4h.1c.6-1 1.8-1.9 3.8-1.9 4 0 4.7 2.6 4.7 6v4.9h-4.8v-4.4c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5v4.5h-4.9V10.8Z" /></svg>;
}

const navigation = [
  ["people", "/team"],
  ["about", "/about"],
  ["research", "/research"],
  ["publications", "/publications"],
  ["projects", "/projects"],
  ["partners", "/partners"],
  ["alumni", "/alumni"],
  ["participate", "/contact"],
] as const;

export default function PublicFooter() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const brand = useTranslations("brand");
  const common = useTranslations("common");
  const [content, setContent] = useState<FooterContent | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { getPublicSiteContent("footer").then(setContent).catch(() => setError(true)); }, []);
  const localized = (value: { en: string; id: string }) => value[locale];

  const fallbackDescription = t("description");
  const footerDescription = content ? localized(content.description) : error ? common("requestUnavailable") : common("loading");
  const footerCopyright = content ? localized(content.copyright) : t("copyright");
  const footerInstitution = content ? localized(content.institution) : brand("institution");

  return <footer className="rams-footer relative overflow-hidden bg-[var(--navy)] text-white">
    <div className="rams-footer-grid pointer-events-none absolute inset-0" aria-hidden="true" />
    <PublicContainer className="relative py-16 sm:py-20 lg:py-24">
      <section className="rams-footer-closing border-b border-white/15 pb-14 sm:pb-16" aria-labelledby="footer-closing-title">
        <div className="flex items-center gap-4">
          <span className="h-px w-10 bg-[var(--rams-red)]" aria-hidden="true" />
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/55">{brand("laboratory")}</p>
        </div>
        <h2 id="footer-closing-title" className="mt-7 max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
          {fallbackDescription}
        </h2>
      </section>

      <section className="grid gap-12 border-b border-white/15 py-14 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.35fr_0.9fr_1fr] lg:gap-16" aria-label={t("navigate")}>
        <div className="max-w-sm">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]">
              <Image src="/assets/rams-logo.png" alt={brand("laboratory")} fill sizes="72px" className="object-contain" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-[-0.02em] text-white">{brand("laboratory")}</p>
              <p className="mt-2 text-xs leading-5 text-white/55">{brand("technicalLine")}</p>
            </div>
          </div>
          <span className="mt-7 block h-px w-12 bg-[var(--rams-red)]" aria-hidden="true" />
          <p className="mt-6 text-sm leading-7 text-white/65">{footerDescription}</p>
        </div>

        <div>
          <p className="rams-footer-label">{t("navigate")}</p>
          <nav className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm" aria-label={t("navigate")}>
            {navigation.map(([key, href]) => <Link key={href} href={href} className="rams-footer-link w-fit">{nav(key)}</Link>)}
          </nav>
        </div>

        <div>
          <p className="rams-footer-label">{t("contact")}</p>
          <div className="mt-5 grid gap-4 text-sm text-white/65">
            {content ? <a href={`mailto:${localized(content.email)}`} className="rams-footer-link w-fit font-medium">{localized(content.email)}</a> : <span>{footerDescription}</span>}
            <address className="not-italic leading-7">
              {content ? content.addressLines.map((line) => <span key={line.en} className="block">{localized(line)}</span>) : error ? common("requestUnavailable") : common("loading")}
            </address>
            {content && <p className="max-w-xs leading-6 text-white/45">{localized(content.socialText)}</p>}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-xs uppercase tracking-[0.12em] text-white/45">{t("findUs")}</span>
              {socialLinks.map((link) => <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label} className={`rams-footer-social rams-footer-social--${link.kind} group`}>
                <SocialIcon kind={link.kind} />
                <span className="rams-footer-social-tooltip" aria-hidden="true">{link.label}</span>
              </a>)}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} {footerCopyright}</span>
        <span className="lg:text-center">{footerInstitution}</span>
      </div>
    </PublicContainer>
  </footer>;
}
