import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured origin without trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", " https://example.com/// ");

    expect(getSiteUrl()).toBe("https://example.com");
  });

  it("uses the local origin outside production", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("uses the public origin while a production build collects page data", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");

    expect(getSiteUrl()).toBe("https://rams.co.id");
  });

  it("rejects a missing origin on a production server", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PHASE", "phase-production-server");

    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL is required/);
  });
});
