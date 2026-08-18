import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./language-switcher";
import PublicContainer from "./public-container";

const navigation = ["about", "research", "projects", "partners", "team", "contact"] as const;
const hrefs = { about: "/about", research: "/research", projects: "/projects", partners: "/partners", team: "/team", contact: "/contact" } as const;

export default function PublicFooter() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");
  const brand = useTranslations("brand");
  const language = useTranslations("language");

  return <footer className="bg-[var(--navy)] text-white">
    <PublicContainer className="py-14 sm:py-16">
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.15fr]">
        <div>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-24 shrink-0 bg-white p-2">
              <Image src="/assets/rams-logo.png" alt={brand("laboratory")} fill sizes="96px" className="object-contain" priority />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-white">{brand("laboratory")}</p>
              <p className="mt-2 text-xs leading-5 text-white/65">{brand("technicalLine")}</p>
            </div>
          </div>
          <p className="mt-6 max-w-xs text-sm leading-7 text-white/70">{t("description")}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t("navigate")}</p>
          <nav className="mt-5 grid gap-3 text-sm text-white/65" aria-label={t("navigate")}>
            {navigation.map((key) => <Link key={key} href={hrefs[key]} className="w-fit transition-colors duration-200 hover:text-[var(--rams-red)]">{nav(key)}</Link>)}
          </nav>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t("ecosystem")}</p>
          <div className="mt-5 grid gap-4 text-sm text-white/75">
            <div className="flex items-center gap-3">
              <div className="public-logo-interaction relative h-14 w-20 shrink-0 overflow-hidden bg-white">
                <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2">
                  <Image src="/assets/rams-logo.png" alt={brand("laboratory")} fill sizes="64px" className="object-contain" />
                </div>
              </div>
              <span>{brand("laboratory")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="public-logo-interaction relative h-14 w-20 shrink-0 overflow-hidden bg-white">
                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2">
                  <Image src="/assets/ais-its-logo.png" alt={brand("ais")} fill sizes="128px" className="object-contain" />
                </div>
              </div>
              <span>{brand("ais")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="public-logo-interaction relative h-14 w-20 shrink-0 overflow-hidden bg-white">
                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2">
                  <Image src="/assets/pui-kekal-logo.png" alt={brand("pui")} fill sizes="128px" className="object-contain" />
                </div>
              </div>
              <span>{brand("pui")}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{t("contact")}</p>
          <div className="mt-5 grid gap-4 text-sm text-white/65">
            <a href="mailto:jtsp@its.ac.id" className="w-fit transition-colors duration-200 hover:text-[var(--rams-red)]">jtsp@its.ac.id</a>
            <span>{t("instagram")}</span>
            <address className="not-italic leading-7">{t("address1")}<br />{t("address2")}<br />{t("address3")}<br />{t("address4")}</address>
            <div className="flex items-center gap-3">
              <span>{language("label")}</span>
              <span className="bg-white px-2 py-1"><LanguageSwitcher /></span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} {t("copyright")}</span>
        <span>{t("institution")}</span>
      </div>
    </PublicContainer>
  </footer>;
}
