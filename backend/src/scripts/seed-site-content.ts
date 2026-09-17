import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import { createSiteContentIndexes } from "../modules/site-content/site-content.index.js";
import {
  getSiteContentCollection,
  upsertSiteContent,
} from "../modules/site-content/site-content.repository.js";
import {
  aboutContentSchema,
  contactContentSchema,
  footerContentSchema,
  homepageContentSchema,
} from "../modules/site-content/site-content.schema.js";
import {
  SITE_CONTENT_KEYS,
  type SiteContentContent,
} from "../modules/site-content/site-content.types.js";

const text = (en: string, id: string) => ({ en, id });
const principle = (
  key: "R" | "A" | "M" | "S",
  titleEn: string,
  descriptionEn: string,
  titleId = titleEn,
  descriptionId = descriptionEn,
) => ({
  key,
  title: text(titleEn, titleId),
  description: text(descriptionEn, descriptionId),
});

export const developmentHeadOfLaboratory = {
  eyebrow: text("LABORATORY HEAD", "KEPALA LABORATORIUM"),
  title: text(
    "Greetings from our Head of Laboratory",
    "Salam dari Kepala Laboratorium",
  ),
  greeting: text(
    "Welcome to RAMS Laboratory. We connect rigorous research with practical engineering decisions for safer, more dependable systems.",
    "Selamat datang di Laboratorium RAMS. Kami menghubungkan riset yang ketat dengan keputusan rekayasa praktis untuk sistem yang lebih aman dan andal.",
  ),
  name: "Dr. Eng. Dhimas Widhi Handani, S.T., M.Sc.",
  role: text("Head of RAMS Laboratory", "Kepala Laboratorium RAMS"),
  s1: text("Reliability and availability", "Keandalan dan ketersediaan"),
  s2: text("Safety and risk", "Keselamatan dan risiko"),
  s3: text("Marine systems", "Sistem maritim"),
  imageAlt: text(
    "Dr. Eng. Dhimas Widhi Handani, Head of RAMS Laboratory",
    "Dr. Eng. Dhimas Widhi Handani, Kepala Laboratorium RAMS",
  ),
};

export async function ensureDevelopmentHeadOfLaboratory() {
  await getSiteContentCollection().updateOne(
    {
      key: "homepage",
      "content.headOfLaboratory": { $exists: false },
    },
    { $set: { "content.headOfLaboratory": developmentHeadOfLaboratory } },
  );
}

