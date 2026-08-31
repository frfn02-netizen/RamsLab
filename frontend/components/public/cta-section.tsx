import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

export default function CtaSection({
  title,
  description,
  primary,
  primaryHref = "/contact",
  secondary,
  secondaryHref = "/research",
}: {
  title: string;
  description: string;
  primary: string;
  primaryHref?: string;
  secondary: string;
  secondaryHref?: string;
}) {
  const common = useTranslations("common");
  return (
    <section className="bg-[var(--navy)] text-white">
      <PublicContainer className="py-16 sm:py-20">
        <RevealOnScroll
          className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"
          stagger={120}
        >
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[var(--ais-blue-light)]">
              {common("nextConversation")}
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-white/70">
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="bg-[var(--rams-red)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--rams-red-light)]"
            >
              {primary} <span aria-hidden="true">↗</span>
            </Link>
            <Link
              href={secondaryHref}
              className="border border-white/35 px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              {secondary} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </RevealOnScroll>
      </PublicContainer>
    </section>
  );
}
