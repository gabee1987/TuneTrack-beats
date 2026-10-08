# 05 — Performance and Robustness Plan

> **Created:** 2026-10-07 on branch `fix/stability-hardening` (Phase 5 of `00-index.md` §4).
> **Status (2026-10-08):** every package shipped (A1–A10, B1, B2, C1–C7, D0–D5 and E1 on 2026-10-07, E2 on 2026-10-08). Every finding below
> was re-verified in code on 2026-10-07 (line numbers drift; file and symbol names are the
> stable reference).
> **Authority:** this document sets the **binding numeric budgets** and the **order** of the
> performance and robustness work. The work-breakdown documents `10`–`14` and `16` keep their
> step-by-step detail; where they disagree with this document, this document wins and §9 lists
> the correction. Owner decisions in `00-index.md` §5 are binding here.

## 0. How to use this document

1. Pick the next open work package from §8 (rollout order). Each package fits one agent
   session, names its owning layer, its proving test and the skill to use.
2. Read the referenced section of the work-breakdown document only for step detail.
3. Measure before and after with the commands in §2 whenever the package has a numeric budget.
4. Finish with `verify` and `plan-status`; tick the acceptance line here and in the
   work-breakdown document.

## 1. What changed since the review (2026-10-06 → 2026-10-07)

- Shipped on the hotfix track: B-01, B-02, B-03, B-11 (timer guards and fatal handlers), B-27,
  F-01, D-03. They are not repeated here.
- **Two new findings** surfaced during re-verification and are registered in
  `01-review-findings.md`:
  - **B-30 (P1, hotfix-sized):** `get_playlist_tracks` checks membership only
    (`RoomService.getPlaylistTracks`), so any player can fetch the imported deck with every
    `releaseYear` during a game — the answers leak.
  - **B-31 (P1):** `RoomConnectionService.removePlayerBySessionId` removes a player from the
    room state but never from `gameState`. It runs from the lobby reconnect timer (which does
    not re-check `status` when it fires, so a game started inside the 30 s grace keeps a ghost
    player who can still receive turns) and from `createRoom`/`addPlayerToRoom` when a session
    that is in a running game creates or joins another room.
- **Corrections to the register:** B-16's second half is wrong — a playlist edit returns the
  whole imported deck to the **requesting socket only**, not to every member. F-11 is milder
  than recorded: the 1 s interval exits early unless playing, and the playback context has a
  single consumer. F-21 is latent: the data router's `navigate` is stable, so the extra
  `JoinRoom` happens only under a non-data router (tests).

## 2. Budgets and measurement protocol (binding)

### 2.1 Web bundle (baseline measured 2026-10-07 with the script in §2.3)

| Metric                                                   | Baseline                 | Gate (must)                 | Target   |
| -------------------------------------------------------- | ------------------------ | --------------------------- | -------- |
| Eager home path (entry JS + preloads + entry CSS), gzip  | **147.0 kB** (464.0 raw) | **≤ 110 kB**                | ≤ 100 kB |
| Entry chunk `index-*.js`, raw                            | 119.4 kB                 | **≤ 100 kB**                | ≤ 80 kB  |
| `vendor-motion` on the eager path                        | 38.9 kB gzip             | **absent**                  | —        |
| `vendor-zod` chunk emitted                               | yes (12.6 kB gzip)       | **absent**                  | —        |
| Largest CSS chunk, raw (`LobbyRoomSettingsStatus-*.css`) | 68.8 kB                  | **≤ 42 kB** (decision 18)   | —        |
| Eager-path regression without written justification      | —                        | **≤ +2 kB gzip per change** | —        |

Why these numbers: the gate is what the planned work can reach with react-router kept
(decision in `10-bundle-and-startup.md` §7.1). Removing `vendor-motion` (−38.9 kB) and adding
the `LazyMotion` runtime (≈ +5 kB) plus loading one catalogue instead of two (≈ −8 kB) lands at
≈ 105 kB. The former "≤ 200 kB" line in `00-index.md` §4 was already met and is withdrawn; the
former "95 kB" target in plan 10 §2 is not reachable without replacing the router and is now
the stretch goal only. The CSS gate was 20 kB until D4 showed that Vite emits one stylesheet per
JS chunk: below 42 kB a file could only shrink by splitting styles that always load together
(decision 18, 2026-10-07).

### 2.2 Runtime (client)

| Budget                                                                                | Gate                                                                                     | Proof (reproducible)                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| A `state_update` that changes only one player's token count                           | `TimelinePanelItems` 0 renders; `GamePageHeader` ≤ 1; `GamePageActionPanels` ≤ 1         | Component test with a React `Profiler` render counter        |
| Handler identity across a `state_update`                                              | every handler returned by `useGamePageActions` keeps its identity                        | Hook test (`renderHook`, rerender with a new state object)   |
| Layout reads per drag move after drag start                                           | **0** `getBoundingClientRect` / `getComputedStyle` / `querySelectorAll` per pointer move | Spy test in `TimelinePanel.test.tsx` over 20 simulated moves |
| `layout`-animated page containers (`GamePageMobile`, `GamePageDesktop`, `ActionDock`) | **0**                                                                                    | Grep in the guard of WP C4                                   |
| Motion duration for a state transition                                                | **≤ 500 ms** (200–350 ms default); no always-on animation during gameplay                | Motion guard test (WP C7)                                    |
| Application `resize` listeners                                                        | **exactly 1**; height-only changes cause **0** layout-mode commits                       | Store test with a spied `addEventListener`                   |
| Periodic commits from playback with the game menu closed or the tab hidden            | **0**                                                                                    | Fake-timer test on `HostPlaybackProvider`                    |
| Global capture-phase listeners after playback is unlocked                             | **0**                                                                                    | `HostPlaybackProvider.gesture.test.tsx`                      |
| Connection loss visible on every route                                                | banner or chip within **1 s** of `disconnect`                                            | Hook test + E2E (WP B2)                                      |

