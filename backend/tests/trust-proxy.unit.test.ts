import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getTrustProxyMode,
  getTrustProxySetting,
  isTrustProxyConfigured,
} from "../src/config/security.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalTrustProxy = process.env.TRUST_PROXY;

beforeEach(() => {
  process.env.NODE_ENV = "test";
  delete process.env.TRUST_PROXY;
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalTrustProxy === undefined) {
    delete process.env.TRUST_PROXY;
  } else {
    process.env.TRUST_PROXY = originalTrustProxy;
  }
});

describe("trust proxy configuration", () => {
  it("defaults to disabled outside production when unset", () => {
    expect(getTrustProxySetting()).toBe(false);
    expect(getTrustProxyMode()).toBe("disabled");
    expect(isTrustProxyConfigured()).toBe(false);
  });

  it("accepts an explicit disabled value", () => {
    process.env.TRUST_PROXY = "false";
    expect(getTrustProxySetting()).toBe(false);
    expect(getTrustProxyMode()).toBe("disabled");
    expect(isTrustProxyConfigured()).toBe(true);
  });

  it("accepts a trusted hop count", () => {
    process.env.TRUST_PROXY = "1";
    expect(getTrustProxySetting()).toBe(1);
    expect(getTrustProxyMode()).toBe("hop-count");
  });

  it("accepts a trusted proxy list", () => {
    process.env.TRUST_PROXY = "loopback,linklocal,10.0.0.0/8";
    expect(getTrustProxySetting()).toBe("loopback,linklocal,10.0.0.0/8");
    expect(getTrustProxyMode()).toBe("trusted-list");
  });

  it("rejects true because clients can spoof forwarded headers", () => {
    process.env.TRUST_PROXY = "true";
    expect(() => getTrustProxySetting()).toThrow(/unsafe/i);
  });

  it("rejects invalid hop counts and proxy entries", () => {
    for (const value of ["0", "-1", "11", "999.1.1.1", "10.0.0.0/33"]) {
      process.env.TRUST_PROXY = value;
      expect(() => getTrustProxySetting()).toThrow();
    }
  });

  it("requires an explicit setting in production", () => {
    process.env.NODE_ENV = "production";
    expect(() => getTrustProxySetting()).toThrow(
      /Production requires TRUST_PROXY/,
    );
    process.env.TRUST_PROXY = "1";
    expect(getTrustProxySetting()).toBe(1);
  });
});
