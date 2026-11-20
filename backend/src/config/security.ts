import crypto from "node:crypto";
import { isIP } from "node:net";

export const AUTH_COOKIE_NAME = "rams_access_token";

export const SECURITY_LIMITS = {
  jsonBodyBytes: 1_048_576,
  maxPageSize: 200,
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
  passwordResetWindowMs: 15 * 60 * 1000,
  maxPasswordResetRequestsPerIp: 20,
  maxPasswordResetRequestsPerEmail: 5,
  maxPasswordResetSubmissionsPerIp: 20,
  maxAdminPasswordResetsPerActor: 20,
} as const;

const TRUSTED_PROXY_NAMES = new Set(["loopback", "linklocal", "uniquelocal"]);

function isValidCidr(token: string) {
  const [address, prefix, ...rest] = token.split("/");
  if (rest.length > 0) return false;
  const version = isIP(address);
  if (version === 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;
  const max = version === 4 ? 32 : 128;
  const value = Number(prefix);
  return value >= 0 && value <= max;
}

export function getTrustProxySetting(): boolean | number | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) {
    if (isProduction()) {
      throw new Error(
        "Production requires TRUST_PROXY. Set it to false, a trusted proxy hop count, or a trusted proxy list.",
      );
    }
    return false;
  }

  if (raw === "false") return false;
  if (raw === "true") {
    throw new Error(
      "TRUST_PROXY=true is unsafe because clients can spoof X-Forwarded-For. Use a hop count or a trusted proxy list.",
    );
  }

  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);
    if (hops < 1 || hops > 10) {
      throw new Error("TRUST_PROXY hop count must be between 1 and 10");
    }
    return hops;
  }

  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) {
    throw new Error(
      "TRUST_PROXY must be false, a hop count, or a trusted proxy list",
    );
  }

  for (const entry of entries) {
    if (TRUSTED_PROXY_NAMES.has(entry.toLowerCase())) continue;
    if (!isValidCidr(entry)) {
      throw new Error(`TRUST_PROXY contains an invalid entry: ${entry}`);
    }
  }

  return entries.join(",");
}

export function isTrustProxyConfigured(): boolean {
  return Boolean(process.env.TRUST_PROXY?.trim());
}

export function getTrustProxyMode(): "disabled" | "hop-count" | "trusted-list" {
  const setting = getTrustProxySetting();
  if (setting === false) return "disabled";
  return typeof setting === "number" ? "hop-count" : "trusted-list";
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function getPrimaryFrontendOrigin(): string {
  return getAllowedOrigins()[0];
}

export function getFrontendBasePath(): string {
  const raw = (process.env.FRONTEND_BASE_PATH ?? process.env.BASE_PATH ?? "").trim();
  if (!raw || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function getAllowedOrigins(): string[] {
  const configured = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const origins = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes("*")) {
    throw new Error("FRONTEND_URL must contain one or more explicit origins");
  }

  const normalized = origins.map((origin) => {
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

  // Local development must not depend on the production FRONTEND_URL value.
  // Production remains restricted to the explicitly configured origins.
  if (!isProduction()) {
    for (const origin of DEVELOPMENT_ORIGINS) {
      if (!normalized.includes(origin)) normalized.push(origin);
    }
  }

  return normalized;
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

  // Validate the proxy topology at startup. This throws when TRUST_PROXY is
  // missing or unsafe in production.
  getTrustProxySetting();
}

export function createCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
