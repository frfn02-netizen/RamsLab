const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export type PhoneNormalizationFailure =
  "empty" | "invalid" | "missing_country_code";

export type PhoneNormalizationResult =
  | { ok: true; value: string }
  | { ok: false; reason: PhoneNormalizationFailure };

export interface PhoneNormalizationOptions {
  defaultCountryCode?: string;
}

function normalizeCountryCode(value: string | undefined): string | null {
  if (!value) return null;
  const digits = value.trim().replace(/^\+/, "").replace(/\D/g, "");
  return /^[1-9]\d{0,2}$/.test(digits) ? digits : null;
}

export function normalizeE164(
  input: unknown,
  options: PhoneNormalizationOptions = {},
): PhoneNormalizationResult {
  if (typeof input !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }

  const compact = trimmed.replace(/[\s().-]/g, "");
  if (!/^[+\d]+$/.test(compact)) {
    return { ok: false, reason: "invalid" };
  }

  let candidate: string;
  if (compact.startsWith("+")) {
    candidate = compact;
  } else if (compact.startsWith("00")) {
    candidate = `+${compact.slice(2)}`;
  } else {
    const countryCode = normalizeCountryCode(options.defaultCountryCode);
    if (!countryCode) {
      return { ok: false, reason: "missing_country_code" };
    }
    if (compact.startsWith("0")) {
      candidate = `+${countryCode}${compact.slice(1)}`;
    } else if (compact.startsWith(countryCode)) {
      candidate = `+${compact}`;
    } else {
      return { ok: false, reason: "missing_country_code" };
    }
  }

  if (!E164_PATTERN.test(candidate)) {
    return { ok: false, reason: "invalid" };
  }

  return { ok: true, value: candidate };
}

export function isValidE164(value: unknown): value is string {
  return typeof value === "string" && E164_PATTERN.test(value);
}