Device traces (plan 11 §1 scenarios S1–S5 on a mid-range Android and an iPhone) remain the
supporting evidence and are recorded in `runtime-baseline.md`, but the jsdom tests above are
the gate because they run in `npm test` and cannot silently regress.

### 2.3 Measurement commands

- **Bundle:** `npm run build -w @tunetrack/web && npm run measure:bundle -w @tunetrack/web`.
  WP D0 commits `apps/web/scripts/measure-bundle.mjs` (Node built-ins only: `fs`, `zlib`; reads
  `dist/index.html`, sums the entry script, every `modulepreload` and the entry stylesheet at
  gzip level 9, lists the twelve largest lazy chunks, the largest CSS chunk and whether
  `vendor-zod` exists). This replaces the visualizer dependency proposed in plan 10 §9 and in
  the `perf-check` skill: no new dependency, same numbers on every machine. Each package with a
  bundle budget appends one row to `docs/plans/2026-10-project-review/bundle-baseline.md`.
- **Runtime:** the tests named in §2.2 (`npm test`); device traces per plan 11 §1.
- **Server:** `npm exec -w @tunetrack/server -- vitest run <file>` for the proving tests in §4;
  bytes per `state_update` for the network gate in §4.9 are logged by a test helper, never by
  production code.

### 2.4 Server

| Budget                                                               | Gate                                                                                                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Spotify work before authorisation                                    | **none** — every Spotify-calling event checks membership and host first                                                         |
| Socket event rate per socket (token bucket, §4.6)                    | gameplay 10 / 5 s · search and discovery 5 / 10 s · token refresh 6 / 60 s (was 3; B24) · directory 10 / 10 s · other 20 / 10 s |
| OAuth callback rate per client address (in memory, never logged)     | 10 / 60 s                                                                                                                       |
| Playlist pagination                                                  | ≤ 10 pages × 100 tracks (equals `MAX_CURATED_PLAYLIST_TRACK_COUNT` = 1 000)                                                     |
| Discovery fan-out                                                    | ≤ 3 concurrent playlist fetches; ≤ 3 live candidate sessions per room                                                           |
| Graceful shutdown                                                    | exits within **5 s** of `SIGTERM`, zero pending timers                                                                          |
| Room-directory broadcasts per lobby join                             | **1**                                                                                                                           |
| Full-state broadcast size (6 players × 30 cards, 30 history entries) | measured and recorded (§4.9); narrow events only if above **64 kB**                                                             |

## 3. Adjudication: F-08 versus the slice store (plan 11 §7)

**Decision: fix handler identity and narrow the memo inputs; do not build a normalised client
room store.** Plan 11 §7 is superseded.

Evidence (verified 2026-10-07): all seven handlers in `useGamePageActions` list `roomState` in
their `useCallback` dependencies although the hook already holds `roomStateRef`; the memo
comparators `areHeaderModelsEqual` (`GamePageHeader.tsx`) and `areActionPanelModelsEqual`
(`GamePageActionPanels.tsx`) compare those handlers **and** `roomState` by reference. Every
`state_update` therefore fails both comparators twice over. A slice store would stabilise
`roomState` slices but not the handlers, so on its own it would change nothing; the handler and
model fix alone removes the churn.

What replaces §7 (WP C1):

1. Handlers read `roomStateRef.current` and depend only on stable inputs; `roomState` leaves
   every dependency array.
