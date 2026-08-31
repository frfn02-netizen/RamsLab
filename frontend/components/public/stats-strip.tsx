import { useTranslations } from "next-intl";

export default function StatsStrip() {
  const t = useTranslations("home");
  const stats = [
    [t("researchTitle"), t("researchEyebrow")],
    [t("systemsTitle"), t("systemsEyebrow")],
    [t("callout.lensValue"), t("callout.lens")],
    [t("callout.collaborationValue"), t("callout.collaboration")],
  ];
  return (
    <section className="border-y border-[var(--navy)] bg-[var(--navy)] text-white">
      <div className="mx-auto grid max-w-[1240px] divide-y divide-white/15 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-8 lg:grid-cols-4 lg:px-10">
        {stats.map(([value, label], index) => (
          <div
            key={label}
            className="relative px-0 py-6 sm:px-6 sm:first:pl-0 lg:px-8 lg:first:pl-0"
          >
            <span
              className={`absolute left-0 top-0 h-1 w-8 ${index % 2 === 0 ? "bg-[var(--rams-red)]" : "bg-[var(--ais-blue-light)]"}`}
              aria-hidden="true"
            />
            <strong className="block max-w-[14rem] font-display text-lg font-semibold leading-6">
              {value}
            </strong>
            <span className="mt-2 block text-sm leading-5 text-white/65">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
