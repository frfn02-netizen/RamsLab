# Architecture

## Runtime components

The platform is split into two npm applications:

| Component   | Location           | Runtime entry point         | Responsibility                                                                                                                      |
| ----------- | ------------------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Backend API | `backend/`         | `src/server.ts`             | Express routes, authentication, authorization, meeting services, MongoDB repositories, reminders, email, and Cloudinary integration |
| Frontend    | `frontend/`        | Next.js app router          | Authenticated meeting workspace, shared agenda UI, forms, calendar views, and route guards                                         |
| Database    | configured MongoDB | `MONGODB_URI` and `DB_NAME` | Users, meetings, reminder deliveries, audit records, and the rest of the RAMS data model                                            |

The API starts only after connecting to MongoDB and creating application indexes. The frontend defaults its API client to `http://localhost:5000/api` unless `NEXT_PUBLIC_API_URL` is configured.

## Request flow

1. A frontend component calls the API client in `frontend/lib/api`.
2. The backend app applies CORS, security headers, JSON limits, cookies, and the CSRF state-changing-origin check.
3. Authenticated meeting routes run `authenticate`, then route-level role or permission middleware.
4. Meeting services validate request schemas, resolve active internal users, apply ownership and visibility rules, detect conflicts, and write audit entries.
5. Repositories read or atomically update MongoDB records.
6. Response serializers return an internal response, a calendar response, or a privacy-safe Busy response depending on the route and actor.

## Meeting relationships

```text
User 1 ---- owns ---- * Meeting.createdBy
User 1 ---- primary/additional PIC ---- * Meeting.primaryPicId / Meeting.picIds
User 1 ---- participates in ---- * Meeting.participantIds
Meeting 1 ---- embeds ---- * Meeting.auditHistory
Meeting 1 ---- embeds ---- * Meeting.attachments
Meeting 1 ---- has optional metadata ---- * Meeting.externalParticipants
Meeting 1 ---- has reminder delivery records ---- * meeting_reminder_deliveries
```

These relationships are deliberately not interchangeable. The creator is the owner used by My Meetings and ownership authorization. A PIC is a responsible internal account used for display and conflict detection. A participant receives participant access and is included in participant-oriented views. An external participant is metadata only and is not an account, PIC, access grant, or reminder recipient.

## Meeting lifecycle

The persisted lifecycle is derived from `cancelledAt`, `startAt`, `endAt`, and the current server time:

| Condition                                       | Status      |
| ----------------------------------------------- | ----------- |
| `cancelledAt` exists                            | `CANCELLED` |
| now is before `startAt`                         | `UPCOMING`  |
| now is at or after `startAt` and before `endAt` | `ONGOING`   |
| now is at or after `endAt`                      | `PAST`      |

Cancellation is checked in the service against persisted `endAt`. The exact boundary `endAt <= now` is rejected with the `MEETING_ALREADY_ENDED` condition. The update is also conditional on the meeting not already being cancelled and on the stored end time still being later than the cancellation timestamp, protecting the state transition from stale clients and concurrent cancellation requests.

## Shared Agenda architecture

The authenticated `/api/meetings/agenda` and `/api/meetings/calendar` routes are available to `ADMIN` and `DOSEN`. The service applies the authenticated actor's visibility and access rules while serializing the response.

The legacy `agenda.manage` permission and agenda-coordinator path were removed. `ADMIN` and `DOSEN` accounts can create, edit, or cancel shared `INTERNAL` meetings subject to the existing ownership and visibility rules.

## Schedule portal architecture

Legacy `/schedule` URLs redirect permanently to `/meetings`. There is no public schedule API or public meeting serializer. The meetings workspace is private and requires an authenticated `ADMIN` or `DOSEN` account.

## Highlights and privacy

The server reads `MEETINGS_HIGHLIGHTED_USER_IDS` and computes the boolean `involvesHighlightedUser`. The configured IDs are not sent to the frontend. The boolean is present only in authorized detailed/calendar responses. A private inaccessible calendar item is serialized as `Busy` and does not expose the highlight state.