2. The header and action-panel models carry the scalars they render (`hostId`,
   `ttModeEnabled`, `turnNumber`, `status`, the active player's id and token count) instead of
   `roomState`; `roomState` leaves both comparators. This is the game-page half of F-19; the
   seven leaf components that take `PublicRoomState` as a prop are Phase 6.
3. If the §2.2 render gate still fails after WP C1, the slice store may be reconsidered, with
   the failing render counts as its justification. It is not scheduled.

## 4. Track A — Server robustness and security

### A1 · Authorisation before work (B-30, B-07 ordering, B-20) — **shipped 2026-10-07**

Every deck-reading, deck-editing and music-setup event (`get_playlist_tracks`,
`remove_playlist_tracks`, `update_playlist_track`, `load_curated_playlist`, `import_playlist`,
`search_spotify_music`, `search_spotify_playlists`, `open_spotify_playlist`,
`generate_spotify_candidates`, `use_spotify_candidates`) passes one guard,
`RoomLobbyService.requireHostInLobby`, before any Spotify work: a guest gets its
`ONLY_HOST_…` code, anyone outside the lobby gets `GAME_ALREADY_STARTED`, and refusals reach the
client as server errors. The host check runs before the candidate session is consumed, so no
peek/consume split was needed. Proof: `apps/server/tests/rooms/playlistAuthorization.test.ts`
(22 cases; Spotify service spies record zero calls).

### A2 · Membership correctness (B-31, B-05, B-04) — **shipped 2026-10-07**

`removePlayerBySessionId` now removes the player from `gameState` through
`gameFlowService.removePlayer` and clears the challenge timer outside `challenge`, as
`kickPlayer` does. The lobby reconnect timer re-reads the room through the session membership
and does nothing once the game has started, so the player stays reserved like any in-game
disconnect (the proof asserts that, not removal). `createRoom` and `addPlayerToRoom` check the
target room, its status and the room limit before leaving the current room; a host alone in
their lobby still frees their room for the limit check. Rename retargets host tokens, pending
OAuth states, playback sessions and play chains, candidate sessions and the idempotency acks.
Proof: `apps/server/tests/rooms/kickDuringRound.test.ts` (2 cases),
`apps/server/tests/rooms/RoomLobbyService.test.ts` (4 cases),
`apps/server/tests/rooms/roomRename.test.ts` (5 cases).

### A3 · Engine purity and deck exhaustion (B-12, B-06 / decision 6, B-09) — **shipped 2026-10-07**

Engine transitions no longer mutate their input: `drawNextCard` in the new
`services/deckFlow.ts` returns the card with new deck and discard-pile arrays. `GameState` has a
`discardPile`; every card that leaves play without reaching a timeline (wrong placement, failed
challenge, TT skip, skipped or cancelled turn, removed active player) goes there, and an empty
deck reshuffles it through the injected `shuffleCards` (`GameFlowService` constructor, Fisher–Yates
over `Math.random` by default). A TT skip draws before it discards, so it never returns the
skipped card. When deck and discard pile are both empty the game finishes with the most-cards
winner, ties by the earliest reveal that reached the count (starting cards count first).
`claimChallenge` takes `nowEpochMs` and owns the deadline check (`isChallengeWindowExpired`,
also used by the server's auto-resolve timer); `GameFlowService.skipTurn` owns the host
skip-versus-cancel decision. The lobby indicator stays with `04` WP 2.
Proof: `packages/game-engine/tests/deckExhaustion.test.ts` (8 cases),
`packages/game-engine/tests/transitionPurity.test.ts` (15 transitions deep-equal before and
after, 4 clock and skip cases; in a new file because `gameFlow.test.ts` is on the size
allowlist), `apps/server/tests/rooms/kickDuringRound.test.ts` (host skip of a claimed challenge).

### A4 · Error contract (B-10) — **shipped 2026-10-07**

`packages/shared` exports `SERVER_ERROR_CODES`, `ServerErrorCode`, `isServerErrorCode` and
`DomainError`; the engine throws `GameRuleError` with a `GameRuleErrorCode` union that the
server's `resolveDomainErrorCode` only compiles against while it stays inside
`ServerErrorCode`. `ServerErrorPayload.code` and `ActionAck.code` are `ServerErrorCode`.
`emitServerError` sends the code of a typed error, sends the handler's fallback code for
anything else (a plain `Error` too) and logs those at `error` with the stack. The web
`SERVER_ERROR_KEY_BY_CODE` `satisfies Record<ServerErrorCode, string>`, so a missing or unknown
key fails the typecheck; the 32 codes without an entry now have one (two new catalogue keys for
Spotify playback control). Proof: `apps/server/tests/realtime/createSocketHandler.test.ts`
(`TypeError` and plain `Error` become the fallback and are logged with a stack, engine code
passes through), `apps/web/src/features/i18n/localizedErrors.test.ts` (every code has an `en`
and a `hu` entry).

### A5 · Idempotency scoping (B-14) — **shipped 2026-10-07**

Acks stay grouped per room (deleted with the room, retargeted on rename) and are keyed by
`sessionId:event:requestId`; the session comes from the caller's socket membership, and a lookup
that names a renamed room's previous code follows the redirect. All twelve room actions and
`rename_room` share `realtime/roomActionIdempotency.ts`. `close_room` keeps its per-socket replay:
a close deletes the room and every membership, so no room-scoped entry can outlive it, and the
per-socket replay is already limited to the caller (§9). Proof:
`apps/server/tests/rooms/processedActionAcks.test.ts` (another member's request id, another event,
a non-member, a rename retried on a new socket after reconnect) and `tests/rooms/RoomStore.test.ts`.

### A6 · Abuse limits (B-07) — **shipped 2026-10-07**

`realtime/rateLimit.ts` is a per-socket `socket.use` token bucket per class (§2.4 limits;
`play_spotify_track` and `start_game` count as gameplay, `import_playlist` and
`open_spotify_playlist` as search). A refused packet gets a `RATE_LIMITED` ack when it carries
one and an `Error` event; the first refusal of a breach logs at `warn` and writes a rejected
audit event; the socket stays connected. The OAuth callback has an in-memory fixed-window limit
per client address (`http/callbackRateLimit.ts`, 429 with `Retry-After`); the address is never
logged. The client address depends on the new `TRUST_PROXY_HOPS` setting (default 0; 1 on
Railway, behind a Cloudflare Tunnel or behind Caddy; documented in `docs/operations`).
Playlist pagination stops at 10 pages, discovery fetches at most 3 playlists at a time and a room
keeps at most 3 candidate sessions (oldest evicted). Known limit: the async search and discovery
hooks wait for their own result event, so a refused search keeps its loading state until the next
search; the error toast explains the refusal. Proof: `apps/server/tests/realtime/rateLimit.test.ts`,
`tests/http/callbackRateLimit.test.ts` (including one trusted proxy hop),
`tests/spotify/SpotifyApiClient.test.ts` (page cap) and
`tests/spotify/SpotifyDiscoveryService.test.ts` (at most 3 concurrent fetches, session cap).

### A7 · Transport configuration (B-15) — **shipped 2026-10-07**

`connectionStateRecovery` stays off (the session-id rejoin restores everything, and every update
is a full state); `pingInterval: 20_000`, `pingTimeout: 25_000` with the reason inline. Proof:
`apps/server/tests/app/createSocketServer.test.ts` (heartbeat, 5 MB buffer, recovery off, CORS
validator wiring). A phone in flight mode for 10 s during a game still needs a device check.

### A8 · Graceful shutdown (B-11 remainder) — **shipped 2026-10-07**

`app/shutdown.ts` handles `SIGTERM` and `SIGINT` once: it clears every room timer
(`RoomTimerCoordinator.clearAll()` and `clearAll()` on both managers, reached through
`RoomRegistry.clearAllTimers()`), emits `ServerToClientEvent.ServerShuttingDown` without a
payload, closes Socket.IO and the HTTP server with a 2 s drain bound, logs the `server_stopped`
audit event, drains the Axiom queue (`drainAxiomLogEvents`, which stops when ingest fails) and
exits 0; a 5 s deadline or a failing step exits 1. Timers are cleared first so no grace callback
mutates a room during the drain. `unref()` stays. Clients on long polling may miss the event
because `io.close()` discards their buffer; B2 treats that disconnect as `reconnecting`. Proof:
`apps/server/tests/app/shutdown.test.ts` (one sequence for repeated signals, zero pending timers,
drain bound, deadline and failure exits) and `tests/app/axiomLogSink.test.ts`.

### A9 · Small server costs (B-24, B-26, B-19, B-18 scope) — **shipped 2026-10-07**

**Shipped 2026-10-07.** `DeckService` resolves the deck folder from `import.meta.url`, the
server build copies it to `dist/decks/test-decks`, and the deck is read and validated once
per process (every game gets its own card copies). Directory watchers are the Socket.IO room
`directory:watchers`, kept in step with game-room membership through the adapter's join and
leave events; `broadcastRoomDirectory` sends once per tick. A host token refresh keeps a
rotated `refresh_token`, and concurrent refreshes of a room share one request; the
client-credentials token is shared the same way (`spotify/clientCredentialsToken.ts`, used by
import, discovery and search). The `user-read-email` scope stays (§9).

**Proof:** `tests/decks/DeckService.test.ts` (one load for two games, own card copies, any
cwd), `tests/realtime/roomDirectoryBroadcast.test.ts` (a lobby player moving rooms: one list,
was two), `tests/spotify/SpotifyAuthService.test.ts`.

### A10 · Broadcast size — measure, then decide (B-16) — **shipped 2026-10-07**

**Shipped 2026-10-07.** The largest state (6 players × 30 cards, 30 history entries) is
117 kB raw, history 22.6 kB of it, so moving history out would have left 94 kB. Decision 20:
Socket.IO per-message compression above 4 kB instead; the same state is 13 kB deflated
(`network-baseline.md`). History stays in the update; narrow events stay deferred. A track
edit is answered with `playlist_track_updated` (the edited track) instead of the whole deck;
removals keep the full-list reply, which six client flows use to rebuild their queued sets.

**Proof:** `tests/rooms/stateUpdateSize.test.ts` (gate on the deflated size),
`tests/app/createSocketServer.test.ts` (compression threshold),
`tests/realtime/playlistTrackEdit.test.ts` (one-track reply, no deck),
`PlaylistEditModal.test.tsx` (the reply replaces the optimistic copy).

## 5. Track B — Client connection robustness

### B1 · Device storage and durable session (F-17, plan 13 Phase 2) — **shipped 2026-10-07**

`services/storage/deviceStorage.ts` reads and writes browser storage without ever throwing;
`playerSession.ts`, `playerProfile.ts` and the `main.tsx` theme read use it, and the session id
falls back to one in-memory id per page load when storage is unavailable. The profile is the
only owner of `tunetrack.playerDisplayName`; the game page reads the name from the profile
store. The room-closed handlers no longer delete the session id, and `resetPlayerSession` is
gone because nothing else called it. No `clearRoomSession()` was added: no room-scoped storage
key exists, and the handlers already clear `roomState`, `currentPlayerId` and the socket. The
plan-13 `SCHEMA_VERSION` key prefix was not adopted, because renaming the key would orphan every
existing session. Proof: `services/session/playerSession.test.ts` and
`features/profile/playerProfile.test.ts` (throwing storage), E2E
`apps/e2e/tests/session-identity.spec.ts` (close a room, join another, same session id for host
and guest). The shared E2E helpers moved to `apps/e2e/tests/support/roomPages.ts`.

### B2 · One connection-state model (F-02, F-20, F-21) — **shipped 2026-10-07**

`services/socket/connectionState.ts` is a `useSyncExternalStore` store that `socketClient.ts`
attaches to every socket it creates and detaches on reset. It reads `connect`, `disconnect`,
the manager's `reconnect_attempt`, `ServerShuttingDown` and the browser `online`/`offline`
events, and derives `connecting | connected | reconnecting | offline | server_restarting`
(`offline` means the browser has no network). The socket client uses the plan 13 §5.1 retry
policy without `auth: { sessionId }`, because the server does not read it yet (data
minimisation; it lands with plan 12 §2). `features/rooms/ConnectionStatus` is the chip on Play,
the mobile lobby header and the desktop `LobbyHeader` (it replaces the English-literal badge);
`ConnectionBanner` heads the game toast stack, on the loading screen too. An `offline` result
from any gameplay action shows a localised refusal toast; `rejected` already shows the server
`Error` toast, so it gets no second one. Both room hooks hold `navigate` in a ref. A
`ROOM_NOT_FOUND` after a `ServerShuttingDown` notice opens the closed-room dialog in a "server
restarted" variant (plan 13 §1.4 in part; a crash without the notice still needs
`instanceId`). `GamePageReconnectToast` and `usePlayerReconnectToast` are not reused; their
deletion is part of the owner's W1 removal. Proof: `services/socket/connectionState.test.ts`
(every transition), `features/rooms/ConnectionStatus.test.tsx`,
`pages/GamePage/hooks/useGamePageActions.offline.test.tsx`,
`pages/GamePage/hooks/useGameRoomConnection.test.ts` (one `JoinRoom` across `navigate`
changes, fails with the old dependency list; restart reason), E2E
`apps/e2e/tests/connection-status.spec.ts` (offline banner within 1 s, refused move, banner
clears and the move goes through after reconnect).

## 6. Track C — Render churn and runtime cost

| WP  | Finding(s) | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Proof                                                                                                                                                                                  |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | F-08, F-19 | **Shipped 2026-10-07.** Every handler reads `roomStateRef` (and `selectedSlotIndex` through a ref); the header and action-panel models carry scalars (`roomId`, `hostId`, `status`, `turnNumber`, `ttModeEnabled`, challenge phase and deadline, winner and skip-candidate names), and `TurnActionDock`, `ChallengeActionPanel`, `RevealActionDock`, `FinishedStatePanel` and `HeaderLeadersStrip` take those scalars instead of `PublicRoomState` (§9).                                                                                                                                                                                                                                                     | `GamePage.renderBudget.test.tsx` (another player's token change: header 1, action panels 0, timeline items 0; was 1, 1, 3), `useGamePageActions.identity.test.tsx`                     |
| C2  | F-09       | **Shipped 2026-10-07.** `itemsModel` and `dragModel` are memoised (no post-hoc mutation); the card-info, preview-ref and mine-button callbacks are stable and passed through unwrapped; the always-empty disabled-slot list is one shared array; each `state_update` keeps the previous reference for every unchanged subtree (`pages/GamePage/reuseUnchangedReferences.ts`, §9). dnd-kit's sortable context still re-renders every item on a reorder; that is outside the props.                                                                                                                                                                                                                            | `TimelinePanel.test.tsx` (a slot move gives unmoved cards equal props; the old inline callback re-rendered each 3 times), `reuseUnchangedReferences.test.ts`                           |
| C3  | F-12       | **Shipped 2026-10-07.** `hooks/timelineDragGeometry.ts` measures layout mode, slot rects and the container once at drag start; a pointer move reads nothing. Slots are equal-sized, so card `i` sits in slot `i` or `i + 1` and the rects survive a reorder; a capture `scroll` listener shifts them (container `scrollLeft`/`scrollTop`, or one container rect read for an ancestor). Edge scrolling is dnd-kit's auto-scroll only, at ≤ 200 px/s (`TIMELINE_AUTO_SCROLL`), with scroll snap off while dragging (`20` B22); the order lives in a ref; the preview rect is not re-measured mid-drag; `useTimelineOverflowState` keeps one `ResizeObserver` and re-measures only when the item count changes. | `TimelinePanel.test.tsx` (20 moves across three reorders: 0 reads; the old hook made 40), `timelineDragGeometry.test.ts`                                                               |
| C4  | F-13       | **Shipped 2026-10-07.** Bare `layout` removed from `GamePageMobile`, `GamePageDesktop` and `ActionDock` (the page containers are plain elements). Remaining sites: `TurnActionDock`, `TimelinePanelHeader`, `AppShellMenuSheet` and `LobbyHostTtSettings` (§9).                                                                                                                                                                                                                                                                                                                                                                                                                                              | `test/guards/layoutAnimationSites.test.ts` (no bare `layout`; site set equals the allowlist), `ActionDock.test.tsx`                                                                    |
| C5  | F-10       | **Shipped 2026-10-07.** `features/viewport/viewportStore.ts`: one window `resize` plus `visualViewport` `resize`/`scroll` and two media-query listeners, attached while anything subscribes, rAF-coalesced; layout consumers are notified only when the layout mode or the mobile-controls match changes; `--app-height` is written from `visualViewport.height` only when it changed. `usePageLayoutMode` and `useMobileControlPortalTarget` read it through `useSyncExternalStore`; `HintBubble` and `AppShellMenuSheet` use its per-frame resize subscription; `main.tsx` calls `startAppHeightSync()`.                                                                                                   | `features/viewport/viewportStore.test.ts` (one listener for seven subscribers; height-only changes: 0 notifications; a burst: one flush), `pageLayoutMode.test.ts` unchanged           |
| C6  | F-11       | **Shipped 2026-10-07.** Controls and progress are two memoised contexts; the SDK and Free mode publish position snapshots (`positionUpdatedAtMs`) on player events instead of a 1 s interval or `timeupdate`; `useInterpolatedPlaybackPosition`, called only by `PlaybackTabContent`, ticks while playing and visible. The capture `pointerdown` listener is removed after a gesture on a ready player and re-armed on `autoplay_failed` or a new player (§9).                                                                                                                                                                                                                                               | `HostPlaybackProvider.progress.test.tsx` (10 s of playback: 0 commits; the old interval committed), `HostPlaybackProvider.gesture.test.tsx`, `useInterpolatedPlaybackPosition.test.ts` |

## 7. Track D — Startup, motion and layering

| WP  | Finding(s)       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Proof                                                                                                                                                                                                                                                                  |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D0  | —                | **Shipped 2026-10-07.** `apps/web/scripts/measure-bundle.mjs` (Node built-ins only), `npm run measure:bundle -w @tunetrack/web`, and `bundle-baseline.md` with the review baseline and a re-measured row (147.5 kB gzip; the +0.5 kB is the B2 and A6 strings).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Script output matches §2.1                                                                                                                                                                                                                                             |
| D1  | F-14             | **Shipped 2026-10-07.** Every component renders `m.*`; `MotionFeatureProvider` (app root, `LazyMotion strict`) loads `domAnimation` as its own chunk after first paint; `MotionLayoutFeatures` adds `domMax` synchronously in the Game and Lobby routes (`layout`, `layoutId`, `drag`); `vite.config.ts` lets Rollup place framer modules, because a manual chunk pulls everything the barrel re-exports back in. Tests render `motion` for `m` (`test/stubs/framerMotion.tsx`).                                                                                                                                                                                                                                                                                                                                                                   | `MotionFeatureProvider.test.tsx` (real framer: initial state first, animates after load; `motion` inside throws), `lazyMotionSites.test.ts`; eager 148.1 → 114.9 kB gzip                                                                                               |
| D2  | F-14             | **Shipped 2026-10-07.** `packages/shared` has `sideEffects: false` and a `./client` entry without `events/schemas` (`index.ts` is client plus schemas); 120 web files import `@tunetrack/shared/client`; `no-restricted-imports` forbids `zod` and the barrel under `apps/web`; the `vendor-zod` branch is removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `measure:bundle` (`vendor-zod` not emitted); `eslint --stdin` on a probe file rejects both imports                                                                                                                                                                     |
| D3  | F-14             | **Shipped 2026-10-07.** `languages/index.ts` holds static metadata and one loader per catalogue with a module cache; `main.tsx` renders `AppRouteFallback`, loads the active catalogue through `loadLazyRoute`, then mounts the app; `I18nProvider` renders only a loaded catalogue and keeps the previous one on screen during a switch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `I18nProvider.test.tsx`, `parseLanguageResource.test.ts`, `i18nKeyParity.test.ts` (metadata equals catalogue); entry 142.5 → 51.1 kB raw, eager 90.8 kB gzip                                                                                                           |
| D4  | F-14             | **Shipped 2026-10-07.** The six CSS barrels are deleted; each component imports the sheets it uses (no class was shadowed between sheets). The playlist editor is a lazy chunk, mounted on first open and preloaded once a playlist is imported. Largest CSS 68.8 → 40.3 kB (`TimelinePanel`: timeline and action panels, which always load together); gate ≤ 42 kB (decision 18).                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `noCssBarrels.test.ts` (empty allowlist), `measure:bundle`                                                                                                                                                                                                             |
| D5  | F-14, F-25       | **Shipped 2026-10-07.** `build.target: "es2020"`; `vendor-zustand` chunk; Workbox `cleanupOutdatedCaches`, `navigateFallback` with `/api/` and `/socket.io/` denied, `NetworkOnly` for both, `CacheFirst` (32 entries) for same-origin images only. No rule for Spotify artwork (third-party media).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Generated `dist/sw.js`; offline shell check is a manual device check                                                                                                                                                                                                   |
| C7  | F-03, F-04, F-15 | **Shipped 2026-10-07, mostly reverted the same day (decision 19).** Kept: reorder 280 ms with the standard ease and a 90 ms throttle, preview slot width 240 ms, the `motionBudget` guard (its allowlist now holds the owner's longer animations). Restored: height disclosures, playlist row springs, wrong-placement loop, challenge, celebration and token-flyout timings, Lobby dot pulse and Premium sheen. The placement popup was redesigned (`TimelineCelebration`, `placementCelebrationTransition.ts`).                                                                                                                                                                                                                                                                                                                                  | `motionBudget.test.ts`, `TimelineCelebration.test.tsx`, `layoutAnimationSites.test.ts`                                                                                                                                                                                 |
| E1  | F-05             | **Shipped 2026-10-07.** `zIndexPrimitives` and `globals.css` carry the plan 14 §2.1 scale (13 layers); 18 literals migrated, three differently from plan 14 §2.2 (§9).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `zIndexScale.test.ts` (every module; `globals.css` equals the primitives)                                                                                                                                                                                              |
| E2  | F-06             | **Shipped 2026-10-08** (decision 21; E2a and E2b). `features/overlay`: `Overlay` keeps each caller's props and context; one stack owns the layer (`dialog`, `sheet` or `blocking`; later entries nested, blocking always on top), Escape and scrim for the top entry only, focus into the panel and back to the trigger, the Tab trap, a scroll guard (touch and wheel gestures outside the top panel are refused; the root overflow is never changed), exiting overlays take no input, and one same-path history entry per overlay, shown only once the entry exists. `LayerPortal` lifts the non-modal layers (mobile action dock, challenge callout, token flyouts, fly-to-timeline card, hints). Every dialog and sheet runs on it, including settings, Music Setup, the playlist and track editors, `RoomResetModal` and `AppLoadingOverlay`. | `features/overlay/Overlay.test.tsx`, `overlayStack.test.ts`, `SongInfoModal.test.tsx`, `AdaptiveSelectSheet.test.tsx`, `AppShellMenu.test.tsx`, `PlaylistEditModal.test.tsx`, `RoomResetModal.test.tsx`, `test/guards/overlaySites.test.ts` (ratchet), E2E E13 and E14 |

`backdrop-filter` (12 declarations in 5 files) is measured in trace S2 during C7; reduce or
drop it on coarse pointers only if the trace shows paint cost.

## 8. Rollout order

One package = one agent session. Packages in the same row can run in parallel sessions only if
their files do not overlap.

| Order | Packages                                            | Depends on                        | Skills                                  | Why this order                                    |
| ----- | --------------------------------------------------- | --------------------------------- | --------------------------------------- | ------------------------------------------------- |
| 1     | **A1** (shipped 2026-10-07)                         | —                                 | `write-tests`, `verify`                 | Answer leak and unauthenticated third-party calls |
| 2     | **A2** (shipped 2026-10-07)                         | —                                 | `write-tests`                           | Ghost players, silent lobby loss, rename breakage |
| 3     | **A3** (shipped 2026-10-07)                         | `04` WP 2 (deck contract) or none | `write-tests`                           | Game soft-lock; decision 6                        |
| 4     | **A4**, **B1** (shipped 2026-10-07)                 | —                                 | `add-socket-action` (A4), `write-tests` | Error contract feeds B2's toasts                  |
| 5     | **A8**, **B2** (shipped 2026-10-07)                 | A4                                | `add-socket-action`, `e2e-scenario`     | Honest connection state end to end                |
| 6     | **A5**, **A6**, **A7** (shipped 2026-10-07)         | A1                                | `write-tests`                           | Abuse limits and transport                        |
| 7     | **D0**, **C1**, **C2** (shipped 2026-10-07)         | —                                 | `perf-check`                            | Largest runtime win, measurable                   |
| 8     | **C3**–**C6** (shipped 2026-10-07)                  | C1                                | `perf-check`                            | Drag, viewport, playback                          |
| 9     | **D1**–**D3** (shipped 2026-10-07)                  | D0                                | `perf-check`                            | Eager gate                                        |
| 10    | **C7**, **D4**, **D5**, **E1** (shipped 2026-10-07) | D1 (C7)                           | `design-token-migration`, `perf-check`  | Motion and CSS budgets                            |
| 11    | **A9**, **A10** (shipped 2026-10-07)                | A2                                | `write-tests`                           | Small server costs, measured broadcast decision   |
| 12    | **E2a**, **E2b** (shipped 2026-10-08)               | E1                                | `add-ui-component`                      | Largest UI refactor last                          |

A1–A10, B1, B2, C1–C7, D0–D5 and E1 shipped on 2026-10-07, E2 on 2026-10-08; every package in this plan has shipped.

## 9. Corrections to the work-breakdown documents

| Doc and section               | Was                                                                                                   | Now (this document)                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00-index.md` §4, Phase 5 row | eager gzip ≤ 200 kB                                                                                   | ≤ 110 kB gate, ≤ 100 kB target (§2.1)                                                                                                                                                                   |
| `10` §2                       | working targets (95 kB home path)                                                                     | §2.1 is binding; 95 kB is a stretch goal requiring a router change                                                                                                                                      |
| `10` §3                       | 68 `motion.*` sites, six layout sites                                                                 | 47 importing files; after C4 three layout sites remain (§6 C4)                                                                                                                                          |
| `10` §9                       | `vite-bundle-visualizer` dev dependency                                                               | `measure-bundle.mjs`, no dependency (§2.3)                                                                                                                                                              |
| `11` §6                       | bounded gesture set for playback arming                                                               | remove the listener after unlock, re-arm on failure (C6)                                                                                                                                                |
| `11` §7                       | normalised slice store                                                                                | superseded by §3 / C1                                                                                                                                                                                   |
| `12` §2.1                     | enable `connectionStateRecovery`                                                                      | not enabled (A7)                                                                                                                                                                                        |
| `12` §2.4                     | limiter inside `createSocketHandler`, needs B-21 first                                                | `socket.use` middleware, no B-21 dependency (A6)                                                                                                                                                        |
| `05` §3                       | the handler and model fix alone removes the churn                                                     | also needs structural sharing of each `state_update` (C2); still no slice store                                                                                                                         |
| `06` W4 (F-19 leaf props)     | all seven leaves narrowed in Phase 6                                                                  | five narrowed in C1; `GameMenuPlayerItem`, `PlaybackTabContent` remain in W4                                                                                                                            |
| `05` A5                       | `close_room` moves onto the shared ack store                                                          | keeps its per-socket replay; the room is gone after a close                                                                                                                                             |
| `12` §3.2                     | remove `unref()`, add `keepProcessAlive` option                                                       | keep `unref()`, add `clearAll()` (A8)                                                                                                                                                                   |
| `05` C4                       | three layout sites remain                                                                             | four: `LobbyHostTtSettings` (`layout="position"`) stays until C7 reworks it                                                                                                                             |
| `11` §5                       | interval gated by a subscriber count, 500 ms tick                                                     | no provider interval; the playback tab interpolates snapshots at 1 s (C6)                                                                                                                               |
| `10` §3                       | `domMax` inside the Game route and `AppShellMenuSheet`                                                | Game and Lobby routes (`MotionLayoutFeatures`): the Lobby's three swipe rows use `drag`; the menu sheet has no layout prop (D1)                                                                         |
| `10` §4                       | three subpaths (`contracts`, `schemas`, `spotify`), 112 web imports, `sideEffects` on both packages   | one `./client` entry, 120 web files; `sideEffects` on `shared` only, the web does not import the engine (D2)                                                                                            |
| `10` §5                       | the provider loads the catalogue behind the skeleton                                                  | `main.tsx` loads it through `loadLazyRoute` behind `AppRouteFallback`, then mounts the app (D3)                                                                                                         |
| `13` §5.2                     | `ConnectionBanner` waits for the overlay host                                                         | render now from the store, move onto the host later (B2)                                                                                                                                                |
| `13` §6.1                     | playlist edits re-emit the deck "to the host"                                                         | to the requesting socket only; reply with the edited track (A10)                                                                                                                                        |
| `13` §6.2                     | narrow events planned                                                                                 | deferred behind the 64 kB measurement gate (A10)                                                                                                                                                        |
| `14` §2.2 `flyToMineCard`     | `--z-raised`                                                                                          | `--z-celebration`: it is portaled to `body` and flies over the dock (`--z-nav`)                                                                                                                         |
| `14` §2.2 dock flyout (5000)  | `--z-nav`                                                                                             | `--z-celebration`: the token-spend flyout rises above the dock it starts from                                                                                                                           |
| `14` §2.2 `SettingField` info | `--z-sheet-nested`                                                                                    | `--z-dialog-nested`: it opens from settings sheets and dialogs                                                                                                                                          |
| `10` §6 acceptance            | largest CSS ≤ 20 kB                                                                                   | ≤ 42 kB (decision 18): CSS follows JS chunks; the remaining files hold styles that load together                                                                                                        |
| `11` §2                       | rows re-spring on every scroll tick                                                                   | a row's `start` changes only on reorder or removal; the spring ran then, and is removed anyway                                                                                                          |
| `11` §3                       | `DRAG_EDGE_SCROLL_ZONE_PX` 120 → 96                                                                   | gone since C3 (dnd-kit auto-scroll, `TIMELINE_AUTO_SCROLL`)                                                                                                                                             |
| `05` A9 scope                 | drop `user-read-email` (unused)                                                                       | kept: the Web Playback SDK requires it                                                                                                                                                                  |
| `01` B-26                     | directory broadcast twice per lobby join                                                              | twice when a lobby player moves to another room (the old room's state listener plus the handler); a plain join sent once                                                                                |
| `05` A10 gate                 | 64 kB raw; move history out first                                                                     | 64 kB compressed (decision 20); history stays, it is a fifth of the payload                                                                                                                             |
| `13` §6.3                     | playlist edits send the edited track                                                                  | edits do (`playlist_track_updated`); removals keep the full list                                                                                                                                        |
| `14` §4.1 host API            | `open(render)` into a host mounted beside `RouterProvider`                                            | a declarative `Overlay` rendered by the caller (decision 21): the editors, Music Setup, settings and the kick confirm read router and page context a host outside the page could not provide            |
| `14` §4.2 depth               | `overlayDepth: n` in router state                                                                     | the ids of the open overlays (`tunetrackOverlayEntries`); Back closes the overlay whose id left the state                                                                                               |
| `14` §4.3 step 4              | `BottomSheet` keeps its props                                                                         | `BottomSheet` and `AdaptiveSelectSheet` take `isOpen` and `label`, so the overlay plays the exit and owns the history entry                                                                             |
| `14` §4.3 steps 5–7           | each overlay keeps its own same-path entry (`AppShellMenu`, `LobbySpotifySection`, `useLobbySpotify`) | the open state is local and `Overlay` owns the entry; settings runs a footer action through `onClosed`, after the pop                                                                                   |
| `14` §4.3 step 8              | `RoomResetModal` ignores Back                                                                         | Back runs the reset like the button (owner decision 2026-10-08); the button pops the entry first, so the reset's replace navigation leaves no room entry behind Home                                    |
| `14` §4.3 step 9              | `AppLoadingOverlay` on the host                                                                       | blocking `Overlay` outside the router: no history entry, so Back still navigates beneath it                                                                                                             |
| `14` §4.3 step 10             | `ConnectionBanner` built on the host                                                                  | stays a `role="status"` line in the toast stack: it is not modal, and the host would trap focus and lock scrolling                                                                                      |
| `14` §4.1 kind `hint`         | stack kind `hint`                                                                                     | non-modal layers use `LayerPortal` and take no stack entry                                                                                                                                              |
| `14` §4.1 scroll locking      | `overflow: hidden` on the root, iOS `position: fixed` pattern (§7 risk row)                           | a scroll guard on `touchmove` and `wheel` outside the top panel: an unscrollable root made Android Chrome resize its viewport under the opening overlay (flicker, offset taps; owner report 2026-10-08) |
| `14` §4.3 sheet motion        | each sheet keeps its own motion                                                                       | one opaque full-width slide for every side sheet (`createSideSheetMotion`); a fading panel showed the screen underneath through it (decision log 2026-10-08)                                            |
| `14` §4.3 step 7              | `PlaylistEditModal` plus `PlaylistTrackDetailsSheet` as a nested sheet pair                           | both are `PanelView`s inside Music Setup: no sheet stacks on a sheet (decision log 2026-10-08)                                                                                                          |

## 10. Compliance and security notes

- A1 closes a game-integrity leak (B-30) and removes Spotify requests triggered by
  unauthorised sockets, reducing calls to a third-party processor (GDPR Art. 28, Art. 32).
- A6 is an availability control for an internet-facing service (ISO/IEC 27001 Annex A.8.6
  capacity management, A.8.20 network security). It is implemented in-house; no new third-party
  package or service. Client addresses for the OAuth callback limit stay in memory for the
  window only and are never logged or shipped to the audit sink (GDPR Art. 5(1)(c), (e)).
- A9 keeps the `user-read-email` scope: the app never reads the email, but Spotify's Web
  Playback SDK lists it as a required scope, so dropping it would risk host playback (§9).
  The data-minimisation question moves to the compliance review of Spotify as a processor. Display-name logging and payload auditing to Axiom stay as decided and remain
  subject to review before any client-facing deployment.
- A8's `server_stopped` audit event carries no personal data.
- No change in this document broadens the personal data stored, logged or shipped.

## 11. Owner questions (answered 2026-10-07: decisions 14 and 15, both as proposed)

1. **Deck and discard pile both empty** (only possible with a deck shorter than the lobby's
   required size, which warns but does not block). Proposal: the game finishes; the player with
   the most timeline cards wins; on a tie, the player who reached that count first (from
   `history`) wins. Alternative: a shared win, which needs a contract change
   (`winnerPlayerId` is a single id).
2. **Home-screen ambient background** (`AnimatedMenuBackground`, 48–60 s loops). Proposal: keep
   it as the one recorded exception to "no decorative motion" — home screen only,
   `transform`/`opacity` only, paused when the tab is hidden and under reduced motion.

## 12. Findings coverage

| Finding | Package | Finding | Package                                   | Finding | Package                             |
| ------- | ------- | ------- | ----------------------------------------- | ------- | ----------------------------------- |
| B-04    | A2      | B-16    | A10                                       | F-08    | C1                                  |
| B-05    | A2      | B-18    | A9                                        | F-09    | C2                                  |
| B-06    | A3      | B-19    | A9                                        | F-10    | C5                                  |
| B-07    | A1, A6  | B-20    | A1                                        | F-11    | C6                                  |
| B-09    | A3      | B-24    | A9                                        | F-12    | C3                                  |
| B-10    | A4      | B-26    | A9                                        | F-13    | C4                                  |
| B-11    | A8      | B-30    | A1                                        | F-14    | D1–D5                               |
| B-12    | A3      | B-31    | A2                                        | F-15    | C7                                  |
| B-14    | A5, A2  | F-02    | B2                                        | F-17    | B1                                  |
| B-15    | A7      | F-03    | C7                                        | F-20    | B2                                  |
| F-04    | C7      | F-05    | E1                                        | F-21    | B2                                  |
| F-06    | E2      | F-19    | C1 (game-page models; leaf props Phase 6) | F-25    | D5 (service worker; assets Phase 6) |
