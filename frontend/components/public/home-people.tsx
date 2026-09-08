"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicPeopleList } from "@/lib/api/modules";
import type { PublicPeopleResponse, PublicPerson } from "@/types/people";
import type { HeadOfLaboratoryContent } from "@/types/site-content";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

const HEAD_OF_LABORATORY_NAME = "Dr. Eng. Dhimas Widhi Handani, S.T., M.Sc.";
const PORTRAIT_TRANSITION_MS = 800;
const PORTRAIT_ROTATION_MS = 2600;

type Locale = "en" | "id";

type PortraitSlot = {
  id: string;
  className: string;
  sizes: string;
};

type AccentCell = {
  id: string;
  className: string;
  variant: "red" | "blue" | "light";
};

type VisiblePortrait = {
  person: PublicPerson;
  previous?: PublicPerson;
};

const portraitSlots: PortraitSlot[] = [
  {
    id: "top-left",
    className: "left-[2%] top-[4%] h-[22%] w-[23%]",
    sizes: "(min-width: 1024px) 10vw, 22vw",
  },
  {
    id: "top-mid",
    className: "left-[29%] top-[0%] h-[18%] w-[20%]",
    sizes: "(min-width: 1024px) 8vw, 20vw",
  },
  {
    id: "top-right",
    className: "right-[8%] top-[8%] h-[24%] w-[22%]",
    sizes: "(min-width: 1024px) 10vw, 22vw",
  },
  {
    id: "mid-left",
    className: "left-[0%] top-[34%] h-[21%] w-[21%]",
    sizes: "(min-width: 1024px) 9vw, 21vw",
  },
  {
    id: "mid-right",
    className: "right-[0%] top-[42%] h-[21%] w-[21%]",
    sizes: "(min-width: 1024px) 9vw, 21vw",
  },
  {
    id: "lower-left",
    className: "left-[10%] bottom-[13%] h-[24%] w-[24%]",
    sizes: "(min-width: 1024px) 10vw, 24vw",
  },
  {
    id: "lower-mid",
    className: "left-[41%] bottom-[2%] h-[19%] w-[19%]",
    sizes: "(min-width: 1024px) 8vw, 19vw",
  },
  {
    id: "lower-right",
    className: "right-[12%] bottom-[10%] h-[22%] w-[22%]",
    sizes: "(min-width: 1024px) 9vw, 22vw",
  },
  {
    id: "edge-right",
    className: "right-[3%] top-[18%] h-[13%] w-[13%]",
    sizes: "(min-width: 1024px) 6vw, 13vw",
  },
] as const;

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

function normalizePersonName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(dr|eng|st|s|t|msc|m|sc)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isHeadOfLaboratory(person: PublicPerson) {
  const normalizedName = normalizePersonName(person.fullName);
  const normalizedHeadName = normalizePersonName(HEAD_OF_LABORATORY_NAME);

  return (
    person.fullName === HEAD_OF_LABORATORY_NAME ||
    normalizedName === normalizedHeadName ||
    normalizedName.includes("dhimas widhi handani")
  );
}

function hasUsablePhoto(person: PublicPerson) {
  return Boolean(person.photo?.trim());
}

function flattenPublicPeople(people: PublicPeopleResponse) {
  return [
    ...people.DOSEN,
    ...people.MAHASISWA,
    ...people.MASTER,
    ...people.UNDERGRADUATE,
    ...people.ALUMNI,
  ];
}

