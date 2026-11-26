"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  threshold?: number;
};

type RevealPhase = "idle" | "pending" | "visible";

export default function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  stagger = 0,
  threshold = 0.1,
}: RevealOnScrollProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<RevealPhase>("idle");

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    // Server-rendered content is visible by default. Only defer content that
    // starts below the viewport, so a failed hydration never hides the page.
    if (node.getBoundingClientRect().top <= window.innerHeight * 0.95) {
      return;
    }

    setPhase("pending");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;

        setPhase("visible");
        observer.disconnect();
      },
      { threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  const style = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-stagger": `${stagger}ms`,
  } as CSSProperties;

  return (
    <div
      ref={nodeRef}
      className={`reveal-on-scroll ${phase === "pending" ? "reveal-pending" : ""} ${phase === "visible" ? "is-visible" : ""} ${className}`.trim()}
      data-reveal-children={stagger > 0 ? "true" : undefined}
      style={style}
    >
      {children}
    </div>
  );
}
