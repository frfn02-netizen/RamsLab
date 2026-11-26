# Deployment and operations

## Required backend configuration

The authoritative example is `backend/.env.example`. The following names are present there and are listed without values:

### Runtime and security

`PORT`, `MONGODB_URI`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `FRONTEND_BASE_PATH`, `TRUST_PROXY`, `PUBLIC_API_URL`, `NODE_ENV`.

### Seed accounts

`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_DOSEN_EMAIL`, and `SEED_DOSEN_PASSWORD`. Other seed scripts also read their own environment values; inspect the script before using them.

### Email providers

The email abstraction supports the configured provider values documented in the example: `gmail`, `resend`, `mailjet`, and `disabled`. Provider-specific names include `GMAIL_SMTP_HOST`, `GMAIL_SMTP_PORT`, `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, and `MAILJET_SENDER_NAME`.

### Meeting reminders

`MEETING_REMINDERS_ENABLED`, `MEETING_REMINDER_CHANNEL`, `MEETING_REMINDER_CONTRACT_LEGACY_INDEXES`, `MEETING_REMINDER_POLL_MS`, `MEETING_REMINDER_TIMEZONE`, `MEETING_REMINDER_MAX_ATTEMPTS`, `MEETING_REMINDER_LEASE_MS`, `MEETING_REMINDER_RETRY_BASE_MS`, and `MEETING_REMINDER_RETRY_CAP_MS` configure the scheduler. The implementation uses fixed intervals of 1440 and 60 minutes before start time. The channel value is `email` or `whatsapp`; WhatsApp remains disabled until a gateway adapter is configured and verified.

Meta WhatsApp Cloud API configuration uses `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, optional `META_WHATSAPP_WABA_ID`, and `META_GRAPH_API_VERSION` from the supported-version allowlist in `backend/src/config/meta-whatsapp.ts` (the example uses `v23.0`). Phone number ID and WABA ID must be numeric. The access token is server-only and is never returned by an API, written to logs, or included in errors. Startup reports whether the transport is configured, whether a WABA ID is present, and the Graph API version, but does not call Meta. WhatsApp remains disabled by default and requires Indonesian templates to be confirmed as approved in Meta Business Manager before enabling. The 24-hour and 1-hour templates declare their parameter mappings independently.

Keep `MEETING_REMINDER_CONTRACT_LEGACY_INDEXES=false` during rolling deploys. The default expand migration keeps the legacy unique index so old and new instances cannot create duplicate logical EMAIL rows. Set it to `true` only during a coordinated maintenance window after every instance has been upgraded and stopped. Dropping the legacy unique index is required only when EMAIL and WHATSAPP records must coexist.

### Meeting creation notifications and cron

`MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_SENDER_EMAIL`, and `MAILJET_SENDER_NAME` configure the meeting creation notification and H-24 reminder delivery. `CRON_SECRET` protects `GET`/`POST /api/cron/meeting-reminders` through `Authorization: Bearer $CRON_SECRET`. Configure the platform scheduler to call the endpoint every few minutes.

### Other configured integrations

`CLOUDINARY_URL` configures attachment storage. Password recovery reads `PASSWORD_RESET_TOKEN_TTL_MINUTES` and `PASSWORD_RESET_MIN_RESPONSE_MS`. Highlight configuration reads server-only `MEETINGS_HIGHLIGHTED_USER_IDS`.

Do not place actual credentials in this documentation or commit local `.env` files.

## Frontend configuration

`frontend/.env.example` exists. The frontend API client reads `NEXT_PUBLIC_API_URL` and defaults to `http://localhost:5000/api`. Base path handling reads `NEXT_PUBLIC_BASE_PATH` or `BASE_PATH`. Next config also reads the existing `TRALING_SLASH_CONFIG` and `UNOPTIMIZED_IMG_CONFIG` names. The public site layout reads `NEXT_PUBLIC_SITE_URL` and the public footer reads the existing social URL variables.

## Install, check, build, and start

Run commands from each package directory:

```sh
cd backend
npm install
npm run build
npm start
```

```sh
cd frontend
npm install
npm run typecheck
npm run build
npm start
```

