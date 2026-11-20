import { createAuthAuditIndexes } from "./auth.audit.js";
import { createPasswordResetTokenIndexes } from "./password-reset.repository.js";

export async function createAuthIndexes() {
  await createPasswordResetTokenIndexes();
  await createAuthAuditIndexes();
  console.log("Auth security indexes created");
}
