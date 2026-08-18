import { z } from "zod";

const text = z.string().trim().min(1).max(5000);

export const bilingualTextSchema = z.object({
  en: text,
  id: text,
});

const principleFields = z.object({
  title: bilingualTextSchema,
  description: bilingualTextSchema,
});

const fixedPrinciple = <T extends "R" | "A" | "M" | "S">(key: T) => principleFields.extend({ key: z.literal(key) });
const principleTuple = z.tuple([fixedPrinciple("R"), fixedPrinciple("A"), fixedPrinciple("M"), fixedPrinciple("S")]);
const focusItems = z.tuple([bilingualTextSchema, bilingualTextSchema, bilingualTextSchema, bilingualTextSchema, bilingualTextSchema]);
const addressLines = z.tuple([bilingualTextSchema, bilingualTextSchema, bilingualTextSchema, bilingualTextSchema]);

export const homepageContentSchema = z.object({
  hero: z.object({
    headline: bilingualTextSchema,
    description: bilingualTextSchema,
    primaryCta: bilingualTextSchema,
    secondaryCta: bilingualTextSchema,
  }),
  principles: principleTuple,
  ecosystem: z.object({
    title: bilingualTextSchema,
    aisDescription: bilingualTextSchema,
  }),
  research: z.object({
    title: bilingualTextSchema,
    description: bilingualTextSchema,
    linkLabel: bilingualTextSchema,
  }),
  projects: z.object({
    title: bilingualTextSchema,
  }),
  cta: z.object({
    title: bilingualTextSchema,
    description: bilingualTextSchema,
    buttonLabel: bilingualTextSchema,
  }),
});

export const aboutContentSchema = z.object({
  hero: z.object({
    eyebrow: bilingualTextSchema,
    title: bilingualTextSchema,
    description: bilingualTextSchema,
  }),
  principles: z.object({ heading: bilingualTextSchema, items: principleTuple }),
  researchApproach: z.object({
    eyebrow: bilingualTextSchema,
    title: bilingualTextSchema,
    description: bilingualTextSchema,
  }),
  researchFocus: z.object({
    title: bilingualTextSchema,
    description: bilingualTextSchema,
    items: focusItems,
  }),
  marineContext: z.object({
    title: bilingualTextSchema,
    description: bilingualTextSchema,
  }),
  ecosystem: z.object({ title: bilingualTextSchema }),
  profile: z.object({
    title: bilingualTextSchema,
    items: z.tuple([
      z.object({ label: bilingualTextSchema, value: bilingualTextSchema }),
      z.object({ label: bilingualTextSchema, value: bilingualTextSchema }),
      z.object({ label: bilingualTextSchema, value: bilingualTextSchema }),
      z.object({ label: bilingualTextSchema, value: bilingualTextSchema }),
    ]),
  }),
  cta: z.object({
    title: bilingualTextSchema,
    description: bilingualTextSchema,
    buttonLabel: bilingualTextSchema,
  }),
});

export const contactContentSchema = z.object({
  hero: z.object({
    eyebrow: bilingualTextSchema,
    title: bilingualTextSchema,
    description: bilingualTextSchema,
  }),
  homePreview: z.object({
    eyebrow: bilingualTextSchema,
    title: bilingualTextSchema,
    description: bilingualTextSchema,
  }),
  details: z.object({
    title: bilingualTextSchema,
    email: bilingualTextSchema,
    addressLines,
    socialText: bilingualTextSchema,
  }),
  collaboration: z.object({
    title: bilingualTextSchema,
    description: bilingualTextSchema,
    buttonLabel: bilingualTextSchema,
  }),
});

export const footerContentSchema = z.object({
  description: bilingualTextSchema,
  email: bilingualTextSchema,
  socialText: bilingualTextSchema,
  addressLines,
  copyright: bilingualTextSchema,
  institution: bilingualTextSchema,
});

export const siteContentSchemas = {
  homepage: homepageContentSchema,
  about: aboutContentSchema,
  contact: contactContentSchema,
  footer: footerContentSchema,
};

export type HomepageContentInput = z.infer<typeof homepageContentSchema>;
export type AboutContentInput = z.infer<typeof aboutContentSchema>;
export type ContactContentInput = z.infer<typeof contactContentSchema>;
export type FooterContentInput = z.infer<typeof footerContentSchema>;
