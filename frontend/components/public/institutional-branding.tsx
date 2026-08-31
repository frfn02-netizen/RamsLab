import Image from "next/image";
import { useTranslations } from "next-intl";

export default function InstitutionalBranding({
  compact = false,
}: {
  compact?: boolean;
}) {
  const t = useTranslations("brand");
  return (
    <div
      className={`flex items-center ${compact ? "gap-3" : "gap-4 sm:gap-7"}`}
    >
      <div className="relative h-10 w-24 sm:h-12 sm:w-32">
        <Image
          src="/assets/rams-logo.png"
          alt={t("laboratory")}
          fill
          sizes="(max-width: 640px) 96px, 128px"
          className="object-contain object-left"
          priority
        />
      </div>
      <span className="h-8 w-px bg-[var(--border)]" aria-hidden="true" />
      <div className="relative h-9 w-20 sm:h-11 sm:w-28">
        <Image
          src="/assets/logo pu-kekal part2.png"
          alt={t("ais")}
          fill
          sizes="(max-width: 640px) 80px, 112px"
          className="object-contain object-left"
        />
      </div>
      {!compact && (
        <>
          <span className="h-8 w-px bg-[var(--border)]" aria-hidden="true" />
          <div className="relative h-9 w-20 sm:h-11 sm:w-28">
            <Image
              src="/assets/logo pu-kekal part2.png"
              alt={t("pui")}
              fill
              sizes="(max-width: 640px) 80px, 112px"
              className="object-contain object-left"
            />
          </div>
        </>
      )}
    </div>
  );
}
