import { ApiError, type ApiErrorDetails } from "./errors";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api").replace(/\/$/, "");
const CSRF_COOKIE = "rams_csrf_token";
const CSRF_STORAGE_KEY = "rams_csrf_token";
const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
  user?: T;
  csrfToken?: string;
  errors?: unknown;
};

export type ApiRequestOptions = RequestInit & { timeoutMs?: number };

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
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(encodedName));
  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null;
}

function getStoredCsrfToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(CSRF_STORAGE_KEY);
}

export function setCsrfToken(token: string) {
  if (typeof window !== "undefined") window.sessionStorage.setItem(CSRF_STORAGE_KEY, token);
}

export function clearCsrfToken() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(CSRF_STORAGE_KEY);
}

function getCsrfToken() {
  return getStoredCsrfToken() ?? getCookie(CSRF_COOKIE);
}

function getErrorDetails(errors: unknown): ApiErrorDetails | undefined {
  if (!errors) return undefined;
  if (typeof errors === "object" && errors !== null && "fieldErrors" in errors) {
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

async function requestEnvelope<T>(path: string, options: ApiRequestOptions = {}) {
  const { timeoutMs = 15000, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const callerSignal = fetchOptions.signal;
  const abortFromCaller = () => controller.abort();
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const headers = new Headers(fetchOptions.headers);
  headers.set("Accept", "application/json");
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (MUTATION_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      credentials: "include",
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", 0);
    }
    throw new ApiError("Unable to connect to the RAMS API.", 0);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }

  const body = await parseResponse<T>(response);
  if (!response.ok || body.success === false) {
    if (response.status === 401 && !path.startsWith("/auth/")) unauthorizedHandler?.();
    throw new ApiError(body.message ?? "Request failed", response.status, getErrorDetails(body.errors));
  }
  return body;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const body = await requestEnvelope<T>(path, options);
  if (body.data === undefined) throw new ApiError("Server response did not contain data", 502);
  return body.data;
}

export function apiRequestWithMeta<T>(path: string, options: ApiRequestOptions = {}) {
  return requestEnvelope<T>(path, options);
}
