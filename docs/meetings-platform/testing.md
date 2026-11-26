# Testing

## Test architecture

### Backend

Backend tests use Vitest, Supertest, and MongoDB-backed integration setup where the test requires persistence. The database test setup targets `rams_platform_security_test` and refuses production database use. Unit tests use injected repositories, pure serializers, schema/service functions, and fake collections where possible.

Relevant test groups include meeting API integration, meeting unit logic, meeting indexes, reminders and recipient resolution, highlight behavior, role authorization, update concurrency, and email delivery.

### Frontend

Frontend tests use Vitest, React Testing Library, and jsdom. They cover meeting forms, workspace pages, calendar behavior, agenda authorization, and existing site functionality. These are component and integration-style tests, not a substitute for a real authenticated browser session.

## Exact commands and results

Commands were run from the package directories shown below.

| Command                                                                                                                                                                                                                                                             | Result     | Evidence                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `cd frontend && npm test -- --reporter=dot`                                                                                                                                                                                                                         | PASS       | 57 test files, 452 tests passed                                                                                                         |
| `cd frontend && npm run typecheck`                                                                                                                                                                                                                                  | PASS       | `tsc --noEmit` exit 0                                                                                                                   |
| `cd frontend && npm run lint`                                                                                                                                                                      | PASS       | exit 0, with existing warnings                                                                                                           |
| `cd frontend && npm run lint`                                                                                                                                                                                                                                       | FAIL       | exit 1, 15 errors and 27 warnings in repository-wide existing files outside the changed meeting scope                                   |
| `cd frontend && npm run build`                                                                                                                                                                                                                                      | PASS       | Next production webpack build compiled and generated 79 static pages                                                                    |
| `cd backend && npm run build`                                                                                                                                                                                                                                       | PASS       | `tsc` exit 0                                                                                                                            |
| `cd backend && npm test -- --run tests/*.unit.test.ts tests/mailjet-email.test.ts tests/meeting-mailjet.unit.test.ts`                                                                            | PASS       | 17 files, 171 tests passed                                                                                                               |
| `cd backend && npm run lint`                                                                                                                                                                                                                                        | NOT TESTED | The package has no `lint` script; npm returned `Missing script: "lint"`                                                                 |
| `cd backend && npm test -- --reporter=dot`                                                                                                                                                                                                                          | BLOCKED    | 54 files ran: 19 passed and 35 failed in MongoDB-dependent setup; 156 tests passed and 344 were skipped. See environment blocker below. |

The frontend full suite emitted non-failing warnings from unrelated tests, including React invalid DOM attributes, an unwrapped `act` update, navigation not implemented by jsdom, and Node localStorage warnings. They did not fail the suite.

## Backend integration blocker

The backend integration setup expects a local MongoDB connection at `mongodb://127.0.0.1:27017` and the isolated database `rams_platform_security_test`. During this run:

- no `mongod` process was available;
- no process was listening on port 27017;
- `docker ps` could not access the Docker daemon because the Docker socket permission was denied;
- starting or using a production or shared database was not authorized by the task constraints and was not attempted.

The full suite therefore timed out in the MongoDB-dependent `beforeAll` hooks. The final Vitest summary was 35 failed and 19 passed files, with 156 passed and 344 skipped tests. The post-change focused unit set passed because it does not require a live database. This is a BLOCKED integration result, not a product PASS.

## Feature matrix

The following matrix reports the strongest evidence available from executed tests and source-backed checks.

