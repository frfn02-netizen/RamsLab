import type { HomepageContent } from "@/types/site-content";

export const content: HomepageContent = {
  hero: {
    headline: { en: "English", id: "Indonesia" },
    description: { en: "Description", id: "Deskripsi" },
    primaryCta: { en: "Explore", id: "Jelajahi" },
    secondaryCta: { en: "About", id: "Tentang" },
  },
  principles: [
    {
      key: "R",
      title: { en: "Reliability", id: "Keandalan" },
      description: { en: "R", id: "R" },
    },
    {
      key: "A",
      title: { en: "Availability", id: "Ketersediaan" },
      description: { en: "A", id: "A" },
    },
    {
      key: "M",
      title: { en: "Management", id: "Manajemen" },
      description: { en: "M", id: "M" },
    },
    {
      key: "S",
      title: { en: "Safety", id: "Keselamatan" },
      description: { en: "S", id: "S" },
    },
  ],
  ecosystem: {
    title: { en: "Ecosystem", id: "Ekosistem" },
    aisDescription: { en: "AIS", id: "AIS" },
  },
  research: {
    title: { en: "Research", id: "Riset" },
    description: { en: "Description", id: "Deskripsi" },
    linkLabel: { en: "Explore", id: "Jelajahi" },
  },
  projects: { title: { en: "Projects", id: "Proyek" } },
  cta: {
    title: { en: "CTA", id: "CTA" },
    description: { en: "Description", id: "Deskripsi" },
    buttonLabel: { en: "Contact", id: "Kontak" },
  },
};
