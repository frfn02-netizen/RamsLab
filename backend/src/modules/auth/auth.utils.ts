import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { JwtPayload } from "./auth.types.js";
import { USER_ROLES } from "../users/user.types.js";

const JWT_ISSUER = "rams-platform-api";

function getJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables"
    );
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  return secret;
}


function getJwtExpiresIn(): SignOptions["expiresIn"] {
  return (
    process.env.JWT_EXPIRES_IN ??
    "1d"
  ) as SignOptions["expiresIn"];
}


export function generateAccessToken(
  payload: JwtPayload
): string {
  const secret =
    getJwtSecret();

  return jwt.sign(
    payload,
    secret,
    {
      expiresIn:
        getJwtExpiresIn(),
      algorithm: "HS256",
      issuer: JWT_ISSUER,
    }
  );
}


export function verifyAccessToken(
  token: string
): JwtPayload {
  const secret =
    getJwtSecret();

  const decoded =
    jwt.verify(
      token,
      secret,
      { algorithms: ["HS256"], issuer: JWT_ISSUER }
    );

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string" ||
    !Object.values(USER_ROLES).includes(decoded.role as typeof USER_ROLES[keyof typeof USER_ROLES]) ||
    (decoded.tokenVersion !== undefined &&
      (!Number.isInteger(decoded.tokenVersion) || decoded.tokenVersion < 0))
  ) {
    throw new Error(
      "Invalid JWT payload"
    );
  }

  return {
    userId: decoded.userId,
    role: decoded.role as JwtPayload["role"],
    tokenVersion: typeof decoded.tokenVersion === "number" ? decoded.tokenVersion : 0,
  };
}
