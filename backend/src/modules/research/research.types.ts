import { ObjectId } from "mongodb";

export const RESEARCH_AREA_CODES = [
  "RISK",
  "AIS",
  "RAM",
  "RCM",
  "DESIGN",
  "SIM",
] as const;
export type ResearchAreaCode = (typeof RESEARCH_AREA_CODES)[number];

export interface BilingualText {
  en: string;
  id: string;
}

export interface ResearchArea {
  _id?: ObjectId;
  code: string;
  slug: string;
  title: BilingualText;
  description: BilingualText;
  downloadablePng?: string;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
}

export type PublicResearchArea = Omit<
  ResearchArea,
  "_id" | "createdAt" | "updatedAt" | "updatedBy"
>;
