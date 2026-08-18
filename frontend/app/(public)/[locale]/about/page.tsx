import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import PublicContainer from "@/components/public/public-container";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import RevealOnScroll from "@/components/public/reveal-on-scroll";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return localizedMetadata({ locale: locale as Locale, title: t("heroTitle"), description: t("heroDescription"), path: "/about" });
}

export default function AboutPage() {
  const t = useTranslations("about");
  const common = useTranslations("common");

  return (
    <>
...

      <section className="bg-white py-16 sm:py-24">
        <PublicContainer className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="hero-entrance">
            <p className="eyebrow">{t("heroEyebrow")}</p>
            <h1 className="mt-4 font-display text-5xl font-bold leading-tight text-[var(--navy)]">{t("heroTitle")}</h1>
            <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">{t("heroDescription")}</p>
            <Link href="/research" className="mt-8 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">
              {common("explore")} →
            </Link>
          </div>
          <div className="group relative h-[400px] w-full overflow-hidden rounded-lg">
            <Image src="/assets/research-marine.jpg" alt={t("heroTitle")} fill className="public-image-zoom object-cover" />
          </div>
        </PublicContainer>
      </section>

      <section className="bg-[var(--background-light)] py-20">
        <PublicContainer>
          <RevealOnScroll className="text-center"><h2 className="font-display text-2xl font-bold text-[var(--navy)]">What RAMS means</h2></RevealOnScroll>
          <RevealOnScroll className="mt-12 grid grid-cols-1 border-t border-b border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4" stagger={120}>
            {[
              { letter: "R", title: "Reliability", desc: "Systems should perform consistently and dependably." },
              { letter: "A", title: "Availability", desc: "Systems should be ready when they are needed." },
              { letter: "M", title: "Maintainability", desc: "Systems should be practical to inspect, repair, and keep operational." },
              { letter: "S", title: "Safety", desc: "Systems should protect people, assets, and the environment." },
            ].map((item, i) => (
              <div key={item.letter} className={`public-card-interaction p-8 ${i < 3 ? "lg:border-r border-[var(--border)]" : ""}`}>
                <span className="font-display text-4xl font-bold text-[var(--rams-red)]">{item.letter}</span>
                <h3 className="mt-4 font-bold text-[var(--navy)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--gray)]">{item.desc}</p>
              </div>
            ))}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-white py-20">
        <PublicContainer>
          <RevealOnScroll className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20" stagger={120}>
          <div className="group relative h-[400px] w-full overflow-hidden rounded-lg">
            <Image src="/assets/engineers.jpg" alt="Engineering" fill className="public-image-zoom object-cover" />
          </div>
          <div>
            <p className="eyebrow">RESEARCH APPROACH</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-[var(--navy)]">From engineering questions to decisions that matter.</h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">RAMS research connects engineering analysis with real operational challenges. The laboratory studies system performance, risk, maintenance, reliability, and safety to support better engineering decisions throughout the system lifecycle.</p>
          </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-[var(--background-light)] py-20">
        <PublicContainer>
          <RevealOnScroll>
            <h2 className="font-display text-3xl font-bold text-[var(--navy)]">Our Research Focus</h2>
            <p className="mt-4 text-[var(--gray)]">Research areas focused on safer, more reliable marine and industrial systems.</p>
          </RevealOnScroll>
          <RevealOnScroll className="mt-12 grid gap-8 border-t border-[var(--border)] pt-12 sm:grid-cols-2 lg:grid-cols-3" stagger={100}>
            {[
              "Reliability Engineering",
              "Risk & Safety Assessment",
              "Maintenance & Asset Management",
              "Marine Systems & AIS",
              "Simulation & Decision Support",
            ].map((area, i) => (
              <div key={area} className="public-card-interaction flex gap-6">
                <span className="font-display text-2xl font-bold text-[var(--gray)]/50">0{i + 1}</span>
                <h3 className="text-xl font-bold text-[var(--navy)]">{area}</h3>
              </div>
            ))}
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-white py-20">
        <PublicContainer>
          <RevealOnScroll className="grid gap-12 lg:grid-cols-2 lg:items-center" stagger={120}>
            <div>
                <h2 className="font-display text-4xl font-bold text-[var(--navy)]">Research grounded in marine systems.</h2>
                <p className="mt-6 text-lg leading-relaxed text-[var(--gray)]">RAMS research directly addresses marine engineering and maritime system challenges, focusing on operational reliability, safety, and maintenance.</p>
            </div>
            <div className="group relative h-[300px] w-full overflow-hidden rounded-lg">
                <Image src="/assets/research-marine.jpg" alt="Marine Research" fill className="public-image-zoom object-cover" />
            </div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-[var(--background-light)] py-16">
        <PublicContainer>
          <RevealOnScroll className="text-center"><h2 className="font-display text-2xl font-bold text-[var(--navy)]">Part of the ITS Research Ecosystem</h2></RevealOnScroll>
          <RevealOnScroll className="mt-12 flex flex-wrap items-center justify-center gap-12" stagger={120}>
            <div className="public-logo-interaction relative h-16 w-24"><Image src="/assets/rams-logo.png" alt="RAMS" fill className="object-contain" /></div>
            <div className="public-logo-interaction relative h-20 w-32"><Image src="/assets/ais-its-logo.png" alt="AIS-ITS" fill className="object-contain" /></div>
            <div className="public-logo-interaction relative h-20 w-32"><Image src="/assets/pui-kekal-logo.png" alt="PUI-KEKAL" fill className="object-contain" /></div>
          </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-white py-20">
        <PublicContainer>
            <RevealOnScroll><h2 className="font-display text-3xl font-bold text-[var(--navy)]">Laboratory Profile</h2></RevealOnScroll>
            <RevealOnScroll className="mt-10 grid gap-6 border-t border-[var(--border)] pt-10 sm:grid-cols-2 lg:grid-cols-4" stagger={100}>
                {[
                    ["Institution", "Institut Teknologi Sepuluh Nopember (ITS)"],
                    ["Laboratory", "RAMS Laboratory"],
                    ["Established", "1997"],
                    ["Base", "Gedung WA, Kampus ITS Sukolilo, Surabaya"],
                ].map(([label, value]) => (
                    <div key={label} className="public-card-interaction">
                        <p className="eyebrow">{label}</p>
                        <p className="mt-2 text-sm text-[var(--navy)]">{value}</p>
                    </div>
                ))}
            </RevealOnScroll>
        </PublicContainer>
      </section>

      <section className="bg-[var(--navy)] py-20 text-white">
        <PublicContainer>
          <RevealOnScroll className="text-center">
            <h2 className="font-display text-4xl font-bold">Research is useful when<br/>it helps people make better decisions.</h2>
            <p className="mt-6 text-lg text-white/80">Explore the research, projects, and systems we work on.</p>
            <Link href="/research" className="mt-10 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]">Explore our research →</Link>
          </RevealOnScroll>
        </PublicContainer>
      </section>
    </>
  );
}
