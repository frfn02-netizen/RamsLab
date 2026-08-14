import type { UserRole } from "../users/user.types.js";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  tokenVersion: number;
}
