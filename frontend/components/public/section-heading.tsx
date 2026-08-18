import type { ReactNode } from "react";

export default function SectionHeading({ eyebrow, title, description, action, inverted = false }: { eyebrow: string; title: string; description?: string; action?: ReactNode; inverted?: boolean }) {
  return <div className={`flex flex-col gap-6 md:flex-row md:items-end md:justify-between ${inverted ? "text-white" : ""}`}><div className="max-w-2xl"><p className={`eyebrow ${inverted ? "text-[var(--ais-blue-light)]" : "text-[var(--ais-blue)]"}`}>{eyebrow}</p><h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">{title}</h2>{description && <p className={`mt-4 max-w-xl text-base leading-7 ${inverted ? "text-white/60" : "text-[var(--slate)]"}`}>{description}</p>}</div>{action}</div>;
}
