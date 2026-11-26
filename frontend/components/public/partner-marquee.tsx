"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Partner } from "@/types/modules";

/* ========================================
   MARQUEE ROW
   ======================================== */

export function MarqueeRow({
  partners,
  direction,
  ariaLabel,
}: {
  partners: Partner[];
  direction: "left" | "right";
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  // Measure the width of ONE set of items (first half of the duplicated list)
  const measure = useCallback(() => {
    if (!firstSetRef.current) return;
    const firstSetWidth = firstSetRef.current.offsetWidth;
    if (firstSetWidth > 0) {
      setDistance(firstSetWidth);
    }
  }, []);

  useEffect(() => {
    measure();

    const ro = new ResizeObserver(measure);
    if (firstSetRef.current) {
      ro.observe(firstSetRef.current);
    }

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, partners]);

  // Duration scales with distance so visual speed stays consistent
  const duration = distance > 0 ? Math.max(25, distance / 12) : 30;

  const trackStyle =
    distance > 0
      ? ({
          "--marquee-distance": `${distance}px`,
          "--marquee-duration": `${duration}s`,
          animationDuration: `${duration}s`,
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      className="partner-marquee-row group relative"
      role="group"
      aria-label={ariaLabel}
    >
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 sm:w-24"
        style={{
          background:
            "linear-gradient(to right, var(--background-light), transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 sm:w-24"
        style={{
          background:
            "linear-gradient(to left, var(--background-light), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="overflow-hidden">
        {/* Hidden measurement container — first set only */}
        <div
          ref={firstSetRef}
          className="pointer-events-none absolute top-0 flex w-max opacity-0"
          aria-hidden="true"
        >
          {partners.map((partner) => (
            <MarqueeItem key={`measure-${partner._id}`} partner={partner} />
          ))}
        </div>

        {/* Visible animated track — duplicated for seamless loop */}
        <div
          ref={trackRef}
          className={`partner-marquee-track partner-marquee-track--${direction}`}
          style={trackStyle}
        >
          {[...partners, ...partners].map((partner, index) => (
            <MarqueeItem key={`${partner._id}-${index}`} partner={partner} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================
   MARQUEE ITEM
   ======================================== */

function MarqueeItem({ partner }: { partner: Partner }) {
  const label = partner.website
    ? `${partner.name} — ${partner.website}`
    : partner.name;

  const inner = partner.logo ? (
    <div className="flex flex-col items-center gap-3">
      <Image
        src={partner.logo}
        alt=""
        width={200}
        height={80}
        className="h-16 w-auto object-contain sm:h-20 md:h-24 lg:h-28 xl:h-32"
      />
      <span className="hidden text-[0.7rem] font-medium tracking-wide text-[var(--gray)] sm:inline">
        {partner.name}
      </span>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-16 w-36 items-center justify-center rounded border border-[var(--border)] bg-white px-4 text-[0.7rem] font-bold leading-tight text-[var(--navy)] sm:h-20 sm:w-40 md:h-24 md:w-48 lg:h-28 lg:w-56 xl:h-32 xl:w-64">
        {partner.name}
      </div>
      <span className="hidden text-[0.7rem] font-medium tracking-wide text-[var(--gray)] sm:inline">
        {partner.name}
      </span>
    </div>
  );

  const sharedClass =
    "flex-shrink-0 px-9 sm:px-12 md:px-14 lg:px-16 xl:px-20 flex items-center justify-center transition duration-300 hover:scale-105";

  if (partner.website) {
    return (
      <a
        href={partner.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={sharedClass}
      >
        {inner}
      </a>
    );
  }

  return <div className={sharedClass}>{inner}</div>;
}
