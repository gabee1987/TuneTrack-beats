# 08 — Spotify Session Persistence and Deterministic Playback

> Addresses findings **F-36 – F-39**.
> Owning layers: `apps/server/src/spotify`, `apps/server/src/http/spotifyRoutes.ts`,
> `apps/web/src/pages/GamePage/hooks` (playback), `packages/shared/src/spotify`.
>
> **Compliance gate:** section 4 changes what personal data the service stores and for how
> long. It must not reach a production or client-facing deployment before the review in
> section 6 is signed off. Sections 2, 3 and 5 have no such gate and can proceed
> independently.

## 1. The four problems

| # | Symptom (as reported) | Root cause | Finding |
| --- | --- | --- | --- |
| 1 | "If I login with Spotify premium I want to keep that login session for a while" | Host tokens are keyed by `RoomId` in an in-memory `Map` and deleted on room close | F-36 |
| 2 | "Sometimes it starts mid song" | `PUT /me/player/play` is sent without `position_ms` | F-37 |
| 3 | "If the song finishes while the card is still in placement state, I cannot restart the song" | `resume()` returns early on `hasActiveContext`, which is never cleared, so the re-issue fallback is unreachable | F-38 |
| 4 | "Sometimes I have to manually start the song" | Autoplay is blocked, the retry ladder gives up silently, and no state tells the UI a gesture is needed | F-39 |

Problems 2-4 are independent of problem 1 and are much cheaper. Do them first.

## 2. Phase 1 — Deterministic playback start · **S2**

**Finding:** F-37.

### 2.1 Pin the start position server-side

`apps/server/src/spotify/SpotifyApiClient.playTracksOnDevice` sends
`body: JSON.stringify({ uris: spotifyTrackUris })`. Add an explicit start position:

    body: JSON.stringify({
      uris: spotifyTrackUris,
      position_ms: 0,
    })

Spotify's documented default for a `uris` play request is position 0, but the observed
behaviour when the target URI is already the device's current track — paused part-way
through — is a resume rather than a restart. Sending `position_ms: 0` removes the ambiguity
at zero cost.

Take the position as an optional parameter (`startPositionMs = 0`) rather than hardcoding
it, because the restart path in Phase 2 and a possible future "start at the chorus" feature
both want it.

### 2.2 Do not treat "already playing" as a successful start

`apps/web/src/pages/GamePage/hooks/useSpotifyPlaybackSdk.waitForPlayingUri` begins:

    const alreadyPlaying =
      currentTrackUriRef.current === spotifyTrackUri && isPlayingRef.current;
    if (alreadyPlaying) {
      return Promise.resolve(true);
    }

This shortcut is correct for a *duplicate* play request for the current card but wrong for
an *intentional restart*. Add an explicit `expectRestart` flag:

- `playTrack(uri)` (new card) keeps the shortcut.
- `restart()` (Phase 2) passes `expectRestart: true`, which skips the shortcut and waits for
  a `player_state_changed` with `position` below a small threshold.

### Acceptance

- [ ] `apps/server/tests/spotify/SpotifyApiClient.test.ts` extended: the play request body
      contains `position_ms: 0` by default and the supplied value when given.
- [ ] Manual device check: a card that has already been heard once in the session starts
      from the beginning when drawn again.
- [ ] A component test with a stubbed SDK asserts `restart` does not take the
      already-playing shortcut.

## 3. Phase 2 — Full transport control at any point in a turn · **S1**

**Findings:** F-38, F-39. This is the most user-visible playback fix.

### 3.1 Extend the playback contract

`HostPlaybackState` in `apps/web/src/pages/GamePage/hooks/useHostPlayback.ts` currently
exposes `isReady`, `isPlaying`, `position`, `duration`, `unlockPlayback`, `pause`,
`resume`, `seek`. Add:

    restart: () => void;              // always re-issues the current URI from 0
    needsUserGesture: boolean;        // autoplay was blocked; UI must offer a tap
    hasEnded: boolean;                // the track finished and there is nothing to resume
    trackUri: string | null;          // what the transport is currently bound to

