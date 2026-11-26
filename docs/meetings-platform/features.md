# Features and workflows

## Meeting management

The meeting form supports:

- title and description;
- client information through `clientName`;
- `OFFLINE` or `ONLINE` mode;
- a physical `location` for offline meetings;
- a safe HTTP or HTTPS `meetingLink` for online meetings;
- start and end timestamps;
- a required primary PIC and one to ten total PIC IDs;
- internal participants;
- external participant metadata;
- attachments within the configured file limits.

The backend trims text, validates mode-specific requirements, validates active internal accounts, removes duplicate participant IDs, and prevents the creator from being included as a participant. The conflict check includes the creator, all PICs, and all internal participants. It reports overlapping meetings as conflicts.

Create, update, cancel, attachment, and deletion operations are authenticated and authorization-protected.

## Multiple PIC

New meetings require `primaryPicId` and `picIds`. The primary ID must be in the PIC list, the list cannot contain duplicates, and every PIC must resolve to an active internal `ADMIN` or `DOSEN` account. PICs can be edited and removed subject to the one-PIC minimum.

The owner, PICs, and participants remain separate. A PIC does not become the owner and does not gain mutation rights merely by being a PIC. Legacy meetings can have absent PIC fields; response serialization treats them as empty/absent rather than inventing an account.

Internal authenticated responses may contain user summaries and IDs because they are used for authorization-aware UI. There is no public meeting or schedule serializer.

## Shared Agenda

The shared agenda is available to authenticated RAMS internal roles:

- `ADMIN`: full administrative access, subject to route-specific behavior.
- `DOSEN`: agenda read access and their normal meeting management behavior.
- `ALUMNI`: not an internal shared-agenda role.

The legacy `STUDENT` auth role, lab-membership records, `agenda.manage` grants, and agenda-coordinator module were removed. Only `ADMIN` and `DOSEN` accounts can create, update, cancel, delete, or attach files to meetings.

All authenticated `ADMIN` and `DOSEN` accounts can view meeting details. Mutation remains limited to admins and the meeting creator.

## Pak Dhimas Highlight

The frontend renders the highlight badge and title styling from the server-provided `involvesHighlightedUser` boolean. The service computes that boolean from the configured server-side highlighted-user IDs and meeting involvement. The frontend does not receive the configured IDs.

The highlight is used by authenticated meeting detail, calendar, and card paths. No public serializer exposes this state.

## Meeting reminders

Reminder scheduling is server-side and disabled by default. When enabled, the scheduler handles fixed intervals of 24 hours and 1 hour before `startAt`, with the configured timezone and retry/lease settings. The channel is email or WhatsApp and is selected by configuration. WhatsApp uses the Meta WhatsApp Cloud API transport with Indonesian template messages when configured; Meta must approve those templates before they can be sent. WhatsApp is disabled by default.

Recipients are resolved from `createdBy` and internal `participantIds`. EMAIL and WHATSAPP both use active `ADMIN` and `DOSEN` accounts only. PIC fields never add recipients. External participants and legacy delegate/guest metadata are not converted to accounts or reminder recipients. WhatsApp delivery also requires an international E.164 number, active consent, and a stored consent number that matches the current number. Consent revocation cancels pending deliveries.

Reminder delivery records use a channel-aware unique delivery key and atomic claim/lease transitions. Historical email records remain valid. The legacy unique index is retained by default during the expand phase, so old instances cannot create duplicate logical EMAIL rows. Dropping legacy indexes is an explicit contract step that requires a coordinated maintenance window after all instances write channel-aware records. A shared channel lease prevents instances configured for different channels from cancelling each other or sending through both channels. A sent delivery is idempotent. Failed attempts are retried up to the configured limit with backoff and lease recovery. Real provider dispatch was not run during this QA pass.

## Accounts, roles, and permissions

The implemented role values are `ADMIN`, `DOSEN`, and `ALUMNI`. Account activity, role, permission, PIC membership, participant membership, and ownership are separate concepts.

The relevant permissions include meeting read/create/manage-own and meeting directory read. Account deactivation is enforced by authentication/account lookup, but a complete live deactivation workflow was not executed without the integration database.

## Role and permission matrix

This is the backend's current permission model, not a proposed product policy.

| Role      | Shared agenda and calendar route | Default meeting permissions                                                                             | Meeting-specific notes                                                                                      |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ADMIN`   | Yes                              | All non-grant permissions, including meeting read/create/manage-own and directory read                  | Can administer meeting records and ownership according to the service rules                                |
| `DOSEN`   | Yes                              | `meetings.access`, `meetings.read`, `meetings.create`, `meetings.manage-own`, `meetings.directory.read` | Normal owner/creator workflow; can mutate own meetings                                                      |
| `ALUMNI`  | No                               | No default meeting permissions                                                                          | Not an internal meeting directory/PIC role                                                                  |

The shared agenda and calendar routes accept `ADMIN` and `DOSEN` directly. List, create, conflict, update, cancel, and attachment operations also apply service-level ownership and cancellation rules.

## Frontend routes

Authenticated meeting routes include `/meetings`, `/meetings/new`, `/meetings/[id]`, `/meetings/[id]/edit`, `/meetings/calendar`, and `/meetings/mine`. Dashboard aliases exist at `/dashboard/meetings`, `/dashboard/meetings/new`, `/dashboard/meetings/[id]`, and `/dashboard/meetings/[id]/edit`.
