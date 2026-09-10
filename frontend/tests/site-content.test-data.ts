import type { HomepageContent } from "@/types/site-content";

export const content: HomepageContent = {
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
    ramsDescription: { en: "RAMS", id: "RAMS" },
    aisDescription: { en: "AIS", id: "AIS" },
    puiKekalDescription: { en: "PUI", id: "PUI" },
  },
  projects: { title: { en: "Projects", id: "Proyek" } },
};
