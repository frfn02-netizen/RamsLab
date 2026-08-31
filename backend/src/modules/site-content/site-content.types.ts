import { ObjectId } from "mongodb";

export const SITE_CONTENT_KEYS = [
  "homepage",
  "about",
  "contact",
  "footer",
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
  HomepageContent | AboutContent | ContactContent | FooterContent;

export interface HomepagePrinciple {
  key: "R" | "A" | "M" | "S";
  title: BilingualText;
  description: BilingualText;
}

export interface HomepageContent {
  hero: {
    headline: BilingualText;
    description: BilingualText;
    primaryCta: BilingualText;
    secondaryCta: BilingualText;
  };
  principles: [
    HomepagePrinciple,
    HomepagePrinciple,
    HomepagePrinciple,
    HomepagePrinciple,
  ];
  ecosystem: {
    title: BilingualText;
    aisDescription: BilingualText;
  };
  research: {
    title: BilingualText;
    description: BilingualText;
    linkLabel: BilingualText;
  };
  projects: {
    title: BilingualText;
  };
  cta: {
    title: BilingualText;
    description: BilingualText;
    buttonLabel: BilingualText;
  };
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
