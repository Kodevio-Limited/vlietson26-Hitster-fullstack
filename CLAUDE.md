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
npm run lint               # eslint with --fix
npm test                   # jest (rootDir: src, *.spec.ts)
npm run test:watch
npm run test:cov
npm run test:e2e           # uses test/jest-e2e.json
npm run format             # prettier
```

Run a single test file: `npx jest path/to/file.spec.ts` from `spotify/`.

### Frontend (`frontend-dashboard/`)
```bash
npm install
npm run dev                # next dev -p 4001
npm run build
npm run start              # next start -p 4001
npm run lint               # eslint (next + ts configs)
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
`NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000/api` — note the port mismatch with backend's 4002; set this explicitly), `NEXT_PUBLIC_API_TOKEN`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_TEMPLATE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` (used by the `/support` page).

## Architecture

### Backend (`spotify/src/`)

Bootstrap is in `main.ts` and wires up, globally:
- `body-parser` 10MB JSON/urlencoded (for base64 image uploads via settings)
- CORS limited to `frontendUrl`
- Global API prefix `api` (so controllers are mounted under `/api/...`)
- `ValidationPipe` with `whitelist`, `transform`, `forbidNonWhitelisted`, implicit conversion
- Global `HttpExceptionFilter` (logged + JSON error envelope) and `LoggingInterceptor`
- `ThrottlerModule` (TTL/limit from env)

`AppModule` (`app.module.ts`) is the wiring point. Each feature is its own Nest module under `modules/`:

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
- **`common/`**:
  - `decorators/` — `@Public()` (skips `JwtAuthGuard`), `@Roles()` (paired with `RolesGuard`).
  - `guards/` — `JwtAuthGuard` (default-on, honors `@Public()`), `AdminGuard` (requires `user.role === 'admin'`), `RolesGuard`.
  - `filters/http-exception.filter.ts` — global error shape.
  - `interceptors/logging.interceptor.ts` — request/response timing log.
  - `services/cache.service.ts` — in-memory `Map` cache with TTL, `getOrSet`, `invalidatePattern`.

TypeORM uses `synchronize: true` in dev (no migrations). Entities live next to their modules in `modules/*/entities/*.entity.ts`.

### Frontend (`frontend-dashboard/`)

- **`app/`** — App Router. Root `page.tsx` redirects to `/admin/signin`. Public pages: `support/page.tsx` (EmailJS form), `privacy/page.tsx`. Route groups:
  - `(auth)` — signin, forgot-password, verification, reset-password. No sidebar.
  - `(dashboard)` — protected by `proxy.ts`. Sidebar layout in `layout.tsx` (mobile sheet + desktop fixed sidebar). Pages: `page.tsx` (stats dashboard), `songs/`, `qr-mapping/`, `settings/`.
- **`proxy.ts`** — Next.js middleware (legacy naming for `middleware.ts`). Reads `adminToken` cookie; redirects unauthenticated requests under `/admin` to `/admin/signin`, except for the public auth subroutes.
- **`app/actions/auth-session.ts`** — Server Actions: `setAdminSessionCookie` (httpOnly, lax, 1 week, secure in prod), `clearAdminSessionCookie`, `loginRedirect`, `logoutRedirect`. The flow is: client sets `localStorage`, calls server action to set the cookie, calls a server-action redirect so the middleware sees the new cookie on the next request.
- **`lib/api/client.ts`** — Axios instance. Reads token from `process.env.NEXT_PUBLIC_API_TOKEN` first, then `localStorage.adminToken`. Attaches as `Authorization: Bearer`. Response interceptor unwraps `message`/`error` fields and throws.
- **`lib/api/admin-dashboard.ts`** — Typed wrappers for every endpoint the dashboard uses. New endpoint → add a function here and import in the page.
- **`lib/api/auth.ts`** — Spotify login URL fetch + login-with-code, plus logout. Calls the auth-session server actions.
- **`components/dashboard/`** — Dialog bodies for the CRUD pages (`add-song-dialog-content`, `edit-song-dialog-content`, `delete-song-dialog-content`, `map-qr-dialog-content`, `delete-mapping-dialog-content`, `qr-mapping-card`).
- **`components/ui/`** — shadcn-generated primitives (style `radix-vega`, base color `neutral`, Tailwind 4). Don't hand-edit beyond what shadcn produces; add new primitives via `npx shadcn add <name>`.
- **`components/form/`** — Thin wrappers around `@tanstack/react-form` + zod (`form-input`, `form-textarea`, `form-image`, `form-submit`).
- **`types/`** — Shared cross-page types (currently just `traffic.ts`).

The app uses `@clerk/nextjs` as a declared dependency but the actual auth flow is backend-issued JWT (Spotify or email/password) — Clerk is not wired in. Treat Clerk as legacy/optional unless explicitly revisited.

### Data flow summary (end-to-end)
1. Admin signs in at `/admin/signin` → backend `/api/auth/login` (or `/api/auth/spotify/login`) → JWT stored in `localStorage` and `adminToken` cookie.
2. Admin adds a Song → frontend posts to `/api/songs` (JWT-authenticated + AdminGuard on backend) → backend fetches Spotify metadata, writes row, invalidates cache, emits notification.
3. Admin generates a QR Code (from `qr-mapping` page) → backend stores identifier + base64 image + `redirectUrl = ${API_URL}/api/qr/redirect/:identifier`.
4. Admin maps Song ↔ QR Code (and optional QrCard) → backend enforces uniqueness, emits notification.
5. End user scans the QR → phone hits `/api/qr/redirect/:identifier` → backend increments `qrCode.scans` and (if mapped) `song.plays`, returns `{ spotifyUrl, song }` to the client.

## Conventions & Gotchas

- Backend uses `class-validator`/`class-transformer` DTOs under each `modules/<x>/dto/`. Controllers rely on the global `ValidationPipe`; never bind raw request bodies to entities.
- `QrCode.imageUrl` has `select: false` — any new repository call that needs it must explicitly `select: { imageUrl: true, ... }` (see `qr-codes.service.ts` for the pattern).
- Adding a new admin email requires editing `isAdminEmail()` in `spotify/src/modules/auth/auth.service.ts`; there is no DB-driven role assignment yet.
- Global API prefix is `/api`. Frontend base URL should be `http://localhost:4002/api` to match the default backend port. The frontend default (`4000`) is a leftover and should be overridden via `NEXT_PUBLIC_API_BASE_URL`.
- `synchronize: true` is on for the backend — schema changes auto-apply. Don't rely on TypeORM migrations for development.
- `@Public()` decorator skips JWT auth; pair it with `JwtAuthGuard` controllers that need mixed access.
- The NestJS `BodyParser` limit is 10MB so base64 avatar uploads work; raising limits needs both the body-parser config and any reverse proxy.
- Mail templates live in `spotify/src/modules/mail/templates/` and are copied into `dist/` by `nest-cli.json` `assets`. New templates need an entry there.
- Tests are co-located as `*.spec.ts` next to source (`rootDir: src` in `package.json`); e2e tests live in `test/*.e2e-spec.ts`.
- Both apps use ESLint flat config (`eslint.config.mjs`). Backend also runs Prettier (`endOfLine: auto` to keep CRLF intact on Windows).