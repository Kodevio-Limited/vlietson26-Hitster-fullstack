# Audit & Mitigation Plan — OV Bouwradio

**Date:** 2026-06-21
**Scope:** Critical security flaws, performance bottlenecks, and correctness bugs not already covered by the 2026-06-20 and 2026-06-21 audits.
**Method:** Four parallel finder agents (QR-redirect hot path, auth/JWT, new TanStack Query layer, songs page) plus manual verification of the top 8 findings against on-disk code. Findings re-flagged from prior audits are excluded; deferred items that amplify new findings are noted at the bottom.

---

## Executive summary

| Severity | Count | Estimated total effort |
| --- | --- | --- |
| Critical | 3 | ~1 day |
| High | 7 | ~3 days |
| Medium | 7 | ~2 days |

**Biggest wins, ordered by impact:**

1. **Fix unauthenticated admin self-promotion** (`auth.service.ts:243-277`) — one-line change in `register()`, biggest single security win.
2. **Collapse the QR-scan hot path** from 4 DB round-trips to 2 — adds a `getActiveMappingByQrCodeId` method, removes a redundant `findByIdentifier`, slims the active-mapping SELECT. ~3x DB-load reduction on the most-trafficked endpoint.
3. **Add error UI to dashboard + songs page** — backend failures currently render as "no data" with zero feedback to the admin.

**Carry-over from prior audits that these findings amplify:**

- JWT in localStorage → compounds #7 (no JWT revocation on reset) and #9 (logout race)
- Soft `proxy.ts` → compounds any stolen-JWT scenario
- No `AbortController` → compounds #11 (search debounce) and #17 (URL race)
- In-memory `CacheService` → multiplies the cost of #4's redundant query per pod

---

## Findings

### Tier 1 — Critical

#### 1. Unauthenticated admin self-promotion via `/api/auth/register`
**File:** `spotify/src/modules/auth/auth.service.ts:243-277`

`register()` sets `role: isAdmin ? 'admin' : 'user'` based purely on the `isAdminEmail()` allow-list, with no email verification. The three admin emails (`vandervliet.rick@gmail.com`, `admin@bouwradio.com`, `omgevingsverbinder@gmail.com`) are public in the repo at `auth.service.ts:162-167`.

**Scenario:** Attacker POSTs `{ email: 'admin@bouwradio.com', password: 'anything' }`. If the legitimate admin hasn't registered yet, the row is created with `role: 'admin'` and an admin JWT is returned (line 267). The legitimate admin is now permanently locked out because the email column is unique.

**Fix:** Don't grant role on register — default to `'user'`. Move admin grant behind either (a) email verification + invite token from an existing admin, or (b) a DB-driven `isAdmin` flag mutated only by an existing admin.

---

#### 2. Dashboard + songs page silently render "no data" on backend failure
**Files:**
- `frontend-dashboard/app/admin/(dashboard)/page.tsx:90` — `isLoading = isPending || isPending`; no branch reads `.error`.
- `frontend-dashboard/app/admin/(dashboard)/songs/page.tsx:150` — same shape: `isLoading` only checks pending/fetching, no `.error` branch.

**Scenario:** Backend returns 500 on `/api/batch/dashboard` (DB down, transient outage). `isPending=false`, `isError=true`. The dashboard renders four `0` stat cards and "No songs yet." The songs page renders an empty table with `totalPages=1`. The admin believes data was wiped and either retries blindly or escalates.

**Fix:** Add an error-state branch (`if (query.isError) return <ErrorState />`) and a toast on both pages. Consider a shared `<QueryErrorState query={...}>` component to avoid duplication.

---

#### 3. Three mutations invalidate the wrong dashboard query key
**Files:**
- `frontend-dashboard/lib/mutations/mappings.ts:31` (`useCreateMapping`)
- `frontend-dashboard/lib/mutations/mappings.ts:56` (`useDeleteMapping`)
- `frontend-dashboard/lib/mutations/qr-codes.ts:22` (`useCreateQrCode`)

