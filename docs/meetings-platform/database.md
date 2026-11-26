# Database

## Connection and safety

The backend reads `MONGODB_URI` and `DB_NAME`. Test mode refuses any database name other than `rams_platform_security_test`. Non-production mode refuses the production database name `rams_platform`. The test setup also rejects a production URI. These guards are important and must remain in place.

The server connects before creating indexes and before listening on its HTTP port.

## Meeting document

The `meetings` collection stores the `Meeting` document. Relevant fields are:

| Field                                              | Type                                          | Meaning                                             |
| -------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| `_id`                                              | MongoDB ObjectId                              | Meeting identifier                                  |
| `title`                                            | string                                        | Required title                                      |
| `description`                                      | string                                        | Internal meeting description                        |
| `clientName`                                       | string or null                                | Client information                                  |
| `mode`                                             | `ONLINE` or `OFFLINE`                         | Meeting mode                                        |
| `location`                                         | string or null                                | Physical location for offline meetings              |
| `startAt`, `endAt`                                 | Date                                          | Meeting window                                      |
| `visibility`                                       | `INTERNAL` or `PRIVATE`                       | Access/public visibility                            |
| `createdBy`                                        | ObjectId                                      | Active owner and creator                            |
| `primaryPicId`                                     | ObjectId, optional for legacy documents       | Primary internal PIC                                |
| `picIds`                                           | ObjectId array, optional for legacy documents | All internal PICs, including primary for new writes |
| `participantIds`                                   | ObjectId array                                | Internal participants                               |
| `externalParticipants`                             | object array, optional                        | Guest metadata only                                 |
| `meetingLink`                                      | string or null                                | Online meeting URL                                  |
| `cancelledAt`, `cancelledBy`, `cancellationReason` | optional                                      | Cancellation state and actor                        |
| `attachments`                                      | object array                                  | Attachment metadata and Cloudinary identifiers      |
| `auditHistory`                                     | object array                                  | Embedded audit records                              |
| `createdAt`, `updatedAt`                           | Date                                          | Record timestamps                                   |

Attachment objects contain `id`, `url`, `publicId`, `filename`, `mimeType`, `size`, and `uploadedAt`. Audit entries contain an `id`, `actorUserId`, action, field changes, and timestamp. The active actions are `CREATE`, `UPDATE`, `CANCEL`, `ATTACHMENT_ADDED`, and `ATTACHMENT_REMOVED`. Legacy delegate and guest invitation action values remain part of the type for compatibility.

## User document relationships

Users are stored in the `users` collection. Relevant fields used by meeting behavior include the ObjectId, email, optional display name, role, `isActive`, permissions, token version, and login timestamps. A PIC or participant reference must resolve to an active internal role. External participants do not create user documents.

The `Dosen` profile data is used when resolving internal display names in the existing user directory path. Public output is reduced to strings and never exposes the account ID or email.

## Reminder delivery collection

The reminder subsystem uses the `meeting_reminder_deliveries` collection. Delivery records contain meeting and recipient identity, channel, interval and scheduled time, status, attempt count, lease/claim fields, error information, and timestamps as defined in `meeting-reminder.types.ts`. Historical records without `channel` are treated as EMAIL.

Configured reminder indexes are:

- `meeting_reminder_delivery_unique_v2`: unique on `meetingId`, `intervalMinutes`, `recipientKind`, `recipientId`, `scheduledFor`, `channel`;
- `meeting_reminder_due_index_v2`: `channel`, `status`, `nextAttemptAt`, `scheduledFor`;
- `meeting_reminder_meeting_index`: `meetingId`, `status`.

Startup performs an expand migration by default: it creates the v2 indexes, backfills missing `channel` values to EMAIL while the legacy unique index still protects the data, and keeps the legacy indexes. The contract step that drops `meeting_reminder_delivery_unique` and `meeting_reminder_due_index` runs only when `MEETING_REMINDER_CONTRACT_LEGACY_INDEXES=true`. Historical delivery records are not deleted.

The `meeting_reminder_channel_lease` collection stores one active document that serializes the reminder channel across API instances. A live lease for a different channel blocks the cycle. The lease has a short TTL and is renewed by cycles on the same channel.

Users store `whatsappNumber`, `whatsappOptIn`, `whatsappOptInAt`, and `whatsappConsentNumber`. Eligibility requires `whatsappConsentNumber` to equal the current normalized number, so a direct number change without new consent cannot receive messages. These fields are private to the account preferences endpoint and are not included in the public API, user directory, meeting responses, or logs.

## Meeting indexes

The startup index module creates and verifies these indexes:

- `meetings_time_index`: `{ startAt: 1, endAt: 1 }`;
- `meetings_participant_index`: `{ participantIds: 1, startAt: 1 }`;
- `meetings_creator_index`: `{ createdBy: 1, startAt: 1 }`;
- `meetings_reminder_due_index`: `{ reminderSentAt: 1, startAt: 1 }` supports the H-24 cron scan.

The meeting index unit tests verify idempotent creation, incompatible-index detection, and preservation of legacy delegate/guest indexes.

## Legacy compatibility

Meeting reads use an effective visibility rule: only an explicit `INTERNAL` value is internal; a missing or other value is treated as `PRIVATE`. This prevents legacy documents with no visibility field from becoming public accidentally.

Legacy documents can also lack PIC fields. The internal serializer returns empty/absent PIC collections for those records. New create requests require PIC data, so old data remains readable while new writes follow the multiple-PIC contract.

## Data mutation behavior

Meeting updates use persisted values and an optional `expectedUpdatedAt` for optimistic concurrency. Cancellation uses a conditional update that checks the existing cancellation state and server time. Audit entries are written with the authenticated actor. No test in this QA pass targeted a production or shared demo database.