The backend must be able to connect to MongoDB before it listens. Startup creates and verifies user, meeting, reminder, and other application indexes. The frontend production server uses the generated Next build.

## Database setup

Use a dedicated non-production database for development and a separate dedicated database for tests. Test mode requires the exact database name `rams_platform_security_test`. Never point test configuration at `rams_platform` or a shared demo database. The application includes explicit database-name safeguards, but deployment operators must still verify `MONGODB_URI` and `DB_NAME` before starting.

## Meta WhatsApp staging activation

1. Keep `MEETING_REMINDER_CHANNEL=email`.
2. Finish the legacy index contract maintenance step and stop all pre-lease instances.
3. Create or select the WhatsApp Business Account and sending phone number in Meta Business Manager.
4. Create the Indonesian templates `rams_meeting_reminder_24h` and `rams_meeting_reminder_1h`, confirm they are approved in Meta Business Manager, and match each template's body parameters to its declaration in `backend/src/modules/meeting-reminders/channels/meta-whatsapp.ts`.
5. Set `META_WHATSAPP_ACCESS_TOKEN` in the staging secret store and set the numeric `META_WHATSAPP_PHONE_NUMBER_ID` and a `META_GRAPH_API_VERSION` from the supported-version allowlist. Set the numeric `META_WHATSAPP_WABA_ID` when available; it is optional for sending.
6. Start the updated application and confirm the startup diagnostic reports the transport as configured without printing the access token, phone number ID, or WABA ID.
7. Send only to allowlisted internal test numbers. Confirm provider acceptance, retry behavior, consent revocation, reschedule, and cancellation.
8. Switch `MEETING_REMINDER_CHANNEL=whatsapp` only after those checks pass.
9. Keep email as the channel until the switch is explicitly approved. Do not activate WhatsApp in production from this phase.

Meta acceptance is not delivery confirmation. Timeouts, connection failures, malformed responses, and 5xx outcomes are ambiguous and are not automatically retried.

## Reminder scheduler

The reminder scheduler starts from `src/server.ts` when `MEETING_REMINDERS_ENABLED` is true. It migrates reminder indexes, acquires the shared channel lease, claims due deliveries, sends through the selected channel adapter, records success/failure, and stops on SIGINT/SIGTERM with a drain timeout. When the adapter is unconfigured, it runs lease expiry and obsolete-delivery cleanup without dispatching. Keep the channel, poll, lease, retry, and provider settings consistent across the active API instance(s). A live lease for a different channel blocks the cycle, preventing mixed-channel instances from cancelling each other or sending through both channels. A channel switch may wait for the previous channel lease to expire, at least five minutes or three polling intervals. Before switching to WhatsApp, stop every instance that predates channel-aware and lease-aware code. A mixed-version fleet can bypass the shared lease and write legacy delivery records.

## Cloudinary operations

Attachment upload and removal use the existing Cloudinary abstraction and store `url` and `publicId` in the meeting document. Configure `CLOUDINARY_URL` only in the controlled deployment environment. A controlled upload/delete smoke test should be run after deployment against a test meeting and test asset. That smoke test was not possible in this QA environment.

## Troubleshooting

### Server exits before listening

Check `MONGODB_URI`, `DB_NAME`, database reachability, and the startup index errors. In test mode, confirm the database name is `rams_platform_security_test`. Do not bypass the database safety guards.

### Frontend shows API errors

Check `NEXT_PUBLIC_API_URL`, the backend port, CORS/`FRONTEND_URL`, cookies, CSRF token handling, and the browser network response. A frontend production build can pass while live API calls remain unavailable.

### Cron reminders do not send

Check `CRON_SECRET`, Mailjet configuration diagnostics, the cron response counts, recipient account activity and role, and the `reminderSentAt` field. Keep `MEETING_REMINDERS_ENABLED=false` while using the H-24 cron endpoint so the legacy scheduler does not send duplicates.

### Meeting access or missing records

Check the access token, role (`ADMIN` or `DOSEN`), persisted `cancelledAt`, and the authenticated meeting serializer.
