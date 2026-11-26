import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { getPasswordResetTokensCollection } from "../src/modules/auth/password-reset.repository.js";
import { ensurePasswordUser } from "./auth-fixture.js";
import {
  clearTestEmailProvider,
  useFailingEmailProvider,
  useTestEmailProvider,
} from "./email-fixture.js";

const USER_ID = "00000000000000000000f401";
const EMAIL = "vitest.email.delivery@test.local";
const PASSWORD = "email-delivery-pass-123";

async function clearTokens() {
  await getPasswordResetTokensCollection().deleteMany({
    userId: new ObjectId(USER_ID),
  });
}

beforeAll(async () => {
  await connectDatabase();
  await ensurePasswordUser({
    id: USER_ID,
    email: EMAIL,
    password: PASSWORD,
    role: "ALUMNI",
    isActive: true,
    mustChangePassword: false,
  });
});

beforeEach(async () => {
  clearTestEmailProvider();
  await clearTokens();
});

afterAll(async () => {
  await getUsersCollection().deleteOne({ _id: new ObjectId(USER_ID) });
  await clearTokens();
  clearTestEmailProvider();
});

describe("password reset email delivery logging", () => {
  it("records an accepted provider status without logging the recipient or token", async () => {
    const provider = useTestEmailProvider();
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: EMAIL });

    expect(response.status).toBe(200);
    expect(provider.messages).toHaveLength(1);

    const acceptedCall = infoSpy.mock.calls.find(
      ([message]) => message === "Password reset email accepted by provider",
    );
    expect(acceptedCall).toBeDefined();
    expect(acceptedCall?.[1]).toMatchObject({
      provider: "mailjet",
      status: "accepted",
      providerMessageId: "test-message-id",
      userId: USER_ID,
    });

    const serialized = JSON.stringify(acceptedCall);
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain("token=");

    expect(
      await getPasswordResetTokensCollection().countDocuments({
        userId: new ObjectId(USER_ID),
      }),
    ).toBe(1);

    infoSpy.mockRestore();
  });

  it("records a provider failure and removes the token", async () => {
    useFailingEmailProvider();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: EMAIL });

    expect(response.status).toBe(200);

    const failureCall = errorSpy.mock.calls.find(
      ([message]) => message === "Password reset email delivery failed",
    );
    expect(failureCall).toBeDefined();
    expect(failureCall?.[1]).toMatchObject({
      provider: "mailjet",
      status: "failed",
      httpStatus: 500,
      reason: "provider_error",
      userId: USER_ID,
    });

    const serialized = JSON.stringify(failureCall);
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain("token=");

    expect(
      await getPasswordResetTokensCollection().countDocuments({
        userId: new ObjectId(USER_ID),
      }),
    ).toBe(0);

    errorSpy.mockRestore();
  });
});
