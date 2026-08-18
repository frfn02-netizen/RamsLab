import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ResearchAreaCode } from "./content";

export default function MaritimeApplicationCard({ image, area }: { image: string; area: ResearchAreaCode }) {
  const t = useTranslations("research.areas");
  const common = useTranslations("common");
  return <Link href={`/research#${area.toLowerCase()}`} className="public-card-interaction group relative block min-h-[300px] overflow-hidden bg-[var(--navy)] text-white"><Image src={image} alt={t(`${area}.title`)} fill sizes="(max-width: 768px) 100vw, 25vw" className="public-image-zoom object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[var(--navy)]/90 via-[var(--navy)]/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6"><p className="public-card-title text-sm font-semibold text-[var(--ais-blue-light)]">{t(`${area}.title`)}</p><p className="mt-2 text-sm leading-6 text-white/80">{t(`${area}.description`)}</p><span className="public-card-arrow mt-4 inline-block text-sm font-semibold text-white">{common("explore")} <span aria-hidden="true">↗</span></span></div></Link>;
}
