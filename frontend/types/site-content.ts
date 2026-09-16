export type SiteContentKey = "homepage" | "about" | "contact" | "footer";

export interface BilingualText {
  en: string;
  id: string;
}

export interface SiteContentImage {
  url: string;
  publicId?: string;
  alt?: BilingualText;
  position?: HeroImagePosition;
}

export interface HeroImagePosition {
  x: number;
  y: number;
}

export interface SiteContentPrinciple {
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
  image?: SiteContentImage;
  imageAlt: BilingualText;
}

export interface HomepageContent {
  principles: [
    SiteContentPrinciple,
    SiteContentPrinciple,
    SiteContentPrinciple,
    SiteContentPrinciple,
  ];
  ecosystem: {
    title: BilingualText;
    ramsDescription?: BilingualText;
    aisDescription: BilingualText;
    puiKekalDescription?: BilingualText;
  };
  projects: { title: BilingualText; featuredLimit?: number };
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
      SiteContentPrinciple,
      SiteContentPrinciple,
      SiteContentPrinciple,
      SiteContentPrinciple,
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
  marineContext: { title: BilingualText; description: BilingualText };
  ecosystem: { title: BilingualText };
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

export interface SiteContentMap {
  homepage: HomepageContent;
  about: AboutContent;
  contact: ContactContent;
  footer: FooterContent;
}

export interface SiteContentEnvelope<
  K extends SiteContentKey = SiteContentKey,
> {
  key: K;
  page: K;
  content: SiteContentMap[K];
}

export interface SiteContentAdminEnvelope<
  K extends SiteContentKey = SiteContentKey,
> extends SiteContentEnvelope<K> {
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}
