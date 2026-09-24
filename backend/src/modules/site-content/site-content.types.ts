import { ObjectId } from "mongodb";

export const SITE_CONTENT_KEYS = [
  "homepage",
  "about",
  "contact",
  "footer",
  "public-service",
] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

export interface BilingualText {
  en: string;
  id: string;
}

export interface SiteContentDocument {
  _id?: ObjectId;
  key: SiteContentKey;
  page: SiteContentKey;
  content: SiteContentContent;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
}

export type SiteContentContent =
  | HomepageContent
  | AboutContent
  | ContactContent
  | FooterContent
  | PublicServiceContent;

export interface HomepagePrinciple {
  key: "R" | "A" | "M" | "S";
  title: BilingualText;
  description: BilingualText;
}

export interface HeadOfLaboratoryContent {
  eyebrow: BilingualText;
  title: BilingualText;
  greeting: BilingualText;
  name: string;
  role: BilingualText;
  s1: BilingualText;
  s2: BilingualText;
  s3: BilingualText;
  image?: {
    url: string;
    publicId?: string;
  };
  imageAlt: BilingualText;
}

export interface HomepageContent {
  principles: [
    HomepagePrinciple,
    HomepagePrinciple,
    HomepagePrinciple,
    HomepagePrinciple,
  ];
  ecosystem: {
    title: BilingualText;
    ramsDescription?: BilingualText;
    aisDescription: BilingualText;
    puiKekalDescription?: BilingualText;
  };
  projects: {
    title: BilingualText;
  };
  headOfLaboratory?: HeadOfLaboratoryContent;
  showHeadOfLaboratoryOnHomepage?: boolean;
  showWhoWeAreOnHomepage?: boolean;
  showEcosystemOnHomepage?: boolean;
}

export interface AboutContent {
  hero: {
    eyebrow: BilingualText;
    title: BilingualText;
    description: BilingualText;
  };
  principles: {
    heading: BilingualText;
    items: [
      HomepagePrinciple,
      HomepagePrinciple,
      HomepagePrinciple,
      HomepagePrinciple,
    ];
  };
  researchApproach: {
    eyebrow: BilingualText;
    title: BilingualText;
    description: BilingualText;
  };
  researchFocus: {
    title: BilingualText;
    description: BilingualText;
    items: [
      BilingualText,
      BilingualText,
      BilingualText,
      BilingualText,
      BilingualText,
    ];
  };
  marineContext: {
    title: BilingualText;
    description: BilingualText;
  };
  ecosystem: {
    title: BilingualText;
  };
  profile: {
    title: BilingualText;
    items: [
      { label: BilingualText; value: BilingualText },
      { label: BilingualText; value: BilingualText },
      { label: BilingualText; value: BilingualText },
      { label: BilingualText; value: BilingualText },
    ];
  };
  cta: {
    title: BilingualText;
    description: BilingualText;
    buttonLabel: BilingualText;
  };
}

export interface ContactContent {
  hero: {
    eyebrow: BilingualText;
    title: BilingualText;
    description: BilingualText;
  };
  homePreview: {
    eyebrow: BilingualText;
    title: BilingualText;
    description: BilingualText;
  };
  details: {
    title: BilingualText;
    email: BilingualText;
    addressLines: [BilingualText, BilingualText, BilingualText, BilingualText];
    socialText: BilingualText;
  };
  collaboration: {
    title: BilingualText;
    description: BilingualText;
    buttonLabel: BilingualText;
  };
}

export interface FooterContent {
  description: BilingualText;
  email: BilingualText;
  socialText: BilingualText;
  addressLines: [BilingualText, BilingualText, BilingualText, BilingualText];
  copyright: BilingualText;
  institution: BilingualText;
}

export interface PublicServiceContent {
  hero: {
    eyebrow: BilingualText;
    title: BilingualText;
    description: BilingualText;
  };
  services: {
    title: BilingualText;
  };
  experts: {
    title: BilingualText;
  };
}
