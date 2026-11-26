# RAMS Backend

## Email configuration

All transactional email (password reset, lecturer onboarding, meeting alerts, and reminders) is delivered through the Mailjet Send API v3.1 in `src/lib/mailjet.ts` using native `fetch` and HTTP Basic authentication. There is no secondary provider and no SMTP dependency.

```env
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_SECRET_KEY=your-mailjet-secret-key
MAILJET_SENDER_EMAIL=no-reply@your-verified-domain
MAILJET_SENDER_NAME="RAMS Platform"
MAILJET_DRY_RUN=false
FRONTEND_URL=https://rams.co.id
```

`MAILJET_SENDER_EMAIL` must be an approved sender address or belong to an authenticated sending domain in the Mailjet account. `MAILJET_SENDER_NAME` is optional and defaults to `RAMS Platform`.

Do not reuse credentials that were shared in chat, email, or tickets. Rotate them in the Mailjet dashboard before enabling delivery. The API key and secret are sent only from the backend to `https://api.mailjet.com/v3.1/send`; they are never returned by the admin health endpoint, written to logs, or exposed to the frontend.

Set `MAILJET_DRY_RUN=true` to log recipients and the subject without calling the Mailjet API. Tests always dry-run unless they inject a transport explicitly. Delivery requests time out after 8 seconds.

Mailjet returns HTTP 200 with a per-message `Status`. A `success` status is treated as accepted, not as inbox delivery. Any other status is reported as `provider_error`. Authentication failures, timeouts, network failures, and malformed responses are mapped to sanitized reasons without logging the response body, recipient, or credentials.

### Meetings reminders

Meeting creation notifications and the reminder cron use the native Mailjet
client in `src/lib/mailjet.ts`. Creation alerts send to all active `ADMIN` and
`DOSEN` users in `users`, deduplicated by email. The meeting is written before
notification delivery, and a failed send leaves the meeting saved while the UI
reports the warning.

```env
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_SECRET_KEY=your-mailjet-secret-key
MAILJET_SENDER_EMAIL=no-reply@your-verified-domain
MAILJET_SENDER_NAME="RAMS Platform"
CRON_SECRET=your-long-random-cron-secret
```

Call `GET` or `POST /api/cron/meeting-reminders` with
`Authorization: Bearer $CRON_SECRET` every few minutes. The endpoint is the
single trigger for reminder delivery: it runs the delivery cycle, which
reconciles scheduled deliveries, claims each one atomically, and records the
outcome. There is no in-process scheduler and no interval loop.

Reminders are implemented as an isolated module under `src/modules/meeting-reminders/`. A vendor-neutral channel adapter selects email or WhatsApp. The email adapter uses the same Mailjet client as password reset; the WhatsApp channel uses the Meta WhatsApp Cloud API when the access token and phone number ID are configured.

```env
MEETING_REMINDER_CHANNEL=email
MEETING_REMINDER_CONTRACT_LEGACY_INDEXES=false
MEETING_REMINDER_POLL_MS=60000
MEETING_REMINDER_TIMEZONE=Asia/Jakarta
MEETING_REMINDER_MAX_ATTEMPTS=4
MEETING_REMINDER_LEASE_MS=120000
MEETING_REMINDER_RETRY_BASE_MS=60000
MEETING_REMINDER_RETRY_CAP_MS=900000
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_WABA_ID=
META_GRAPH_API_VERSION=v23.0
```

Behavior:

- Reminders are sent 24 hours and 1 hour before `startAt`.
- First attempts use grace windows of 60 minutes and 10 minutes respectively.
- Recipients are `createdBy` and internal `participantIds`. Active `ADMIN` and `DOSEN` accounts are eligible. PIC fields never add recipients, and external participants are excluded.
- EMAIL and WHATSAPP recipients are limited to active `ADMIN` and `DOSEN` accounts.
- WhatsApp delivery requires an international E.164 number, active consent, and a stored consent number that matches the current number. Revoked consent cancels pending deliveries.
- The Meta transport sends a template message to `/{PHONE_NUMBER_ID}/messages` with the recipient number in international format without the leading `+`.
- Dates are rendered in `Asia/Jakarta`.
- No reminder is sent at or after the meeting start.
- Rescheduling creates reminders for the new time, preserves sent history, and cancels obsolete pending reminders.
- Cancelling a meeting cancels pending reminders. No cancellation message is sent.
- Hard-deleted meetings are handled by orphan cleanup.
- The cron endpoint runs the delivery cycle. Multiple API instances are supported through a channel-aware unique delivery index, atomic per-delivery claims, and a shared channel lease.
- The default startup migration expands to channel-aware indexes and keeps legacy indexes. Contracting legacy indexes requires `MEETING_REMINDER_CONTRACT_LEGACY_INDEXES=true` in a coordinated maintenance window.
- When the selected adapter is unconfigured, the cycle performs lease expiry and obsolete-delivery cleanup but does not dispatch.

Delivery status:

- `accepted` from the provider is not proof of delivery.
- Known transient failures retry with exponential backoff up to 4 attempts.
- Ambiguous outcomes after transmission (timeouts, connection loss, invalid responses, 5xx where acceptance cannot be ruled out) become `unknown` and are not automatically retried.
- Expired `sending` leases become `unknown` for operator review.
- Exactly-once delivery is not guaranteed. Final consent, account, and meeting checks run immediately before the adapter call, but a small race remains between that check and the external provider request. An already-started external request cannot be transactionally cancelled.

### Meta WhatsApp Cloud API

