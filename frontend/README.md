# RAMS Platform frontend

The RAMS frontend is a Next.js 16 App Router application for the public RAMS website and the authenticated management console. It integrates with the existing Express API; it does not own authentication or application data.

## Architecture

- `app/` contains public, login, dashboard, and alumni self-profile routes.
- `components/` contains interactive module screens and small shared UI primitives.
- `lib/api/` is the single typed API boundary. Requests use `credentials: "include"`; JWTs are never exposed to JavaScript or persisted in browser storage.
- `types/` mirrors the verified backend response and input contracts.
- Auth uses the backend `rams_access_token` HttpOnly cookie and readable `rams_csrf_token` cookie. The client adds `X-CSRF-Token` automatically to state-changing requests.

## Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The backend must be running separately and its `FRONTEND_URL` must include the frontend origin.

## Environment variables

Required:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Optional site URL used for metadata:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Only public origins belong in `NEXT_PUBLIC_*`. Never put JWT secrets, database credentials, or private API keys in this project.

## Development and verification

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

The tests use mocked HTTP responses for deterministic client behavior. They do not replace backend integration/security tests; run the backend test suite from `../backend` for API and authorization verification.

## Routes

Public: `/`, `/projects`, `/projects/[slug]`, `/partners`, `/partners/university`, `/partners/industrial`.

Authenticated staff: `/dashboard`, `/dashboard/alumni`, `/dashboard/dosen`, `/dashboard/projects`, `/dashboard/partners`, `/dashboard/tracking`.

Authenticated alumni: `/profile` for the self-profile contract exposed by the backend.

## Role model

The backend is the authorization boundary. The frontend uses roles only to provide useful UX: ADMIN sees mutation controls, DOSEN sees read-only operational views where the API allows it, and ALUMNI is routed to the supported self-profile page. A hidden button is not a security control.

## Production deployment

### Vercel

Create a Vercel project from this directory, set `NEXT_PUBLIC_API_URL` to the deployed API base (for example `https://api.example.com/api`), set `NEXT_PUBLIC_SITE_URL` to the public frontend URL, and deploy. Configure the backend `FRONTEND_URL` with the exact Vercel origin.

### Node.js hosting

```bash
npm ci
npm run build
PORT=3000 npm run start
```

Set the same public environment variables in the host. The default Next.js server output is used, so no development server or backend secret is required at runtime.

## API integration notes

Dashboard data is fetched only after the AuthProvider restores `/api/auth/me`. Public reads use `/api/public/*`. Authenticated dashboard reads and mutations use the corresponding `/api/*` endpoints documented by the backend source. Authenticated responses are not cached by the frontend data layer.

## Troubleshooting

- A 401 means the cookie session is missing, expired, or revoked; sign in again.
- A 403 means the backend rejected the role or CSRF/origin check; inspect the API origin and backend `FRONTEND_URL`.
- Network errors usually mean the API is not running or `NEXT_PUBLIC_API_URL` is incorrect.
- If a mutation fails with CSRF validation, sign out and sign in again to obtain a fresh CSRF cookie, then verify both origins are configured exactly.
