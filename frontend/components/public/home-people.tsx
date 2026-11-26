import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { HEAD_OF_LABORATORY_NAME } from "@/lib/public/people";
import type { PublicPerson } from "@/types/people";
import type { HeadOfLaboratoryContent } from "@/types/site-content";
import PeoplePortraitRotation from "./people-portrait-rotation";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

type Locale = "en" | "id";

type AccentCell = {
  id: string;
  className: string;
  variant: "red" | "blue" | "light";
};

const accentCells: AccentCell[] = [
  {
    id: "light-a",
    className: "left-[20%] top-[27%] h-[12%] w-[12%]",
    variant: "light",
  },
  {
    id: "red-a",
    className: "right-[31%] top-[26%] h-[10%] w-[10%]",
    variant: "red",
  },
  {
    id: "blue-a",
    className: "left-[3%] bottom-[36%] h-[10%] w-[10%]",
    variant: "blue",
  },
  {
    id: "light-b",
    className: "right-[28%] bottom-[30%] h-[13%] w-[13%]",
    variant: "light",
  },
  {
    id: "red-b",
    className: "right-[1%] bottom-[24%] h-[11%] w-[11%]",
    variant: "red",
  },
  {
    id: "blue-b",
    className: "left-[31%] bottom-[23%] h-[9%] w-[9%]",
    variant: "blue",
  },
] as const;

const accentClassByVariant = {
  red: "bg-[var(--rams-red)]",
  blue: "bg-[var(--ais-blue)]",
  light: "border border-[var(--border)] bg-white",
} satisfies Record<AccentCell["variant"], string>;

function localizedAlt(
  imageAlt: HeadOfLaboratoryContent["imageAlt"],
  image: HeadOfLaboratoryContent["image"],
  locale: Locale,
) {
  return image?.alt?.[locale] ?? imageAlt[locale];
}

export default async function HomePeopleSection({
  headOfLaboratory,
  people,
}: {
  headOfLaboratory?: HeadOfLaboratoryContent;
  people: PublicPerson[];
}) {
  const locale = (await getLocale()) === "id" ? "id" : "en";
  const t = await getTranslations({ locale, namespace: "home.people" });
  const centralImage = headOfLaboratory?.image;
  const centralAlt = headOfLaboratory
    ? localizedAlt(headOfLaboratory.imageAlt, centralImage, locale)
    : HEAD_OF_LABORATORY_NAME;

  return (
    <section
      className="bg-white py-14 sm:py-16 lg:py-20 min-[2000px]:py-28"
      aria-labelledby="home-people-title"
    >
      <PublicContainer>
        <RevealOnScroll className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.62fr)] lg:gap-12">
          <div className="relative mx-auto aspect-[1.05/1] w-full max-w-[42rem]">
            <div className="absolute left-1/2 top-1/2 z-20 aspect-[4/5] h-[52%] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[var(--navy)] shadow-[0_22px_60px_rgba(8,24,38,0.18)]">
              {centralImage?.url ? (
                <Image
                  src={centralImage.url}
                  alt={centralAlt}
                  fill
                  sizes="(min-width: 1024px) 19vw, 46vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[var(--navy)]">
                  <span className="font-display text-6xl font-bold text-white/15">
                    RAMS
                  </span>
                </div>
              )}
            </div>

            {accentCells.map((cell) => (
              <div
                key={cell.id}
                aria-hidden="true"
                className={`absolute ${cell.className} ${accentClassByVariant[cell.variant]}`}
              />
            ))}

            <PeoplePortraitRotation
              key={people.map((person) => person.id).join("-")}
              people={people}
            />
          </div>

          <div className="max-w-sm lg:justify-self-end">
            <p className="eyebrow text-[var(--rams-red)]">{t("eyebrow")}</p>
            <h2
              id="home-people-title"
              className="public-section-title mt-3 text-[var(--navy)]"
            >
              {t("title")}
            </h2>
            <Link
              href="/team"
              className="mt-6 inline-flex items-center gap-3 border border-[var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-normal text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:bg-[var(--rams-red)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)]"
            >
              {t("button")}
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </RevealOnScroll>
      </PublicContainer>
    </section>
  );
}
