"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

type HeroTone = "dark" | "light";

const HeroContext = createContext<{ isAtTop: boolean; heroTone: HeroTone }>({
  isAtTop: true,
  heroTone: "dark",
});

export function HeroProvider({ children }: { children: React.ReactNode }) {
  const [isAtTop, setIsAtTop] = useState(true);
  const [heroTone, setHeroTone] = useState<HeroTone>("dark");
  const pathname = usePathname();

  useEffect(() => {
    let hero: HTMLElement | null = null;
    let frame: number | null = null;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let mutationObserver: MutationObserver | null = null;

    function update() {
      if (!hero) {
        setIsAtTop(false);
        return;
      }
      setIsAtTop(window.scrollY <= 4);
    }

    function onScroll() {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        update();
      });
    }

    function attach(target: HTMLElement) {
      if (hero === target) return;
      hero = target;
      setHeroTone(target.dataset.heroTone === "light" ? "light" : "dark");
      update();
    }

    function findHero() {
      const found = document.getElementById("hero");
      if (!found) return false;
      attach(found);
      return true;
    }

    function setup() {
      if (findHero()) return;
      update();
      mutationObserver = new MutationObserver(() => {
        if (findHero()) {
          mutationObserver?.disconnect();
          mutationObserver = null;
        }
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    startTimer = setTimeout(setup, 0);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
      if (startTimer) clearTimeout(startTimer);
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  return (
    <HeroContext.Provider value={{ isAtTop, heroTone }}>
      {children}
    </HeroContext.Provider>
  );
}

export function useHeroContext() {
  return useContext(HeroContext);
}
