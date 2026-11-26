import { ApiError, type ApiErrorDetails } from "./errors";
import { isProductionBuild } from "@/lib/runtime-env";

const LOCAL_API_URL = "http://localhost:5000/api";
const MISSING_API_URL_MESSAGE =
  "NEXT_PUBLIC_API_URL is required in production. Set it to the deployed public URL, not localhost.";

// Resolve on use instead of at import so `next build` can collect page data
// without deployment env vars. A production server still fails on the first
// request when the origin is missing.
function publicApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production" && !isProductionBuild()) {
    throw new Error(MISSING_API_URL_MESSAGE);
  }

  return LOCAL_API_URL;
}

function internalApiUrl() {
  if (typeof window !== "undefined") return undefined;
  return process.env.INTERNAL_API_URL?.trim().replace(/\/+$/, "") || undefined;
}

export function apiUrl(path: string) {
  return `${publicApiUrl()}${path}`;
}

function requestUrl(path: string) {
  return `${internalApiUrl() ?? publicApiUrl()}${path}`;
}
const CSRF_COOKIE = "rams_csrf_token";
const CSRF_STORAGE_KEY = "rams_csrf_token";
const CSRF_SHARED_STORAGE_KEY = "rams_csrf_token_shared";
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
  user?: T;
  csrfToken?: string;
  errors?: unknown;
  code?: string;
  reauthenticate?: boolean;
  temporaryPassword?: string;
};

export type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
  next?: { revalidate?: number; tags?: string[] };
};

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(encodedName));
  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null;
}

function getStoredCsrfToken() {
  if (typeof window === "undefined") return null;
  try {
    // localStorage keeps separate tabs aligned when one tab refreshes the
    // API-issued CSRF cookie. sessionStorage remains the fallback for privacy
    // modes where shared storage is unavailable.
    return (
      window.localStorage.getItem(CSRF_SHARED_STORAGE_KEY) ??
      window.sessionStorage.getItem(CSRF_STORAGE_KEY)
    );
  } catch {
    return window.sessionStorage.getItem(CSRF_STORAGE_KEY);
  }
}

export function setCsrfToken(token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  try {
    window.localStorage.setItem(CSRF_SHARED_STORAGE_KEY, token);
  } catch {
    // sessionStorage is sufficient when shared storage is blocked.
  }
}

export function clearCsrfToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
  try {
    window.localStorage.removeItem(CSRF_SHARED_STORAGE_KEY);
  } catch {
    // Nothing else to clear when shared storage is blocked.
  }
}

function getCsrfToken() {
  return getStoredCsrfToken() ?? getCookie(CSRF_COOKIE);
}

function getErrorDetails(errors: unknown): ApiErrorDetails | undefined {
  if (!errors) return undefined;
  if (
    typeof errors === "object" &&
    errors !== null &&
    "fieldErrors" in errors
  ) {
    const fieldErrors = (errors as { fieldErrors?: unknown }).fieldErrors;
    if (typeof fieldErrors === "object" && fieldErrors !== null) {
      return { fieldErrors: fieldErrors as Record<string, string[]> };
    }
  }
  return { details: errors };
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.status === 204) return { success: true };
  const text = await response.text();
  if (!text) return { success: response.ok };
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new ApiError("Invalid server response", response.status);
  }
}

async function refreshCsrfTokenForRetry(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(requestUrl("/auth/csrf"), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await parseResponse<{ csrfToken: string }>(response);
    if (response.status === 401) unauthorizedHandler?.();
    if (!response.ok || !body.csrfToken) return false;
    setCsrfToken(body.csrfToken);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestEnvelope<T>(
  path: string,
  options: ApiRequestOptions = {},
  csrfRetried = false,
) {
  const { timeoutMs = 15000, next, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const callerSignal = fetchOptions.signal;
  const abortFromCaller = () => controller.abort();
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const headers = new Headers(fetchOptions.headers);
  headers.set("Accept", "application/json");
  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (MUTATION_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const url = requestUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      ...(next ? { next } : {}),
      credentials: "include",
      headers,
      signal: controller.signal,
    } as RequestInit & {
      next?: { revalidate?: number; tags?: string[] };
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    if (isTimeout) {
      throw new ApiError("The request timed out. Please try again.", 0);
    }
    throw new ApiError("Unable to connect to the RAMS API.", 0);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }

  const body = await parseResponse<T>(response);
  if (
    response.status === 403 &&
    body.message === "CSRF validation failed" &&
    MUTATION_METHODS.has(method) &&
    !csrfRetried &&
    (await refreshCsrfTokenForRetry(timeoutMs))
  ) {
    return requestEnvelope<T>(path, options, true);
  }
  if (!response.ok || body.success === false) {
    if (response.status === 401 && !path.startsWith("/auth/"))
      unauthorizedHandler?.();
    throw new ApiError(body.message ?? "Request failed", response.status, {
      ...getErrorDetails(body.errors),
      ...(body.code ? { code: body.code } : {}),
    });
  }
  return body;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const body = await requestEnvelope<T>(path, options);
  if (body.data === undefined)
    throw new ApiError("Server response did not contain data", 502);
  return body.data;
}

export function apiRequestWithMeta<T>(
  path: string,
  options: ApiRequestOptions = {},
) {
  return requestEnvelope<T>(path, options);
}
