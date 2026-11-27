import { afterEach, describe, expect, it } from "vitest";

import { cookieSecurityOptions } from "../src/modules/auth/auth.controller.js";

const originalDomain = process.env.AUTH_COOKIE_DOMAIN;

afterEach(() => {
  if (originalDomain === undefined) {
    delete process.env.AUTH_COOKIE_DOMAIN;
  } else {
    process.env.AUTH_COOKIE_DOMAIN = originalDomain;
  }
});

describe("auth cookie security options", () => {
  it("omits the domain attribute when AUTH_COOKIE_DOMAIN is unset", () => {
    delete process.env.AUTH_COOKIE_DOMAIN;

    const options = cookieSecurityOptions();

    expect(options).not.toHaveProperty("domain");
    expect(options).toMatchObject({ path: "/" });
  });

  it("omits the domain attribute when AUTH_COOKIE_DOMAIN is blank", () => {
    process.env.AUTH_COOKIE_DOMAIN = "   ";

    expect(cookieSecurityOptions()).not.toHaveProperty("domain");
  });

  it("applies the trimmed parent domain when AUTH_COOKIE_DOMAIN is set", () => {
    process.env.AUTH_COOKIE_DOMAIN = "  .rams.co.id  ";

    expect(cookieSecurityOptions()).toMatchObject({
      path: "/",
      domain: ".rams.co.id",
    });
  });
});
