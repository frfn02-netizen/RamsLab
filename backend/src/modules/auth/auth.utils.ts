import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { JwtPayload,} from "./auth.types.js";


function getJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables"
    );
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
      secret
    );

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error(
      "Invalid JWT payload"
    );
  }

  return decoded as unknown as JwtPayload;
}