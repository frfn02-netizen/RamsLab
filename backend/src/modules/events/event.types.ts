import { ObjectId } from "mongodb";

export interface BilingualText {
  en: string;
  id: string;
}

export interface EventImage {
  url: string;
  publicId?: string;
  alt?: BilingualText;
}

export interface Event {
  _id?: ObjectId;
  title: BilingualText;
  description?: BilingualText;
  image?: EventImage;
  eventDate?: Date | null;
  location?: BilingualText;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId;
}

export interface PublicEvent {
  id: string;
  title: BilingualText;
  description?: BilingualText;
  image?: EventImage;
  eventDate?: string | null;
  location?: BilingualText;
  order: number;
}
