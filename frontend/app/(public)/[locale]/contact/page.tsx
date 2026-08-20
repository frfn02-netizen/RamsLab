import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ContactForm from "@/components/public/contact-form";
import PublicContainer from "@/components/public/public-container";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import RevealOnScroll from "@/components/public/reveal-on-scroll";
import { PublicError } from "@/components/public/public-states";
import { getPublicSiteContent } from "@/lib/api/modules";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return localizedMetadata({ locale: locale as Locale, path: "/contact", title: t("heroTitle"), description: t("heroDescription") });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  const common = await getTranslations({ locale, namespace: "common" });
  const brand = await getTranslations({ locale, namespace: "brand" });
  const nav = await getTranslations({ locale, namespace: "nav" });
  let content;
  try {
    content = await getPublicSiteContent("contact");
  } catch {
    return <section className="bg-white py-20"><PublicContainer><div className="mx-auto max-w-2xl"><PublicError message={common("requestUnavailable")} /></div></PublicContainer></section>;
  }
  const localized = (value: { en: string; id: string }) => value[locale === "id" ? "id" : "en"];

  return (
    <>
      {/* SECTION 1: CONTACT HERO */}
      <section className="border-b border-[var(--navy-deep)] bg-[var(--navy)] py-16 text-white sm:py-20">
        <PublicContainer>
          <div className="hero-entrance">
          <nav aria-label={t("contactEyebrow")} className="flex items-center gap-2 text-sm text-white/60">
            <Link href="/" className="transition hover:text-white">{brand("laboratory")}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white">{nav("contact")}</span>
          </nav>
          <p className="mt-10 text-[0.75rem] font-bold uppercase tracking-[0.1em] text-[var(--rams-red)]">{localized(content.hero.eyebrow)}</p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-[-0.02em] sm:text-5xl">{localized(content.hero.title)}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/70">{localized(content.hero.description)}</p>
          </div>
        </PublicContainer>
      </section>

      {/* SECTION 2: MAIN CONTACT AREA */}
      <section className="bg-[var(--background-light)] py-16 sm:py-24">
        <PublicContainer>
          <RevealOnScroll className="grid items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16" stagger={120}>
          <ContactForm />

          <aside className="space-y-10">
            <div className="border border-[#D9E0E6] bg-white">
              <div className="border-b border-[var(--border)] px-8 py-7">
                <h2 className="font-display text-2xl font-bold text-[var(--navy)]">{localized(content.details.title)}</h2>
                <span className="mt-3 block h-0.5 w-10 bg-[var(--rams-red)]" aria-hidden="true" />
              </div>
              <dl className="divide-y divide-[var(--border)]">
                <div className="px-8 py-6">
                  <dt className="eyebrow">{t("address")}</dt>
                  <dd className="mt-3">
                    <address className="text-sm not-italic leading-6 text-[var(--navy)]">
                      {content.details.addressLines.map((line) => <span key={line.en} className="block">{localized(line)}</span>)}
                    </address>
                  </dd>
                </div>
                <div className="px-8 py-6">
                  <dt className="eyebrow">{t("email")}</dt>
                  <dd className="mt-3">
                    <a href={`mailto:${localized(content.details.email)}`} className="text-sm font-semibold text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]">{localized(content.details.email)}</a>
                  </dd>
                </div>
                <div className="px-8 py-6">
                  <dt className="eyebrow">{t("laboratory")}</dt>
                  <dd className="mt-3 text-sm leading-6 text-[var(--navy)]">
                    {brand("laboratory")}<br />
                    {brand("institution")}
                  </dd>
                </div>
                <div className="px-8 py-6">
                  <dt className="eyebrow">{t("social")}</dt>
                    <dd className="mt-3 text-sm leading-6 text-[var(--navy)]">{localized(content.details.socialText)}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-[var(--navy)] p-8 text-white">
              <h3 className="font-display text-xl font-bold">{localized(content.collaboration.title)}</h3>
              <span className="mt-3 block h-0.5 w-10 bg-[var(--rams-red)]" aria-hidden="true" />
              <p className="mt-4 text-sm leading-6 text-white/70">{localized(content.collaboration.description)}</p>
              <Link href="#contact-form" className="mt-6 inline-block bg-[var(--rams-red)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">
                {localized(content.collaboration.buttonLabel)} →
              </Link>
            </div>
          </aside>
          </RevealOnScroll>
        </PublicContainer>
      </section>
    </>
  );
}
