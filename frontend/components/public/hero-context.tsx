"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

const HeroContext = createContext({ isAtTop: true });

export function HeroProvider({ children }: { children: React.ReactNode }) {
  const [isAtTop, setIsAtTop] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    let pollCount = 0;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    setIsAtTop(false);

    function setup() {
      const hero = document.getElementById("hero");
      if (!hero) {
        if (pollCount < 20) {
          pollCount++;
          pollTimer = setTimeout(setup, 50);
        }
        return;
      }
      observer = new IntersectionObserver(
        ([entry]) => setIsAtTop(entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(hero);
    }

    const startTimer = setTimeout(setup, 100);

    return () => {
      observer?.disconnect();
      clearTimeout(startTimer);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [pathname]);

  return (
    <HeroContext.Provider value={{ isAtTop }}>{children}</HeroContext.Provider>
  );
}

export function useHeroContext() {
  return useContext(HeroContext);
}
