import { normalizeE164 } from "../../lib/phone.js";
import type { UserNotificationPreferences } from "./user.types.js";

export interface NotificationPreferenceUpdate {
  whatsappNumber?: string | null;
  whatsappOptIn?: boolean;
}

export type NotificationPreferenceError =
  | "number_required"
  | "invalid_number"
  | "missing_country_code"
  | "empty_number";

export type NotificationPreferenceResolution =
  | { ok: true; value: UserNotificationPreferences }
  | { ok: false; reason: NotificationPreferenceError };

export function resolveNotificationPreferences(
  existing: UserNotificationPreferences,
  update: NotificationPreferenceUpdate,
  now: Date = new Date(),
): NotificationPreferenceResolution {
  let whatsappNumber = existing.whatsappNumber;

  if (update.whatsappNumber !== undefined) {
    if (update.whatsappNumber === null || update.whatsappNumber.trim() === "") {
      whatsappNumber = null;
    } else {
      const normalized = normalizeE164(update.whatsappNumber);
      if (!normalized.ok) {
        return {
          ok: false,
          reason:
            normalized.reason === "missing_country_code"
              ? "missing_country_code"
              : normalized.reason === "empty"
                ? "empty_number"
                : "invalid_number",
        };
      }
      whatsappNumber = normalized.value;
    }
  }

  const numberChanged = whatsappNumber !== existing.whatsappNumber;
  const whatsappOptIn =
    update.whatsappOptIn ?? (numberChanged ? false : existing.whatsappOptIn);

  if (whatsappOptIn && !whatsappNumber) {
    return { ok: false, reason: "number_required" };
  }

  const reconsented =
    whatsappOptIn &&
    update.whatsappOptIn === true &&
    (!existing.whatsappOptIn || numberChanged);
  const whatsappOptInAt = whatsappOptIn
    ? reconsented
      ? now
      : (existing.whatsappOptInAt ?? now)
    : null;

  return {
    ok: true,
    value: {
      whatsappNumber,
      whatsappOptIn,
      whatsappOptInAt,
      whatsappConsentNumber: whatsappOptIn ? whatsappNumber : null,
    },
  };
}
