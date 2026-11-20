import type {
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/types/auth";
import { apiRequestWithMeta, clearCsrfToken, setCsrfToken } from "./client";
import { ApiError } from "./errors";

type LoginUser = {
  id: string;
  email: string;
  displayName?: string;
  fullName?: string;
  role: AuthUser["role"];
  isActive?: boolean;
  permissions?: string[];
  mustChangePassword?: boolean;
  labMembership?: AuthUser["labMembership"];
};
type MeUser = {
  userId: string;
  fullName?: string;
  role: AuthUser["role"];
  permissions?: string[];
  mustChangePassword?: boolean;
  labMembership?: AuthUser["labMembership"];
};
type CsrfResponse = { csrfToken: string };

function normalizeUser(
  user: LoginUser | MeUser,
  fallback?: AuthUser,
): AuthUser {
  if ("userId" in user) {
    return {
      id: user.userId,
      email: fallback?.email,
      fullName: user.fullName ?? fallback?.fullName,
      role: user.role,
      isActive: fallback?.isActive ?? true,
      permissions: user.permissions ?? fallback?.permissions ?? [],
      mustChangePassword:
        user.mustChangePassword ?? fallback?.mustChangePassword ?? false,
      labMembership: user.labMembership ?? fallback?.labMembership ?? null,
    };
  }
  return {
    id: user.id,
    email: user.email,
    fullName:
      user.fullName ??
      user.displayName ??
      fallback?.fullName,
    role: user.role,
    isActive: user.isActive ?? true,
    permissions: user.permissions ?? fallback?.permissions ?? [],
    mustChangePassword: user.mustChangePassword ?? false,
    labMembership: user.labMembership ?? null,
  };
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const response = await apiRequestWithMeta<LoginUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (response.csrfToken) setCsrfToken(response.csrfToken);
  const loggedInUser = response.user ?? response.data;
  if (!loggedInUser)
    throw new ApiError("Login response did not contain a user", 502);
  return getCurrentUser(normalizeUser(loggedInUser));
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const response = await apiRequestWithMeta<LoginUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (response.csrfToken) setCsrfToken(response.csrfToken);
  const registeredUser = response.user ?? response.data;
  if (!registeredUser)
    throw new ApiError("Registration response did not contain a user", 502);
  return getCurrentUser(normalizeUser(registeredUser));
}

export async function getCurrentUser(fallback?: AuthUser): Promise<AuthUser> {
  const response = await apiRequestWithMeta<MeUser>("/auth/me");
  const me = response.user ?? response.data;
  if (!me) throw new ApiError("Authentication required", 401);
  await refreshCsrfToken();
  return normalizeUser(me, fallback);
}

export async function refreshCsrfToken() {
  const response = await apiRequestWithMeta<CsrfResponse>("/auth/csrf");
  if (!response.csrfToken)
    throw new ApiError("CSRF token response was invalid", 502);
  setCsrfToken(response.csrfToken);
}

export async function logout() {
  try {
    await refreshCsrfToken();
    await apiRequestWithMeta("/auth/logout", { method: "POST" });
  } finally {
    clearCsrfToken();
  }
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiRequestWithMeta("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function forgotPassword(input: ForgotPasswordInput) {
  return apiRequestWithMeta("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resetPassword(input: ResetPasswordInput) {
  return apiRequestWithMeta("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
