import { beforeAll, afterAll, describe, expect, it } from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";

import { connectDatabase } from "../src/config/database.js";

import { getPartnersCollection } from "../src/modules/partners/partner.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const TEST_UNIVERSITY_NAME = "Vitest University Partner";

const TEST_INDUSTRIAL_NAME = "Vitest Industrial Partner";

let adminToken: string;
let universityId: string;
let industrialId: string;

beforeAll(async () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for partner tests");
  }

  await connectDatabase();
  await ensureTestUsers();

  const collection = getPartnersCollection();

  await collection.deleteMany({
    name: {
      $in: [TEST_UNIVERSITY_NAME, TEST_INDUSTRIAL_NAME],
    },
  });

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
});

afterAll(async () => {
  const collection = getPartnersCollection();

  await collection.deleteMany({
    name: {
      $in: [TEST_UNIVERSITY_NAME, TEST_INDUSTRIAL_NAME],
    },
  });
});

describe("Partners API", () => {
  it("should create a university partner", async () => {
    const response = await request(app)
      .post("/api/partners/university")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        name: TEST_UNIVERSITY_NAME,
        logo: "https://example.com/vitest-university.png",
        website: "https://example.com",
        country: "Indonesia",
        description: "University partner for automated testing.",
        isFeatured: true,
        published: true,
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.data.name).toBe(TEST_UNIVERSITY_NAME);

    expect(response.body.data.type).toBe("UNIVERSITY");

    universityId = response.body.data._id;
  });

  it("should get the university partner", async () => {
    const response = await request(app)
      .get(`/api/partners/university/${universityId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.name).toBe(TEST_UNIVERSITY_NAME);

    expect(response.body.data.type).toBe("UNIVERSITY");
  });

  it("should update the university partner", async () => {
    const response = await request(app)
      .patch(`/api/partners/university/${universityId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        description: "Updated by Vitest.",
        isFeatured: false,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.description).toBe("Updated by Vitest.");

    expect(response.body.data.isFeatured).toBe(false);
  });

  it("should reject invalid university partner id", async () => {
    const response = await request(app)
      .get("/api/partners/university/invalid-id")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Invalid partner ID");
  });

  it("should reject invalid university partner body", async () => {
    const response = await request(app)
      .post("/api/partners/university")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        name: "A",
        website: "not-a-url",
      });

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe("Validation failed");
  });

  it("should create an industrial partner", async () => {
    const response = await request(app)
      .post("/api/partners/industrial")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        name: TEST_INDUSTRIAL_NAME,
        logo: "https://example.com/vitest-industrial.png",
        website: "https://example.com",
        country: "Indonesia",
        description: "Industrial partner for automated testing.",
        isFeatured: true,
        published: true,
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.data.name).toBe(TEST_INDUSTRIAL_NAME);

    expect(response.body.data.type).toBe("INDUSTRIAL");

    industrialId = response.body.data._id;
  });

  it("should get the industrial partner", async () => {
    const response = await request(app)
      .get(`/api/partners/industrial/${industrialId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.name).toBe(TEST_INDUSTRIAL_NAME);

    expect(response.body.data.type).toBe("INDUSTRIAL");
  });

  it("should delete the university partner", async () => {
    const response = await request(app)
      .delete(`/api/partners/university/${universityId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });

  it("should delete the industrial partner", async () => {
    const response = await request(app)
      .delete(`/api/partners/industrial/${industrialId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });
});
