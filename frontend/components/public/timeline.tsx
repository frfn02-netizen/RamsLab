import { useTranslations } from "next-intl";
import type { timelineKeys } from "./content";

export default function Timeline({
  items,
}: {
  items: readonly (typeof timelineKeys)[number][];
}) {
  const t = useTranslations("timeline");
  return (
    <ol className="relative ml-2 border-l border-[var(--ais-blue)]/35">
      {items.map((item) => (
        <li key={item} className="relative pb-10 pl-8 last:pb-0">
          <span className="absolute -left-[7px] top-1 h-3 w-3 border-2 border-[var(--paper)] bg-[var(--rams-red)]" />
          <p className="eyebrow text-[var(--ais-blue)]">
            {t(`${item}.year`)} · {t(`${item}.label`)}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--slate)]">
            {t(`${item}.text`)}
          </p>
        </li>
      ))}
    </ol>
  );
}
