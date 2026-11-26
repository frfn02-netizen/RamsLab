import { describe, expect, it } from "vitest";

import { isValidE164, normalizeE164 } from "../src/lib/phone.js";

describe("E.164 normalization", () => {
  it("accepts international formats without country context", () => {
    expect(normalizeE164("+62 812-3456-7890")).toEqual({
      ok: true,
      value: "+6281234567890",
    });
    expect(normalizeE164("0062 812 3456 7890")).toEqual({
      ok: true,
      value: "+6281234567890",
    });
  });

  it("requires explicit country context for local and country-code formats", () => {
    expect(normalizeE164("0812 3456 7890")).toEqual({
      ok: false,
      reason: "missing_country_code",
    });
    expect(normalizeE164("62812 3456 7890")).toEqual({
      ok: false,
      reason: "missing_country_code",
    });
    expect(
      normalizeE164("0812 3456 7890", { defaultCountryCode: "62" }),
    ).toEqual({
      ok: true,
      value: "+6281234567890",
    });
    expect(
      normalizeE164("62812 3456 7890", { defaultCountryCode: "62" }),
    ).toEqual({
      ok: true,
      value: "+6281234567890",
    });
  });

  it("rejects unsafe or ambiguous values", () => {
    expect(normalizeE164("")).toEqual({ ok: false, reason: "empty" });
    expect(normalizeE164("   ")).toEqual({ ok: false, reason: "empty" });
    expect(normalizeE164("not-a-number")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(normalizeE164("+0123456789")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(normalizeE164("12345")).toEqual({
      ok: false,
      reason: "missing_country_code",
    });
    expect(normalizeE164("+1234567890123456")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("accepts only canonical stored values", () => {
    expect(isValidE164("+6281234567890")).toBe(true);
    expect(isValidE164("081234567890")).toBe(false);
    expect(isValidE164(null)).toBe(false);
  });
});
