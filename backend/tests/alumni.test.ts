import { beforeAll, afterAll, describe, expect, it } from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import app from "../src/app.js";

import { connectDatabase } from "../src/config/database.js";

import { getAlumniCollection } from "../src/modules/alumni/alumni.repository.js";
import { createAlumniShell } from "../src/modules/alumni/alumni.service.js";
import { createAlumniUser } from "../src/modules/users/user.service.js";

import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const TEST_USER_ID = new ObjectId().toHexString();

const TEST_NIM = "VITEST-ALUMNI-001";

const TEST_FULL_NAME = "Vitest Alumni";

const TEST_USER_EMAIL = "vitest.alumni@test.local";

let adminToken: string;
let alumniToken: string;
let alumniId: string;

beforeAll(async () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for alumni tests");
  }

  await connectDatabase();
  await ensureTestUsers();

  const users = getUsersCollection();

  await users.deleteMany({
    email: TEST_USER_EMAIL,
  });

  await users.insertOne({
    _id: new ObjectId(TEST_USER_ID),
    email: TEST_USER_EMAIL,
    passwordHash: "vitest-test-password",
    role: "ALUMNI",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const alumniCollection = getAlumniCollection();

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  const alumniDoc = {
    userId: new ObjectId(TEST_USER_ID),
    fullName: TEST_FULL_NAME,
    nim: TEST_NIM,
    angkatan: 26,
    program: "S1 TEKNIK SISTEM PERKAPALAN",
    photo: "https://example.com/vitest-alumni.jpg",
    phone: "081234567890",
    location: "Surabaya",
    currentStatus: "WORKING",
    currentCompany: "Vitest Company",
    currentPosition: "Software Engineer",
    linkedin: "https://www.linkedin.com/in/vitest-alumni",
    bio: "Alumni created for automated testing.",
    careerHistory: [],
    educationHistory: [],
    isPublic: false,
    reviewStatus: "PENDING",
    profileCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inserted = await alumniCollection.insertOne(alumniDoc);
  alumniId = inserted.insertedId.toString();

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  alumniToken = jwt.sign(
    {
      userId: TEST_USER_ID,
      role: "ALUMNI",
    },
    secret,
    {
      expiresIn: "1h",
      issuer: "rams-platform-api",
    },
  );
});

afterAll(async () => {
  const alumniCollection = getAlumniCollection();

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  const users = getUsersCollection();

  await users.deleteOne({
    _id: new ObjectId(TEST_USER_ID),
  });
});

describe("Alumni API", () => {
  it("no longer exposes the admin create endpoints", async () => {
    const legacyCreate = await request(app)
      .post("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({});

    expect(legacyCreate.status).toBe(404);

    const legacyAccount = await request(app)
      .post("/api/alumni/admin")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        email: "legacy.admin.alumni@test.local",
        password: "LegacyPass1!",
      });

    expect(legacyAccount.status).toBe(404);

    const legacyUser = await request(app)
      .post("/api/users/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        email: "legacy.admin.alumni@test.local",
        password: "LegacyPass1!",
      });

    expect(legacyUser.status).toBe(404);
  });

  it("still supports alumni self-registration and first login", async () => {
    const email = `vitest.register.${Date.now()}@test.local`;
    const password = "VitestRegister1!";

    const registered = await request(app).post("/api/auth/register").send({
      fullName: "Register Alumni",
      tahunAngkatan: 2015,
      email,
      password,
      confirmPassword: password,
    });

    expect(registered.status).toBe(201);

    const userId = new ObjectId(registered.body.user.id as string);

    const shells = await getAlumniCollection().find({ userId }).toArray();

    expect(shells).toHaveLength(1);
    expect(shells[0]?.reviewStatus).toBe("PENDING");
    expect(shells[0]?.isPublic).toBe(false);
    expect(shells[0]).toMatchObject({ tahunAngkatan: 2015, angkatan: 55 });

    const login = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.user.id).toBe(userId.toHexString());

    await getAlumniCollection().deleteMany({ userId });
    await getUsersCollection().deleteOne({ _id: userId });
  });

  it("should get alumni list", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    expect(
      response.body.data.some((alumni: any) => alumni.nim === TEST_NIM),
    ).toBe(true);

    expect(response.body.pagination.total).toBeGreaterThan(0);
  });

  it("should search alumni by NIM", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        search: TEST_NIM,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.length).toBeGreaterThan(0);

    expect(
      response.body.data.some((alumni: any) => alumni.nim === TEST_NIM),
    ).toBe(true);
  });

  it("should get alumni by id", async () => {
    const response = await request(app)
      .get(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data._id).toBe(alumniId);

    expect(response.body.data.nim).toBe(TEST_NIM);
  });

  it("should get alumni by current user", async () => {
    const response = await request(app)
      .get("/api/alumni/me")
      .set("Cookie", `rams_access_token=${alumniToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.userId).toBe(TEST_USER_ID);
  });

  it("should reject invalid alumni id", async () => {
    const response = await request(app)
      .get("/api/alumni/invalid-id")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(404);

    expect(response.body.success).toBe(false);
  });

  it("should reject invalid pagination page", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        page: 0,
        limit: 10,
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Page must be a positive integer");
  });

  it("should reject invalid pagination limit", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        page: 1,
        limit: 0,
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Limit must be a positive integer");
  });

  it("should update my alumni profile", async () => {
    const response = await request(app)
      .patch("/api/alumni/me")
      .set("Cookie", `rams_access_token=${alumniToken}`)
      .send({
        currentPosition: "Senior Software Engineer",
        location: "Jakarta",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.currentPosition).toBe("Senior Software Engineer");

    expect(response.body.data.location).toBe("Jakarta");
  });

  it("does not publish a pending profile even when an alumni sends isPublic true", async () => {
    const update = await request(app)
      .patch("/api/alumni/me")
      .set("Cookie", `rams_access_token=${alumniToken}`)
      .send({ isPublic: true });

    expect(update.status).toBe(200);
    expect(update.body.data.reviewStatus).toBe("PENDING");

    const publicList = await request(app).get("/api/public/alumni");
    expect(publicList.status).toBe(200);
    expect(
      publicList.body.data.some(
        (alumni: { id: string }) => alumni.id === alumniId,
      ),
    ).toBe(false);
  });

  it("allows an admin to approve and publish a completed alumni profile", async () => {
    const review = await request(app)
      .patch(`/api/alumni/${alumniId}/review`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ action: "APPROVE" });

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("APPROVED");
    expect(review.body.data.isPublic).toBe(true);

    const publicList = await request(app).get("/api/public/alumni");
    expect(
      publicList.body.data.some(
        (alumni: { id: string }) => alumni.id === alumniId,
      ),
    ).toBe(true);

    const publicDetail = await request(app).get(
      `/api/public/alumni/${alumniId}`,
    );
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data.category).toBe("ALUMNI");
  });

  it("removes a rejected alumni from public list and detail responses", async () => {
    const review = await request(app)
      .patch(`/api/alumni/${alumniId}/review`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ action: "REJECT", reason: "Profile is not publishable yet." });

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("REJECTED");
    expect(review.body.data.reviewNote).toBe("Profile is not publishable yet.");
    expect(review.body.data.isPublic).toBe(false);

    expect(
      (await request(app).get("/api/public/alumni")).body.data.some(
        (alumni: { id: string }) => alumni.id === alumniId,
      ),
    ).toBe(false);
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(404);
  });

  it("should update alumni as admin", async () => {
    const response = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        currentCompany: "Updated Vitest Company",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.currentCompany).toBe("Updated Vitest Company");
  });
});

it("should reject modification of immutable alumni fields", async () => {
  const response = await request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${alumniToken}`)
    .send({
      nim: "MALICIOUS-NIM-999",
      userId: new ObjectId().toHexString(),
    });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim).toBe(TEST_NIM);

  expect(response.body.data.userId).toBe(TEST_USER_ID);
});

