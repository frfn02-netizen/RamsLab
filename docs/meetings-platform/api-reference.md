# API reference

All paths below are relative to the backend API origin. Authenticated endpoints use the existing cookie-based authentication and CSRF behavior. Successful responses use the existing `{ success: true, data: ... }` envelope unless noted.

## Authenticated meeting endpoints

| Method and path                                      | Purpose                                                                   | Authorization                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /api/meetings/agenda`                           | Shared agenda list, with `from`, `to`, `limit`, and `offset` query values | Authenticated `ADMIN` or `DOSEN`                               |
| `GET /api/meetings/calendar`                         | Calendar items and privacy-safe Busy items                                | Authenticated `ADMIN` or `DOSEN`                               |
| `GET /api/meetings`                                  | Meeting list with the existing list query contract                        | Authenticated `ADMIN` or `DOSEN`                                                              |
| `POST /api/meetings/conflicts/check`                 | Validate a proposed time, PIC, and participant conflict set               | Authenticated `ADMIN` or `DOSEN`                                                              |
| `GET /api/meetings/:id`                              | Authenticated detail                                                      | Authentication plus service-level detail access                                                        |
| `POST /api/meetings`                                 | Create                                                                    | `ADMIN` or `DOSEN`                                                         |
| `PATCH /api/meetings/:id`                            | Update                                                                    | `ADMIN`, or the `DOSEN` creator                                                                        |
| `POST /api/meetings/:id/cancel`                      | Cancel with optional reason                                               | `ADMIN`, or the `DOSEN` creator                                                                        |
| `DELETE /api/meetings/:id`                           | Delete                                                                    | `ADMIN`, or the `DOSEN` creator                                                                        |
| `GET /api/meetings/:id/audit`                        | Audit history                                                             | Authentication plus meeting access checks                                                              |
| `POST /api/meetings/:id/attachments`                 | Upload a meeting attachment                                               | `ADMIN`, or the `DOSEN` creator                                                                        |
| `DELETE /api/meetings/:id/attachments/:attachmentId` | Delete an attachment                                                      | `ADMIN`, or the `DOSEN` creator                                                                        |

The route-level permissions are only the first gate. The meeting service still checks creator ownership, role, visibility, private access, persisted timestamps, and current account state.

## Create request

The create body uses these fields:

```json
{
  "title": "Client review",
  "description": "Optional description",
  "clientName": "Client name",
  "mode": "ONLINE",
  "location": null,
  "startAt": "2040-01-01T09:00:00.000Z",
  "endAt": "2040-01-01T10:00:00.000Z",
  "visibility": "INTERNAL",
  "primaryPicId": "507f1f77bcf86cd799439011",
  "picIds": ["507f1f77bcf86cd799439011"],
  "participantIds": [],
  "meetingLink": "https://meet.google.com/example"
}
```

The example ID is shape-only and is not a real account. A valid request requires a real active internal account ID. `OFFLINE` requires a non-empty location. `ONLINE` requires a valid HTTP or HTTPS meeting link. `primaryPicId` must be in `picIds`; PIC IDs must be unique; and there must be one to ten PIC IDs. `participantIds` can contain at most 100 IDs.

## Update request

`PATCH /api/meetings/:id` accepts any subset of meeting fields plus optional `expectedUpdatedAt`. When both `primaryPicId` and `picIds` are sent, the primary must be included and PIC IDs must be unique. The service validates the merged stored candidate for mode-specific requirements and active account references.

## Cancel request and errors

```json
{ "reason": "Client requested a new time" }
```

The exact end-time boundary is not cancellable: a persisted meeting with `endAt <= now` returns the service's `MEETING_ALREADY_ENDED` conflict condition, represented as HTTP 409 by the error middleware. A previously cancelled meeting is also protected by the conditional update. Authorization failures return HTTP 403. Validation failures return HTTP 400. Invalid or inaccessible resources use the existing 404/403 service behavior for the specific route.

## Internal meeting response

The authenticated detail response includes the meeting fields plus:

```json
{
  "visibility": "INTERNAL",
  "createdBy": {
    "id": "...",
    "displayName": "...",
    "email": "...",
    "role": "DOSEN"
  },
  "primaryPicId": "...",
  "picIds": ["..."],
  "primaryPic": {
    "id": "...",
    "displayName": "...",
    "email": "...",
    "role": "DOSEN"
  },
  "additionalPics": [],
  "participants": [],
  "participantIds": [],
  "status": "UPCOMING",
  "canEdit": true,
  "canCancel": true,
  "canDelete": false,
  "isOrganizer": true,
  "involvesHighlightedUser": false
}
```

The values above are a response shape example only. Do not use the placeholder IDs as data.

## Reminder cron endpoint

| Method and path | Header | Behavior |
| --- | --- | --- |
| `GET /api/cron/meeting-reminders` or `POST /api/cron/meeting-reminders` | `Authorization: Bearer $CRON_SECRET` | Sends the H-24 reminder to active internal users and records the atomic reminder state |

The cron response includes scan, sent, failed, and skipped counts. The endpoint never exposes meeting data without the cron secret.

```json
{
  "success": true,
  "data": { "scanned": 1, "sent": 1, "failed": 0, "skipped": 0 }
}
```

## User directory endpoint

| Method and path            | Purpose                                                    | Authorization          |
| -------------------------- | ---------------------------------------------------------- | ---------------------- |
| `GET /api/users/directory` | Internal user directory used for participant/PIC selection | Authenticated `ADMIN` or `DOSEN` |

Agenda-coordinator endpoints and `agenda.manage` grants were removed with the legacy `STUDENT` role.

## Error handling

The API returns `{ success: false, message, ... }` using the existing error middleware. Known meeting-specific conditions include validation errors, invalid user IDs, unauthorized access, conflict responses, already-ended cancellation, optimistic concurrency conflicts, and invalid cron authorization. Exact message strings should be taken from the current controller/service response rather than copied into clients as a stable machine contract unless a `code` field is present.