| Area                                                              | Status     | Evidence or limitation                                                                                            |
| ----------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Create/read/update/cancel meeting service logic                   | PASS       | Focused backend unit tests and frontend form/workspace tests passed; full API persistence path blocked by MongoDB |
| ONLINE/OFFLINE validation and Google Meet URL safety              | PASS       | Schema/service unit coverage passed                                                                               |
| Client, location, mode, and date fields                           | PASS       | Frontend and focused backend tests passed                                                                         |
| Ownership, participant separation, and conflicts                  | BLOCKED    | Source and unit logic verified; authenticated persistence/integration tests blocked                               |
| Attachments                                                       | BLOCKED    | Routes/source inspected; Cloudinary and MongoDB integration not executed                                          |
| Cancellation guard including `endAt <= now`                       | PASS       | Service/unit coverage passed; live API integration blocked                                                        |
| Primary and multiple PICs                                         | PASS       | Schema, serializer, frontend form tests, and focused backend tests passed                                         |
| Active internal PIC validation, duplicate rejection, edit/removal | BLOCKED    | Validation logic and regression tests passed; database-backed account scenarios blocked                           |
| Legacy meetings without PIC fields                                | PASS       | Serializer and compatibility logic covered by unit/source checks                                                  |
| Creator, PIC, participant separation                              | BLOCKED    | Added integration regression coverage; it could not run without MongoDB                                           |
| Public PIC display names without IDs/emails                       | PASS       | Public serializer tests passed                                                                                    |
| Shared agenda ADMIN/DOSEN access                                  | PASS       | Route guards and service-level authorization tests                                                                 |
| Coordinator grant/revoke and immediate revocation                 | BLOCKED    | Integration tests exist; MongoDB blocked execution                                                                |
| Shared create/edit/cancel integration                             | BLOCKED    | Integration tests exist; MongoDB blocked execution                                                                |
| Shared meeting mutation restriction                               | PASS       | Service logic and focused permission logic; live API path blocked                                                 |
| Public dashboard/calendar/detail                                  | BLOCKED    | Frontend tests passed; live API/browser was not available                                                         |
| Public search/filter/pagination/date navigation                   | PASS       | Public UI/unit test coverage passed; live response path blocked                                                   |
| CANCELLED exclusion and historical PAST                           | PASS       | Public repository/filter and serializer tests passed                                                              |
| Public link and PIC output                                        | PASS       | Public serializer tests passed                                                                                    |
| Public no-leak boundary and inaccessible 404                      | BLOCKED    | Serializer unit tests passed; database-backed HTTP response not executed                                          |
| Pak Dhimas creator/participant highlight                          | BLOCKED    | Integration regression tests added; MongoDB blocked execution                                                     |
| Highlight title/badge/calendar/detail consistency                 | PASS       | Frontend highlight tests and focused backend logic passed                                                         |
| No highlighted-user ID in frontend                                | PASS       | Source contract and response tests use boolean only                                                               |
| Reminder recipient resolution                                     | PASS       | Focused reminder recipient/config tests passed                                                                    |
| Reminder atomic claims, leases, retry, idempotency                | PASS       | Focused logic tests passed; database concurrency not executed                                                     |
| Real email dispatch                                               | NOT TESTED | No controlled provider environment was available                                                                  |
| ADMIN/DOSEN/ALUMNI authorization                                  | PASS       | Role matrix unit tests and backend route guards                                                                   |
| Account deactivation                                              | NOT TESTED | No live account/database environment                                                                              |
| Desktop/mobile layout                                             | NOT TESTED | No real browser viewport run                                                                                      |
| Keyboard/accessibility basics                                     | PASS       | Form labels and accessible control regression tests passed; no axe audit or keyboard browser run                  |
| Browser end-to-end critical workflows                             | BLOCKED    | Browser control runtime was not exposed in this session; backend database was also unavailable                    |

## Defect handling

### Confirmed defect fixed: ambiguous PIC controls and stale form regression tests

Reproduction: render the meeting form with the same internal account available in both the additional PIC list and participant list, then query a checkbox by its account email. The query matched multiple controls. The existing workspace page tests also failed to submit because the updated create contract requires a primary PIC and the fixtures selected none.

Root cause: both checkbox groups exposed only the account email as their accessible name, and test fixtures lagged behind the required `primaryPicId`/`picIds` contract.

Fix: added distinct `Additional PIC: <email>` and `Participant: <email>` labels, updated the affected tests to select valid PICs, and added assertions for the resulting PIC payload. The changed meeting source and tests pass targeted ESLint, frontend typecheck, frontend build, and the full frontend suite.

### Confirmed test-maintenance defect fixed: invalid backend create fixtures

Reproduction: the backend meeting unit tests sent a create fixture without the now-required primary PIC and PIC list, producing schema failures before the intended validation assertions.

Root cause: the shared test fixture did not track the active create schema.

Fix: updated the fixture and relevant integration payload helpers with valid PIC data, then added duplicate-PIC and primary-in-list regression cases. The focused backend set passes 52/52. Persistence integration remains BLOCKED because MongoDB is unavailable.

No production data was changed, and no unrelated source refactor was made.