it("should not allow alumni to modify academic identity fields", async () => {
  const response = await request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${alumniToken}`)
    .send({
      nim: "MALICIOUS-NIM-999",
      angkatan: 99,
      program: "S1 DOUBLE DEGREE (DD)",
    });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim).toBe(TEST_NIM);

  expect(response.body.data.angkatan).not.toBe(99);

  expect(response.body.data.program).not.toBe("S1 DOUBLE DEGREE (DD)");
});

it("should not allow alumni to modify immutable fields", async () => {
  const response = await request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${alumniToken}`)
    .send({
      nim: "ATTACKED-NIM",
      userId: new ObjectId().toHexString(),
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      currentPosition: "Security Test Engineer",
    });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim).toBe(TEST_NIM);

  expect(response.body.data.userId).toBe(TEST_USER_ID);

  expect(response.body.data.currentPosition).toBe("Security Test Engineer");
});

it("should delete alumni as admin", async () => {
  const response = await request(app)
    .delete(`/api/alumni/${alumniId}`)
    .set("Cookie", `rams_access_token=${adminToken}`);

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.message).toBe("Alumni deleted successfully");

  const deleted = await getAlumniCollection().findOne({
    _id: new ObjectId(alumniId),
  });
  expect(deleted).toBeNull();

  const account = await getUsersCollection().findOne({
    _id: new ObjectId(TEST_USER_ID),
  });
  expect(account?.isActive).toBe(false);
  expect(account?.tokenVersion).toBeGreaterThan(0);
});

// ============================================================
// Review workflow: save → pending → approve / reject → re-review
// ============================================================

const workflowEmails: string[] = [];
const workflowAlumniIds: string[] = [];
let workflowSequence = 0;

async function createWorkflowAlumni() {
  workflowSequence += 1;
  const email = `vitest.workflow.${workflowSequence}.${Date.now()}@test.local`;
  workflowEmails.push(email);

  const user = await createAlumniUser({ email, password: "VitestWorkflow1!" });
  const alumni = await createAlumniShell(user.id);

  const createdAlumniId = alumni._id.toString();
  workflowAlumniIds.push(createdAlumniId);

  return {
    alumniId: createdAlumniId,
    token: signTestToken(user.id, "ALUMNI"),
  };
}

function saveProfile(token: string, payload: Record<string, unknown>) {
  return request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${token}`)
    .send(payload);
}

function readProfile(token: string) {
  return request(app)
    .get("/api/alumni/me")
    .set("Cookie", `rams_access_token=${token}`);
}

async function seedLegacyProgram(
  alumniId: string,
  program: "Ship Design" | "Naval Architecture" | "Marine Engineering",
) {
  await getAlumniCollection().updateOne(
    { _id: new ObjectId(alumniId) },
    {
      $set: {
        fullName: "Legacy Program Alumni",
        nim: `LEGACY-${workflowSequence}`,
        angkatan: 34,
        program,
        photo: `https://example.com/legacy-${workflowSequence}.jpg`,
      },
    },
  );
}

