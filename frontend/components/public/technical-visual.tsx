import Image from "next/image";
import { useTranslations } from "next-intl";

export default function TechnicalVisual() {
  const t = useTranslations("visual");
  const a11y = useTranslations("a11y");
  return (
    <figure className="public-card-interaction group border border-[var(--border)] bg-white p-3 shadow-[0_12px_30px_rgba(11,32,56,.08)] sm:p-4">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--navy)]">
        <Image
          src="/assets/prof-ketut.jpg"
          alt={a11y("technicalVisual")}
          fill
          sizes="(max-width: 1024px) 100vw, 540px"
          className="public-image-zoom object-cover object-[center_22%]"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--navy)]/85 to-transparent px-5 pb-5 pt-16 text-white sm:px-6 sm:pb-6">
          <p className="text-sm font-semibold">{t("headName")}</p>
          <p className="mt-1 text-xs text-white/75">{t("headRole")}</p>
        </div>
      </div>
      <figcaption className="flex flex-col gap-2 px-2 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-3">
        <span className="text-sm font-semibold text-[var(--navy)]">
          {t("profile")}
        </span>
        <span className="text-sm text-[var(--gray)]">{t("affiliation")}</span>
      </figcaption>
    </figure>
  );
}
