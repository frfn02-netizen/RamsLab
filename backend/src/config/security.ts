import crypto from "node:crypto";

export const AUTH_COOKIE_NAME = "rams_access_token";

export const SECURITY_LIMITS = {
  jsonBodyBytes: 1_048_576,
  maxPageSize: 100,
  maxPageNumber: 100_000,
  maxListResults: 500,
  maxSearchLength: 100,
  maxHistoryEntries: 50,
  maxArrayEntries: 50,
  maxLoginAttempts: 10,
  maxLoginAttemptsPerIp: 30,
  loginWindowMs: 15 * 60 * 1000,
  maxApiRequests: 300,
  apiWindowMs: 60 * 1000,
  maxPublicRequests: 120,
  maxDashboardRequests: 30,
} as const;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getAllowedOrigins(): string[] {
  const configured = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes("*")) {
    throw new Error("FRONTEND_URL must contain one or more explicit origins");
  }

  return origins.map((origin) => {
    const parsed = new URL(origin);
    if (
      !/^https?:$/.test(parsed.protocol) ||
      (parsed.pathname !== "/" && parsed.pathname !== "") ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error("FRONTEND_URL must contain valid HTTP(S) origins");
    }
    return parsed.origin;
  });
}

export function validateProductionSecurityConfiguration(): void {
  if (!isProduction()) return;

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.includes("replace-with")) {
    throw new Error("Production requires a strong JWT_SECRET");
  }

  if (!process.env.FRONTEND_URL) {
    throw new Error("Production requires an explicit FRONTEND_URL");
  }
}

export function createCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
