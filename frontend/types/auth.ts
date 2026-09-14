export type UserRole = "ADMIN" | "DOSEN" | "ALUMNI" | "PUBLICATION_EDITOR";

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
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