The transport sends only WhatsApp template messages through the Meta Graph API. Template approval must be confirmed in Meta Business Manager. A successful response means Meta accepted the request, not that the message reached the recipient. The transport does not retry requests. Network failures, timeouts, malformed success responses, and 5xx responses are ambiguous and become `unknown` in the existing delivery state machine. HTTP 429 is retryable. Authentication and definitive 4xx validation failures are rejected.

Required server configuration:

1. Create or select the WhatsApp Business Account and sending phone number in Meta Business Manager.
2. Create an Indonesian utility template named `rams_meeting_reminder_24h` and confirm it is approved, with the body parameters declared for that template in `backend/src/modules/meeting-reminders/channels/meta-whatsapp.ts`.
3. Create an Indonesian utility template named `rams_meeting_reminder_1h` and confirm it is approved, with the body parameters declared independently for that template.
4. Set `META_WHATSAPP_ACCESS_TOKEN` only in the server secret environment.
5. Set `META_WHATSAPP_PHONE_NUMBER_ID` and a `META_GRAPH_API_VERSION` from the supported-version allowlist in `backend/src/config/meta-whatsapp.ts` (for example `v23.0`). Set `META_WHATSAPP_WABA_ID` when available; it is optional for send readiness and is used for configuration/diagnostics.
6. Keep `MEETING_REMINDER_CHANNEL=email` until staging verification is complete.

The adapter requires the access token and phone number ID before it is considered configured. The WABA ID is not required to send because the Graph API message endpoint is scoped by phone number ID, but it remains part of configuration and diagnostics. Phone number ID and WABA ID must be numeric identifiers. Graph API versions must match the explicit supported-version allowlist; the application does not assume a version is supported. Startup diagnostics report only the provider, configured state, whether a WABA ID is present, and the Graph API version. They never report the access token, phone number ID, or WABA ID. RAMS does not create templates, query Meta during startup, or expose Meta configuration through frontend responses.

The 24-hour and 1-hour templates each declare their own language code and ordered body parameter list. The payload builder validates each declared mapping (non-empty name, language code shape, non-empty and unique parameter fields) instead of assuming both templates share one shape. If an approved template differs, update its declaration to match the approved template before enabling WhatsApp.

Do not switch the reminder channel to WhatsApp until staging verification covers gateway acceptance, timezone output, reschedule behavior, cancellation behavior, consent revocation, and duplicate prevention. Stop every instance that predates channel-aware and lease-aware code before the switch. A mixed-version fleet can bypass the shared channel lease and write legacy delivery records.

### Agenda access

The shared Meetings agenda is restricted to authenticated `ADMIN` and `DOSEN`
accounts. The legacy `STUDENT` role, lab-membership records, and the public
schedule module are no longer part of the product. `ALUMNI` accounts keep their
separate self-service portal but cannot access `/meetings`.

Backend meeting routes enforce the role on every request and return `401` when
the session is missing and `403` for an unsupported role. The Next.js
`/meetings` layout validates the httpOnly session cookie against `/api/auth/me`
before rendering and redirects unauthenticated visitors to the localized login
flow with a safe `callbackUrl`.

Run the legacy-role cleanup once after deploying this change:

```bash
npm run migrate:remove-student-role          # dry run
npm run migrate:remove-student-role -- --apply
```

The migration deactivates legacy `STUDENT` documents, increments their token
version to invalidate existing sessions, and removes student-only identity
fields. Review the dry-run email list before applying it.

Agenda endpoints:

```text
GET /api/meetings/agenda?from=<ISO>&to=<ISO>&limit=<1-200>&offset=<n>
GET /api/meetings/calendar?from=<ISO>&to=<ISO>
```

- Agenda read access never grants meeting-management or private-detail access.
- PRIVATE meetings without detail access are reduced to the `Busy` whitelist.
- Detail access remains ADMIN, creator, or internal participant.
- My Meetings remains creator-only in the frontend.

### Operational diagnostics

As an authenticated ADMIN, inspect:

```text
GET /api/admin/health
```

The response includes `emailDeliveryConfigured`, `provider`, boolean Mailjet credential status, `mailjetSenderDomain`, `dryRun`, and trust proxy status. It never returns the Mailjet API key, secret, or reset token. The public `/api/health` does not expose these fields.

Backend logs use these safe events:

- `Password reset email accepted by provider`: provider, status, provider message ID, user ID.
- `Password reset email delivery failed`: provider, status, HTTP status or sanitized reason, user ID.
- `Gmail SMTP send failed`: provider, status, sanitized reason, SMTP error code.
- `Mailjet send failed`: provider, status, sanitized reason.
- `Mailjet rejected a message`: provider, status, sanitized reason, HTTP status.
- `Mailjet returned an unexpected response`: provider, status, sanitized reason, HTTP status.

Recipients, reset tokens, reset URLs, App Passwords, and API keys are never logged.

### Provider status limits

`accepted` means the provider accepted the send request. It is not proof of inbox delivery. Gmail delivery, spam placement, bounces, and complaints must be checked in the Gmail account, Resend dashboard, or provider webhooks.

### Manual email test

1. Configure the provider and restart the backend.
2. Sign in as ADMIN and check `GET /api/admin/health`.
3. Request a reset from the Forgot Password page for a real account.
4. Check the backend log for `Password reset email accepted by provider` and the provider message ID.
5. Check the Gmail inbox, spam folder, and Sent folder. Do not treat the HTTP 200 response as delivery proof.
6. If sending fails, use the sanitized log reason and the provider dashboard. Admin password reset remains available as a fallback.