function shufflePeople(people: PublicPerson[]) {
  const shuffled = [...people];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function buildInitialPortraits(people: PublicPerson[]) {
  if (!people.length) return [];

  return portraitSlots.map((_, index) => ({
    person: people[index % people.length],
  }));
}

function localizedAlt(
  imageAlt: HeadOfLaboratoryContent["imageAlt"],
  image: HeadOfLaboratoryContent["image"],
  locale: Locale,
) {
  return image?.alt?.[locale] ?? imageAlt[locale];
}

function PortraitTile({
  slot,
  portrait,
}: {
  slot: PortraitSlot;
  portrait?: VisiblePortrait;
}) {
  return (
    <div
      className={`absolute overflow-hidden bg-[var(--background-light)] shadow-[0_16px_40px_rgba(8,24,38,0.12)] ${slot.className}`}
    >
      {portrait?.previous?.photo && (
        <Image
          key={`previous-${portrait.previous.id}`}
          src={portrait.previous.photo}
          alt=""
          fill
          sizes={slot.sizes}
          unoptimized
          className="home-people-portrait-out object-cover"
        />
      )}
      {portrait?.person.photo ? (
        <Image
          key={`current-${portrait.person.id}`}
          src={portrait.person.photo}
          alt={portrait.person.fullName}
          fill
          sizes={slot.sizes}
          unoptimized
          className="home-people-portrait-in object-cover"
        />
      ) : (
        <div className="h-full w-full bg-white" />
      )}
    </div>
  );
}

export default function HomePeopleSection({
  headOfLaboratory,
}: {
  headOfLaboratory?: HeadOfLaboratoryContent;
}) {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("home.people");
  const [peoplePool, setPeoplePool] = useState<PublicPerson[]>([]);
  const [visiblePortraits, setVisiblePortraits] = useState<VisiblePortrait[]>(
    [],
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const poolRef = useRef<PublicPerson[]>([]);
  const cursorRef = useRef(0);
  const slotCursorRef = useRef(0);
  const transitionTimeoutsRef = useRef<number[]>([]);
  const rotationIntervalRef = useRef<number | null>(null);

  const centralImage = headOfLaboratory?.image;
  const centralAlt = useMemo(
    () =>
      headOfLaboratory
        ? localizedAlt(headOfLaboratory.imageAlt, centralImage, locale)
        : HEAD_OF_LABORATORY_NAME,
    [centralImage, headOfLaboratory, locale],
  );

  useEffect(() => {
    let cancelled = false;

    getPublicPeopleList()
      .then((records) => {
        if (cancelled) return;

        const eligiblePeople = flattenPublicPeople(records).filter(
          (person) => hasUsablePhoto(person) && !isHeadOfLaboratory(person),
        );
        const shuffled = shufflePeople(eligiblePeople);

        poolRef.current = shuffled;
        cursorRef.current =
          shuffled.length > 0 ? portraitSlots.length % shuffled.length : 0;
        setPeoplePool(shuffled);
        setVisiblePortraits(buildInitialPortraits(shuffled));
      })
      .catch(() => {
        if (!cancelled) {
          poolRef.current = [];
          setPeoplePool([]);
          setVisiblePortraits([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      setPrefersReducedMotion(motionQuery.matches);
    };

    syncReducedMotion();
    motionQuery.addEventListener("change", syncReducedMotion);

    return () => {
      motionQuery.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (peoplePool.length <= 1 || prefersReducedMotion) return undefined;

    const clearTransitionTimeouts = () => {
      transitionTimeoutsRef.current.forEach((timeout) =>
        window.clearTimeout(timeout),
      );
      transitionTimeoutsRef.current = [];
    };

    const stopRotation = () => {
      if (rotationIntervalRef.current !== null) {
        window.clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      clearTransitionTimeouts();
    };

    const rotateOneSlot = () => {
      if (document.hidden) return;

      setVisiblePortraits((currentPortraits) => {
        const pool = poolRef.current;
        if (!pool.length || !currentPortraits.length) return currentPortraits;

        const slotIndex = slotCursorRef.current % currentPortraits.length;
        slotCursorRef.current += 1;
        const displayedIds = new Set(
          currentPortraits
            .map((portrait, index) =>
              index === slotIndex ? undefined : portrait.person.id,
            )
            .filter(Boolean),
        );
        let nextPerson: PublicPerson | undefined;
        let attempts = 0;

        while (attempts < pool.length) {
          const candidate = pool[cursorRef.current];
          cursorRef.current += 1;
          attempts += 1;

          if (
            pool.length < currentPortraits.length ||
            !displayedIds.has(candidate.id)
          ) {
            nextPerson = candidate;
            break;
          }
        }

        if (cursorRef.current >= pool.length && pool.length > 1) {
          const currentDisplayedIds = new Set(
            currentPortraits.map((portrait) => portrait.person.id),
          );
          poolRef.current = shufflePeople(pool).sort((a, b) => {
            const aDisplayed = currentDisplayedIds.has(a.id) ? 1 : 0;
            const bDisplayed = currentDisplayedIds.has(b.id) ? 1 : 0;
            return aDisplayed - bDisplayed;
          });
          cursorRef.current = 0;
        }

        if (
          !nextPerson ||
          nextPerson.id === currentPortraits[slotIndex].person.id
        ) {
          return currentPortraits;
        }

        const nextPortraits = currentPortraits.map((portrait, index) =>
          index === slotIndex
            ? { person: nextPerson, previous: portrait.person }
            : portrait,
        );

        const timeout = window.setTimeout(() => {
          setVisiblePortraits((latestPortraits) =>
            latestPortraits.map((portrait) =>
              portrait.person.id === nextPerson?.id
                ? { person: portrait.person }
                : portrait,
            ),
          );
        }, PORTRAIT_TRANSITION_MS);
        transitionTimeoutsRef.current.push(timeout);

        return nextPortraits;
      });
    };

    const startRotation = () => {
      if (rotationIntervalRef.current !== null) {
        return;
      }
      rotationIntervalRef.current = window.setInterval(
        rotateOneSlot,
        PORTRAIT_ROTATION_MS,
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopRotation();
      } else {
        startRotation();
      }
    };

    startRotation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopRotation();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [peoplePool, prefersReducedMotion]);

  return (
    <section
      className="bg-white py-20 sm:py-24 lg:py-28"
      aria-labelledby="home-people-title"
    >
      <PublicContainer>
        <RevealOnScroll className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.62fr)] lg:gap-20">
          <div className="relative mx-auto aspect-[1.05/1] w-full max-w-[42rem]">
            <div className="absolute left-1/2 top-1/2 z-20 aspect-[4/5] h-[52%] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[var(--navy)] shadow-[0_22px_60px_rgba(8,24,38,0.18)]">
              {centralImage?.url ? (
                <Image
                  src={centralImage.url}
                  alt={centralAlt}
                  fill
                  sizes="(min-width: 1024px) 19vw, 46vw"
                  unoptimized
                  priority={false}
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

            {portraitSlots.map((slot, index) => (
              <PortraitTile
                key={slot.id}
                slot={slot}
                portrait={visiblePortraits[index]}
              />
            ))}
          </div>

          <div className="max-w-sm lg:justify-self-end">
            <p className="eyebrow text-[var(--rams-red)]">{t("eyebrow")}</p>
            <h2
              id="home-people-title"
              className="mt-4 font-display text-4xl font-bold leading-tight text-[var(--navy)] sm:text-5xl"
            >
              {t("title")}
            </h2>
            <Link
              href="/team"
              className="mt-8 inline-flex items-center gap-3 border border-[var(--navy)] px-5 py-3 text-sm font-bold uppercase tracking-normal text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:bg-[var(--rams-red)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)]"
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
