# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OV Bouwradio** is a QR-code-driven music game (Hitster-style) where physical QR cards link to Spotify tracks. Admins curate songs and bind them to QR codes via a web dashboard; end users scan a card and get redirected to play the song.

The repo is a two-app monorepo plus Docker for the database:

| Path | Stack | Default port |
| --- | --- | --- |
| `frontend-dashboard/` | Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/Radix UI | 4001 |
| `spotify/` | NestJS 11 + TypeORM + PostgreSQL | 4002 |
| root | Docker Compose (Postgres + backend) | — |

The frontend redirects `/` to `/admin/signin`. Everything under `/admin` is protected; the auth flow lives at `/admin/(auth)/*` and the post-login app at `/admin/(dashboard)/*`.

## Common Commands

### Backend (`spotify/`)
```bash
npm install
npm run start:dev          # nest start --watch (hot reload)
npm run build              # nest build → dist/
npm run start:prod         # node dist/main
npm run lint               # eslint
npm run lint:fix           # eslint --fix
npm run format             # prettier
npm test                   # jest (rootDir: src, *.spec.ts)
npm run test:watch
npm run test:cov
npm run test:e2e           # uses test/jest-e2e.json
```

Run a single test file: `npx jest path/to/file.spec.ts` from `spotify/`.

### Frontend (`frontend-dashboard/`)
```bash
npm install
npm run dev                # next dev -p 4001
npm run build
npm run start              # next start -p 4001
npm run lint               # eslint (next + ts configs)
npm run typecheck          # tsc --noEmit
```

### Database / Docker (root)
```bash
docker compose up -d db            # postgres only
docker compose up -d --build backend
docker compose down -v             # also drops the db_data volume
```
Postgres credentials are in `docker-compose.yml`: `hitster` / `hitster_password` / `hitster_db` on the internal `app-network`. The backend connects via `DATABASE_URL`.

## Environment Variables

### Backend (`spotify/.env`, loaded via `src/config/configuration.ts` and validated by `src/config/validation.ts`)
Required: `NODE_ENV`, `PORT`, `DATABASE_URL`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
Optional: `FRONTEND_URL` (CORS origin, default `http://localhost:4200`), `API_URL` (used to build QR redirect URLs, default `http://localhost:4000`), `QR_CODE_SIZE`, `QR_CODE_MARGIN`, `THROTTLE_TTL`, `THROTTLE_LIMIT`, and SMTP_* (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).

### Frontend (`.env.local`)
`NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4002/api` — matches the backend), `NEXT_PUBLIC_API_TOKEN` (see security note below), `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` (used by the `/support` page).

> Security note: `NEXT_PUBLIC_API_TOKEN` is **not** read by the API client (`lib/api/client.ts` reads only `localStorage.adminToken`). A leftover check in the client used to let a build-time env var override every user's session; that branch was removed during the 2026-06-20 cleanup. Don't reintroduce it.

## Architecture

### Backend (`spotify/src/`)

Bootstrap is in `main.ts` and wires up, globally:
- `helmet` for security headers (no custom CSP — tighten per-deployment)
- `body-parser` 10MB JSON/urlencoded (currently the same limit applies everywhere; the comment in `main.ts` describes a planned 100kb default + route-specific override that was never finished)
- An **early middleware** that short-circuits `GET /__*`, `/favicon.ico`, `/robots.txt` to **204 No Content** before the router sees them. This silences VS Code's JavaScript Debugger auto-attach probe (`__tsd/console-pipe/sse`) and other dev-time polling. Add new noisy 4xx paths to this middleware rather than letting them become log spam.
- CORS limited to `frontendUrl`; hard-fails in production if `FRONTEND_URL` is missing or still points at localhost
- Global API prefix `api` with `exclude: [{ path: '', method: RequestMethod.GET }]` so `GET /` is reachable and returns API metadata (see `AppController.getApiInfo`); every other route is mounted under `/api/...`
- `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`, implicit conversion
- Global `HttpExceptionFilter` (logged + JSON error envelope; non-`HttpException` errors are returned as a generic "Internal server error" — raw internal errors are no longer leaked) and `LoggingInterceptor` (redacts PII: logs `user.id`, never email). **Both split severity by status: 4xx → `warn` (no stack trace), 5xx → `error` (with stack).** 4xx is a normal client outcome, not an operational error.
- `ThrottlerModule` (TTL/limit from env) + `APP_GUARD: ThrottlerGuard` so every route is throttled; auth routes override with `@Throttle()` to be much stricter

