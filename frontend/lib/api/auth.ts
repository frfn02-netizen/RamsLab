import type { AuthUser, LoginInput } from "@/types/auth";
import { apiRequestWithMeta, clearCsrfToken, setCsrfToken } from "./client";
import { ApiError } from "./errors";

type LoginUser = {
  id: string;
  email: string;
  role: AuthUser["role"];
  isActive?: boolean;
};
type MeUser = { userId: string; role: AuthUser["role"] };
type CsrfResponse = { csrfToken: string };

function normalizeUser(
  user: LoginUser | MeUser,
  fallback?: AuthUser,
): AuthUser {
  if ("userId" in user) {
    return {
      id: user.userId,
      email: fallback?.email,
      role: user.role,
      isActive: fallback?.isActive ?? true,
    };
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive ?? true,
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
