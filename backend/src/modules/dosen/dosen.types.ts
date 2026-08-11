import { ObjectId } from "mongodb";

export interface Dosen {
  _id?: ObjectId;

  userId: ObjectId;

  fullName: string;

  employeeId?: string;

  title?: string;

  position?: string;

  specialization: string[];

  email?: string;

  phone?: string;

  photo?: string;

  bio?: string;

  linkedin?: string;

  isPublic: boolean;

  createdAt: Date;

  updatedAt: Date;
}