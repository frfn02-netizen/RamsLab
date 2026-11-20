# RAMS Backend

## Authentication email configuration

Password recovery supports four email providers:

| `EMAIL_PROVIDER` | Required configuration |
| --- | --- |
| `gmail` | `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `EMAIL_FROM` matching the SMTP user |
| `resend` | `RESEND_API_KEY`, `EMAIL_FROM` on a verified Resend domain |
| `mailjet` | `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_SENDER_EMAIL` |
| `disabled` | None. Self-service reset links are not sent. |

Default development can stay `disabled`. Production should use `gmail`, `resend`, or `mailjet`. Startup logs a warning when the selected provider is not configured.

### Gmail SMTP

Use `smtp.gmail.com` with port `587` and STARTTLS. Authentication uses a Google App Password, never the normal Google account password.

```env
EMAIL_PROVIDER=gmail
GMAIL_SMTP_HOST=smtp.gmail.com
GMAIL_SMTP_PORT=587
GMAIL_SMTP_USER=youraccount@gmail.com
GMAIL_SMTP_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM="RAMS Platform <youraccount@gmail.com>"
FRONTEND_URL=https://rams.co.id
```

The application enforces that the address in `EMAIL_FROM` matches `GMAIL_SMTP_USER` case-insensitively. A display name is allowed, but the mailbox must match. This prevents sending from an address the Gmail account is not allowed to use. If you need a Gmail alias, configure that alias in the Google account and use the alias as both `GMAIL_SMTP_USER` and the `EMAIL_FROM` address, then verify Google accepts SMTP authentication for it.

### Creating a Google App Password

1. Sign in to the Google account that will send the email.
2. Enable 2-Step Verification. App Passwords are not available without it.
3. Open Google Account, Security, then App Passwords.
4. Create an app password for Mail, or choose Other and name it `RAMS Platform`.
5. Copy the 16-character password. Spaces are optional; the backend removes them.
6. Store the value only in the hosting secret manager or local `.env`. Never commit it to Git or expose it to the frontend.

Google Workspace administrators can disable App Passwords for an organization. If the option is missing, ask the Workspace administrator. Gmail also has daily sending limits that depend on the account type.

### Resend

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM="RAMS Platform <no-reply@your-verified-domain>"
FRONTEND_URL=https://rams.co.id
```

The `EMAIL_FROM` domain must be verified in the Resend dashboard, including SPF and DKIM. An unverified or example domain can be accepted by the API but rejected or filtered by Gmail.

### Mailjet

The backend uses the Mailjet Send API v3.1 with HTTP Basic authentication. `MAILJET_SENDER_EMAIL` must be an approved sender address or belong to an authenticated sending domain in the Mailjet account. `MAILJET_SENDER_NAME` is optional and defaults to `RAMS Platform`.

```env
EMAIL_PROVIDER=mailjet
MAILJET_API_KEY=your-mailjet-api-key
MAILJET_API_SECRET=your-mailjet-api-secret
MAILJET_SENDER_EMAIL=no-reply@your-verified-domain
MAILJET_SENDER_NAME="RAMS Platform"
FRONTEND_URL=https://rams.co.id
```

Do not reuse credentials that were shared in chat, email, or tickets. Rotate them in the Mailjet dashboard before enabling this provider. The API key and secret are sent only from the backend to `https://api.mailjet.com/v3.1/send`; they are never returned by the admin health endpoint, written to logs, or exposed to the frontend.

Mailjet returns HTTP 200 with a per-message `Status`. A `success` status is treated as accepted, not as inbox delivery. Any other status is reported as `provider_error`. Authentication failures, timeouts, network failures, and malformed responses are mapped to sanitized reasons without logging the response body, recipient, or credentials.

### Meetings email reminders

Meetings reminders are implemented as an isolated module under `src/modules/meeting-reminders/`. They use the existing `sendEmail()` abstraction and the configured `EMAIL_PROVIDER`. They do not create a second email provider, read Mailjet credentials, or modify meeting APIs.

