import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "rams_access_token";
const LOCAL_API_URL = "http://localhost:5000/api";
const INTERNAL_ROLES = new Set(["ADMIN", "DOSEN"]);
const SESSION_TIMEOUT_MS = 5000;

type MeResponse = {
  success?: boolean;
  user?: {
    role?: string;
  };
};

export type MeetingsSession =
  | { status: "internal"; role: "ADMIN" | "DOSEN" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; role: string | undefined };

function apiBaseUrl() {
  return (
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    LOCAL_API_URL
  ).replace(/\/+$/, "");
}

/**
 * Validate the current request's session against the backend before rendering
 * an internal meetings route. The token lives in an httpOnly cookie, so the
 * browser cannot verify its role itself.
 */
export async function getMeetingsSession(): Promise<MeetingsSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return { status: "unauthenticated" };

  try {
    const response = await fetch(`${apiBaseUrl()}/auth/me`, {
      headers: { Cookie: `${AUTH_COOKIE_NAME}=${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      return { status: "unauthenticated" };
    }
    if (!response.ok) {
      return { status: "unauthenticated" };
    }

    const body = (await response.json()) as MeResponse;
    const role = body.user?.role;
    if (role && INTERNAL_ROLES.has(role)) {
      return { status: "internal", role: role as "ADMIN" | "DOSEN" };
    }
    return { status: "forbidden", role };
  } catch {
    return { status: "unauthenticated" };
  }
}
