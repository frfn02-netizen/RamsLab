"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  threshold?: number;
};

export default function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  stagger = 0,
  threshold = 0.1,
}: RevealOnScrollProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;

      setIsVisible(true);
      observer.disconnect();
    }, { threshold });

    observer.observe(node);

    return () => observer.disconnect();
  }, [threshold]);

  const style = {
    "--reveal-delay": `${delay}ms`,
    "--reveal-stagger": `${stagger}ms`,
  } as CSSProperties;
  return <div
    ref={nodeRef}
    className={`reveal-on-scroll ${isVisible ? "is-visible" : ""} ${className}`.trim()}
    data-reveal-children={stagger > 0 ? "true" : undefined}
    style={style}
  >
    {children}
  </div>;
}