```env
MEETING_REMINDERS_ENABLED=false
MEETING_REMINDER_POLL_MS=60000
MEETING_REMINDER_TIMEZONE=Asia/Jakarta
MEETING_REMINDER_MAX_ATTEMPTS=4
MEETING_REMINDER_LEASE_MS=120000
MEETING_REMINDER_RETRY_BASE_MS=60000
MEETING_REMINDER_RETRY_CAP_MS=900000
```

Behavior:

- Reminders are sent 24 hours, 1 hour, and 15 minutes before `startAt`.
- First attempts use grace windows of 60 minutes, 10 minutes, and 5 minutes respectively.
- Recipients are the organizer (`organizerId ?? createdBy`) and active `ADMIN`/`DOSEN` participants. Delegates are only included when they are also participants. External participants are excluded.
- Dates are rendered in `Asia/Jakarta`.
- No reminder is sent at or after the meeting start.
- Rescheduling creates reminders for the new time, preserves sent history, and cancels obsolete pending reminders.
- Cancelling a meeting cancels pending reminders. No cancellation email is sent.
- Hard-deleted meetings are handled by orphan cleanup.
- Polling runs every 60 seconds when enabled. Multiple API instances are supported through a unique delivery index and atomic per-delivery claims.
- The feature creates its indexes only when enabled.

Delivery status:

- `accepted` from the provider is not proof of inbox delivery.
- Known transient failures retry with exponential backoff up to 4 attempts.
- Ambiguous outcomes after transmission (timeouts, connection loss, invalid responses, 5xx where acceptance cannot be ruled out) become `unknown` and are not automatically retried.
- Expired `sending` leases become `unknown` for operator review.
- Exactly-once delivery is not guaranteed.

Do not enable reminders in production until a staging activation has verified the Mailjet sender, timezone output, reschedule behavior, cancellation behavior, and duplicate prevention.

### Lab membership and agenda

Lab-wide agenda access requires an active record in `lab_memberships`. Membership is explicit and is never inferred from role, email, or profile existence. The current deployment uses one server-side lab identifier:

```env
RAMS_LAB_ID=rams
```

Do not accept a lab identifier from client requests. The value is read from the backend environment.

ADMIN manages membership through:

```text
GET    /api/lab-memberships
GET    /api/lab-memberships/candidates
POST   /api/lab-memberships
PATCH  /api/lab-memberships/:userId
DELETE /api/lab-memberships/:userId
```

`DELETE` logically deactivates membership; it never physically deletes the record. Duplicate `{ labId, userId }` records are prevented by a unique index. Reactivation updates the existing record.

Agenda:

```text
GET /api/meetings/agenda?from=<ISO>&to=<ISO>&limit=<1-200>&offset=<n>
```

- ADMIN can read the agenda without a membership record.
- DOSEN and ALUMNI require an active lab membership for the agenda.
- Agenda read access never grants meeting-management or private-detail access.
- PRIVATE meetings without detail access are reduced to the `Busy` whitelist.
- Detail access remains ADMIN, creator, or internal participant.
- My Meetings remains creator-only in the frontend.

Bootstrap: use the existing ADMIN account/seed procedure to sign in, then add confirmed lab members through the membership API/UI. Do not bulk-enroll every account. The first ADMIN already comes from the existing trusted admin seed process; no membership bypass is provided.

Membership changes are recorded in `lab_membership_audit_logs` with `ADDED`, `ACTIVATED`, or `DEACTIVATED`, the member, acting admin, lab, and timestamps. Events are written first with status `PENDING`; the membership mutation proceeds only after that durable write. Successful application marks the event `APPLIED` with `appliedAt`. Failed mutations mark the event `FAILED`; interrupted `PENDING` or `FAILED` events are retried/recovered by later mutations for the same member. Historical records without a status remain readable as legacy applied entries.

### Operational diagnostics

As an authenticated ADMIN, inspect:

```text
GET /api/admin/health
```

The response includes `emailDeliveryConfigured`, `provider`, Gmail host and port, boolean Gmail credential status, boolean Mailjet credential and sender status, `emailFromDomain`, `mailjetSenderDomain`, and trust proxy status. It never returns the Gmail address, App Password, Resend key, Mailjet API key or secret, or reset token. The public `/api/health` does not expose these fields.

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
