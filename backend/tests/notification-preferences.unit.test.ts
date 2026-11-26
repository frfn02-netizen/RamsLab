import { describe, expect, it } from "vitest";

import { resolveNotificationPreferences } from "../src/modules/users/notification-preferences.js";

const NOW = new Date("2040-01-01T00:00:00.000Z");

function existing(
  overrides: Partial<{
    whatsappNumber: string | null;
    whatsappOptIn: boolean;
    whatsappOptInAt: Date | null;
    whatsappConsentNumber: string | null;
  }> = {},
) {
  return {
    whatsappNumber: null,
    whatsappOptIn: false,
    whatsappOptInAt: null,
    whatsappConsentNumber: null,
    ...overrides,
  };
}

describe("notification preferences", () => {
  it("records consent for the explicit international number", () => {
    const result = resolveNotificationPreferences(
      existing(),
      { whatsappNumber: "+6281234567890", whatsappOptIn: true },
      NOW,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        whatsappNumber: "+6281234567890",
        whatsappOptIn: true,
        whatsappOptInAt: NOW,
        whatsappConsentNumber: "+6281234567890",
      },
    });
  });

  it("requires explicit country context for local numbers", () => {
    expect(
      resolveNotificationPreferences(
        existing(),
        { whatsappNumber: "0812-3456-7890", whatsappOptIn: true },
        NOW,
      ),
    ).toEqual({ ok: false, reason: "missing_country_code" });
  });

  it("requires a number when consent is active", () => {
    expect(
      resolveNotificationPreferences(existing(), { whatsappOptIn: true }, NOW),
    ).toEqual({ ok: false, reason: "number_required" });
    expect(
      resolveNotificationPreferences(
        existing(),
        { whatsappNumber: "   ", whatsappOptIn: true },
        NOW,
      ),
    ).toEqual({ ok: false, reason: "number_required" });
  });

  it("rejects invalid numbers without echoing them", () => {
    expect(
      resolveNotificationPreferences(
        existing(),
        { whatsappNumber: "+012345", whatsappOptIn: true },
        NOW,
      ),
    ).toEqual({ ok: false, reason: "invalid_number" });
  });

  it("revokes consent and clears the consent number", () => {
    const result = resolveNotificationPreferences(
      existing({
        whatsappNumber: "+6281234567890",
        whatsappOptIn: true,
        whatsappOptInAt: NOW,
        whatsappConsentNumber: "+6281234567890",
      }),
      { whatsappOptIn: false },
      new Date("2040-02-01T00:00:00.000Z"),
    );

    expect(result).toEqual({
      ok: true,
      value: {
        whatsappNumber: "+6281234567890",
        whatsappOptIn: false,
        whatsappOptInAt: null,
        whatsappConsentNumber: null,
      },
    });
  });

  it("revokes consent when the number changes without explicit consent", () => {
    const result = resolveNotificationPreferences(
      existing({
        whatsappNumber: "+628111111111",
        whatsappOptIn: true,
        whatsappOptInAt: NOW,
        whatsappConsentNumber: "+628111111111",
      }),
      { whatsappNumber: "+628222222222" },
      NOW,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        whatsappNumber: "+628222222222",
        whatsappOptIn: false,
        whatsappOptInAt: null,
        whatsappConsentNumber: null,
      },
    });
  });

  it("records fresh consent when the number changes with consent", () => {
    const later = new Date("2040-03-01T00:00:00.000Z");
    const result = resolveNotificationPreferences(
      existing({
        whatsappNumber: "+628111111111",
        whatsappOptIn: true,
        whatsappOptInAt: NOW,
        whatsappConsentNumber: "+628111111111",
      }),
      { whatsappNumber: "+628222222222", whatsappOptIn: true },
      later,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        whatsappNumber: "+628222222222",
        whatsappOptIn: true,
        whatsappOptInAt: later,
        whatsappConsentNumber: "+628222222222",
      },
    });
  });

  it("clears consent when the number is removed", () => {
    const result = resolveNotificationPreferences(
      existing({
        whatsappNumber: "+628111111111",
        whatsappOptIn: true,
        whatsappOptInAt: NOW,
        whatsappConsentNumber: "+628111111111",
      }),
      { whatsappNumber: null },
      NOW,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        whatsappNumber: null,
        whatsappOptIn: false,
        whatsappOptInAt: null,
        whatsappConsentNumber: null,
      },
    });
  });
});
