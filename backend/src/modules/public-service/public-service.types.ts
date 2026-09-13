import { ObjectId } from "mongodb";

export interface BilingualText {
  en: string;
  id: string;
}

export type PeopleRefKind = "DOSEN" | "STUDENT" | "ALUMNI";

export interface PeopleRef {
  kind: PeopleRefKind;
  id: ObjectId;
}

export interface PublicServiceExpert {
  _id?: ObjectId;
  peopleRef?: PeopleRef;
  displayName?: string;
  expertise?: BilingualText;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
}

export interface PublicServiceCompany {
  id: string;
  name: string;
  description?: BilingualText;
  order: number;
  published: boolean;
}

export interface PublicServiceJob {
  id: string;
  name: BilingualText;
  description?: BilingualText;
  order: number;
  published: boolean;
}

export interface PublicService {
  _id?: ObjectId;
  code?: string;
  title: BilingualText;
  description?: BilingualText;
  shortDescription?: BilingualText;
  detailedDescription?: BilingualText;
  images: string[];
  companies: PublicServiceCompany[];
  jobs: PublicServiceJob[];
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
}

export interface PublicServiceProject {
  _id?: ObjectId;
  yearGroup: string;
  title: BilingualText;
  executingEntity: string;
  client: string;
  period: string;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
}
