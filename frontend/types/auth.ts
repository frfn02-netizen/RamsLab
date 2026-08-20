export type UserRole =
  | "ADMIN"
  | "DOSEN"
  | "ALUMNI"
  | "PUBLICATION_EDITOR";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface ManagedAccount {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}