Also update `HostPlaybackProvider`'s `disabledPlayback` and `useHostPlayback`'s `disabled`
constants, which are two separate copies of the same shape — collapse them into one
exported constant while in there.

Per Doc 03 section 5, split the context so `position`/`isPlaying`/`duration` live in a
progress context and the rest in a stable controls context.

### 3.2 Track end-of-context explicitly

The core defect: `hasActiveContext` is set `true` on the first `player_state_changed` and
never cleared while the player stays connected, so `resume()`'s early return blocks the
re-issue path forever after the first play.

In `useSpotifyPlaybackSdk`'s `player_state_changed` handler, derive an ended state:

- Spotify reports a finished single-URI context as `paused: true` with `position` at or
  near 0 and an empty `track_window.next_tracks`, or as `paused: true` with
  `position >= duration`. Both shapes occur depending on client version, so check both.
- Set `hasEnded: true` when detected; clear it on any state where `paused === false`, and on
  every new `playTrack`.
- Keep `hasActiveContext` for what it actually means — "the SDK holds a context we could
  resume" — and set it `false` when `hasEnded` becomes true.

### 3.3 Rewrite `resume()`

    function resume() {
      if (!isPremium) { void audioRef.current?.play().catch(() => undefined); return; }

      if (hasEnded || !hasActiveContext) {
        restart();          // re-issue the current URI from position 0
        return;
      }
      sdkResume();
    }

and

    function restart() {
      const uri = currentUriRef.current;
      if (!uri) return;
      void playTrack(uri, { expectRestart: true }).then((ok) => {
        if (ok) lastConfirmedUriRef.current = uri;
      });
    }

The important property: **there is no state in which the host cannot get audio going
again**. Any failure falls through to a re-issue.

### 3.4 Surface `needsUserGesture`

`useSpotifyPlaybackSdk` currently logs `autoplay_failed` and fails the pending
confirmation. Instead:

- set `needsUserGesture: true` on `autoplay_failed`, and on a `playTrack` that exhausts the
  retry ladder;
- clear it on any successful play confirmation and on `activateElement()` succeeding after a
  real gesture;
- when `needsUserGesture` is true, the turn action dock shows an explicit, prominent
  "Tap to play" control instead of leaving the host guessing. This is the missing
  affordance behind reported problem 4.

Also reconsider the retry ladder. `[0, 2500, 6000]` ms then silent give-up is reasonable
for a device-visibility race but wrong for an autoplay block, which will never succeed
without a gesture. Branch:

- device-not-found / not-yet-visible: keep the ladder, it is the right remedy;
- autoplay blocked: do **not** retry; set `needsUserGesture` immediately.

### 3.5 Free-tier parity

The free-tier path (30-second preview via `HTMLAudioElement`) has the same gaps: no
restart, and the `lastPreviewUrlRef` guard means the same preview URL is never replayed. Add
`restart()` for it too (`audio.currentTime = 0; void audio.play()`), and reset
`lastPreviewUrlRef` on card change rather than comparing URLs, so a repeated preview URL
still plays.

### 3.6 Media Session API

Worth adding while in this area, and cheap: `navigator.mediaSession` with metadata
(title, artist, artwork) and action handlers for `play`, `pause`, `previoustrack`
(mapped to restart) and `seekto`. It gives the host lock-screen and headphone-button
control, which for a party host holding the device is a genuine improvement.

Note: this publishes the current track's title, artist and artwork to the OS media
notification, which is visible on the lock screen. That is the expected behaviour of a music
app and involves no new data leaving the device, but it should be a conscious choice rather
than an accident. Do not include the release year in the metadata — it is the answer to the
game.

### Acceptance

