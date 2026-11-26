"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import type { PublicPerson } from "@/types/people";

const PORTRAIT_TRANSITION_MS = 800;
const PORTRAIT_ROTATION_MS = 2600;

type PortraitSlot = {
  id: string;
  className: string;
  sizes: string;
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
          className="home-people-portrait-in object-cover"
        />
      ) : (
        <div className="h-full w-full bg-white" />
      )}
    </div>
  );
}

export default function PeoplePortraitRotation({
  people,
}: {
  people: PublicPerson[];
}) {
  const [visiblePortraits, setVisiblePortraits] = useState<VisiblePortrait[]>(
    () => buildInitialPortraits(people),
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const poolRef = useRef<PublicPerson[]>(people);
  const cursorRef = useRef(
    people.length > 0 ? portraitSlots.length % people.length : 0,
  );
  const slotCursorRef = useRef(0);
  const transitionTimeoutsRef = useRef<number[]>([]);
  const rotationIntervalRef = useRef<number | null>(null);

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
    if (people.length <= 1 || prefersReducedMotion) return undefined;

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
  }, [people, prefersReducedMotion]);

  return (
    <>
      {portraitSlots.map((slot, index) => (
        <PortraitTile
          key={slot.id}
          slot={slot}
          portrait={visiblePortraits[index]}
        />
      ))}
    </>
  );
}