All three call `invalidateQueries({ queryKey: queryKeys.batch.dashboard({}) })`. The dashboard's `useQuery` at `page.tsx:87` keys on `batchQueries.dashboard({ songLimit: 1 })` → cache key `['batch','dashboard',{ songLimit: 1 }]`. TanStack Query prefix matching compares the third element as an object; `{ songLimit: 1 } !== {}`. After create/delete, the dashboard's Collections + Unmapped Songs counts stay stale until the cache expires.

**Scenario:** Admin creates a mapping in the QR-mapping page, navigates back to `/admin`. The "Collections" stat still shows the pre-mapping count. Admin refreshes manually, finds the count changed, but never trusts the dashboard again.

**Fix:** Either invalidate by the actual key (`queryKeys.batch.dashboard({ songLimit: 1 })`) or expose a higher-level key (`queryKeys.batch.dashboard.all = ['batch','dashboard']`) and invalidate that. Also remove the spurious `queryKeys.qrCards.all` invalidation in `useCreateQrCode` (creating a QR doesn't change card count).

---

### Tier 2 — High

#### 4. QR-scan hot path does 3-4 DB round-trips where 1-2 would do
**Files:**
- `spotify/src/modules/qr-redirect/qr-redirect.controller.ts:48,68,73`
- `spotify/src/modules/mappings/mappings.service.ts:206-224` (`getActiveMappingByQrIdentifier`)

`findMetaByIdentifier` returns `qrCode.id` (line 48) but the controller discards it and passes `identifier` to `getActiveMappingByQrIdentifier(identifier)`, which re-resolves the QR via `qrCodesService.findByIdentifier(identifier)` — a heavy lookup with eager `relations: ['mappings','mappings.song','mappings.qrCard']`. The active-mapping lookup then adds another join (`relations: ['song','qrCode']`).

**Scenario:** Each mobile scan costs 4 DB queries when 2 would suffice. At event traffic (hundreds of scans/min), this 3-4x multiplier is the difference between a healthy pod and one saturated.

**Fix:** Add `getActiveMappingByQrCodeId(qrCodeId: string, options?: { select?: SlimSelect })`. Have the controller pass `qrCode.id` directly. Slim the active-mapping SELECT to the 7 projected columns (see #15).

---

#### 5. Per-scan `logger.log` calls flood logs
**File:** `spotify/src/modules/qr-redirect/qr-redirect.controller.ts:44, 90-92`

Every scan writes one or two info-level lines. The first line ("QR Code scanned") doesn't even include the identifier, so it's pure noise. The `LoggingInterceptor` already records request timing per scan.

**Scenario:** At 100 scans/sec the controller writes 200 info lines/sec, saturating disk and stdout. The downstream log aggregator bills per-GB ingested.

**Fix:** Drop both `logger.log` calls to `logger.debug`. The interceptor owns per-request logging; the controller shouldn't duplicate it.

---

#### 6. JWT algorithms not pinned
**File:** `spotify/src/modules/auth/strategies/jwt.strategy.ts:16-21`

No `algorithms: ['HS256']` on `passport-jwt`. Today the secret is a string so classic RS256→HS256 confusion isn't directly exploitable, but any future refactor that switches to an asymmetric public key (e.g. for third-party token exchange) silently opens the door to forging HS256 tokens with the public key as the HMAC secret.

**Fix:** Add `algorithms: ['HS256']`, `issuer`, and `audience` to both `JwtStrategy` and `JwtModule.registerAsync`. Add the matching `issuer`/`audience` claims when signing in `auth.service.ts:login()`/`register()`.

---

#### 7. `resetPassword()` doesn't revoke existing JWTs
**File:** `spotify/src/modules/auth/auth.service.ts:327-352`

Password is rotated but `isActive` is not flipped and there's no token version. `JwtStrategy.validate` only checks `isActive=true` and `id` match — the password change is never consulted. Any JWT issued before the reset remains valid for the full `JWT_EXPIRES_IN` window (7 days per `spotify/.env`). The only way to revoke a stolen token is to rotate `JWT_SECRET` (which logs out everyone).

**Scenario:** Attacker exfiltrates admin JWT via XSS or shared device. Admin notices, runs forgot-password → verify-otp → reset-password. The attacker's token still works for the remainder of the 7-day window.

**Fix:** Add a `tokenVersion` (or `passwordChangedAt`) column to `User`. Include it in the JWT payload. Reject tokens whose version predates the user's current value in `JwtStrategy.validate`. Bump the version on reset (and on change-password).

---

#### 8. Spotify OAuth `state` parameter missing
**File:** `spotify/src/modules/auth/auth.service.ts:39-53` (`getSpotifyAuthUrl`)

No CSRF binding between the OAuth callback and the user's session. The handler at `auth.service.ts:55-110` blindly accepts any valid Spotify `code`.

**Scenario:** Attacker runs the Spotify OAuth flow themselves, captures their own `code`, and phishes a logged-in admin into POSTing it to `/auth/spotify/login`. The admin is signed in as the attacker's account; every action they take is attributed to the attacker.

**Fix:** Generate a random `state` on the frontend, persist it in a short-lived signed cookie (or pass through `state` URL param and validate on callback), reject on mismatch.

---

#### 9. `logout()` clears localStorage before cookie and swallows errors
**File:** `frontend-dashboard/lib/api/auth.ts:28-44`

`localStorage.removeItem` runs before `clearAdminSessionCookie()`, and the inner try/catch silently catches every error. The dashboard layout (`layout.tsx:48-66`) papers over this for its own call site, but `logout()` itself is a footgun for any other caller.

**Scenario:** User clicks logout during a transient server outage. The Server Action throws; localStorage was already cleared; the catch swallows it; the function reports success. The Bearer JWT in localStorage is still valid until expiry. Anyone who previously exfiltrated it retains API access.

**Fix:** Clear the cookie first (await the Server Action), then clear localStorage. Rethrow on failure so callers can branch. The layout's defensive pre-clear can stay as a belt-and-braces measure for its own call site.

---

#### 10. `JWT_EXPIRES_IN` not hard-required in production
**File:** `spotify/src/config/validation.ts:41-43`

`@IsOptional` allows missing env. With `expiresIn: undefined`, `jsonwebtoken` issues tokens with no `exp` claim. Combined with #7, those tokens become permanent — only `JWT_SECRET` rotation revokes them.

**Fix:** Mirror the existing `JWT_SECRET` 32-char-in-prod pattern. Reject empty/undefined `JWT_EXPIRES_IN` in production at boot.

---

#### 11. Search input fires a request on every keystroke (no debounce)
**File:** `frontend-dashboard/app/admin/(dashboard)/songs/page.tsx:114`

`handleSearchChange` calls `setUrlParams({ q: value })` per character. Each character triggers a new `songsQuery` keyed on URL params.

**Scenario:** Typing "abba" fires four parallel `/api/songs?q=...` requests. `placeholderData: keepPreviousData` masks the UI flicker but every character still hits Postgres with `WHERE name ILIKE %q%`. Backend load scales linearly with search length.

**Fix:** Debounce 250-300ms before writing to URL (use `useDeferredValue` or a manual `setTimeout`). Bonus: also drop the URL→input `useEffect` (#17) once debounce lands.

---

### Tier 3 — Medium

#### 12. QR-redirect TOCTOU between `isActive` check and `incrementScans`
**File:** `spotify/src/modules/qr-redirect/qr-redirect.controller.ts:58-68`

If admin deactivates a QR between the `isActive` read (line 58) and the UPDATE (line 68), the scan counter still advances — the WHERE in `incrementScans` is on `identifier`, not `is_active`. Deactivated codes show phantom scans.

**Fix:** `qrCodesRepository.increment({ identifier, isActive: true }, 'scans', 1)` and check affected-row count. If 0, treat as gone (410).

---

#### 13. `redirectUrl` response field is set to the Spotify URL
**File:** `spotify/src/modules/qr-redirect/qr-redirect.controller.ts:102`

`return { ..., spotifyUrl: qrCode.code, redirectUrl: qrCode.code }` — both fields carry the Spotify URL. The entity's actual `redirect_url` column (`${API_URL}/api/qr/redirect/${identifier}`) is never returned.

**Fix:** Either return the entity's `redirectUrl` field (rename to avoid the duplicate-key collision) or remove the duplicate from the response. Decide which semantic the mobile client expects.

---

#### 14. No partial unique index on `(qr_code_id) WHERE is_active=true`
**File:** `spotify/src/modules/mappings/entities/mapping.entity.ts:16-22`

Schema allows multiple active mappings per QR. Hot path picks one with non-deterministic `ORDER BY createdAt DESC LIMIT 1`. Concurrent imports can produce two active rows; the wrong song plays depending on insertion order. (Already in the deferred list from `hitster-fixes-applied.md`.)

**Fix:** Add a migration: `CREATE UNIQUE INDEX ON mapping (qr_code_id) WHERE is_active = true;`. Enforce in the service before saving (reject if an active mapping exists for that QR).

---

#### 15. Eager loads full Song row on scan
**File:** `spotify/src/modules/mappings/mappings.service.ts:216-220`

`relations: ['song', 'qrCode']` reads all Song columns from disk just to project 7 fields (`id, name, artist, releaseYear, spotifyTrackId, albumImageUrl, previewUrl`).

**Fix:** Use `select: { id: true, song: { id: true, name: true, ... } }` in the `findOne`. Combine with #4 (new `getActiveMappingByQrCodeId`).

---

#### 16. `songQueries.qr(songId)` stored under `queryKeys.songs.detail(songId)` key
**File:** `frontend-dashboard/lib/queries/songs.ts:45`

Collision waiting to happen. The next person to add `songQueries.detail(id)` with the natural `songs.detail(id)` key will silently overwrite the QR cache, and `useUpdateSong` already invalidates `queryKeys.songs.detail(id)` thinking it's a real Song detail cache.

**Fix:** Use a distinct key tree, e.g. `queryKeys.songs.qr(songId)` that includes a discriminator. Or rename the QR helper to make its semantics obvious.

---

#### 17. URL→input sync effect can race user's typing
**File:** `frontend-dashboard/app/admin/(dashboard)/songs/page.tsx:94`

The `useEffect` syncing URL `q` to local `searchInput` can fire on a stale URL after a faster keystroke, overwriting the user's in-flight input. Visible flicker; potential data loss if the user stops typing at the wrong moment.

**Fix:** Track the URL value that originated the local change; only sync if they differ. Resolved naturally once #11 (debounce) lands, since the URL no longer changes on every keystroke.

---

## Mitigation plan

Five phases, ordered by impact-to-effort ratio. Each phase ends with a checklist; do not start the next phase until the current one is green.

### Phase 0 — Stop the bleeding (today)

Critical-tier items that take <30 minutes each. Land as a single PR if possible.

| Finding | Action | Effort | Risk |
| --- | --- | --- | --- |
| #1 | `register()`: remove role-on-register, default to `'user'` | 15 min | Low — only admins can self-register today |
| #2 | Dashboard + songs page: add error-state branch + toast | 1 h | Low — additive, no behavior change for happy path |
| #3 | Three mutations: invalidate `queryKeys.batch.dashboard.all` (new key) or match exact params | 30 min | Low |

**Acceptance:**
- New user registration with `admin@bouwradio.com` → role `'user'`, no admin JWT.
- Kill the backend during `/admin` load → see error toast instead of zeros/empty.
- Create a mapping in `/qr-mapping`, navigate to `/admin` → "Collections" stat reflects the new count within 1s.

**PR-1 scope:** #1 + #2 + #3 (single PR, ~2 h total).

---

### Phase 1 — QR-scan hot path optimization (1 day)

The single highest-volume endpoint. Combine findings that touch the same files.

| Finding | Action | Effort |
| --- | --- | --- |
| #4 | Add `getActiveMappingByQrCodeId`; controller passes `qrCode.id` | 2 h |
| #15 | Slim the active-mapping `select` to 7 columns | 30 min |
| #5 | Drop `logger.log` to `logger.debug` | 10 min |
| #12 | Conditional `increment({ identifier, isActive: true }, ...)`; check affected rows | 30 min |
| #13 | Decide response semantics; remove duplicate field | 30 min |

**Acceptance:**
- Mobile scan completes with 2 DB queries (down from 4).
- No `info`-level log lines per scan (only the interceptor's request log).
- Deactivate a QR mid-scan → scan counter not advanced (verify with a manual test).
- Mobile client still parses the response (run the existing `qr-redirect.controller.spec.ts` if any; add one if missing).

**PR-2 scope:** #4 + #5 + #12 + #13 + #15 (single PR, ~3 h, focused on `qr-redirect.controller.ts` + `mappings.service.ts` + `qr-codes.service.ts`).

---

### Phase 2 — Auth hardening (1-2 days)

Five findings, each small, together they close the major auth gaps. Pair #6+#10+#7 in PR-3, #8+#9 in PR-4.

| Finding | Action | Effort |
| --- | --- | --- |
| #10 | `validation.ts`: hard-require `JWT_EXPIRES_IN` in prod | 30 min |
| #6 | `JwtStrategy`: pin `algorithms: ['HS256']` + `issuer`/`audience`; mirror in `JwtModule.registerAsync` and signing | 1 h |
| #7 | Add `tokenVersion` column + migration; include in JWT; bump on reset/change-password; reject stale version in `JwtStrategy.validate` | 3 h |
| #8 | Generate OAuth `state`; persist in short-lived signed cookie; validate on callback | 2 h |
| #9 | `lib/api/auth.ts`: clear cookie before localStorage; rethrow on failure | 30 min |

**Acceptance:**
- App refuses to boot in prod if `JWT_EXPIRES_IN` is unset.
- Existing tokens missing `iss`/`aud` are rejected; new tokens carry both claims.
- After `resetPassword`, a token issued before the reset returns 401 on the next request.
- OAuth login attempts with a stale `state` are rejected with 400.
- `logout()` during a transient outage throws to the caller; subsequent calls detect the stale localStorage and clean up.

**PR-3 scope:** #10 + #6 + #7.
**PR-4 scope:** #8 + #9.

---

### Phase 3 — Frontend polish (1 day)

| Finding | Action | Effort |
| --- | --- | --- |
| #11 | Debounce search input (250-300ms) | 1 h |
| #17 | Once #11 lands, drop or simplify the URL→input sync effect | 30 min |
| #16 | Rename `songQueries.qr` key to `songs.qr` (with discriminator) | 30 min |

**Acceptance:**
- Typing "abba" into the search fires 1 request (after the debounce window).
- No visible input flicker on rapid typing.
- Adding a future `songQueries.detail` would not collide with the QR cache.

**PR-5 scope:** #11 + #17 + #16 (single PR, ~2 h).

---

### Phase 4 — Schema and deferred items (as time allows)

| Finding | Action | Effort | Notes |
| --- | --- | --- | --- |
| #14 | Partial unique index migration; enforce in service | 4 h | Requires DB migration + dev DB rollback plan |
| — | Add `AbortController` integration to axios transport | 3 h | Already in deferred list |
| — | Move JWT to httpOnly cookie only (remove localStorage) | 1 day | Already in deferred list |
| — | Tighten `proxy.ts` to validate JWT (not just cookie presence) | 4 h | Already in deferred list |
| — | Redis-backed `CacheService` | 2 days | Already in deferred list |

**Acceptance for #14:**
- Two concurrent imports for the same QR: the second fails with `ConflictException` rather than producing two active rows.
- Migration is reversible (`down` drops the index without affecting rows).

**PR-6 scope:** #14.
**Subsequent PRs:** each deferred item gets its own PR.

---

## Cross-cutting concerns

These don't fit a single tier but recur across phases:

1. **Tests are an afterthought.** `spotify/src/modules/qr-redirect/qr-redirect.controller.ts` has no spec; `frontend-dashboard/app/admin/(dashboard)/songs/page.tsx` is the biggest file with no test coverage. Add tests alongside each fix:
   - PR-1 (Phase 0): spec for `register()` role default; spec for `batch.dashboard` invalidation keys.
   - PR-2 (Phase 1): spec for `getActiveMappingByQrCodeId`; integration test for the 2-query scan path.
   - PR-3 (Phase 2): spec for `JwtStrategy.validate` rejecting pre-reset tokens.
   - PR-4 (Phase 3): RTL test for debounced search; the songs page test stub is overdue.

2. **Lint debt is at 328 errors** (mostly `@typescript-eslint/no-unsafe-*` from Express). Don't try to fix all of them in a single PR — file-scoped fixes are fine. PR-2 should add a spec file, which will inherit the lint debt but won't make it worse.

3. **Performance baselines.** Capture a baseline DB-query count per scan before PR-2 lands (log the queries from the interceptor or use `pg_stat_statements`). Re-measure after to verify the ~3x reduction.

4. **Mobile client compatibility.** Findings #13 (`redirectUrl` field semantics) and any change to the scan response shape need to be coordinated with the mobile client. Flag in PR-2's description.

5. **Migration timing for #14.** Don't land #14 in the same week as the `tokenVersion` migration (#7). Two schema changes in one week doubles the rollback surface.

---

## Tracking

Use GitHub issues (one per finding, labelled `audit-2026-06-21`) and link each PR back to its issue. Suggested milestone structure:

- `audit-2026-06-21 / phase-0` (PR-1)
- `audit-2026-06-21 / phase-1` (PR-2)
- `audit-2026-06-21 / phase-2 / auth-hardening` (PR-3, PR-4)
- `audit-2026-06-21 / phase-3 / frontend-polish` (PR-5)
- `audit-2026-06-21 / phase-4 / schema` (PR-6 + later)

Update `CLAUDE.md` "Open gaps" section after Phase 0 lands to remove the resolved items.

---

## Appendix — Verification log

The following findings were verified against the on-disk code in this session (all confirmed real, not speculative):

- #1 admin escalation (`auth.service.ts:243-277` + `162-167`)
- #2 silent failure (`page.tsx:90` + structure of `songs/page.tsx`)
- #3 invalidation keys (`mutations/mappings.ts:31,56` + `mutations/qr-codes.ts:22` + `page.tsx:87` + `queries/batch.ts:17`)
- #4 QR hot path (`qr-redirect.controller.ts:48-104` + `mappings.service.ts:206-224`)
- #5 per-scan log spam (`qr-redirect.controller.ts:44, 90-92`)
- #6 JWT algorithms (`strategies/jwt.strategy.ts:16-21`)
- #7 resetPassword doesn't revoke (`auth.service.ts:327-352` + `strategies/jwt.strategy.ts:23-39`)
- #9 logout race (`lib/api/auth.ts:28-44`)
- #12 TOCTOU on incrementScans (`qr-redirect.controller.ts:58-68` + `qrCodesService.incrementScans`)

The remaining findings (#8, #10, #11, #13–#17) are PLAUSIBLE based on the agents' targeted reads but were not deep-verified in this session. Phase owners should re-verify their specific finding before opening the PR.