async function completeProfile(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const sequence = workflowSequence;
  const response = await saveProfile(token, {
    fullName: "Workflow Alumni",
    nim: `WF-${sequence}`,
    angkatan: 34,
    program: "S1 TEKNIK SISTEM PERKAPALAN",
    photo: `https://example.com/workflow-${sequence}.jpg`,
    ...overrides,
  });
  expect(response.status).toBe(200);
  return response;
}

function approveProfile(id: string) {
  return request(app)
    .patch(`/api/alumni/${id}/review`)
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({ action: "APPROVE" });
}

function rejectProfile(id: string, reason = "Please complete your profile.") {
  return request(app)
    .patch(`/api/alumni/${id}/review`)
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({ action: "REJECT", reason });
}

function isPublicAlumni(id: string) {
  return request(app)
    .get("/api/public/alumni")
    .then((response) =>
      (response.body.data as Array<{ id: string }>).some(
        (alumni) => alumni.id === id,
      ),
    );
}

afterAll(async () => {
  await getAlumniCollection().deleteMany({
    _id: { $in: workflowAlumniIds.map((id) => new ObjectId(id)) },
  });
  await getUsersCollection().deleteMany({
    email: { $in: workflowEmails },
  });
});

describe("alumni review workflow", () => {
  it("stores the batch number the alumni typed and returns it when the form is reopened", async () => {
    const { token } = await createWorkflowAlumni();

    const saved = await completeProfile(token, { angkatan: 34 });
    expect(saved.body.data.angkatan).toBe(34);
    expect(saved.body.data.profileCompleted).toBe(true);

    const reopened = await readProfile(token);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.angkatan).toBe(34);
    expect(reopened.body.data.program).toBe("S1 TEKNIK SISTEM PERKAPALAN");

    // Saving again without touching the batch number must keep it.
    const savedAgain = await saveProfile(token, { bio: "Still here" });
    expect(savedAgain.status).toBe(200);
    expect(savedAgain.body.data.angkatan).toBe(34);

    const reopenedAgain = await readProfile(token);
    expect(reopenedAgain.body.data.angkatan).toBe(34);
  });

  it("lets an alumni claim academic identity once and never overwrite it", async () => {
    const { token } = await createWorkflowAlumni();

    await completeProfile(token, {
      angkatan: 21,
      program: "S1 DOUBLE DEGREE (DD)",
    });

    const tampered = await saveProfile(token, {
      angkatan: 99,
      program: "S2 TEKNIK SISTEM PERKAPALAN",
      nim: "REPLACED-NIM",
    });

    expect(tampered.status).toBe(200);
    expect(tampered.body.data.angkatan).toBe(21);
    expect(tampered.body.data.program).toBe("S1 DOUBLE DEGREE (DD)");
    expect(tampered.body.data.nim).toBe(`WF-${workflowSequence}`);
  });

  it("lets Ship Design be replaced once, persists it, and exposes the stored program to admin and public views", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    const replacement = "S1 TEKNIK SISTEM PERKAPALAN";
    await seedLegacyProgram(alumniId, "Ship Design");

    const saved = await saveProfile(token, { program: replacement });
    expect(saved.status).toBe(200);
    expect(saved.body.data.program).toBe(replacement);

    const reloaded = await readProfile(token);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.data.program).toBe(replacement);

    const attemptedOverwrite = await saveProfile(token, {
      program: "S2 TEKNIK SISTEM PERKAPALAN",
    });
    expect(attemptedOverwrite.status).toBe(200);
    expect(attemptedOverwrite.body.data.program).toBe(replacement);

    const adminDetail = await request(app)
      .get(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(adminDetail.status).toBe(200);
    expect(adminDetail.body.data.program).toBe(replacement);

    const approved = await approveProfile(alumniId);
    expect(approved.status).toBe(200);
    const publicDetail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data.program).toBe(replacement);
  });

  it("lets Naval Architecture be replaced by an approved program", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await seedLegacyProgram(alumniId, "Naval Architecture");

    const saved = await saveProfile(token, {
      program: "S2 DOUBLE DEGREE (DD)",
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.program).toBe("S2 DOUBLE DEGREE (DD)");
    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.program).toBe("S2 DOUBLE DEGREE (DD)");
  });

  it("approves and publishes an incomplete profile", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName: "Incomplete Alumni",
      angkatan: 30,
      program: "S2 TEKNIK SISTEM PERKAPALAN",
      photo: `https://example.com/incomplete-${workflowSequence}.jpg`,
      // NIM is left empty on purpose: a profile may only be *saved* with full
      // name + photo + angkatan (registration gate), while everything beyond
      // those three stays informational and must not gate the approval.
    });

    expect(saved.status).toBe(200);
    // Completeness stays informational: it must not gate the approval.
    expect(saved.body.data.profileCompleted).toBe(false);

    const review = await approveProfile(alumniId);

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("APPROVED");
    expect(review.body.data.isPublic).toBe(true);
    expect(review.body.data.profileCompleted).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(true);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.fullName).toBe("Incomplete Alumni");
  });

  it("approves and publishes a complete profile", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const review = await approveProfile(alumniId);

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("APPROVED");
    expect(review.body.data.isPublic).toBe(true);
    expect(await isPublicAlumni(alumniId)).toBe(true);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(200);
  });

  it("moves an approved profile back to pending when the alumni edits it", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    expect((await approveProfile(alumniId)).status).toBe(200);

    const edited = await saveProfile(token, {
      bio: "Edited after approval",
    });

    expect(edited.status).toBe(200);
    expect(edited.body.data.reviewStatus).toBe("PENDING");
    expect(edited.body.data.isPublic).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(false);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(404);
  });

  it("moves a rejected profile back to pending when the alumni edits it", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    expect((await rejectProfile(alumniId)).status).toBe(200);

    const fixed = await saveProfile(token, {
      bio: "Corrected after rejection",
    });

    expect(fixed.status).toBe(200);
    expect(fixed.body.data.reviewStatus).toBe("PENDING");
    expect(fixed.body.data.isPublic).toBe(false);

    const approvedAgain = await approveProfile(alumniId);
    expect(approvedAgain.status).toBe(200);
    expect(approvedAgain.body.data.reviewStatus).toBe("APPROVED");
    expect(approvedAgain.body.data.isPublic).toBe(true);
  });

  it("keeps a pending profile pending when the alumni saves it", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const saved = await saveProfile(token, { bio: "Still awaiting review" });

    expect(saved.status).toBe(200);
    expect(saved.body.data.reviewStatus).toBe("PENDING");
    expect(saved.body.data.isPublic).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(false);
  });

  it("keeps an approved profile approved when the alumni only toggles visibility", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    expect((await approveProfile(alumniId)).status).toBe(200);

    const hidden = await saveProfile(token, { isPublic: false });
    expect(hidden.body.data.reviewStatus).toBe("APPROVED");
    expect(hidden.body.data.isPublic).toBe(false);

    const shown = await saveProfile(token, { isPublic: true });
    expect(shown.body.data.reviewStatus).toBe("APPROVED");
    expect(shown.body.data.isPublic).toBe(true);
    expect(await isPublicAlumni(alumniId)).toBe(true);
  });

  it("publishes a profile without program and lets the alumni fill it later", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName: "No Program Alumni",
      nim: `WF-PROG-${workflowSequence}`,
      angkatan: 32,
      photo: `https://example.com/program-${workflowSequence}.jpg`,
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.profileCompleted).toBe(false);

    // Approval is never blocked by completeness (Pak Dhimas' requirement).
    const approved = await approveProfile(alumniId);
    expect(approved.status).toBe(200);
    expect(approved.body.data.reviewStatus).toBe("APPROVED");
    expect(approved.body.data.isPublic).toBe(true);
    expect(await isPublicAlumni(alumniId)).toBe(true);
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(200);

    // Program can still be claimed later: the informational flag flips to
    // complete, and the content edit re-queues the profile for review.
    const filled = await saveProfile(token, {
      program: "S3 TEKNIK SISTEM PERKAPALAN",
    });
    expect(filled.status).toBe(200);
    expect(filled.body.data.profileCompleted).toBe(true);
    expect(filled.body.data.reviewStatus).toBe("PENDING");
    expect(filled.body.data.isPublic).toBe(false);
  });

  it("rejects the renamed graduationYear payload instead of dropping it silently", async () => {
    const { token } = await createWorkflowAlumni();

    const response = await saveProfile(token, {
      fullName: "Legacy Payload Alumni",
      graduationYear: 2013,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/angkatan/i);

    const stored = await readProfile(token);
    expect(stored.body.data.angkatan).toBeFalsy();
  });

  it("keeps an approved profile public while profileCompleted is recomputed", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    await completeProfile(token);
    const approved = await approveProfile(alumniId);
    expect(approved.status).toBe(200);
    expect(approved.body.data.profileCompleted).toBe(true);
    expect(approved.body.data.reviewStatus).toBe("APPROVED");
    expect(approved.body.data.isPublic).toBe(true);
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(200);

    // Corrupt the stored document behind the API: the flag is stale but the
    // field is gone. Publication follows `reviewStatus` + `isPublic`, never
    // the completeness flag, so the profile stays visible.
    await getAlumniCollection().updateOne(
      { _id: new ObjectId(alumniId) },
      { $set: { program: "" } },
    );
    const corrupted = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(corrupted?.profileCompleted).toBe(true);
    expect(corrupted?.reviewStatus).toBe("APPROVED");
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(200);
    expect(await isPublicAlumni(alumniId)).toBe(true);

    // The next write recomputes the informational flag from the fields.
    const saved = await saveProfile(token, {
      bio: "Still missing a program.",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.profileCompleted).toBe(false);
  });
});

