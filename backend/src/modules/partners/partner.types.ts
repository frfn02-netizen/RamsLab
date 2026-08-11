import { ObjectId } from "mongodb";

export const PARTNER_TYPE = {
  UNIVERSITY: "UNIVERSITY",
  INDUSTRIAL: "INDUSTRIAL",
} as const;

export type PartnerType =
  (typeof PARTNER_TYPE)[keyof typeof PARTNER_TYPE];

export interface Partner {
  _id?: ObjectId;

  name: string;

  type: PartnerType;

  logo?: string;

  website?: string;

  country?: string;

  description?: string;

  isFeatured: boolean;

  published: boolean;

  createdAt: Date;

  updatedAt: Date;
}