- [ ] Component test with a stubbed SDK: after `hasEnded`, `resume()` calls `playTrack`
      rather than `player.resume()`.
- [ ] Component test: `restart()` works from every state (never played, playing, paused
      mid-track, ended, autoplay-blocked).
- [ ] Component test: `needsUserGesture` becomes true on `autoplay_failed` and the dock
      renders the tap-to-play control.
- [ ] Manual device check on iOS Safari and Android Chrome: let a track finish during a
      placement, then press play — audio restarts.
- [ ] Manual: free-tier host can replay the same preview twice.
- [ ] Lock-screen controls work on both platforms and do not expose the release year.

## 4. Phase 3 — Persistent Spotify authorisation · **S2, gated**

**Finding:** F-36. **Do not implement before the section 6 review is signed off.**

### 4.1 Current design

`apps/server/src/spotify/SpotifyTokenStore.ts` keys `hostTokensByRoomId` by `RoomId`:

    private readonly hostTokensByRoomId = new Map<RoomId, HostTokenRecord>();

and `RoomService.closeRoom` calls `clearHostTokens(roomId)`. The map is also lost on every
server restart and on every redeploy. So the host re-authorises for every room, and often
mid-session.

### 4.2 Target design

Key the credential by **device session**, not by room, and give it an explicit lifetime.

    interface SpotifyCredential {
      subjectKey: string;          // HMAC of the player session id — see 4.4
      refreshTokenCiphertext: string;
      accountType: SpotifyAccountType;
      scope: string;               // recorded so a scope change forces re-consent
      createdAtMs: number;
      lastUsedAtMs: number;
      expiresAtMs: number;         // absolute retention deadline
    }

- **Access tokens stay in memory only**, keyed by room as they are now. They live an hour
  and there is no reason to persist them.
- **Refresh tokens** are the only thing that persists, because they are what removes the
  re-login.
- A room's Spotify state becomes a *binding* from `roomId` to `subjectKey`, created when a
  host connects Spotify and dropped when the room closes. Closing a room removes the
  binding, not the credential.
- On room creation, if the creating session already holds a valid credential, the server
  offers "continue with your connected Spotify account" instead of an OAuth round trip.
  Offer it — do not silently reuse it. The host should see which account is about to be
  used, and be able to choose a different one.

### 4.3 Storage

The MVP has no database (`CLAUDE.md`: in-memory storage, future Redis/PostgreSQL). Two
options:

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Encrypted client-side credential** — the server returns the encrypted refresh token to the browser, which stores it and presents it on reconnect | No server-side persistence at all; no new infrastructure; survives server restarts | The ciphertext lives in `localStorage`, so it is exposed to any XSS in the app; needs a server-held key so the client cannot read it |
| **B. Server-side store behind an interface** — `SpotifyCredentialStore` with an in-memory implementation now and Redis later | Token never reaches the browser; straightforward revocation; auditable | Lost on restart until a real backing store exists, so it only partly solves the problem |

**Recommendation: B, with a documented follow-up to add a persistent backing store.**
Rationale: option A places a long-lived credential for a third-party account inside browser
storage, where the app's own XSS surface becomes a Spotify account-compromise surface. That
is the wrong trade for a convenience feature, and it is difficult to argue as
"appropriate technical measures" under GDPR Art. 32. Option B solves the room-to-room
re-login immediately (the common complaint) and the restart case follows when persistence
is added.

Define the interface now so the swap is a wiring change:

    export interface SpotifyCredentialStore {
      get(subjectKey: string): Promise<SpotifyCredential | null>;
      put(credential: SpotifyCredential): Promise<void>;
      touch(subjectKey: string, lastUsedAtMs: number): Promise<void>;
      delete(subjectKey: string): Promise<void>;
      deleteExpired(nowMs: number): Promise<number>;
    }

### 4.4 Security controls

Non-negotiable for this phase:

