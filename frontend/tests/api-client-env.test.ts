import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, apiUrl } from "@/lib/api/client";

describe("API URL resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses the configured origin without trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/api///");

    expect(apiUrl("/publications/1/pdf")).toBe(
      "https://api.example.com/api/publications/1/pdf",
    );
  });

  it("keeps local builds on the local default", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(apiUrl("/public/research")).toBe(
      "http://localhost:5000/api/public/research",
    );
  });

  it("does not require the origin while a production build collects data", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");

    expect(apiUrl("/public/research")).toBe(
      "http://localhost:5000/api/public/research",
    );
  });

  it("rejects a missing origin on the first production request", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/public/research")).rejects.toThrow(
      /NEXT_PUBLIC_API_URL is required/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("imports cleanly in a production build without the variable", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.resetModules();

    await expect(import("@/lib/api/client")).resolves.toBeDefined();
  });
});
