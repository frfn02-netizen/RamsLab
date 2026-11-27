import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("meetings routing redirects", () => {
  it("keeps /meetings as the DOSEN workspace instead of redirecting it", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const sources = redirects.map((redirect) => redirect.source);

    expect(sources).not.toContain("/meetings");
    expect(sources).not.toContain("/meetings/:path*");
    expect(sources).not.toContain("/en/meetings");
    expect(sources).not.toContain("/en/meetings/:path*");
    expect(sources).not.toContain("/id/meetings");
    expect(sources).not.toContain("/id/meetings/:path*");
    expect(
      sources.some((source) => /meetings(?:\/|$)/.test(source)),
    ).toBe(false);
  });

  it("still sends the legacy /schedule alias to the Meetings workspace", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/schedule",
          destination: "/meetings",
        }),
        expect.objectContaining({
          source: "/:locale/schedule",
          destination: "/:locale/meetings",
        }),
      ]),
    );
  });
});
