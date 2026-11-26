# Security and privacy

## Authentication and transport controls

The backend uses cookie-based authentication and JWT-backed user identity. The app applies CORS, security headers, body-size limits, cookie parsing, and a state-changing-origin/CSRF check. The frontend stores the API-issued CSRF token in session storage and attempts to synchronize it through shared local storage for multiple tabs.

`TRUST_PROXY` is parsed as a known proxy count or trusted proxy list. Production configuration should not use an unrestricted `true` value. `JWT_SECRET` is required by the auth utilities. Secrets and provider credentials are not included in this documentation.

## Authorization layers

Authorization has multiple layers:

1. Authentication resolves an active account and JWT identity.
2. Route middleware checks broad role or permission requirements.
3. Meeting services check ownership, account roles, cancellation state, and the requested operation.
4. Serializers remove fields that the actor or audience cannot receive.

This means a PIC reference is not itself an access grant. Detail access is available to authenticated `ADMIN` and `DOSEN` accounts, while mutation remains limited to admins and the creator.

## Internal meeting access

All meeting routes require an authenticated `ADMIN` or `DOSEN` account. Every internal account receives the full internal detail and calendar serialization. Mutation is limited to `ADMIN` accounts and the meeting creator.

## Serializer boundary

Meeting responses are private to authenticated internal accounts and are served with `Cache-Control: private, no-store`. The internal serializer includes creator, participant, PIC, and attachment data because the authorization-aware UI uses it. There is no public meeting or schedule serializer.

PIC names use a resolved display name and fall back to the email local part.

## Highlight privacy

`MEETINGS_HIGHLIGHTED_USER_IDS` is server-only configuration. The backend returns only `involvesHighlightedUser` in authenticated internal responses. It does not return the configured list.

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
