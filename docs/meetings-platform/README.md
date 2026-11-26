# RAMS Meetings Platform Documentation

This directory documents the implemented RAMS meeting, shared agenda, PIC, highlight, attachment, audit, and reminder behavior.

The documentation is based on the current backend and frontend source and on the tests actually executed on 2026-11-21. It does not describe unimplemented product intent as if it were behavior. Items that could not be exercised are marked explicitly in [testing.md](./testing.md) and [known-limitations.md](./known-limitations.md).

## Documentation map

- [Architecture](./architecture.md): application boundaries, data flow, lifecycle, and permission boundaries.
- [Features](./features.md): implemented workflows and the role matrix.
- [API reference](./api-reference.md): authenticated meeting, agenda, PIC, attachment, audit, coordinator, account, and cron endpoints.
- [Database](./database.md): collections, meeting fields, indexes, relationships, audit data, and legacy behavior.
- [Security and privacy](./security-and-privacy.md): authentication, authorization, public serializers, PRIVATE meetings, Busy events, and sensitive fields.
- [Testing](./testing.md): test architecture, exact commands, results, evidence, and execution limits.
- [Deployment and operations](./deployment-and-operations.md): configuration, startup, reminders, email, Cloudinary, and troubleshooting.
- [Known limitations](./known-limitations.md): remaining gaps and blocked verification.

## System summary

The backend is an Express and TypeScript API backed by MongoDB. The frontend is a Next.js and TypeScript application. Both packages are independent npm projects under this repository.

Meeting data is stored in the `meetings` collection. A meeting has an owner in `createdBy`, internal PIC references in `primaryPicId` and `picIds`, internal participants in `participantIds`, optional external guest metadata in `externalParticipants`, optional attachments, and embedded audit history. PICs are not automatically granted meeting detail access.

The authenticated meetings API is mounted at `/api/meetings`. The frontend exposes the private workspace under `/meetings`, with legacy `/schedule` URLs permanently redirected to the meetings workspace. The H-24 reminder endpoint is `/api/cron/meeting-reminders` and requires the cron bearer secret.

## Verification status at documentation time

- PASS: full frontend Vitest suite, 57 files and 452 tests.
- PASS: frontend TypeScript check, targeted ESLint, and production build.
- PASS: backend TypeScript build and the focused meeting business-logic/unit set, 6 files and 52 tests.
- BLOCKED: complete backend integration suite, because the isolated MongoDB test database was not available.
- FAIL: repository-wide frontend ESLint, with 15 errors and 27 warnings in existing unrelated files. The changed meeting files passed targeted ESLint.
- BLOCKED: browser E2E and controlled email/Cloudinary dispatch verification. The browser control runtime was not exposed in this session, and the backend database prerequisite was unavailable.