// ============================================================
// Rejection reason: admin must explain, alumni must see it
// ============================================================

describe("alumni rejection reason", () => {
  function reviewWithoutReason(id: string, payload: Record<string, unknown>) {
    return request(app)
      .patch(`/api/alumni/${id}/review`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(payload);
  }

  it("refuses a rejection without a reason", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const response = await reviewWithoutReason(id, { action: "REJECT" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/reason is required/i);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewStatus).toBe("PENDING");
    expect(stored?.isPublic).toBe(false);
    expect(stored?.reviewNote ?? null).toBeNull();
  });

  it("refuses a rejection with a whitespace-only reason", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const response = await reviewWithoutReason(id, {
      action: "REJECT",
      reason: "   \n\t  ",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/reason is required/i);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewStatus).toBe("PENDING");
    expect(stored?.reviewNote ?? null).toBeNull();
  });

  it("stores a trimmed rejection reason together with the rejection", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const response = await rejectProfile(
      id,
      "  Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan.  ",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.reviewStatus).toBe("REJECTED");
    expect(response.body.data.reviewNote).toBe(
      "Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan.",
    );
    expect(response.body.data.isPublic).toBe(false);
    expect(typeof response.body.data.profileCompleted).toBe("boolean");

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewNote).toBe(
      "Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan.",
    );
  });

  it("lets the alumni read the rejection reason on their own profile", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Company name and position are missing.");

    const mine = await readProfile(token);

    expect(mine.status).toBe(200);
    expect(mine.body.data.reviewStatus).toBe("REJECTED");
    expect(mine.body.data.reviewNote).toBe(
      "Company name and position are missing.",
    );
  });

  it("ignores a reviewNote the alumni tries to write through a profile update", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Original reviewer reason.");

    const tampered = await saveProfile(token, { reviewNote: "tampered" });

    expect(tampered.status).toBe(200);
    expect(tampered.body.data.reviewStatus).toBe("REJECTED");
    expect(tampered.body.data.reviewNote).toBe("Original reviewer reason.");
  });

  it("clears the active rejection when the alumni resubmits the profile", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Please add your career history.");

    const fixed = await saveProfile(token, {
      bio: "Career history added after rejection.",
    });

    expect(fixed.status).toBe(200);
    expect(fixed.body.data.reviewStatus).toBe("PENDING");
    expect(fixed.body.data.isPublic).toBe(false);
    expect(fixed.body.data.reviewNote ?? null).toBeNull();

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewStatus).toBe("PENDING");
    expect(stored?.reviewNote ?? null).toBeNull();

    // The rejection no longer counts as active once the profile is queued.
    const reapproved = await approveProfile(id);
    expect(reapproved.status).toBe(200);
    expect(reapproved.body.data.reviewStatus).toBe("APPROVED");
    expect(reapproved.body.data.isPublic).toBe(true);
    expect(reapproved.body.data.reviewNote ?? null).toBeNull();
  });

  it("keeps the rejection reason until the profile is resubmitted", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Still under review.");

    const reopened = await readProfile(token);

    expect(reopened.body.data.reviewStatus).toBe("REJECTED");
    expect(reopened.body.data.reviewNote).toBe("Still under review.");
  });

  it("does not expose the review note on public endpoints", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Internal reviewer note that must stay private.");

    // Legacy-style record: the note is still on a profile that is publicly
    // visible. The public serializer is an allow-list, so nothing else may
    // leak through it.
    await getAlumniCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          reviewStatus: "APPROVED",
          isPublic: true,
          profileCompleted: true,
          reviewNote: "Internal reviewer note that must stay private.",
        },
      },
    );

    const detail = await request(app).get(`/api/public/alumni/${id}`);
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.body)).not.toContain("reviewNote");
    expect(JSON.stringify(detail.body)).not.toContain("Internal reviewer note");

    const list = await request(app).get("/api/public/alumni");
    expect(JSON.stringify(list.body)).not.toContain("reviewNote");
    expect(JSON.stringify(list.body)).not.toContain("Internal reviewer note");
  });
});

