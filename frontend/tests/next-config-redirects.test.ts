import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

describe("legacy meetings redirects", () => {
  it("redirects /meetings and nested paths to the dashboard workspace", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/meetings",
          destination: "/dashboard/meetings",
        }),
        expect.objectContaining({
          source: "/meetings/:path*",
          destination: "/dashboard/meetings/:path*",
        }),
      ]),
    );
  });
});
