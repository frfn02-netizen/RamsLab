import { ObjectId } from "mongodb";

export interface BilingualText {
  en: string;
  id: string;
}

export interface ResearchHighlightImage {
  url: string;
  publicId?: string;
}

export interface ResearchHighlight {
  _id?: ObjectId;
  headline: BilingualText;
  publicationId: ObjectId;
  image?: ResearchHighlightImage;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId | null;
}

export interface ResearchHighlightPublication {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi: string | null;
  pdfUrl: string | null;
}

export interface ResearchHighlightWithPublication extends ResearchHighlight {
  publication: ResearchHighlightPublication;
}