// ============================================================
// Cohort year (tahunAngkatan): separate from the batch number
// ============================================================

describe("alumni cohort year (tahunAngkatan)", () => {
  it("saves and returns the cohort year on the alumni's own profile", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const saved = await completeProfile(token, { tahunAngkatan: 2015 });
    expect(saved.body.data.tahunAngkatan).toBe(2015);

    const reopened = await readProfile(token);
    expect(reopened.body.data.tahunAngkatan).toBe(2015);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.tahunAngkatan).toBe(2015);
  });

  it("clears the cohort year when the alumni sends null", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token, { tahunAngkatan: 2015 });

    const cleared = await saveProfile(token, { tahunAngkatan: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.tahunAngkatan).toBeNull();

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.tahunAngkatan).toBeNull();
  });

  it("leaves the cohort year untouched when the field is omitted", async () => {
    const { token } = await createWorkflowAlumni();
    await completeProfile(token, { tahunAngkatan: 2015 });

    const saved = await saveProfile(token, { bio: "Still the same year." });
    expect(saved.status).toBe(200);
    expect(saved.body.data.tahunAngkatan).toBe(2015);
  });

  it("rejects a cohort year outside 1961..2059", async () => {
    const { token } = await createWorkflowAlumni();
    await completeProfile(token);

    // The bounds are the values which still derive a two-digit P (1..99).
    const tooOld = await saveProfile(token, { tahunAngkatan: 1960 });
    expect(tooOld.status).toBe(400);

    const tooNew = await saveProfile(token, { tahunAngkatan: 2060 });
    expect(tooNew.status).toBe(400);

    const wayOff = await saveProfile(token, { tahunAngkatan: 1800 });
    expect(wayOff.status).toBe(400);

    const farFuture = await saveProfile(token, { tahunAngkatan: 2200 });
    expect(farFuture.status).toBe(400);

    // The stored year must be untouched by every rejected attempt.
    const stored = await readProfile(token);
    expect(stored.body.data.tahunAngkatan ?? null).toBeNull();
  });

  async function seedLegacyCohortYear(alumniId: string, year: number) {
    // A record written under the older 1900..2100 contract: P and the cohort
    // year were stored independently, so they do not have to satisfy
    // P = year - 1960. Nothing here may be migrated.
    await getAlumniCollection().updateOne(
      { _id: new ObjectId(alumniId) },
      {
        $set: {
          fullName: "Legacy Cohort Alumni",
          nim: `LEGACY-YEAR-${alumniId.slice(-6)}`,
          angkatan: 34,
          photo: `https://example.com/legacy-year-${alumniId.slice(-6)}.jpg`,
          tahunAngkatan: year,
        },
      },
    );
  }

  it("keeps a stored legacy year outside 1961..2059 fully savable", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await seedLegacyCohortYear(alumniId, 1955);

    // Touching an unrelated field must not be blocked by the stored year.
    const untouchedYear = await saveProfile(token, {
      bio: "Saved with a legacy cohort year.",
    });
    expect(untouchedYear.status).toBe(200);
    expect(untouchedYear.body.data.tahunAngkatan).toBe(1955);

    // Re-submitting the same value is an echo of stored data, not a new one.
    const echoed = await saveProfile(token, { tahunAngkatan: 1955 });
    expect(echoed.status).toBe(200);
    expect(echoed.body.data.tahunAngkatan).toBe(1955);
    // The stored P is left alone: nothing derives a value from 1955.
    expect(echoed.body.data.angkatan).toBe(34);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.tahunAngkatan).toBe(1955);
    expect(stored?.angkatan).toBe(34);
  });

  it("still rejects a *new* year outside 1961..2059 on a legacy record", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await seedLegacyCohortYear(alumniId, 1955);

    const changed = await saveProfile(token, { tahunAngkatan: 1960 });
    expect(changed.status).toBe(400);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.tahunAngkatan).toBe(1955);
    expect(stored?.angkatan).toBe(34);
  });

  it("derives P as soon as a legacy year is corrected to a valid one", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await seedLegacyCohortYear(alumniId, 1955);

    const corrected = await saveProfile(token, { tahunAngkatan: 2015 });

    expect(corrected.status).toBe(200);
    expect(corrected.body.data.tahunAngkatan).toBe(2015);
    expect(corrected.body.data.angkatan).toBe(55);
  });

  it("ignores a manual batch number while a cohort year governs the record", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token, { angkatan: 34, tahunAngkatan: 2015 });
    expect((await readProfile(token)).body.data.angkatan).toBe(55);

    const attempt = await saveProfile(token, { angkatan: 99 });

    expect(attempt.status).toBe(200);
    expect(attempt.body.data.angkatan).toBe(55);
    expect(attempt.body.data.tahunAngkatan).toBe(2015);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.angkatan).toBe(55);
    expect(stored?.tahunAngkatan).toBe(2015);
  });

  it("never silently repairs a record whose P predates the derivation rule", async () => {
    // Written before `P = tahunAngkatan - 1960` (2002 would imply 42). It is
    // not migrated and must survive every save that does not change the year.
    const { alumniId, token } = await createWorkflowAlumni();
    await getAlumniCollection().updateOne(
      { _id: new ObjectId(alumniId) },
      {
        $set: {
          fullName: "Legacy Pair Alumni",
          nim: `LEGACY-PAIR-${alumniId.slice(-6)}`,
          angkatan: 89,
          photo: `https://example.com/legacy-pair-${alumniId.slice(-6)}.jpg`,
          tahunAngkatan: 2002,
        },
      },
    );

    // Unrelated edit: neither field is even part of the payload.
    const unrelated = await saveProfile(token, { bio: "Untouched pair." });
    expect(unrelated.status).toBe(200);

    // Re-sending the stored year is an echo, not a change.
    const echoed = await saveProfile(token, { tahunAngkatan: 2002, angkatan: 3 });
    expect(echoed.status).toBe(200);
    expect(echoed.body.data.tahunAngkatan).toBe(2002);
    expect(echoed.body.data.angkatan).toBe(89);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.tahunAngkatan).toBe(2002);
    expect(stored?.angkatan).toBe(89);

    // The admin endpoint behaves the same way.
    const adminEcho = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ tahunAngkatan: 2002, angkatan: 3 });
    expect(adminEcho.status).toBe(200);
    expect(adminEcho.body.data.angkatan).toBe(89);

    // Only an explicit year change re-derives P.
    const changed = await saveProfile(token, { tahunAngkatan: 2003 });
    expect(changed.status).toBe(200);
    expect(changed.body.data.tahunAngkatan).toBe(2003);
    expect(changed.body.data.angkatan).toBe(43);
  });

  it("lets the alumni change the cohort year after the first save", async () => {
    // Not an academic identity field: unlike `angkatan` it is never claim-once.
    const { token } = await createWorkflowAlumni();
    await completeProfile(token, { tahunAngkatan: 2015 });

    const updated = await saveProfile(token, { tahunAngkatan: 2016 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.tahunAngkatan).toBe(2016);
  });

  it("recalculates the stored batch number when the year changes", async () => {
    const { token } = await createWorkflowAlumni();
    await completeProfile(token, { angkatan: 34, tahunAngkatan: 2015 });

    const saved = await saveProfile(token, {
      angkatan: 99,
      tahunAngkatan: 2016,
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.angkatan).toBe(56);
    expect(saved.body.data.tahunAngkatan).toBe(2016);
  });

  it("does not require a cohort year for a complete profile", async () => {
    const { token } = await createWorkflowAlumni();

    const saved = await completeProfile(token);
    expect(saved.body.data.profileCompleted).toBe(true);
    expect(saved.body.data.tahunAngkatan ?? null).toBeNull();
  });

  it("puts an approved profile back in review when only the year changes", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    const approved = await approveProfile(alumniId);
    expect(approved.body.data.reviewStatus).toBe("APPROVED");

    const saved = await saveProfile(token, { tahunAngkatan: 2015 });

    expect(saved.body.data.tahunAngkatan).toBe(2015);
    expect(saved.body.data.reviewStatus).toBe("PENDING");
    expect(saved.body.data.isPublic).toBe(false);
  });

  it("keeps an approved profile approved when only the year is re-sent unchanged", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token, { tahunAngkatan: 2015 });
    await approveProfile(alumniId);

    const saved = await saveProfile(token, { tahunAngkatan: 2015 });

    expect(saved.body.data.reviewStatus).toBe("APPROVED");
    expect(saved.body.data.isPublic).toBe(true);
  });

  it("returns the cohort year from public endpoints after approval", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token, { angkatan: 55, tahunAngkatan: 2015 });
    await approveProfile(alumniId);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.angkatan).toBe(55);
    expect(detail.body.data.tahunAngkatan).toBe(2015);

    const list = await request(app).get("/api/public/alumni");
    const listed = (list.body.data as Array<{ id: string }>).find(
      (alumni) => alumni.id === alumniId,
    );
    expect(listed).toMatchObject({
      angkatan: 55,
      tahunAngkatan: 2015,
    });
  });

  it("lets an admin set and clear the cohort year", async () => {
    const { alumniId } = await createWorkflowAlumni();

    const set = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ tahunAngkatan: 2015 });
    expect(set.status).toBe(200);
    expect(set.body.data.tahunAngkatan).toBe(2015);

    const cleared = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ tahunAngkatan: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.tahunAngkatan).toBeNull();
  });

  it("never lets an admin diverge angkatan from the cohort year", async () => {
    const { alumniId } = await createWorkflowAlumni();

    const setYear = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ tahunAngkatan: 2015 });
    expect(setYear.status).toBe(200);
    expect(setYear.body.data.angkatan).toBe(55);

    // A raw batch number is not an independent value any more: with a cohort
    // year on the record it must never win over `tahunAngkatan - 1960`.
    const diverge = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ angkatan: 99 });
    expect(diverge.status).toBe(200);
    expect(diverge.body.data.angkatan).toBe(55);
    expect(diverge.body.data.tahunAngkatan).toBe(2015);

    const together = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ angkatan: 99, tahunAngkatan: 2016 });
    expect(together.status).toBe(200);
    expect(together.body.data.angkatan).toBe(56);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(stored?.angkatan).toBe(56);
    expect(stored?.tahunAngkatan).toBe(2016);
  });
});

