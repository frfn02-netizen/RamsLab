import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import PublicContainer from "./public-container";

export default function PageHero({
  eyebrow,
  title,
  description,
  current,
}: {
  eyebrow: string;
  title: string;
  description: string;
  current?: string;
}) {
  const brand = useTranslations("brand");
  return (
    <section className="border-b border-[var(--border)] bg-white">
      <PublicContainer className="py-8 sm:py-10 lg:py-12">
        <div className="hero-entrance max-w-3xl">
          <div className="flex items-center gap-2 text-sm text-[var(--gray)]">
            <Link href="/" className="transition hover:text-[var(--rams-red)]">
              {brand("laboratory")}
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-[var(--navy)]">{current ?? title}</span>
          </div>
          {eyebrow ? <p className="eyebrow mt-5">{eyebrow}</p> : null}
          <h1 className={`${eyebrow ? "mt-3" : "mt-5"} max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--navy)] sm:text-5xl lg:text-[3.8rem]`}>
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--slate)] sm:text-lg">
            {description}
          </p>
        </div>
      </PublicContainer>
    </section>
  );
}
