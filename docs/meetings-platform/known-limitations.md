# Known limitations

## Verification limitations from this QA pass

1. The complete backend integration suite is BLOCKED because no isolated MongoDB instance was available at the configured test endpoint. The test suite was not redirected to production or shared demo data.
2. Browser E2E is BLOCKED. The browser control runtime required for an actual signed-in browser session was not exposed in this session. The unavailable MongoDB instance would also prevent the backend-backed authenticated flows from being meaningful.
3. Real email dispatch is NOT TESTED. No controlled Gmail, Resend, Mailjet, or fake-provider delivery environment was available.
4. Cloudinary upload/delete is NOT TESTED. No controlled Cloudinary integration was available.
5. Account deactivation and the complete role/permission matrix are NOT TESTED live. Source and test definitions were inspected, but a database-backed auth session is required for the strongest evidence.
6. Mobile visual layout, desktop visual layout, keyboard-only navigation, and an automated accessibility audit were NOT TESTED in a real browser. Component tests and source-level labels do not prove visual or interaction completeness.

## Repository quality limitations

- The frontend repository-wide ESLint command fails with 15 errors and 27 warnings in existing files outside the changed meeting scope. Targeted ESLint for the changed meeting files passes.
- The backend package has no `lint` script, so a backend ESLint result cannot be reported from the package scripts.
- The frontend full test suite emits unrelated React/jsdom warnings. They do not currently fail tests but should be cleaned up separately.

## Product and legacy limitations

- New meeting writes require PIC data, but legacy meeting documents may omit `primaryPicId` and `picIds`. The implementation reads those documents compatibly; a migration is not included in this phase.
- The internal meeting response contains account identifiers and emails for authorized users because the existing UI and authorization-aware workflows use them. No meeting response is exposed through a public schedule route, which was removed.
- A PIC is not an access grant. If product owners expect PICs to open PRIVATE meetings, that would be a business-rule change requiring explicit authorization design and tests. The current implementation intentionally keeps ownership, PIC, and participant roles separate.
- Reminder delivery is a scheduler/provider integration. Unit tests cover configuration, recipient resolution, claims, leases, retries, and idempotency, but provider delivery and mailbox behavior require a controlled environment.
- Final consent, account, and meeting checks run immediately before the external adapter call. A small race remains between the final check and the provider request, and an already-started external request cannot be transactionally cancelled. Exactly-once delivery is not guaranteed.
- WhatsApp recipients created before the consent-number invariant was introduced have no stored consent number and remain ineligible until they grant consent again.
- WhatsApp reminders require approved Meta message templates. Message acceptance depends on template approval, the WhatsApp Business Account, messaging limits, and Meta availability. Provider acceptance is not proof of WhatsApp delivery.
- The transport does not retry inside the provider call. Timeout, connection failure, malformed success response, and 5xx outcomes are ambiguous and become `unknown`; they are not automatically retried. HTTP 429 is retryable, and definitive authentication/validation 4xx outcomes are rejected.
- Real Meta dispatch is not tested. Unit tests use mocked HTTP responses and never contact the Meta Graph API.
- Attachment behavior depends on Cloudinary. Database metadata tests do not prove provider retention or deletion behavior.
- The frontend can render a successful production build while the API or database is unavailable. Deployment health checks should exercise `/api/health` and a controlled authenticated/public API request.

## Required follow-up before production sign-off

- Provide a disposable MongoDB instance or CI service for the complete backend integration suite.
- Run authenticated browser workflows for admin, dosen, alumni, owner, participant, PIC, and deactivated-account cases.
- Run authenticated privacy tests against persisted PRIVATE, CANCELLED, legacy, online, offline, past, and highlighted meetings.
- Run cancellation tests at the exact `endAt` boundary through the HTTP API, including concurrent cancellation attempts.
- Run reminder dispatch against a fake or sandbox provider and inspect duplicate, retry, lease expiry, and provider failure behavior.
- Run Cloudinary upload/delete tests with non-sensitive fixture files.
- Resolve or separately baseline the existing repository-wide frontend lint errors and add a backend lint command if lint enforcement is required.
