import { beforeAll, afterAll, describe, expect, it } from "vitest";

import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";

import { connectDatabase } from "../src/config/database.js";

import { getProjectsCollection } from "../src/modules/projects/project.repository.js";

import { getPartnersCollection } from "../src/modules/partners/partner.repository.js";

import { PARTNER_TYPE } from "../src/modules/partners/partner.types.js";

const TEST_PUBLISHED_PROJECT_ID = new ObjectId();

const TEST_UNPUBLISHED_PROJECT_ID = new ObjectId();

const TEST_SLUG = "vitest-public-project";

const TEST_UNPUBLISHED_SLUG = "vitest-unpublished-project";

const TEST_UNIVERSITY_PARTNER_ID = new ObjectId();

const TEST_INDUSTRIAL_PARTNER_ID = new ObjectId();

const TEST_UNIVERSITY_NAME = "Vitest Public University";

const TEST_INDUSTRIAL_NAME = "Vitest Public Industrial";

beforeAll(async () => {
  await connectDatabase();

  const projects = getProjectsCollection();

  const partners = getPartnersCollection();

  await projects.deleteMany({
    slug: {
      $in: [TEST_SLUG, TEST_UNPUBLISHED_SLUG],
    },
  });

  await partners.deleteMany({
    name: {
      $in: [TEST_UNIVERSITY_NAME, TEST_INDUSTRIAL_NAME],
    },
  });

  const now = new Date();

  await projects.insertMany([
    {
      _id: TEST_PUBLISHED_PROJECT_ID,
      title: "Vitest Public Project",
      slug: TEST_SLUG,
      description: "Published project for public API testing.",
      category: "RESEARCH",
      partnerIds: [],
      year: 2026,
      status: "ONGOING",
      image: undefined,
      technologies: ["TypeScript", "MongoDB"],
      published: true,
      createdAt: now,
      updatedAt: now,
    },

    {
      _id: TEST_UNPUBLISHED_PROJECT_ID,
      title: "Vitest Unpublished Project",
      slug: TEST_UNPUBLISHED_SLUG,
      description: "Unpublished project for public API testing.",
      category: "RESEARCH",
      partnerIds: [],
      year: 2026,
      status: "PLANNING",
      image: undefined,
      technologies: ["TypeScript"],
      published: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await partners.insertMany([
    {
      _id: TEST_UNIVERSITY_PARTNER_ID,
      name: TEST_UNIVERSITY_NAME,
      type: PARTNER_TYPE.UNIVERSITY,
      logo: "https://example.com/vitest-university.png",
      website: "https://example.com/vitest-university",
      country: "Indonesia",
      description: "University partner for public API testing.",
      isFeatured: false,
      published: true,
      createdAt: now,
      updatedAt: now,
    },

    {
      _id: TEST_INDUSTRIAL_PARTNER_ID,
      name: TEST_INDUSTRIAL_NAME,
      type: PARTNER_TYPE.INDUSTRIAL,
      logo: "https://example.com/vitest-industrial.png",
      website: "https://example.com/vitest-industrial",
      country: "Indonesia",
      description: "Industrial partner for public API testing.",
      isFeatured: false,
      published: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
});

afterAll(async () => {
  const projects = getProjectsCollection();

  const partners = getPartnersCollection();

  await projects.deleteMany({
    _id: {
      $in: [TEST_PUBLISHED_PROJECT_ID, TEST_UNPUBLISHED_PROJECT_ID],
    },
  });

  await partners.deleteMany({
    _id: {
      $in: [TEST_UNIVERSITY_PARTNER_ID, TEST_INDUSTRIAL_PARTNER_ID],
    },
  });
});

describe("Public API", () => {
  it("should get published public projects", async () => {
    const response = await request(app).get("/api/public/projects");

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    expect(
      response.body.data.some((project: any) => project.slug === TEST_SLUG),
    ).toBe(true);

    expect(
      response.body.data.some(
        (project: any) => project.slug === TEST_UNPUBLISHED_SLUG,
      ),
    ).toBe(false);
  });

  it("should get a published project by slug", async () => {
    const response = await request(app).get(
      `/api/public/projects/${TEST_SLUG}`,
    );

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.slug).toBe(TEST_SLUG);

    expect(response.body.data.published).toBe(true);
  });

  it("should return 404 for an unpublished project", async () => {
    const response = await request(app).get(
      `/api/public/projects/${TEST_UNPUBLISHED_SLUG}`,
    );

    expect(response.status).toBe(404);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe("Project not found");
  });

  it("should return 404 for a missing project", async () => {
    const response = await request(app).get(
      "/api/public/projects/project-does-not-exist",
    );

    expect(response.status).toBe(404);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe("Project not found");
  });

  it("should get published university partners", async () => {
    const response = await request(app).get("/api/public/partners/university");

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    expect(
      response.body.data.some(
        (partner: any) => partner.name === TEST_UNIVERSITY_NAME,
      ),
    ).toBe(true);
  });

  it("should only return published university partners", async () => {
    const response = await request(app).get("/api/public/partners/university");

    expect(response.status).toBe(200);

    expect(
      response.body.data.some(
        (partner: any) => partner.name === TEST_INDUSTRIAL_NAME,
      ),
    ).toBe(false);

    expect(
      response.body.data.every(
        (partner: any) =>
          partner.type === PARTNER_TYPE.UNIVERSITY &&
          partner.published === true,
      ),
    ).toBe(true);
  });

  it("should get published industrial partners", async () => {
    const response = await request(app).get("/api/public/partners/industrial");

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    expect(
      response.body.data.some(
        (partner: any) => partner.name === TEST_INDUSTRIAL_NAME,
      ),
    ).toBe(true);
  });

  it("should only return published industrial partners", async () => {
    const response = await request(app).get("/api/public/partners/industrial");

    expect(response.status).toBe(200);

    expect(
      response.body.data.some(
        (partner: any) => partner.name === TEST_UNIVERSITY_NAME,
      ),
    ).toBe(false);

    expect(
      response.body.data.every(
        (partner: any) =>
          partner.type === PARTNER_TYPE.INDUSTRIAL &&
          partner.published === true,
      ),
    ).toBe(true);
  });

  it("should allow public endpoints without authentication", async () => {
    const responses = await Promise.all([
      request(app).get("/api/public/projects"),

      request(app).get("/api/public/partners/university"),

      request(app).get("/api/public/partners/industrial"),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
    }
  });
});
