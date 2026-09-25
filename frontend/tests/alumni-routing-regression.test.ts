import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => {
    const { NextResponse } = require("next/server");
    return (_request: any) => {
      const response = NextResponse.next();
      response.headers.set("x-intl-middleware", "true");
      return response;
    };
  },
}));

vi.mock("next-intl/routing", () => ({
  defineRouting: vi.fn(() => ({
    locales: ["en", "id"],
    defaultLocale: "en",
  })),
}));

import proxy, { config } from "../proxy";

function makeRequest(pathname: string) {
  return new NextRequest(`http://localhost:3000${pathname}`);
}

describe("proxy middleware – alumni routing", () => {
  it("sends /alumni/{id} through i18n middleware", () => {
    const request = makeRequest("/alumni/6ab0d6de07058c3a572ea486");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBe("true");
  });

  it("keeps /alumni (portal landing) as private (no i18n)", () => {
    const request = makeRequest("/alumni");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("keeps /alumni/login as private", () => {
    const request = makeRequest("/alumni/login");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("keeps /alumni/register as private", () => {
    const request = makeRequest("/alumni/register");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("keeps /alumni/dashboard as private", () => {
    const request = makeRequest("/alumni/dashboard");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("keeps /alumni/history as private", () => {
    const request = makeRequest("/alumni/history");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("sends /team/{id} through i18n (not private)", () => {
    const request = makeRequest("/team/some-id-123");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBe("true");
  });

  it("keeps /dashboard as private", () => {
    const request = makeRequest("/dashboard");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("keeps /api as private", () => {
    const request = makeRequest("/api/some-endpoint");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("config matcher excludes static files", () => {
    expect(config.matcher).toEqual(["/((?!_next|.*\\..*).*)"]);
  });
});

describe("proxy middleware – trailing slash (trailingSlash: true deployments)", () => {
  it.each([
    "/alumni/",
    "/alumni/login/",
    "/alumni/register/",
    "/alumni/dashboard/",
    "/alumni/history/",
  ])("keeps %s as private", (pathname) => {
    const request = makeRequest(pathname);
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBeNull();
  });

  it("still sends /alumni/{id}/ through i18n middleware", () => {
    const request = makeRequest("/alumni/6ab0d6de07058c3a572ea486/");
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBe("true");
  });
});

describe("proxy middleware – alumni detail IDs go through i18n", () => {
  it.each([
    "/alumni/abc123",
    "/alumni/6ab0d6de07058c3a572ea486",
    "/alumni/507f1f77bcf86cd799439011",
  ])("%s is routed through i18n middleware", (pathname) => {
    const request = makeRequest(pathname);
    const response = proxy(request);
    expect(response.headers.get("x-intl-middleware")).toBe("true");
  });
});