// ============================================================
// Registration gate: full name + photo + angkatan (P) are mandatory
// ============================================================

describe("alumni registration requirements", () => {
  const fullName = "Registration Alumni";
  const photo = "https://example.com/registration-alumni.jpg";

  function readStored(alumniId: string) {
    return getAlumniCollection().findOne({ _id: new ObjectId(alumniId) });
  }

  it("accepts a registration save that has full name, photo, and angkatan", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, { fullName, angkatan: 41, photo });

    expect(saved.status).toBe(200);
    expect(saved.body.success).toBe(true);
    expect(saved.body.data.fullName).toBe(fullName);
    expect(saved.body.data.angkatan).toBe(41);
    expect(saved.body.data.photo).toBe(photo);
    // A first save never publishes itself: registration still waits for review.
    expect(saved.body.data.reviewStatus).toBe("PENDING");
    expect(saved.body.data.isPublic).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(false);
  });

  it("rejects a registration save without a full name", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const rejected = await saveProfile(token, { angkatan: 41, photo });

    expect(rejected.status).toBe(400);
    expect(rejected.body.success).toBe(false);
    expect(rejected.body.message).toMatch(/full name/i);

    // Nothing is persisted, so partial data never looks like a registration.
    const stored = await readStored(alumniId);
    expect(stored?.fullName ?? "").toBe("");
    expect(stored?.photo).toBeUndefined();
    // The shell stores the unset batch number as null (driver behaviour).
    expect(stored?.angkatan ?? null).toBeNull();
    expect(stored?.profileCompleted).toBe(false);
    expect(stored?.reviewStatus).toBe("PENDING");
  });

  it("rejects a whitespace-only full name", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const rejected = await saveProfile(token, {
      fullName: "   ",
      angkatan: 41,
      photo,
    });

    expect(rejected.status).toBe(400);
    expect(
      (rejected.body.errors as Array<{ path: string[] }>).some((issue) =>
        issue.path.includes("fullName"),
      ),
    ).toBe(true);

    const stored = await readStored(alumniId);
    expect(stored?.fullName ?? "").toBe("");
  });

  it("rejects a registration save without a photo", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const rejected = await saveProfile(token, { fullName, angkatan: 41 });

    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toMatch(/photo/i);

    const stored = await readStored(alumniId);
    expect(stored?.photo).toBeUndefined();
    // The shell stores the unset batch number as null (driver behaviour).
    expect(stored?.angkatan ?? null).toBeNull();
    expect(stored?.fullName ?? "").toBe("");
  });

  it("rejects a registration save without angkatan (P)", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const rejected = await saveProfile(token, { fullName, photo });

    expect(rejected.status).toBe(400);
    expect(rejected.body.message).toMatch(/angkatan/i);

    const stored = await readStored(alumniId);
    // The shell stores the unset batch number as null (driver behaviour).
    expect(stored?.angkatan ?? null).toBeNull();
    expect(stored?.photo).toBeUndefined();
  });

  it("rejects clearing an existing photo to an empty value", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const cleared = await saveProfile(token, { photo: "" });

    expect(cleared.status).toBe(400);
    // An empty value is refused by the photo validation itself, so the error
    // points at the photo field instead of silently keeping a blank string.
    expect(
      (cleared.body.errors as Array<{ path: string[] }>).some((issue) =>
        issue.path.includes("photo"),
      ),
    ).toBe(true);

    const stored = await readStored(alumniId);
    expect(stored?.photo).toBe(
      `https://example.com/workflow-${workflowSequence}.jpg`,
    );
  });

  it("still accepts a registration save with an empty NIM", async () => {
    const { token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName,
      angkatan: 41,
      photo,
      program: "S1 TEKNIK SISTEM PERKAPALAN",
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.nim ?? "").toBe("");
    // NIM only drives the informational completeness flag.
    expect(saved.body.data.profileCompleted).toBe(false);
  });

  it("still accepts a registration save with an empty program", async () => {
    const { token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName,
      angkatan: 41,
      photo,
      nim: `WF-REG-${workflowSequence}`,
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.program ?? "").toBe("");
    expect(saved.body.data.profileCompleted).toBe(false);
  });

  it("still accepts a registration save with an empty cohort year", async () => {
    const { token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName,
      angkatan: 41,
      photo,
      nim: `WF-REG-YEAR-${workflowSequence}`,
      program: "S1 TEKNIK SISTEM PERKAPALAN",
      tahunAngkatan: null,
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.tahunAngkatan ?? null).toBeNull();
    expect(saved.body.data.profileCompleted).toBe(true);
  });
});

