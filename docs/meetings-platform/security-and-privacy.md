# Security and privacy

## Authentication and transport controls

The backend uses cookie-based authentication and JWT-backed user identity. The app applies CORS, security headers, body-size limits, cookie parsing, and a state-changing-origin/CSRF check. The frontend stores the API-issued CSRF token in session storage and attempts to synchronize it through shared local storage for multiple tabs.

`TRUST_PROXY` is parsed as a known proxy count or trusted proxy list. Production configuration should not use an unrestricted `true` value. `JWT_SECRET` is required by the auth utilities. Secrets and provider credentials are not included in this documentation.

## Authorization layers

Authorization has multiple layers:

1. Authentication resolves an active account and JWT identity.
2. Route middleware checks broad role or permission requirements.
3. Meeting services check ownership, visibility, coordinator status, account roles, and requested operation.
4. Serializers remove fields that the actor or audience cannot receive.

This means a PIC reference is not itself an access grant. A participant can have detail access according to the service rule. Only admins and lecturers manage shared non-private meetings, subject to ownership rules.

## PRIVATE behavior

The effective visibility function returns `INTERNAL` only for an explicit `INTERNAL` value. Missing visibility is treated as `PRIVATE`.

For authenticated meeting detail, private access is restricted by the current service rule to admins, the creator, or an internal participant. A PIC who is not otherwise authorized does not receive detail access solely from PIC membership.

For the authenticated calendar, an inaccessible private meeting is reduced to:

```json
{
  "_id": "...",
  "title": "Busy",
  "startAt": "...",
  "endAt": "...",
  "createdBy": null,
  "canViewDetails": false
}
```

No private title, client, mode, location, link, participant, PIC, highlight, attachment, or audit data is included in that Busy item. The exact shape is enforced by the meeting service and unit tests.

## Public serializer boundary

Public schedule queries enforce `visibility: INTERNAL` and no cancellation timestamp. Public detail applies the same filter, so PRIVATE, CANCELLED, and legacy missing-visibility records return HTTP 404. Past INTERNAL meetings remain eligible.

The public serializer returns only:

```text
id, title, clientName, startAt, endAt, mode, location,
meetingLink, primaryPicName, additionalPicNames, status
```

It deliberately omits creator, participant, attachment, description, audit, permission, highlight, PIC IDs, and PIC emails. PIC names use a resolved display name and fall back to the email local part; the email itself is not returned.

## Highlight privacy

`MEETINGS_HIGHLIGHTED_USER_IDS` is server-only configuration. The backend returns only `involvesHighlightedUser` in authorized internal responses. It does not return the configured list. Private Busy output also omits it.

## Account and permission separation

The platform keeps these concepts separate:

- account identity and active status;
- role such as `ADMIN`, `DOSEN`, or `ALUMNI`;
- ownership in `createdBy`;
- PIC responsibility in `primaryPicId` and `picIds`;
- participant access in `participantIds`.

Deactivating an account must be evaluated by the auth and current account checks. A stale frontend page is not an authorization source. A complete live deactivation scenario was not executed in this QA pass because MongoDB was unavailable.

## Attachments and third-party data

Attachments are controlled by extension, MIME type, count, and size limits in the meeting schema/service. The stored record includes a URL and provider public ID. Cloudinary upload/delete behavior was not live-tested in this environment, so provider-side privacy, retention, and deletion guarantees require a controlled integration test.

## WhatsApp and Meta Cloud API privacy

`META_WHATSAPP_ACCESS_TOKEN` is server-only. It is read from the backend environment, sent only in the `Authorization: Bearer` header to `https://graph.facebook.com/{version}/{phone_number_id}/messages`, and is never returned by the API, included in startup diagnostics, or written to logs. Startup reports only the provider name, configured state, whether a WABA ID is present, and the Graph API version. No live Meta connectivity check runs at startup.

Reminder messages use WhatsApp template messages; template approval is managed in Meta Business Manager. Their body parameters contain the meeting title, date and time, organizer name, safe meeting link, and RAMS detail link. They do not include descriptions, attachments, participant lists, consent data, phone numbers, or internal metadata. The transport sends the normalized E.164 number without the leading `+`.

## Email privacy

Reminder recipients are resolved server-side from the creator and eligible internal participants. External participant metadata, guest invitation records, and delegate fields are not converted into reminder recipients. Email provider dispatch was not executed, so provider logging and mailbox delivery remain unverified.
