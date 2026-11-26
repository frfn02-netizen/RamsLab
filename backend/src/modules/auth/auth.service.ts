import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import {
  deleteUser,
  findUserByEmail,
  findUserById,
  getUsersCollection,
  setUserPassword,
} from "../users/user.repository.js";
import { createAlumniUser } from "../users/user.service.js";
import { USER_ROLES } from "../users/user.types.js";
import { createAlumniShell } from "../alumni/alumni.service.js";
import {
  getFrontendBasePath,
  getPrimaryFrontendOrigin,
} from "../../config/security.js";
import { HttpError } from "../../middlewares/error.middleware.js";
import {
  getMailjetConfigurationDiagnostics,
  isMailjetConfigured,
  sendPasswordResetEmail,
} from "../../lib/mailjet.js";

import {
  generateAccessToken,
  generatePasswordResetToken,
  generateTemporaryPassword,
  getPasswordResetTokenExpiry,
  hashPasswordResetToken,
  waitForPasswordResetFloor,
} from "./auth.utils.js";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  deletePasswordResetTokenByHash,
  deletePasswordResetTokensForUser,
} from "./password-reset.repository.js";
import { recordAuthAudit } from "./auth.audit.js";

import type { LoginInput, RegisterInput } from "./auth.schema.js";

const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account matches that email, password reset instructions will be sent.";

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user || !user.isActive) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  // Accounts carrying a role that is no longer supported must be migrated
  // before they can sign in. This prevents issuing a token that the
  // authorization middleware will reject on every request.
  if (!Object.values(USER_ROLES).includes(user.role)) {
    throw new Error("Invalid email or password");
  }

  const token = generateAccessToken({
    userId: user._id!.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });

  if (user._id) {
    await getUsersCollection().updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  return {
    token,
    user: {
      id: user._id!.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
      mustChangePassword: user.mustChangePassword ?? false,
    },
  };
}

export async function register(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const user = await createAlumniUser({
    email: input.email,
    password: input.password,
  });

  let alumni;
  try {
    // P is derived server-side from Tahun Angkatan. This prevents a manually
    // supplied P from diverging from the academic year before the profile is
    // ever saved. Photo is completed through the authenticated profile flow.
    alumni = await createAlumniShell(
      user.id,
      input.fullName,
      input.tahunAngkatan,
    );
  } catch (error) {
    await deleteUser(new ObjectId(user.id));
    throw error;
  }

  const token = generateAccessToken({
    userId: user.id,
    role: user.role,
    tokenVersion: 0,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    },
    alumni,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  ip?: string,
) {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const users = getUsersCollection();
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new Error("Current password is invalid");
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new Error("New password must be different from the current password");
  }

  const tokenVersion = await setUserPassword(
    user._id!,
    await bcrypt.hash(newPassword, 12),
    {
      mustChangePassword: false,
      incrementTokenVersion: true,
      expectedPasswordHash: user.passwordHash,
    },
  );
  if (tokenVersion === null) {
    throw new Error("Password changed concurrently");
  }

  await deletePasswordResetTokensForUser(user._id!);
  await recordAuthAudit({
    action: "PASSWORD_CHANGED",
    actorUserId: user._id!,
    targetUserId: user._id!,
    ip,
  });

  return { tokenVersion };
}