// ============================================================
// Admin list: filter by review status (All / Pending / Rejected / Approved)
// ============================================================

describe("alumni admin review status filter", () => {
  const rejectionReason = "Mohon melengkapi data pekerjaan.";

  let pendingAlumniId = "";
  let approvedAlumniId = "";
  let rejectedAlumniId = "";
  let incompleteApprovedAlumniId = "";

  type ListRow = {
    _id: string;
    reviewStatus?: string;
    reviewNote?: string | null;
    profileCompleted?: boolean;
  };

  beforeAll(async () => {
    const pending = await createWorkflowAlumni();
    await completeProfile(pending.token);
    pendingAlumniId = pending.alumniId;

    const approved = await createWorkflowAlumni();
    await completeProfile(approved.token);
    expect((await approveProfile(approved.alumniId)).status).toBe(200);
    approvedAlumniId = approved.alumniId;

    const rejected = await createWorkflowAlumni();
    await completeProfile(rejected.token);
    expect(
      (await rejectProfile(rejected.alumniId, rejectionReason)).status,
    ).toBe(200);
    rejectedAlumniId = rejected.alumniId;

    // Approved while a publish field (NIM) is still missing: the Approved
    // filter must never be confused with `profileCompleted`.
    const incomplete = await createWorkflowAlumni();
    const saved = await saveProfile(incomplete.token, {
      fullName: "Approved Incomplete Alumni",
      angkatan: 44,
      photo: `https://example.com/approved-incomplete-${workflowSequence}.jpg`,
      program: "S2 TEKNIK SISTEM PERKAPALAN",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.profileCompleted).toBe(false);
    expect((await approveProfile(incomplete.alumniId)).status).toBe(200);
    incompleteApprovedAlumniId = incomplete.alumniId;
  });

  function listAlumni(reviewStatus?: string) {
    const query: Record<string, string | number> = { page: 1, limit: 200 };
    if (reviewStatus) query.reviewStatus = reviewStatus;

    return request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query(query);
  }

  function rows(response: { body: { data?: ListRow[] } }) {
    return response.body.data ?? [];
  }

  it("returns every review status when no filter is sent (All)", async () => {
    const response = await listAlumni();

    expect(response.status).toBe(200);

    const ids = rows(response).map((row) => row._id);
    expect(ids).toContain(pendingAlumniId);
    expect(ids).toContain(approvedAlumniId);
    expect(ids).toContain(rejectedAlumniId);
  });

  it("returns only PENDING alumni for the Pending filter", async () => {
    const response = await listAlumni("PENDING");

    expect(response.status).toBe(200);

    const data = rows(response);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((row) => row.reviewStatus === "PENDING")).toBe(true);
    expect(data.map((row) => row._id)).toContain(pendingAlumniId);
    expect(data.map((row) => row._id)).not.toContain(rejectedAlumniId);
  });

  it("returns only REJECTED alumni for the Rejected filter", async () => {
    const response = await listAlumni("REJECTED");

    expect(response.status).toBe(200);

    const data = rows(response);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((row) => row.reviewStatus === "REJECTED")).toBe(true);
    expect(data.map((row) => row._id)).toContain(rejectedAlumniId);
    expect(data.map((row) => row._id)).not.toContain(approvedAlumniId);
  });

  it("returns only APPROVED alumni for the Approved filter", async () => {
    const response = await listAlumni("APPROVED");

    expect(response.status).toBe(200);

    const data = rows(response);
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((row) => row.reviewStatus === "APPROVED")).toBe(true);
    expect(data.map((row) => row._id)).toContain(approvedAlumniId);
    expect(data.map((row) => row._id)).not.toContain(pendingAlumniId);
  });

  it("keeps an approved profile with profileCompleted=false in the Approved filter", async () => {
    const response = await listAlumni("APPROVED");

    const row = rows(response).find(
      (item) => item._id === incompleteApprovedAlumniId,
    );

    expect(row).toBeDefined();
    expect(row?.reviewStatus).toBe("APPROVED");
    expect(row?.profileCompleted).toBe(false);
  });

  it("keeps the rejection reason on alumni returned by the Rejected filter", async () => {
    const response = await listAlumni("REJECTED");

    const row = rows(response).find((item) => item._id === rejectedAlumniId);

    expect(row).toBeDefined();
    expect(row?.reviewStatus).toBe("REJECTED");
    expect(row?.reviewNote).toBe(rejectionReason);
  });

  it("rejects an unknown review status filter", async () => {
    const response = await listAlumni("ARCHIVED");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/reviewStatus/i);
  });
});