1. **Encryption at rest.** Refresh tokens are encrypted with AES-256-GCM using a key from
   a new required env var `SPOTIFY_TOKEN_ENCRYPTION_KEY` (32 bytes, base64). Validate it in
   `apps/server/src/app/env.ts` alongside the existing Spotify config, and refuse to boot
   with persistence enabled and no key. A random nonce per record; the auth tag stored with
   the ciphertext.
2. **No raw session id as the storage key.** Store `subjectKey = HMAC-SHA256(sessionId, serverKey)`
   so a dump of the store cannot be correlated back to client-held identifiers.
3. **Bounded retention.** `expiresAtMs = createdAtMs + 30 days`, plus an idle expiry of
   14 days from `lastUsedAtMs`, whichever is sooner. A periodic sweep calls `deleteExpired`.
   Thirty days is a proposal, not a given — the retention period is a decision for the
   review in section 6.
4. **Explicit revocation.** A "disconnect Spotify" control in settings deletes the
   credential server-side and clears the room binding. This must be reachable without
   being in a room. Users must be able to withdraw consent as easily as they gave it.
5. **Scope binding.** Store the granted `scope`. If the app's requested scope set ever
   changes, treat the stored credential as invalid and re-consent.
6. **Never log token material.** Audit `apps/server/src/app/axiomLogSink.ts` and
   `realtimeAuditLogger.ts` to confirm no access token, refresh token or authorisation code
   can reach a log line or an audit payload. Add a test that feeds a token-shaped string
   through the audit path and asserts it is absent from the output.
7. **No token to the client.** The browser never sees the refresh token. The access token
   already reaches the browser, which is unavoidable for the Web Playback SDK, but it must
   stay short-lived and must never be written to storage. Confirm `useSpotifyPlaybackSdk`
   keeps it in a ref only — it currently does (`accessTokenRef`), which is correct.
8. **OAuth state.** Review the `state` parameter handling in `SpotifyAuthService.handleCallback`
   for single-use enforcement and expiry; a replayable `state` is a CSRF weakness on the
   callback. Add a test.

### 4.5 Also fix while here

`apps/server/src/http/spotifyRoutes.ts` `buildClosePopupHtml` returns an HTML page with an
inline `<script>window.close()</script>`. Two issues:

- There is no `Content-Security-Policy` on this response, and no CSP anywhere in the app.
  Add a restrictive CSP header for this route at minimum, and consider one for the SPA.
- The response does not vary on success or failure, so a user whose authorisation failed
  sees "You can close this window" with no indication. The socket event carries the error,
  but if the socket dropped, the user gets nothing. Render a short honest message in the
  popup instead.

### Acceptance

- [ ] Section 6 review signed off and recorded before any of this ships.
- [ ] Connecting Spotify once, closing the room and creating a new room offers to reuse the
      connected account with the account clearly named; accepting requires no OAuth round trip.
- [ ] "Disconnect Spotify" removes the credential and is reachable from settings outside a room.
- [ ] Tests: encryption round-trip; wrong key fails closed; expired credential is not
      returned; idle expiry; sweep deletes expired records; scope change invalidates.
- [ ] Test: no token material appears in any log or audit payload.
- [ ] Test: an OAuth `state` value cannot be replayed.
- [ ] `docs/axiom_logging_setup.md` and the deployment docs updated with the new env var.

## 5. Phase 4 — Playback diagnostics · **S3**

`useSpotifyPlaybackSdk` has 11 `console.error` / `console.info` / `console.warn` calls. They
are the only visibility into playback failures, which means the console is currently
load-bearing — and it is also why Doc 02 section 7.3 defers dropping console output in
production builds.

Replace with a small structured channel:

- A `playbackDiagnostics` module collecting the last 50 events
  (`{ at, kind, code, message, deviceId, uri }`) in a ring buffer.