export const contentByKey = {
  homepage: homepageContentSchema.parse({
    hero: {
      headline: text(
        "Reliability, safety & marine systems research.",
        "Riset keandalan, keselamatan & sistem maritim.",
      ),
      description: text(
        "We study the systems behind safe, dependable maritime and industrial operations—from risk assessment and AIS monitoring to maintenance, reliability, and simulation.",
        "Kami mempelajari sistem di balik operasi maritim dan industri yang aman dan andal—mulai dari asesmen risiko dan pemantauan AIS hingga pemeliharaan, keandalan, dan simulasi.",
      ),
      primaryCta: text("Explore our research", "Jelajahi riset kami"),
      secondaryCta: text("About the laboratory", "Tentang laboratorium"),
    },
    principles: [
      principle("R", "Reliability", "Modeling and predicting system behavior"),
      principle("A", "Availability", "Ensuring systems are ready when needed"),
      principle("M", "Management", "Optimizing Management strategies"),
      principle("S", "Safety", "Reducing risks in complex environments"),
    ],
    ecosystem: {
      title: text(
        "Part of the ITS Research Ecosystem",
        "Bagian dari Ekosistem Riset ITS",
      ),
      aisDescription: text(
        "Automatic Information System\nInstitut Teknologi Sepuluh Nopember",
        "Automatic Information System\nInstitut Teknologi Sepuluh Nopember",
      ),
      ramsDescription: text(
        "Reliability, availability, maintainability, and safety research for dependable systems.",
        "Riset keandalan, ketersediaan, kemudahan pemeliharaan, dan keselamatan untuk sistem yang andal.",
      ),
      puiKekalDescription: text(
        "Center for sustainable energy and maritime systems research.",
        "Pusat riset energi berkelanjutan dan sistem maritim.",
      ),
    },
    research: {
      title: text("Our Research Areas", "Our Research Areas"),
      description: text(
        "Focused research for safer and more reliable marine and industrial systems.",
        "Focused research for safer and more reliable marine and industrial systems.",
      ),
      linkLabel: text("View all research", "View all research"),
    },
    projects: {
      title: text("Featured Projects", "Featured Projects"),
      featuredLimit: 3,
    },
    cta: {
      title: text(
        "Let's build safer, more\nreliable marine systems.",
        "Let's build safer, more\nreliable marine systems.",
      ),
      description: text(
        "Research collaboration, industrial projects,\nand engineering partnerships.",
        "Research collaboration, industrial projects,\nand engineering partnerships.",
      ),
      buttonLabel: text("Discuss a collaboration", "Discuss a collaboration"),
    },
  }),
  about: aboutContentSchema.parse({
    hero: {
      eyebrow: text("About the laboratory", "Tentang laboratorium"),
      title: text(
        "A research laboratory for dependable systems.",
        "Laboratorium riset untuk sistem yang andal.",
      ),
      description: text(
        "RAMS Laboratory works at the intersection of marine engineering, industrial reliability, safety, maintenance, and maritime systems.",
        "Laboratorium RAMS bekerja di persimpangan rekayasa kelautan, keandalan industri, keselamatan, pemeliharaan, dan sistem maritim.",
      ),
    },
    principles: {
      heading: text("What RAMS means", "What RAMS means"),
      items: [
        principle(
          "R",
          "Reliability",
          "Systems should perform consistently and dependably.",
        ),
        principle(
          "A",
          "Availability",
          "Systems should be ready when they are needed.",
        ),
        principle(
          "M",
          "Management",
          "Systems should be practical to inspect, repair, and keep operational.",
        ),
        principle(
          "S",
          "Safety",
          "Systems should protect people, assets, and the environment.",
        ),
      ],
    },
    researchApproach: {
      eyebrow: text("RESEARCH APPROACH", "RESEARCH APPROACH"),
      title: text(
        "From engineering questions to decisions that matter.",
        "From engineering questions to decisions that matter.",
      ),
      description: text(
        "RAMS research connects engineering analysis with real operational challenges. The laboratory studies system performance, risk, maintenance, reliability, and safety to support better engineering decisions throughout the system lifecycle.",
        "RAMS research connects engineering analysis with real operational challenges. The laboratory studies system performance, risk, maintenance, reliability, and safety to support better engineering decisions throughout the system lifecycle.",
      ),
    },
    researchFocus: {
      title: text("Our Research Focus", "Our Research Focus"),
      description: text(
        "Research areas focused on safer, more reliable marine and industrial systems.",
        "Research areas focused on safer, more reliable marine and industrial systems.",
      ),
      items: [
        text("Reliability Engineering", "Reliability Engineering"),
        text("Risk & Safety Assessment", "Risk & Safety Assessment"),
        text(
          "Maintenance & Asset Management",
          "Maintenance & Asset Management",
        ),
        text("Marine Systems & AIS", "Marine Systems & AIS"),
        text("Simulation & Decision Support", "Simulation & Decision Support"),
      ],
    },
    marineContext: {
      title: text(
        "Research grounded in marine systems.",
        "Research grounded in marine systems.",
      ),
      description: text(
        "RAMS research directly addresses marine engineering and maritime system challenges, focusing on operational reliability, safety, and maintenance.",
        "RAMS research directly addresses marine engineering and maritime system challenges, focusing on operational reliability, safety, and maintenance.",
      ),
    },
    ecosystem: {
      title: text(
        "Part of the ITS Research Ecosystem",
        "Part of the ITS Research Ecosystem",
      ),
    },
    profile: {
      title: text("Laboratory Profile", "Laboratory Profile"),
      items: [
        {
          label: text("Institution", "Institution"),
          value: text(
            "Institut Teknologi Sepuluh Nopember (ITS)",
            "Institut Teknologi Sepuluh Nopember (ITS)",
          ),
        },
        {
          label: text("Laboratory", "Laboratory"),
          value: text("RAMS Laboratory", "RAMS Laboratory"),
        },
        {
          label: text("Established", "Established"),
          value: text("1997", "1997"),
        },
        {
          label: text("Base", "Base"),
          value: text(
            "Gedung WA, Kampus ITS Sukolilo, Surabaya",
            "Gedung WA, Kampus ITS Sukolilo, Surabaya",
          ),
        },
      ],
    },
    cta: {
      title: text(
        "Research is useful when\nit helps people make better decisions.",
        "Research is useful when\nit helps people make better decisions.",
      ),
      description: text(
        "Explore the research, projects, and systems we work on.",
        "Explore the research, projects, and systems we work on.",
      ),
      buttonLabel: text("Explore our research", "Explore our research"),
    },
  }),
  contact: contactContentSchema.parse({
    hero: {
      eyebrow: text("Contact", "Kontak"),
      title: text("Get in touch.", "Hubungi kami."),
      description: text(
        "For research collaboration, industrial consulting, or questions about the laboratory, reach out through the channels below.",
        "Untuk kolaborasi riset, konsultasi industri, atau pertanyaan tentang laboratorium, hubungi kami melalui kanal berikut.",
      ),
    },
    homePreview: {
      eyebrow: text("GET IN TOUCH", "HUBUNGI KAMI"),
      title: text(
        "Let's talk about your next engineering challenge.",
        "Mari bicarakan tantangan rekayasa Anda berikutnya.",
      ),
      description: text(
        "Research collaboration, engineering projects, technical discussions, and marine systems inquiries.",
        "Kolaborasi riset, proyek rekayasa, diskusi teknis, dan kebutuhan sistem maritim.",
      ),
    },
    details: {
      title: text("Contact Information", "Informasi Kontak"),
      email: text("jtsp@its.ac.id", "jtsp@its.ac.id"),
      addressLines: [
        text("Gedung WA", "Gedung WA"),
        text("Kampus ITS Sukolilo", "Kampus ITS Sukolilo"),
        text("Surabaya 60111", "Surabaya 60111"),
        text("Indonesia", "Indonesia"),
      ],
      socialText: text(
        "Instagram · RAMS Laboratory",
        "Instagram · Laboratorium RAMS",
      ),
    },
    collaboration: {
      title: text("Research & Collaboration", "Riset & Kolaborasi"),
      description: text(
        "RAMS Laboratory is open to research collaboration, engineering projects, technical discussions, and industry collaboration.",
        "Laboratorium RAMS terbuka untuk kolaborasi riset, proyek rekayasa, diskusi teknis, dan kolaborasi industri.",
      ),
      buttonLabel: text("Discuss a collaboration", "Diskusikan kolaborasi"),
    },
  }),
  footer: footerContentSchema.parse({
    description: text(
      "Research and engineering for reliability, safety, management, and marine systems",
      "Riset dan rekayasa untuk keandalan, keselamatan, kemudahan pemeliharaan, dan sistem maritim.",
    ),
    email: text("jtsp@its.ac.id", "jtsp@its.ac.id"),
    socialText: text(
      "Instagram · RAMS Laboratory",
      "Instagram · Laboratorium RAMS",
    ),
    addressLines: [
      text("Gedung WA", "Gedung WA"),
      text("Kampus ITS Sukolilo", "Kampus ITS Sukolilo"),
      text("Surabaya 60111", "Surabaya 60111"),
      text("Indonesia", "Indonesia"),
    ],
    copyright: text("RAMS Laboratory", "Laboratorium RAMS"),
    institution: text(
      "Institut Teknologi Sepuluh Nopember · Surabaya",
      "Institut Teknologi Sepuluh Nopember · Surabaya",
    ),
  }),
};

async function seedSiteContent() {
  await connectDatabase();
  await createSiteContentIndexes();
  for (const key of SITE_CONTENT_KEYS) {
    await upsertSiteContent(key, contentByKey[key] as SiteContentContent);
    console.log(`Updated site content ${key}`);
  }
  await ensureDevelopmentHeadOfLaboratory();
  console.log("Ensured development Head of Laboratory content");
  console.log("✅ Site content seeded idempotently");
}

seedSiteContent().catch((error: unknown) => {
  console.error("❌ Failed to seed site content:", error);
  process.exitCode = 1;
});
