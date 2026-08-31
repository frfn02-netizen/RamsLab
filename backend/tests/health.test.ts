import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Health API", () => {
  it("should return API health status", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "RAMS API is running",
    });

    expect(response.body.timestamp).toBeDefined();
  });
});
