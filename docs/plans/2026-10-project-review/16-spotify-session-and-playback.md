# 16 — Spotify Session Persistence and Deterministic Playback

> **Status (2026-10-06):** Phase 1 (deterministic start position) and Phase 2 items 3.1–3.4 (restart, end-of-track detection, tap-to-play) shipped; bug register B7 and B9 resolved 2026-09-09. Open: Phase 2 items 3.5 (Free-tier parity, unverified) and 3.6 (Media Session), Phase 3 (persistent authorisation — gated by owner decision 10, stays per room pending compliance review) and Phase 4 (playback diagnostics; 14 `console.*` calls remain in a 746-line hook that also violates the 700-line rule).
> **Folded from** `docs/plans/2026-09-stability-performance/08-spotify-session-and-playback.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.

> Owning layers: `apps/server/src/spotify`, `apps/server/src/http/spotifyRoutes.ts`,
> `apps/web/src/pages/GamePage/hooks` (playback), `packages/shared/src/spotify`.
> Register findings: B-01 (OAuth `state`, hotfix track), B-18 (PII and unused scope), F-11 (playback
> runtime cost), F-22 (console diagnostics), F-26 (file split), U-14 (per-room login copy), T-05 and
> T-06 (untested Spotify services and hooks).
>
> **Compliance gate:** section 3 changes what personal data the service stores and for how long. It
> must not reach a production or client-facing deployment before the review in section 5 is signed
> off. Sections 2 and 4 have no such gate and can proceed independently.

## 1. Shipped — Phase 1 and Phase 2 items 3.1–3.4

- **Phase 1, deterministic start.** `SpotifyPlayerClient.playTracksOnDevice` sends `position_ms`
  (default 0, parameterised for the restart path). Proven by
  `apps/server/tests/spotify/spotifyClients.test.ts` (default and supplied value). Commit `20df16a`.
- **Phase 2, 3.1 contract.** `HostPlaybackState` in `useHostPlayback.ts` exposes `restart`,
  `needsUserGesture` and `hasEnded` in addition to the original transport controls.
- **Phase 2, 3.2–3.3 end-of-track and `resume()`.** The ended state is derived in the SDK hook and
  `resume()` falls through to a re-issue of the current URI, so there is no state in which the host
  cannot get audio going again. Proven by `apps/web/src/pages/GamePage/hooks/useHostPlayback.test.ts`.
- **Phase 2, 3.4 autoplay.** `needsUserGesture` is surfaced to the turn action dock as an explicit
  tap-to-play control.
- **Deviations.** The split of the playback context into a stable controls context and a progress
  context recommended in 3.1 did not land: the context value is still a new object per render and a
  1 s interval runs whenever playback is enabled (F-11, owned by Phase 5 of the review programme).
  Whether the retry ladder was branched for autoplay blocks was not re-verified in this fold.
- **Manual checks still owed:** M8 and M9 in `19-testing-strategy.md` §8 (track finishes during a
  placement, then play restarts; a previously heard track starts from the beginning).

## 2. Phase 2 — open items

### 2.1 Free-tier parity (formerly 3.5) · **unverified**

The free-tier path (30-second preview via `HTMLAudioElement`) had the same gaps as the premium
path: no restart, and the `lastPreviewUrlRef` guard meant the same preview URL was never replayed.
The plan was to add `restart()` for it too (`audio.currentTime = 0; void audio.play()`) and to reset
`lastPreviewUrlRef` on card change rather than comparing URLs, so a repeated preview URL still
plays.

Whether this landed together with the premium fix in `20df16a` has not been confirmed by a test.
Verify first; if it is missing, implement it with a component test against the `HTMLMediaElement`
stubs in `apps/web/vitest.setup.ts`.

### 2.2 Media Session API (formerly 3.6) · **open**

Not present (no `navigator.mediaSession` usage in `apps/web/src`). Cheap and worth adding while in
this area: `navigator.mediaSession` with metadata (title, artist, artwork) and action handlers for
`play`, `pause`, `previoustrack` (mapped to restart) and `seekto`. It gives the host lock-screen and
headphone-button control, which for a party host holding the device is a genuine improvement.

Note: this publishes the current track's title, artist and artwork to the OS media notification,
which is visible on the lock screen. That is the expected behaviour of a music app and involves no
new data leaving the device, but it should be a conscious choice rather than an accident. **Do not
include the release year in the metadata — it is the answer to the game.**

### Acceptance

- [ ] Component test: free-tier `restart()` replays the preview from 0, and the same preview URL
      plays twice in a row.
- [ ] Manual: a Free-tier host can replay the same preview twice.
- [ ] Lock-screen controls work on iOS Safari and Android Chrome and do not expose the release
      year; a test asserts the metadata object carries no year.

## 3. Phase 3 — Persistent Spotify authorisation · **S2, gated**

**Owner decision 10 (`00-index.md` §5):** Spotify login **stays per room** for now, gated on
compliance review. Phase 4 of the review programme makes the per-room login explicit in the UI
(U-14: tokens are dropped on room close and the UI never says so). Nothing in this section may be
implemented before the section 5 review is signed off and recorded.

### 3.1 Current design

`apps/server/src/spotify/SpotifyTokenStore.ts` keys `hostTokensByRoomId` by `RoomId`, and
`RoomService.closeRoom` clears the host tokens. The map is also lost on every server restart and on
every redeploy. So the host re-authorises for every room, and often mid-session.

### 3.2 Target design

Key the credential by **device session**, not by room, and give it an explicit lifetime. A
`SpotifyCredential` record holds: a `subjectKey` (HMAC of the player session id, see 3.4), the
refresh-token ciphertext, the account type, the granted scope (so a scope change forces
re-consent), creation and last-used timestamps and an absolute retention deadline.

- **Access tokens stay in memory only**, keyed by room as they are now. They live an hour and there
  is no reason to persist them.
- **Refresh tokens** are the only thing that persists, because they are what removes the re-login.
- A room's Spotify state becomes a _binding_ from `roomId` to `subjectKey`, created when a host
  connects Spotify and dropped when the room closes. Closing a room removes the binding, not the
  credential.
- On room creation, if the creating session already holds a valid credential, the server offers
  "continue with your connected Spotify account" instead of an OAuth round trip. Offer it — do not
  silently reuse it. The host should see which account is about to be used, and be able to choose a
  different one.

### 3.3 Storage

The MVP has no database (`CLAUDE.md`: in-memory storage, future Redis/PostgreSQL). Two options:

| Option                                                                                                                                                | Pros                                                                               | Cons                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Encrypted client-side credential** — the server returns the encrypted refresh token to the browser, which stores it and presents it on reconnect | No server-side persistence at all; no new infrastructure; survives server restarts | The ciphertext lives in `localStorage`, so it is exposed to any XSS in the app; needs a server-held key so the client cannot read it |
| **B. Server-side store behind an interface** — `SpotifyCredentialStore` with an in-memory implementation now and Redis later                          | Token never reaches the browser; straightforward revocation; auditable             | Lost on restart until a real backing store exists, so it only partly solves the problem                                              |

**Recommendation: B, with a documented follow-up to add a persistent backing store.** Option A
places a long-lived credential for a third-party account inside browser storage, where the app's
own XSS surface becomes a Spotify account-compromise surface. That is the wrong trade for a
convenience feature, and it is difficult to argue as "appropriate technical measures" under GDPR
Art. 32. Option B solves the room-to-room re-login immediately and the restart case follows when
persistence is added.

Define the store interface now (`get`, `put`, `touch`, `delete`, `deleteExpired`) so the swap is a
wiring change. Redis or any managed store is a third-party service and requires compliance review
before use.

### 3.4 Security controls

Non-negotiable for this phase:

1. **Encryption at rest.** Refresh tokens are encrypted with AES-256-GCM using a key from a new
   required env var `SPOTIFY_TOKEN_ENCRYPTION_KEY` (32 bytes, base64). Validate it in
   `apps/server/src/app/env.ts` alongside the existing Spotify config, and refuse to boot with
   persistence enabled and no key. A random nonce per record; the auth tag stored with the
   ciphertext.
2. **No raw session id as the storage key.** Store `subjectKey = HMAC-SHA256(sessionId, serverKey)`
   so a dump of the store cannot be correlated back to client-held identifiers.
3. **Bounded retention.** `expiresAtMs = createdAtMs + 30 days`, plus an idle expiry of 14 days from
   `lastUsedAtMs`, whichever is sooner. A periodic sweep calls `deleteExpired`. Thirty days is a
   proposal, not a given — the retention period is a decision for the review in section 5.
4. **Explicit revocation.** A "disconnect Spotify" control in settings deletes the credential
   server-side and clears the room binding. This must be reachable without being in a room. Users
   must be able to withdraw consent as easily as they gave it.
5. **Scope binding.** Store the granted `scope`. If the app's requested scope set ever changes,
   treat the stored credential as invalid and re-consent.
6. **Never log token material.** Audit `apps/server/src/app/axiomLogSink.ts` and
   `realtimeAuditLogger.ts` to confirm no access token, refresh token or authorisation code can
   reach a log line or an audit payload. Add a test that feeds a token-shaped string through the
   audit path and asserts it is absent from the output.
7. **No token to the client.** The browser never sees the refresh token. The access token already
   reaches the browser, which is unavoidable for the Web Playback SDK, but it must stay short-lived
   and must never be written to storage. `useSpotifyPlaybackSdk` keeps it in a ref only, which is
   correct.
8. **OAuth state.** Single-use enforcement and expiry of the OAuth `state` parameter are now
   finding **B-01** on the hotfix track (`00-index.md` §4), independent of this phase, and must be
   fixed before any further external test session.

### 3.5 Also fix while here

`apps/server/src/http/spotifyRoutes.ts` `buildClosePopupHtml` returns an HTML page with an inline
script that closes the window. Two issues:

- There is no `Content-Security-Policy` on this response, and no CSP anywhere in the app. Add a
  restrictive CSP header for this route at minimum, and consider one for the SPA.
- The response does not vary on success or failure, so a user whose authorisation failed sees "You
  can close this window" with no indication. The socket event carries the error, but if the socket
  dropped, the user gets nothing. Render a short honest message in the popup instead.

### Acceptance

- [ ] Section 5 review signed off and recorded before any of this ships.
- [ ] Connecting Spotify once, closing the room and creating a new room offers to reuse the
      connected account with the account clearly named; accepting requires no OAuth round trip.
- [ ] "Disconnect Spotify" removes the credential and is reachable from settings outside a room.
- [ ] Tests: encryption round-trip; wrong key fails closed; expired credential is not returned; idle
      expiry; sweep deletes expired records; scope change invalidates.
- [ ] Test: no token material appears in any log or audit payload.
- [ ] Test: an OAuth `state` value cannot be replayed (B-01).
- [ ] `docs/operations/axiom_logging_setup.md` and the deployment docs updated with the new env var.

## 4. Phase 4 — Playback diagnostics · **S3**

`apps/web/src/pages/GamePage/hooks/useSpotifyPlaybackSdk.ts` has **14** `console.error` /
`console.info` / `console.warn` calls (F-22). They are the only visibility into playback failures,
which means the console is currently load-bearing — and it is also why `10-bundle-and-startup.md`
§7.3 defers dropping console output in production builds.

The same file is **746 lines** and violates the 700-line hard limit (owner decision 3). Its split is
finding **F-26**, owned by Phase 6 of the review programme; do the split first or together with this
phase, never add the diagnostics channel into the unsplit file.

Replace the console calls with a small structured channel:

- A `playbackDiagnostics` module collecting the last 50 events
  (`{ at, kind, code, message, deviceId, uri }`) in a ring buffer.
- Rendered in the game menu's dev tab, behind the existing dev-visibility preferences, so a host
  can read what happened without a laptop and DevTools.
- Forwarded to the server as an audit event for the failure cases only (`autoplay_failed`,
  `device_not_found` after retries, `authentication_error`), reusing `logAuditEvent`'s
  `spotify_auth` audit kind. Cap the rate so a failing device cannot spam the sink. No token
  material and no display names in the payload.
- Keep `console` output in development only.

This also gives the test scenario in `docs/operations/axiom_logging_setup.md` real playback
telemetry, which it currently lacks.

### Acceptance

- [ ] No bare `console.*` call remains in the playback hooks.
- [ ] The dev tab shows the diagnostic ring buffer.
- [ ] Playback failures appear as audit events, rate-limited, with no token material.
- [ ] `10-bundle-and-startup.md` §7.3 can now safely enable `drop: ["console"]` in production
      builds.
- [ ] `useSpotifyPlaybackSdk.ts` is below 700 lines (F-26) and has a test (T-06).

## 5. Compliance review checklist for Phase 3

To be completed and recorded before implementation. This is new processing of personal data, not a
refactor.

| Item                                      | Question to answer                                                                                                                                                                                                                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**                               | Why is the refresh token retained, and is retention necessary to achieve it? (Convenience is a legitimate purpose; it must be stated.)                                                                                                                                                                         |
| **Lawful basis**                          | Consent, obtained at the point of connecting Spotify. Is the consent request specific, informed and separable from other terms?                                                                                                                                                                                |
| **Data minimisation (GDPR Art. 5(1)(c))** | Is the refresh token the minimum needed? Confirm no profile data, email or display name from Spotify is stored — `SpotifyAccountsClient.buildAuthUrl` requests the `user-read-email` and `user-read-private` scopes today; confirm what is retained and drop anything not required for the account-type check. |
| **Storage limitation (Art. 5(1)(e))**     | Is 30-day absolute / 14-day idle retention justified, and documented?                                                                                                                                                                                                                                          |
| **Security of processing (Art. 32)**      | Encryption at rest, key management (where does `SPOTIFY_TOKEN_ENCRYPTION_KEY` live per environment, and how is it rotated?), access control, no logging of secrets.                                                                                                                                            |
| **Right to erasure (Art. 17)**            | Is "disconnect Spotify" a complete erasure, and is it discoverable?                                                                                                                                                                                                                                            |
| **Transparency (Arts. 13-14)**            | Does any user-facing text state that the Spotify connection is remembered, for how long, and how to revoke it? Currently there is no privacy notice in the app at all — that gap should be recorded.                                                                                                           |
| **Processor relationship**                | Spotify is a third party receiving user requests on our behalf. Confirm the app's use is within Spotify's developer terms, particularly around storing credentials and around caching track metadata.                                                                                                          |
| **NIS2 relevance**                        | Assess whether the deployment falls in scope. A family party game very likely does not, but if this is ever offered to a public-sector client the assessment must exist rather than be assumed.                                                                                                                |
| **Scope for public-sector use**           | If TuneTrack is ever demonstrated or delivered in a public-sector context, a third-party cloud music service and persisted third-party credentials both require explicit prior approval. Note this constraint even though it is out of scope today.                                                            |

Record the outcome in `docs/decision_log.md` with the date and who approved it.

**Owner decision 9 (B-18):** personal data in operational logs and audit events stays as is for the
current trusted-party deployment and is revisited before any public or client-facing deployment.
Dropping the unused `user-read-email` scope remains recommended as a no-cost minimisation,
independent of this review; Phase 5 of the review programme proposes it.

## 6. Risk register

| Risk                                                                       | Mitigation                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Persisting credentials expands the breach impact of a server compromise    | Encryption at rest with an env-held key, HMAC-derived storage keys, bounded retention, and no token material in logs. Accepted only if section 5 is signed off (and decision 10 is revisited). |
| A persistent store is added later and inherits weak assumptions            | The `SpotifyCredentialStore` interface fixes the contract now, including `deleteExpired`, so the persistent implementation must honour retention.                                              |
| Media Session metadata leaks the answer                                    | Explicitly exclude release year; assert it in a test.                                                                                                                                          |
| The diagnostics channel is added to the 746-line hook and grows it further | Split first (F-26); the ring buffer is its own module; the hook only emits events.                                                                                                             |