`AppModule` (`app.module.ts`) is the wiring point. It also hard-fails boot in production if `JWT_SECRET` is missing or shorter than 32 chars (see `config/validation.ts`). Each feature is its own Nest module under `modules/`:

- **`auth/`** — Two login flows (Spotify OAuth `code` exchange + email/password + register) plus forgot-password / verify-OTP / reset / update-profile / change-password. `AuthModule` is `@Global()` so JWT/Passport/User repo are injectable everywhere. Admin role is granted to a hardcoded allow-list of emails in `AuthService.isAdminEmail()` (see `auth.service.ts`) — any new admin email must be added there. JWT strategy is in `strategies/jwt.strategy.ts`; the bearer token comes from `Authorization`.
- **`songs/`** — CRUD with paged search (`SearchSongDto`: `q`, `page`, `limit`, `sortBy`, `sortOrder`). On create/update, calls `SpotifyService.getTrackById` to enrich with `albumImageUrl`, `previewUrl`, `spotifyUrl`. `getRecentSongs` / `getPopularSongs` are 5-min cached via `CacheService`. Mutations invalidate `songs:*` cache pattern.
- **`qr-codes/`** — `generateQrCode` produces a base64 PNG (via `qrcode` lib, size/margin from config) and a `redirectUrl` of the form `${apiUrl}/api/qr/redirect/:identifier` so scans are tracked. `imageUrl` is declared `select: false` on the entity — services must explicitly select it.
- **`qr-cards/`** — Physical card inventory (separate from QR codes). Tracks `cardId`, `status: active|inactive`. Card ↔ mapping relationship is many-to-one (a card can host several mappings over time).
- **`mappings/`** — Join table Song ↔ QrCode (and optionally QrCard). Unique index on `(songId, qrCodeId)`. `getActiveMappingByQrIdentifier` is what the redirect endpoint uses.
- **`qr-redirect/`** — `QrRedirectController` (mounted directly on `AppModule`, not its own module). Two endpoints:
  - `GET /api/qr/redirect/:identifier` — increments QR scan counter, increments song plays if there's an active mapping, returns JSON `{ spotifyUrl, song, redirectUrl }` for the mobile client.
  - `GET /api/qr/info/:identifier` — metadata only.
  Returns `410 GONE` for inactive codes, `404` for unknown identifiers.
- **`spotify/`** — `SpotifyService` uses **client-credentials** flow (separate from the user-OAuth flow in `AuthService`). Holds a single access token in-memory with expiry. Exposes `searchTracks`, `getTrackById`, `getSeveralTracks`, `getAlbumTracks`.
- **`mail/`** — `@nestjs-modules/mailer` + handlebars template at `modules/mail/templates/verification.hbs` (copied to `dist/` by `nest-cli.json` `assets` config). Used only by the forgot-password OTP flow.
- **`notifications/`** — In-app activity feed. Two scopes: user-specific (`userId`) and broadcast (`userId IS NULL`). Categories: `security`, `content`. Severities: `info`, `warning`, `critical`. Mutations in `songs`/`mappings`/`auth` all emit notifications.
- **`batch/`** — `BatchService` fans out to `songsService` + `mappingsService` + `qrCodesService` with `Promise.all` for the dashboard views, behind `JwtAuthGuard`. Frontend has matching `fetchDashboardData` / `fetchQrMappingPageData` helpers in `lib/api/admin-dashboard.ts`.
- **`health/`** — `GET /api/health` endpoint (no auth, `@SkipThrottle()`). Returns `{ status, uptime, dbConnected, timestamp }`; throws `ServiceUnavailableException` (503) with a `dbError` field when the DB is down. For orchestrator / uptime-monitor probes; humans should hit `GET /` for API metadata.
- **`common/`**:
  - `decorators/` — `@Public()` (skips `JwtAuthGuard`), `@Roles()` (paired with `RolesGuard`).
  - `guards/` — `JwtAuthGuard` (default-on, honors `@Public()`), `AdminGuard` (requires `user.role === 'admin'`), `RolesGuard`.
  - `filters/http-exception.filter.ts` — global error shape.
  - `interceptors/logging.interceptor.ts` — request/response timing log.
  - `services/cache.service.ts` — in-memory `Map` cache with TTL, `getOrSet`, `invalidatePattern`.

