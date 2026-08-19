import { ObjectId } from "mongodb";

export interface Publication {
  _id?: ObjectId;
  title: string;
  authors: string[];
  publicationType: string;
  year: number;
  journal: string;
  doi: string | null;
  pdfUrl: string | null;
  topics: string[];
  methods: string[];
  normalizedTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PublicationResponse = Omit<Publication, "normalizedTitle">;