- Rendered in the game menu's dev tab, behind the existing dev-visibility preferences, so a
  host can read what happened without a laptop and DevTools.
- Forwarded to the server as an audit event for the failure cases only
  (`autoplay_failed`, `device_not_found` after retries, `authentication_error`), reusing
  `logAuditEvent`'s `spotify_auth` audit kind. Cap the rate so a failing device cannot spam
  the sink.
- Keep `console` output in development only.

This also gives the family-test scenario in `docs/axiom_logging_setup.md` real playback
telemetry, which it currently lacks.

### Acceptance

- [ ] No bare `console.*` call remains in the playback hooks.
- [ ] The dev tab shows the diagnostic ring buffer.
- [ ] Playback failures appear as audit events, rate-limited, with no token material.
- [ ] Doc 02 section 7.3 can now safely enable `drop: ["console"]` in production builds.

## 6. Compliance review checklist for Phase 3

To be completed and recorded before implementation. This is new processing of personal
data, not a refactor.

| Item | Question to answer |
| --- | --- |
| **Purpose** | Why is the refresh token retained, and is retention necessary to achieve it? (Convenience is a legitimate purpose; it must be stated.) |
| **Lawful basis** | Consent, obtained at the point of connecting Spotify. Is the consent request specific, informed and separable from other terms? |
| **Data minimisation (GDPR Art. 5(1)(c))** | Is the refresh token the minimum needed? Confirm no profile data, email or display name from Spotify is stored — `SpotifyAuthService` reads `user-read-email` and `user-read-private` scopes today; confirm what it retains and drop anything not required for the account-type check. |
| **Storage limitation (Art. 5(1)(e))** | Is 30-day absolute / 14-day idle retention justified, and documented? |
| **Security of processing (Art. 32)** | Encryption at rest, key management (where does `SPOTIFY_TOKEN_ENCRYPTION_KEY` live per environment, and how is it rotated?), access control, no logging of secrets. |
| **Right to erasure (Art. 17)** | Is "disconnect Spotify" a complete erasure, and is it discoverable? |
| **Transparency (Arts. 13-14)** | Does any user-facing text state that the Spotify connection is remembered, for how long, and how to revoke it? Currently there is no privacy notice in the app at all — that gap should be recorded. |
| **Processor relationship** | Spotify is a third party receiving user requests on our behalf. Confirm the app's use is within Spotify's developer terms, particularly around storing credentials and around caching track metadata. |
| **NIS2 relevance** | Assess whether the deployment falls in scope. A family party game very likely does not, but if this is ever offered to a public-sector client the assessment must exist rather than be assumed. |
| **Scope for public-sector use** | If TuneTrack is ever demonstrated or delivered in a public-sector context, a third-party cloud music service and persisted third-party credentials both require explicit prior approval. Note this constraint even though it is out of scope today. |

Record the outcome in `docs/decision_log.md` with the date and who approved it.

## 7. Risk register

| Risk | Mitigation |
| --- | --- |
| `position_ms: 0` breaks a resume case that currently works by accident | The restart path is now explicit, so nothing relies on implicit resume; covered by the Phase 2 tests. |
| End-of-track detection is unreliable across Spotify SDK versions | Detect both known shapes; and because `resume()` now falls through to `restart()` on any doubt, a missed detection degrades to a restart rather than to silence. |
| `needsUserGesture` shows a tap-to-play prompt that is not actually needed | Clear the flag on any successful confirmation; the prompt is additive and non-blocking. |
| Persisting credentials expands the breach impact of a server compromise | Encryption at rest with an env-held key, HMAC-derived storage keys, bounded retention, and no token material in logs. Accepted only if section 6 is signed off. |
| A persistent store is added later and inherits weak assumptions | The `SpotifyCredentialStore` interface fixes the contract now, including `deleteExpired`, so the persistent implementation must honour retention. |
| Media Session metadata leaks the answer | Explicitly exclude release year; assert it in a test. |
