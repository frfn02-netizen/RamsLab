import { ObjectId } from "mongodb";

export interface HomepageVideo {
  _id?: ObjectId;
  youtubeUrl: string;
  youtubeVideoId: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  isFeatured: boolean;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: ObjectId | null;
}

export interface PublicHomepageVideo {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title?: string | null;
  thumbnailUrl: string;
  isFeatured: boolean;
  order: number;
}
