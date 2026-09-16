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

export type ImageLayoutMode = "preset" | "custom";
export type ImagePreset = "landscape" | "wide" | "portrait" | "square";
export type ImageFit = "cover" | "contain";
export type ImagePosition = "center" | "top" | "bottom" | "left" | "right";
export type CropAspectRatio = "4/3" | "16/9" | "1/1" | "3/4" | "9/16" | "custom";

export const IMAGE_LAYOUT_DEFAULTS = {
  imageLayout: "preset" as ImageLayoutMode,
  imagePreset: "portrait" as ImagePreset,
  gridColumns: 4,
  gridRows: 3,
  imageFit: "cover" as ImageFit,
  imagePosition: "center" as ImagePosition,
};

export const CROP_DEFAULTS = {
  cropAspectRatio: "4/3" as CropAspectRatio,
  cropPositionX: 50,
  cropPositionY: 50,
  cropScale: 1,
  customWidth: undefined as number | undefined,
  customHeight: undefined as number | undefined,
};

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
  imageLayout?: ImageLayoutMode;
  imagePreset?: ImagePreset;
  gridColumns?: number;
  gridRows?: number;
  imageFit?: ImageFit;
  imagePosition?: ImagePosition;
  cropAspectRatio?: CropAspectRatio;
  cropPositionX?: number;
  cropPositionY?: number;
  cropScale?: number;
  customWidth?: number;
  customHeight?: number;
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
