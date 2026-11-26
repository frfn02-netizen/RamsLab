import { Link } from "@/i18n/navigation";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

export default function CtaSection({
  eyebrow,
  title,
  description,
  primary,
  primaryHref = "/contact",
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  primaryHref?: string;
  centered?: boolean;
}) {
  return (
    <section className="bg-[var(--navy)] text-white">
      <PublicContainer className="py-12 sm:py-14 lg:py-16">
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
              {eyebrow}
            </p>
            <h2 className="public-section-title mt-3 max-w-2xl">{title}</h2>
            <p className="public-lead mt-4 max-w-xl text-white/75">
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
