export type UserRole = "ADMIN" | "DOSEN" | "ALUMNI";

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
  mustChangePassword?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  tahunAngkatan: number;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export type InternalAccountRole = "ADMIN" | "DOSEN";

export interface InternalAccountInput {
  fullName: string;
  email: string;
  role: InternalAccountRole;
}

export interface InternalAccountResult {
  id: string;
  displayName: string;
  email: string;
  role: InternalAccountRole;
  isActive: boolean;
  mustChangePassword: boolean;
  temporaryPassword: string;
}

export interface AdminPasswordResetResult {
  userId: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
  mustChangePassword: true;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}
