import { createHash, randomBytes, randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { JwtPayload } from "./auth.types.js";
import { USER_ROLES } from "../users/user.types.js";

const JWT_ISSUER = "rams-platform-api";
const TEMPORARY_PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const TEMPORARY_PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const TEMPORARY_PASSWORD_DIGITS = "23456789";
const TEMPORARY_PASSWORD_SYMBOLS = "!@#$%^&*()-_=+";
const PASSWORD_RESET_TOKEN_BYTES = 32;
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 60;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return secret;
}

function getJwtExpiresIn(): SignOptions["expiresIn"] {
  return (process.env.JWT_EXPIRES_IN ?? "1d") as SignOptions["expiresIn"];
}

export function generateAccessToken(payload: JwtPayload): string {
  const secret = getJwtSecret();

  return jwt.sign(payload, secret, {
    expiresIn: getJwtExpiresIn(),
    algorithm: "HS256",
    issuer: JWT_ISSUER,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = getJwtSecret();

  const decoded = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
  });

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string" ||
    !Object.values(USER_ROLES).includes(
      decoded.role as (typeof USER_ROLES)[keyof typeof USER_ROLES],
    ) ||
    (decoded.tokenVersion !== undefined &&
      (!Number.isInteger(decoded.tokenVersion) || decoded.tokenVersion < 0))
  ) {
    throw new Error("Invalid JWT payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role as JwtPayload["role"],
    tokenVersion:
      typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : 0,
  };
}

function randomCharacter(alphabet: string) {
  return alphabet[randomInt(alphabet.length)];
}

export function generateTemporaryPassword(length = 20): string {
  const size = Math.max(length, 12);
  const all =
    TEMPORARY_PASSWORD_UPPER +
    TEMPORARY_PASSWORD_LOWER +
    TEMPORARY_PASSWORD_DIGITS +
    TEMPORARY_PASSWORD_SYMBOLS;

  const characters = [
    randomCharacter(TEMPORARY_PASSWORD_UPPER),
    randomCharacter(TEMPORARY_PASSWORD_LOWER),
    randomCharacter(TEMPORARY_PASSWORD_DIGITS),
    randomCharacter(TEMPORARY_PASSWORD_SYMBOLS),
  ];

  while (characters.length < size) {
    characters.push(randomCharacter(all));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const current = characters[index];
    characters[index] = characters[swapIndex];
    characters[swapIndex] = current;
  }

  return characters.join("");
}

export function generatePasswordResetToken(): string {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetTokenExpiry(now = new Date()): Date {
  const configured = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES);
  const minutes =
    Number.isInteger(configured) && configured > 0
      ? configured
      : DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  return new Date(now.getTime() + minutes * 60 * 1000);
}

export async function waitForPasswordResetFloor(): Promise<void> {
  const configured = Number(process.env.PASSWORD_RESET_MIN_RESPONSE_MS);
  const base =
    Number.isInteger(configured) && configured >= 0 ? configured : 250;
  const jitter = randomInt(0, 150);
  await new Promise<void>((resolve) => setTimeout(resolve, base + jitter));
}
