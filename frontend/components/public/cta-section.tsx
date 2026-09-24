import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

export default function CtaSection({
  title,
  description,
  primary,
  primaryHref = "/contact",
  centered = false,
}: {
  title: string;
  description: string;
  primary: string;
  primaryHref?: string;
  centered?: boolean;
}) {
  const common = useTranslations("common");
  return (
    <section className="bg-[var(--navy)] text-white">
      <PublicContainer className="py-10 sm:py-14">
        <RevealOnScroll
          className={
            centered
              ? "flex flex-col items-center text-center"
              : "grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"
          }
          stagger={120}
        >
          <div className={centered ? "" : "max-w-2xl"}>
            <p className="text-sm font-semibold text-[var(--ais-blue-light)]">
              {common("nextConversation")}
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-white/70">
              {description}
            </p>
          </div>
          <div>
            <Link
              href={primaryHref}
              className="bg-[var(--rams-red)] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[var(--rams-red-light)]"
            >
              {primary} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </RevealOnScroll>
      </PublicContainer>
    </section>
  );
}
