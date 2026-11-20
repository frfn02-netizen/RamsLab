import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import type { PasswordResetToken } from "./password-reset.types.js";

const PASSWORD_RESET_COLLECTION = "password_reset_tokens";

export function getPasswordResetTokensCollection(): Collection<PasswordResetToken> {
  return getDatabase().collection<PasswordResetToken>(
    PASSWORD_RESET_COLLECTION,
  );
}

export async function createPasswordResetToken(
  token: Omit<PasswordResetToken, "_id">,
): Promise<void> {
  await getPasswordResetTokensCollection().insertOne(token);
}

export async function deletePasswordResetTokensForUser(
  userId: ObjectId,
): Promise<void> {
  await getPasswordResetTokensCollection().deleteMany({ userId });
}

export async function deletePasswordResetTokenByHash(
  tokenHash: string,
): Promise<void> {
  await getPasswordResetTokensCollection().deleteOne({ tokenHash });
}

// Consuming the token atomically makes it single-use even when two reset
// requests arrive at the same time. The caller updates the password after the
// token is claimed; if that update fails, the token stays consumed and the
// user must request a new link.
export async function consumePasswordResetToken(
  tokenHash: string,
): Promise<PasswordResetToken | null> {
  return getPasswordResetTokensCollection().findOneAndUpdate(
    {
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function createPasswordResetTokenIndexes(): Promise<void> {
  const collection = getPasswordResetTokensCollection();
  await collection.createIndex(
    { tokenHash: 1 },
    { unique: true, name: "password_reset_token_hash_unique" },
  );
  await collection.createIndex(
    { userId: 1, createdAt: -1 },
    { name: "password_reset_user_index" },
  );
  await collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "password_reset_expiry_ttl" },
  );
}
