import { ObjectId } from "mongodb";

export interface PasswordResetToken {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}
