import { beforeAll, afterAll, describe, expect, it } from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import app from "../src/app.js";

import { connectDatabase } from "../src/config/database.js";

import { getDosenCollection } from "../src/modules/dosen/dosen.repository.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const TEST_USER_ID = TEST_DOSEN_USER_ID;

const TEST_EMPLOYEE_ID = "VITEST-DOSEN-001";

let adminToken: string;
let dosenId: string;

beforeAll(async () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for dosen tests");
  }

  await connectDatabase();
  await ensureTestUsers();

  const collection = getDosenCollection();

  await collection.deleteMany({
    employeeId: TEST_EMPLOYEE_ID,
  });

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
});

afterAll(async () => {
  const collection = getDosenCollection();

  await collection.deleteMany({
    employeeId: TEST_EMPLOYEE_ID,
  });
});

describe("Dosen API", () => {
  it("should create a dosen", async () => {
    const response = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        userId: TEST_USER_ID,
        fullName: "Vitest Dosen",
        employeeId: TEST_EMPLOYEE_ID,
        title: "Dr.",
        position: "Lecturer",
        specialization: ["Maritime Engineering", "Marine Technology"],
        email: "vitest.dosen@test.local",
        phone: "081234567890",
        photo: "https://example.com/vitest-dosen.jpg",
        bio: "Dosen created specifically for automated testing.",
        linkedin: "https://www.linkedin.com/in/vitest-dosen",
        isPublic: true,
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.data.fullName).toBe("Vitest Dosen");

    expect(response.body.data.employeeId).toBe(TEST_EMPLOYEE_ID);

    dosenId = response.body.data._id;
  });

  it("should get all dosen", async () => {
    const response = await request(app)
      .get("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    expect(
      response.body.data.some(
        (dosen: any) => dosen.employeeId === TEST_EMPLOYEE_ID,
      ),
    ).toBe(true);
  });

  it("should expose public dosen without authentication", async () => {
    const response = await request(app).get("/api/public/dosen");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(
      response.body.data.some(
        (dosen: any) => dosen.fullName === "Vitest Dosen",
      ),
    ).toBe(true);
    expect(response.body.data[0]).not.toHaveProperty("userId");
    expect(response.body.data[0]).not.toHaveProperty("email");
    expect(response.body.data[0]).not.toHaveProperty("phone");
    expect(response.body.data[0]).not.toHaveProperty("employeeId");
  });

  it("should get dosen by id", async () => {
    const response = await request(app)
      .get(`/api/dosen/${dosenId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data._id).toBe(dosenId);

    expect(response.body.data.fullName).toBe("Vitest Dosen");
  });

  it("should get dosen by employee id", async () => {
    const response = await request(app)
      .get(`/api/dosen/employee/${TEST_EMPLOYEE_ID}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.employeeId).toBe(TEST_EMPLOYEE_ID);
  });

  it("should reject invalid dosen id", async () => {
    const response = await request(app)
      .get("/api/dosen/invalid-id")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Invalid dosen ID");
  });

  it("should reject invalid dosen body", async () => {
    const response = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({});

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe("Validation failed");
  });

  it("should update the dosen", async () => {
    const response = await request(app)
      .patch(`/api/dosen/${dosenId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        fullName: "Vitest Dosen Updated",
        position: "Senior Lecturer",
        isPublic: false,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.fullName).toBe("Vitest Dosen Updated");

    expect(response.body.data.position).toBe("Senior Lecturer");

    expect(response.body.data.isPublic).toBe(false);
  });

  //   it("should get public dosen without the private test record", async () => {
  //     const response =
  //       await request(app)
  //         .get("/api/dosen/public");

  //     expect(response.status)
  //       .toBe(200);

  //     expect(response.body.success)
  //       .toBe(true);

  //     expect(
  //       Array.isArray(response.body.data)
  //     ).toBe(true);

  //     expect(
  //       response.body.data.some(
  //         (dosen: any) =>
  //           dosen.employeeId ===
  //           TEST_EMPLOYEE_ID
  //       )
  //     ).toBe(false);
  //   });

  it("should delete the test dosen", async () => {
    const response = await request(app)
      .delete(`/api/dosen/${dosenId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe("Dosen deleted successfully");

    const account = await getUsersCollection().findOne({
      _id: new ObjectId(TEST_USER_ID),
    });
    expect(account?.isActive).toBe(false);
    expect(account?.tokenVersion).toBeGreaterThan(0);
  });
});
