import { beforeAll, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getProjectsCollection } from "../src/modules/projects/project.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const TEST_PROJECT_SLUG = "vitest-project-test";
let adminToken: string;
let projectId: string;

beforeAll(async () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for project tests");
  }

  await connectDatabase();
  await ensureTestUsers();

  const collection = getProjectsCollection();

  await collection.deleteMany({
    slug: TEST_PROJECT_SLUG,
  });

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
});

afterAll(async () => {
  const collection = getProjectsCollection();

  await collection.deleteMany({
    slug: TEST_PROJECT_SLUG,
  });
});

describe("Projects API", () => {
  it("should create a project", async () => {
    const response = await request(app)
      .post("/api/projects")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        title: "Vitest Project Test",
        slug: TEST_PROJECT_SLUG,
        description: "Project created for automated testing.",
        category: "DEVELOPMENT",
        partnerIds: [],
        year: 2026,
        status: "ONGOING",
        technologies: ["TypeScript", "Vitest"],
        published: true,
      });

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.data.slug).toBe(TEST_PROJECT_SLUG);

    projectId = response.body.data._id;
  });

  it("should get project by id", async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.slug).toBe(TEST_PROJECT_SLUG);
  });

  it("should get project by slug", async () => {
    const response = await request(app)
      .get(`/api/projects/slug/${TEST_PROJECT_SLUG}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.slug).toBe(TEST_PROJECT_SLUG);
  });

  it("should reject invalid project id", async () => {
    const response = await request(app)
      .get("/api/projects/invalid-id")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Invalid project ID");
  });

  it("should reject invalid project body", async () => {
    const response = await request(app)
      .post("/api/projects")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({});

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe("Validation failed");
  });

  it("should delete the test project", async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
  });
});