TypeORM uses `synchronize: !isProd` (see `app.module.ts:33-53`); entities live next to their modules in `modules/*/entities/*.entity.ts`.

### Frontend (`frontend-dashboard/`)

- **`app/`** — App Router. Root `page.tsx` redirects to `/admin/signin`. Public pages: `support/page.tsx` (EmailJS form), `privacy/page.tsx`. Route groups:
  - `(auth)` — signin, forgot-password, verification, reset-password. No sidebar.
  - `(dashboard)` — protected by `proxy.ts`. Sidebar layout in `layout.tsx` (mobile sheet + desktop fixed sidebar). Pages: `page.tsx` (stats dashboard), `songs/`, `qr-mapping/`, `settings/`.
- **`proxy.ts`** — Next.js middleware (legacy naming for `middleware.ts`). Reads `adminToken` cookie; redirects unauthenticated requests under `/admin` to `/admin/signin`, except for the public auth subroutes.
- **`app/actions/auth-session.ts`** — Server Actions: `setAdminSessionCookie` (httpOnly, lax, 1 week, secure in prod), `clearAdminSessionCookie`, `loginRedirect`, `logoutRedirect`. The flow is: client sets `localStorage`, calls server action to set the cookie, calls a server-action redirect so the middleware sees the new cookie on the next request.
- **`lib/api/client.ts`** — Axios instance. Reads the bearer token from `localStorage.adminToken` only (a build-time `NEXT_PUBLIC_API_TOKEN` branch was removed because it let a single env value override every user's session). Attaches as `Authorization: Bearer`. Response interceptor preserves the original `AxiosError` and, on `401`, clears local storage and redirects to `/admin/signin` (except when already there).
- **`lib/api/admin-dashboard.ts`** — Typed wrappers for every endpoint the dashboard uses. New endpoint → add a function here and import in the page.
- **`lib/queries/`** — TanStack Query layer (one file per feature: `songs.ts`, `mappings.ts`, `qr-codes.ts`, `qr-cards.ts`, `batch.ts`, `notifications.ts`). Each exports a `xxxQueries` object of `queryOptions` factories. `query-keys.ts` holds the hierarchical keys; `client.ts` configures the `QueryClient` (30s `staleTime`, 5min `gcTime`, no refetch on window focus, `keepPreviousData` for pagination). See "Data fetching pattern" below.
- **`lib/mutations/`** — TanStack Query mutation hooks (one file per feature: `songs.ts`, `mappings.ts`, `qr-codes.ts`, `notifications.ts`, `profile.ts`). Each mutation invalidates the relevant query keys on success.
- **`components/providers/query-provider.tsx`** — Client component wrapping the app in `QueryClientProvider` (created lazily inside `useState` so it survives across renders). Devtools are loaded only in development. Wired into `app/layout.tsx`.
- **`lib/api/auth.ts`** — Spotify login URL fetch + login-with-code, plus logout. Calls the auth-session server actions. (The login flow is **not** routed through TanStack Query because it interleaves localStorage, httpOnly cookie via Server Action, and a server-action redirect — too side-effectful to fit a mutation cleanly.)
- **`components/dashboard/`** — Dialog bodies for the CRUD pages (`add-song-dialog-content`, `edit-song-dialog-content`, `delete-song-dialog-content`, `map-qr-dialog-content`, `delete-mapping-dialog-content`, `qr-mapping-card`).
- **`components/ui/`** — shadcn-generated primitives (style `radix-vega`, base color `neutral`, Tailwind 4). Don't hand-edit beyond what shadcn produces; add new primitives via `npx shadcn add <name>`.
- **`components/form/`** — Thin wrappers around `@tanstack/react-form` + zod (`form-input`, `form-textarea`, `form-image`, `form-submit`).
- **`types/`** — Shared cross-page types (currently just `traffic.ts`).

Auth is backend-issued JWT (Spotify OAuth or email/password) stored in `localStorage` + an `adminToken` httpOnly cookie.

### Data fetching pattern (TanStack Query)

The dashboard uses **TanStack Query v5** (`@tanstack/react-query`) for all server-state. The pattern, applied to every feature:

1. **Plain transport in `lib/api/<feature>.ts`** — `fetchX(params)` functions that hit the backend via axios and return typed data. No React, no caching, easy to test.
2. **`queryOptions` factories in `lib/queries/<feature>.ts`** — wrap the transport with a typed key from `queryKeys.<feature>` and a sensible `staleTime`. This is what gets passed to `useQuery` / `useSuspenseQuery` / `ensureQueryData`.
3. **Hierarchical keys in `lib/queries/query-keys.ts`** — every feature exposes an `all` key (e.g. `queryKeys.songs.all = ["songs"] as const`) so a single `invalidateQueries({ queryKey: queryKeys.songs.all })` wipes every dependent view.
4. **`useMutation` hooks in `lib/mutations/<feature>.ts`** — call the transport function, then `invalidateQueries` for the relevant keys on success. UI components just `mutation.mutate(payload, { onSuccess, onError })`.
5. **Component code uses hooks, not `useEffect`** — `const { data, isPending } = useQuery(songQueries.list(params))` replaces manual `useState` + `useEffect` + try/catch. `placeholderData: keepPreviousData` (set in the global defaults) makes pagination feel instant.

URL state for paginated/filtered pages: `page`, `q`, `sort`, `order` live in search params (read via `useSearchParams`, written via `router.replace`). The query key includes the URL params, so deep links to `?page=3` just work — fixes the bug noted in the deferred-work section.

The `QueryClient` is created in `components/providers/query-provider.tsx` (a client component) using `useState(() => makeQueryClient())` so the client survives across renders but is re-instantiated per request in SSR. Devtools (`@tanstack/react-query-devtools`) are mounted in development only.

Reference: `@.agents/skills/tanstack-query/SKILL.md` and `@.agents/skills/tanstack-integration-best-practices/SKILL.md`. Note: those skills are written for TanStack Router; the Next.js App Router is a different data-fetching model, so the router-specific pieces (`setupRouterSsrQueryIntegration`, `createRootRouteWithContext`, file-based loaders) do **not** apply — only the query-layer patterns translate.

### Data flow summary (end-to-end)
1. Admin signs in at `/admin/signin` → backend `/api/auth/login` (or `/api/auth/spotify/login`) → JWT stored in `localStorage` and `adminToken` cookie.
2. Admin adds a Song → frontend posts to `/api/songs` (JWT-authenticated + AdminGuard on backend) → backend fetches Spotify metadata, writes row, invalidates cache, emits notification.
3. Admin generates a QR Code (from `qr-mapping` page) → backend stores identifier + base64 image + `redirectUrl = ${API_URL}/api/qr/redirect/:identifier`.
4. Admin maps Song ↔ QR Code (and optional QrCard) → backend enforces uniqueness, emits notification.
5. End user scans the QR → phone hits `/api/qr/redirect/:identifier` → backend increments `qrCode.scans` and (if mapped) `song.plays`, returns `{ spotifyUrl, song }` to the client.

## Conventions & Gotchas

- Backend uses `class-validator`/`class-transformer` DTOs under each `modules/<x>/dto/`. Controllers rely on the global `ValidationPipe`; never bind raw request bodies to entities.
- `QrCode.imageUrl` has `select: false` — any new repository call that needs it must explicitly `select: { imageUrl: true, ... }` (see `qr-codes.service.ts` for the pattern). The QR-scan hot path uses `findMetaByIdentifier` to avoid loading the base64 PNG.
- Adding a new admin email requires editing `isAdminEmail()` in `spotify/src/modules/auth/auth.service.ts`; there is no DB-driven role assignment yet. `mappings.controller.ts` and `qr-codes.controller.ts` apply `AdminGuard`; `songs.controller.ts` does the same — keep the pattern for any new write endpoint.
- Global API prefix is `/api`. Frontend's `lib/api/client.ts` defaults to `http://localhost:4002/api` (matching the backend's `port` config). The backend's `API_URL` env var is used to build QR `redirectUrl` values and `qr-codes.service.ts` hard-fails in prod if it still points at localhost.
- `synchronize: true` is enabled outside production (see `app.module.ts` — `synchronize: !isProd`). The prod config uses `synchronize: false`. Don't rely on TypeORM migrations for development.
- `@Public()` decorator skips JWT auth; pair it with `JwtAuthGuard` controllers that need mixed access.
- The NestJS `BodyParser` limit is 10MB so base64 avatar uploads work; raising limits needs both the body-parser config and any reverse proxy. The `main.ts` comment describes a planned 100kb default + route-specific override that was never finished.
- Mail templates live in `spotify/src/modules/mail/templates/` and are copied into `dist/` by `nest-cli.json` `assets`. New templates need an entry there.
- Tests are co-located as `*.spec.ts` next to source (`rootDir: src` in `package.json`); e2e tests live in `test/*.e2e-spec.ts` and run with the separate `test/jest-e2e.json` config.
- Both apps use ESLint flat config (`eslint.config.mjs`). Backend also runs Prettier (`endOfLine: auto` to keep CRLF intact on Windows). `skills-lock.json` at the repo root pins the auto-invoked skills in `.agents/skills/` (currently `nestjs-best-practices`, `tanstack-integration-best-practices`, `tanstack-query`).
- Frontend `proxy.ts` (Next middleware) only checks for the **presence** of the `adminToken` cookie, not JWT signature/expiry. The DB is not queried on the middleware path. Treat this as a soft gate — don't add admin-only routes that the middleware alone can protect.