async function deliverPasswordResetEmail(input: {
  userId: ObjectId;
  to: string;
  resetUrl: string;
  tokenHash: string;
}) {
  try {
    const result = await sendPasswordResetEmail(input.to, input.resetUrl);

    if (result.sent) {
      // "accepted" is not "delivered". Delivery, bounce, and failure are
      // provider-asynchronous and must be checked in the provider dashboard.
      console.info("Password reset email accepted by provider", {
        provider: result.provider,
        status: result.status,
        providerMessageId: result.providerMessageId ?? null,
        userId: input.userId.toString(),
      });
      return;
    }

    await deletePasswordResetTokenByHash(input.tokenHash);
    console.error("Password reset email delivery failed", {
      provider: result.provider,
      status: result.status,
      httpStatus: result.httpStatus ?? null,
      reason: result.reason ?? null,
      userId: input.userId.toString(),
    });
  } catch (error) {
    await deletePasswordResetTokenByHash(input.tokenHash).catch(
      () => undefined,
    );
    console.error("Password reset email delivery threw", {
      userId: input.userId.toString(),
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  if (!user || !user.isActive) {
    await waitForPasswordResetFloor();
    return;
  }

  if (!isMailjetConfigured()) {
    // Keep the response generic. The operator sees this warning; the client
    // does not learn whether the address exists or why no email arrived.
    console.warn(
      "Password reset requested but email delivery is not configured",
      {
        ...getMailjetConfigurationDiagnostics(),
        userId: user._id?.toString(),
      },
    );
    await waitForPasswordResetFloor();
    return;
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  await deletePasswordResetTokensForUser(user._id!);
  await createPasswordResetToken({
    userId: user._id!,
    tokenHash,
    expiresAt: getPasswordResetTokenExpiry(),
    usedAt: null,
    createdAt: new Date(),
  });

  try {
    const resetUrl = `${getPrimaryFrontendOrigin()}${getFrontendBasePath()}/reset-password#token=${encodeURIComponent(
      rawToken,
    )}`;
    // Await delivery so a serverless or short-lived runtime cannot terminate
    // before the provider request is sent. The API response stays generic.
    await deliverPasswordResetEmail({
      userId: user._id!,
      to: user.email,
      resetUrl,
      tokenHash,
    });
  } catch (error) {
    await deletePasswordResetTokenByHash(tokenHash).catch(() => undefined);
    console.error("Password reset email scheduling failed", {
      userId: user._id!.toString(),
      error: error instanceof Error ? error.message : "unknown error",
    });
  }

  await waitForPasswordResetFloor();
}

export async function resetPassword(
  token: string,
  newPassword: string,
  ip?: string,
) {
  const tokenHash = hashPasswordResetToken(token);
  const record = await consumePasswordResetToken(tokenHash);
  if (!record) {
    throw new HttpError(400, "This reset link is invalid or has expired.");
  }

  const user = await findUserById(record.userId.toString());
  if (!user || !user.isActive) {
    throw new HttpError(400, "This reset link is invalid or has expired.");
  }

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new HttpError(
      422,
      "New password must be different from the current password",
    );
  }

  const tokenVersion = await setUserPassword(
    user._id!,
    await bcrypt.hash(newPassword, 12),
    { mustChangePassword: false, incrementTokenVersion: true },
  );
  if (tokenVersion === null) {
    throw new HttpError(400, "This reset link is invalid or has expired.");
  }

  await deletePasswordResetTokensForUser(user._id!);
  await recordAuthAudit({
    action: "PASSWORD_RESET_COMPLETED",
    actorUserId: null,
    targetUserId: user._id!,
    ip,
  });

  return { email: user.email };
}

export async function adminResetPassword(
  targetUserId: string,
  actorUserId: string,
  ip?: string,
) {
  if (!ObjectId.isValid(targetUserId)) {
    throw new HttpError(400, "Invalid user ID");
  }

  const targetId = new ObjectId(targetUserId).toString();
  const actorId = ObjectId.isValid(actorUserId)
    ? new ObjectId(actorUserId).toString()
    : actorUserId;
  if (targetId === actorId) {
    throw new HttpError(
      400,
      "Use the change password page for your own account",
    );
  }

  const user = await findUserById(targetId);
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (user.role === "ADMIN") {
    throw new HttpError(
      403,
      "Administrator accounts cannot be reset through this endpoint",
    );
  }
  if (!user.isActive) {
    throw new HttpError(400, "Account is not active");
  }

  let temporaryPassword = generateTemporaryPassword();
  for (
    let attempt = 0;
    attempt < 3 && (await bcrypt.compare(temporaryPassword, user.passwordHash));
    attempt += 1
  ) {
    temporaryPassword = generateTemporaryPassword();
  }

  const tokenVersion = await setUserPassword(
    user._id!,
    await bcrypt.hash(temporaryPassword, 12),
    { mustChangePassword: true, incrementTokenVersion: true },
  );
  if (tokenVersion === null) {
    throw new HttpError(500, "Failed to reset password");
  }

  await deletePasswordResetTokensForUser(user._id!);
  await recordAuthAudit({
    action: "ADMIN_PASSWORD_RESET",
    actorUserId: ObjectId.isValid(actorId) ? new ObjectId(actorId) : null,
    targetUserId: user._id!,
    ip,
  });

  return {
    userId: user._id!.toString(),
    email: user.email,
    role: user.role,
    temporaryPassword,
    mustChangePassword: true,
  };
}

export { PASSWORD_RESET_GENERIC_MESSAGE };