## Project memory

Long-running context (audit findings, past fixes, deferred work, architectural notes) lives in the auto-loaded memory directory — see `C:\Users\User\.claude\projects\D--Kodevio-Projects-02-May-vlietson26-Hitster-fullstack\memory\MEMORY.md` for the index. **Check there before re-investigating something that looks broken** — many "is this a bug?" questions are already answered.

Known gaps that are still open (and intentionally not done yet):

- **JWT in `localStorage`** (XSS surface). Should move to httpOnly cookie only.
- **Soft middleware** — `proxy.ts` validates cookie presence, not signature. Needs a shared secret or a lightweight `/auth/me` round-trip to be tightened.
- **In-memory `CacheService`** (server-side) — not shared across pods. Redis-backed cache is the right next step.
- **QR images stored as base64 in Postgres `text`** — should move to object storage.
- **Admin role** is still hardcoded via `isAdminEmail()`. Needs a DB-driven flag with admin-only mutation.
- **No CI pipeline** — no `.github/workflows/` yet.
- **No `AbortController` integration** — TanStack Query now handles the dedup and stale-revalidation, but the underlying axios transport still doesn't pass `signal` for in-flight cancellation. Pages that navigate away mid-fetch still complete the request.
- **Songs page loading flash** — `useQuery(songQueries.list(...))` shows the full `SkeletonTable` during any fetch (including pagination), so quick page changes cause the table to disappear and reappear. The `keepPreviousData` default in `lib/queries/client.ts` is configured but not used by the songs page; can revert to keep-previous + in-table spinner if the flash becomes annoying.
- **Pre-existing backend lint debt** — 328 errors, mostly `@typescript-eslint/no-unsafe-*` from Express's loose typing and `no-floating-promises` on `bootstrap()`. Mechanical fix; out of scope for recent passes.