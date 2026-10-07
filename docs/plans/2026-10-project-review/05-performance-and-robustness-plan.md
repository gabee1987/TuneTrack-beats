# 05 — Performance and Robustness Plan

> **Created:** 2026-10-07 on branch `fix/stability-hardening` (Phase 5 of `00-index.md` §4).
> **Status:** specification only; no code has changed. Every finding below was re-verified in
> code on 2026-10-07 (line numbers drift; file and symbol names are the stable reference).
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
| Largest CSS chunk, raw (`LobbyRoomSettingsStatus-*.css`) | 68.8 kB                  | **≤ 20 kB**                 | ≤ 12 kB  |
| Eager-path regression without written justification      | —                        | **≤ +2 kB gzip per change** | —        |

Why these numbers: the gate is what the planned work can reach with react-router kept
(decision in `10-bundle-and-startup.md` §7.1). Removing `vendor-motion` (−38.9 kB) and adding
the `LazyMotion` runtime (≈ +5 kB) plus loading one catalogue instead of two (≈ −8 kB) lands at
≈ 105 kB. The former "≤ 200 kB" line in `00-index.md` §4 was already met and is withdrawn; the
former "95 kB" target in plan 10 §2 is not reachable without replacing the router and is now
the stretch goal only.

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

| Budget                                                               | Gate                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Spotify work before authorisation                                    | **none** — every Spotify-calling event checks membership and host first                                            |
| Socket event rate per socket (token bucket, §4.6)                    | gameplay 10 / 5 s · search and discovery 5 / 10 s · token refresh 3 / 60 s · directory 10 / 10 s · other 20 / 10 s |
| OAuth callback rate per client address (in memory, never logged)     | 10 / 60 s                                                                                                          |
| Playlist pagination                                                  | ≤ 10 pages × 100 tracks (equals `MAX_CURATED_PLAYLIST_TRACK_COUNT` = 1 000)                                        |
| Discovery fan-out                                                    | ≤ 3 concurrent playlist fetches; ≤ 3 live candidate sessions per room                                              |
| Graceful shutdown                                                    | exits within **5 s** of `SIGTERM`, zero pending timers                                                             |
| Room-directory broadcasts per lobby join                             | **1**                                                                                                              |
| Full-state broadcast size (6 players × 30 cards, 30 history entries) | measured and recorded (§4.9); narrow events only if above **64 kB**                                                |

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

### A1 · Authorisation before work (B-30, B-07 ordering, B-20) — **do first**

- `getPlaylistTracks`: host only, and only while `status === "lobby"` (the editor is a lobby
  tool; the host is also a player and must not see answers in game). Existing codes:
  `ONLY_HOST_CAN_EDIT_PLAYLIST` for a guest, `GAME_ALREADY_STARTED` outside the lobby.
- `importPlaylist`: `requireHost` before `importFromUrl`; no Spotify request for a non-host or
  non-member.
- `generateSpotifyCandidates` and `useSpotifyCandidates`: host check first; split
  `applyCandidates` into peek and consume so a failed check never deletes the session (B-20).
- **Proof:** `apps/server/tests/rooms/playlistAuthorization.test.ts` (new): guest gets
  `ONLY_HOST_…` for all four events; a mocked `SpotifyApiClient` records **zero** calls; the
  host's candidate session survives a rejected guest call; `get_playlist_tracks` in `playing`
  is refused for the host too.

### A2 · Membership correctness (B-31, B-05, B-04)

- Route `removePlayerBySessionId` through `gameFlowService.removePlayer` whenever `gameState`
  exists and clear the challenge timer unless the phase is `challenge`, exactly as `kickPlayer`
  does; the lobby reconnect timer re-reads `status` and does nothing outside `lobby`.
- `createRoom` / `addPlayerToRoom`: validate target room, status and capacity **before**
  leaving the current room (B-05).
- Rename retargets every room-keyed store: `SpotifyTokenStore`, `SpotifyPlaybackSessionStore`
  (sessions and play chains), discovery candidate sessions, pending OAuth states and the
  idempotency acks (B-04, with B-14's rename half). One `retargetRoom(previous, next)` per
  store, called from the rename path next to the existing `RoomStore` retarget.
- **Proof:** extend `kickDuringRound.test.ts` (ghost-player case: lobby grace expires after
  start, player absent from `gameState.players`); `RoomLobbyService.test.ts` (mistyped code
  leaves the player in the old lobby; full server leaves the player in place); new
  `roomRename.test.ts` (Spotify status, token refresh and a pending OAuth callback still work
  after rename).

### A3 · Engine purity and deck exhaustion (B-12, B-06 / decision 6, B-09)

- `drawNextCard(deck)` returns `{ card, deck }` and never mutates; all four mutating callers
  move to the copy (B-12).
- `GameState` gains `discardPile: GameTrackCard[]`. A wrong placement and a TT skip push the
  card there. When a draw finds the deck empty, the discard pile is shuffled into a new deck
  (decision 6). Shuffling is injected: `GameFlowService` takes a `shuffleCards` function
  (default Fisher–Yates over `Math.random`, tests pass a deterministic one), so the engine stays
  free of environment access.
- If deck **and** discard pile are empty the game finishes deterministically — see owner
  question §11.1 for the tie rule. `CURRENT_CARD_NOT_AVAILABLE` can no longer be reached.
- `nowEpochMs` becomes a parameter of the engine transitions that need a clock; the challenge
  deadline check and the skip-versus-cancel decision in `RoomGameplayService.skipTurn` move
  into the engine (B-09).
- **Proof:** `packages/game-engine/tests/deckExhaustion.test.ts` (new: reshuffle after the
  last card, discarded cards return, timeline cards never do, finish when both are empty);
  `gameFlow.test.ts` asserts the input state is deep-equal before and after every transition.
- Note: the lobby deck-size indicator and Start gating are `04-host-flow-ux-spec.md` WP 2.

### A4 · Error contract (B-10)

- `DomainError(code: ServerErrorCode)` in the engine and server; `ServerErrorCode` is a union
  exported from `packages/shared` and used by the web `SERVER_ERROR_KEY_BY_CODE` map.
- `emitServerError` sends the code of a `DomainError`, the handler's fallback code for anything
  else, and logs unknown errors at `error` with the stack.
- **Proof:** `createSocketHandler.test.ts`: a thrown `TypeError` reaches the client as the
  fallback code and is logged with a stack; a type test fails if a web map key is not a
  `ServerErrorCode`.

### A5 · Idempotency scoping (B-14)

- Key acks by `sessionId:event:requestId`; keep acks across rename (A2); move `close_room` and
  `rename_room` from per-socket `lastSuccessful*` onto the same store.
- **Proof:** `RoomStore.test.ts`: a second member reusing a `requestId` gets a fresh result,
  not the first member's ack; a retry of `rename_room` on a new socket after reconnect replays.

### A6 · Abuse limits (B-07)

- One per-socket token bucket as a **`socket.use` middleware** in `realtime/rateLimit.ts`, so
  it sees every incoming packet including the five async handlers that bypass
  `createSocketHandler` (B-21 is not a prerequisite). Limits per §2.4. On breach: `Error` with
  code `RATE_LIMITED` (both catalogues), `warn` log, audit event, no disconnect.
- OAuth callback: in-memory fixed-window limit per client address in `http/`; the address is
  held only in memory for the window and never logged (GDPR Art. 5(1)(c)).
- Pagination cap and discovery concurrency per §2.4; candidate sessions capped per room
  (oldest evicted).
- No third-party rate-limit package; the limiter is ~60 lines of in-house code.
- **Proof:** `tests/realtime/rateLimit.test.ts` (under limit, breach, refill, per-socket and
  per-class buckets, no disconnect); `SpotifyApiClient.test.ts` (pagination stops at 10 pages);
  discovery test with a counting fetch stub (≤ 3 concurrent).

### A7 · Transport configuration (B-15)

- **Decision: do not enable `connectionStateRecovery`.** The session-id rejoin already restores
  room, identity and full state after any interruption (E7, E8). Recovery would add a second
  reconnect path, packet replay and deferred membership removal for no user-visible gain while
  every update is a full state. Revisit only if narrow events (§4.9) are ever introduced.
- Heartbeat `pingInterval: 20_000`, `pingTimeout: 25_000` with a one-line "why" comment.
- **Proof:** new `tests/app/createSocketServer.test.ts` asserts the options, buffer size and
  CORS wiring, and that recovery is off.

### A8 · Graceful shutdown (B-11 remainder)

- `app/shutdown.ts`: `SIGTERM`/`SIGINT`, idempotent; stop accepting connections; emit the new
  `ServerShuttingDown` event; `io.close()` with a 2 s drain; `RoomTimerCoordinator.clearAll()`
  (new, plus `clearAll()` on both timer managers); bounded Axiom flush; `server_stopped` audit
  event; exit 0 or 1 on timeout. `unref()` stays (the HTTP listener keeps the process alive;
  the review overstated this) — plan 12 §3.2's `keepProcessAlive` option is dropped.
- **Proof:** `tests/app/shutdown.test.ts` with stubbed `process`, server and fake timers: one
  sequence for two signals, zero pending timers, exit within 5 s.

### A9 · Small server costs (B-24, B-26, B-19, B-18 scope)

- `DeckService` loads and validates the practice deck once (lazily), path from
  `import.meta.url`, not `process.cwd()` (B-24).
- Directory watchers join a Socket.IO `directory` room; emits are coalesced per tick, so a
  lobby join broadcasts once (B-26).
- Token refresh keeps a rotated `refresh_token`, and concurrent refreshes per room share one
  in-flight promise; the client-credentials fetch is coalesced the same way (B-19, and the
  in-flight half of B-22).
- Drop the unused `user-read-email` scope (decision 9 left this proposal to Phase 5:
  **proposed, no-cost minimisation**). Display-name logging stays as decided.
- **Proof:** `DeckService.test.ts` (one disk read for two starts; works from another cwd);
  directory test counting emits; new `SpotifyAuthService.test.ts` (rotation kept; two parallel
  refreshes → one token request); OAuth test asserts the scope list.

### A10 · Broadcast size — measure, then decide (B-16)

- Add a test helper that serialises the `state_update` payload for 6 players × 30 cards with
  artwork and preview URLs and 30 history entries; record the size in
  `network-baseline.md`. If it exceeds **64 kB**, first move `history` behind an explicit
  request (plan 13 §6.3); narrow events with `revision` (plan 13 §6.2) stay deferred.
- Playlist edits answer with the edited track only, not the whole deck (the true half of B-16).
- **Proof:** the size test itself; `roomFlow.test.ts` asserts the edit response shape.

## 5. Track B — Client connection robustness

### B1 · Device storage and durable session (F-17, plan 13 Phase 2)

- One `deviceStorage` helper (try/catch on every access, `null` on failure) used by
  `playerSession.ts`, `playerProfile.ts` and the `main.tsx` theme read. `playerProfile` owns
  `tunetrack.playerDisplayName`; `playerSession` stops writing it.
- Room close no longer calls `resetPlayerSession()`; `clearRoomSession()` clears room-scoped
  state only.
- **Proof:** `playerSession.test.ts` and `playerProfile.test.ts` with a throwing storage stub;
  E2E: close a room, rejoin another, same session id.

### B2 · One connection-state model (F-02, F-20, F-21)

- `services/socket/connectionState.ts`: a `useSyncExternalStore` store fed by `connect`,
  `disconnect`, `reconnect_attempt` and `ServerShuttingDown` (A8), states `connecting |
connected | reconnecting | offline | server_restarting`. Both room hooks read it; the string
  literals disappear.
- Rendering: the `ConnectionStatus` chip from `04-host-flow-ux-spec.md` §2.3 on Play and Lobby,
  and a game-page banner. Both render now from the store; they move onto the overlay host when
  E2 lands, instead of waiting for it.
- Gameplay acks `offline` and `rejected` show a localised refusal toast instead of resetting
  to idle silently; no offline queue (decision log 2026-10-06).
- `navigate` held in a ref in both connection effects.
- Socket client policy per plan 13 §5.1.
- Delete `GamePageReconnectToast` and `usePlayerReconnectToast` unless the banner work reuses
  them (F-23 overlap).
- **Proof:** `connectionState.test.ts` (every transition); `useGamePageActions.test.tsx` (an
  `offline` ack produces the toast); `useGameRoomConnection.test.ts` (one `JoinRoom` per room
  id across a location change); E2E: drop the socket on the game page, banner within 1 s,
  clears on reconnect.

## 6. Track C — Render churn and runtime cost

| WP  | Finding(s) | Change                                                                                                                                                                                                                                                                                                                                                                                        | Proof                                                                            |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| C1  | F-08, F-19 | §3: handlers via `roomStateRef`; narrow header and action-panel models; `roomState` out of both comparators.                                                                                                                                                                                                                                                                                  | §2.2 render and handler-identity gates                                           |
| C2  | F-09       | `useMemo` for `itemsModel` (including `shouldAnimateCorrectPlacement`, no post-hoc mutation) and `dragModel`; `useCallback` for the ref and card-info callbacks; per-item ref callbacks created once.                                                                                                                                                                                         | `TimelinePanel.test.tsx` render counter: a drag step re-renders moved items only |
| C3  | F-12       | Resolve layout mode, card nodes and rects at drag start (refresh on scroll); throttle before reading; no reads after `scrollBy` writes in the same frame; one `ResizeObserver` for the panel lifetime.                                                                                                                                                                                        | §2.2 zero-reads gate                                                             |
| C4  | F-13       | Remove bare `layout` from `GamePageMobile`, `GamePageDesktop`, `ActionDock`. Allowed layout sites afterwards: `TurnActionDock` (`layout="position"`), `TimelinePanelHeader` (`layoutId`), `AppShellMenuSheet` (`LayoutGroup`). Guard test greps for others.                                                                                                                                   | Guard + `ActionDock.test.tsx`                                                    |
| C5  | F-10       | `features/viewport/viewportStore.ts` per plan 11 §4: one `resize` + `visualViewport` listener, rAF-coalesced, notifies on layout-mode change only, writes `--app-height` from `visualViewport.height` when changed. Migrates `usePageLayoutMode`, `useMobileControlPortalTarget`, `HintBubble`, `AppShellMenuSheet`, `main.tsx`.                                                              | §2.2 listener gate; `pageLayoutMode.test.ts` unchanged                           |
| C6  | F-11       | Memoise the playback context value; position in its own context consumed only by `PlaybackTabContent`; interval and Free-mode `timeupdate` updates only while that tab is open and `document.visibilityState === "visible"`; the capture-phase `pointerdown` listener is removed after a successful unlock and re-armed on `autoplay_failed` (simpler than plan 11 §6's bounded gesture set). | §2.2 playback gates; `HostPlaybackProvider*.test.*` updated                      |

## 7. Track D — Startup, motion and layering

| WP  | Finding(s)       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Proof                                                                                      |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| D0  | —                | Commit `measure-bundle.mjs` and the `measure:bundle` script; create `bundle-baseline.md` with the 2026-10-07 row from §2.1.                                                                                                                                                                                                                                                                                                                                                                       | Script output matches §2.1                                                                 |
| D1  | F-14             | `LazyMotion` + `m` per plan 10 §3 (47 files import `framer-motion` today); `domMax` only inside the Game route and `AppShellMenuSheet`.                                                                                                                                                                                                                                                                                                                                                           | `vendor-motion` absent from `index.html`; eager gate                                       |
| D2  | F-14             | `sideEffects: false` and a client subpath without `events/schemas` in `packages/shared`; repoint 112 web imports; `no-restricted-imports` for `zod` and the schema subpath in `apps/web`.                                                                                                                                                                                                                                                                                                         | `vendor-zod` absent; lint rule fails on a bad import                                       |
| D3  | F-14             | One catalogue at a time per plan 10 §5; first paint gated on the catalogue.                                                                                                                                                                                                                                                                                                                                                                                                                       | Entry ≤ 100 kB raw; key-parity guard unchanged                                             |
| D4  | F-14             | Dissolve the six CSS barrels per plan 10 §6, smallest first.                                                                                                                                                                                                                                                                                                                                                                                                                                      | `noCssBarrels` allowlist empty; largest CSS ≤ 20 kB                                        |
| D5  | F-14, F-25       | `build.target: "es2020"`; separate `vendor-zustand`; service-worker `navigateFallbackDenylist` for `/api/` and `NetworkOnly` for `/socket.io/` per plan 10 §7.5.                                                                                                                                                                                                                                                                                                                                  | Build output; offline shell check                                                          |
| C7  | F-03, F-04, F-15 | Height animation replaced by `transform`/`opacity` (`createMeasuredDisclosureMotion` users: `GameMenuPlayerItem`, `LobbyHostTtSettings`; delete unused `createDisclosurePanelMotion`); reorder 280 ms with the standard ease (plan 11 §3); no infinite animation during gameplay (`timelineCards` 1.12 s pulse removed); celebration and challenge transitions ≤ 500 ms; loaders may loop only while loading and stop under reduced motion; `PlaylistTrackList` row springs removed (plan 11 §2). | `motionBudget.test.ts` guard (new): CSS durations > 500 ms only on an allowlist of loaders |
| E1  | F-05             | z-index scale and guard per plan 14 §2 (guard first, red, then migrate 18 literals).                                                                                                                                                                                                                                                                                                                                                                                                              | `zIndexScale.test.ts` empty allowlist                                                      |
| E2  | F-06             | Overlay host per plan 14 §4, migration order §4.3. Host-flow overlays follow `04-host-flow-ux-spec.md` §2.4.                                                                                                                                                                                                                                                                                                                                                                                      | Plan 14 §4 acceptance                                                                      |

`backdrop-filter` (12 declarations in 5 files) is measured in trace S2 during C7; reduce or
drop it on coarse pointers only if the trace shows paint cost.

## 8. Rollout order

One package = one agent session. Packages in the same row can run in parallel sessions only if
their files do not overlap.

| Order | Packages       | Depends on                        | Skills                                  | Why this order                                    |
| ----- | -------------- | --------------------------------- | --------------------------------------- | ------------------------------------------------- |
| 1     | **A1**         | —                                 | `write-tests`, `verify`                 | Answer leak and unauthenticated third-party calls |
| 2     | A2             | —                                 | `write-tests`                           | Ghost players, silent lobby loss, rename breakage |
| 3     | A3             | `04` WP 2 (deck contract) or none | `write-tests`                           | Game soft-lock; decision 6                        |
| 4     | A4, B1         | —                                 | `add-socket-action` (A4), `write-tests` | Error contract feeds B2's toasts                  |
| 5     | A8, B2         | A4                                | `add-socket-action`, `e2e-scenario`     | Honest connection state end to end                |
| 6     | A5, A6, A7     | A1                                | `write-tests`                           | Abuse limits and transport                        |
| 7     | D0, C1, C2     | —                                 | `perf-check`                            | Largest runtime win, measurable                   |
| 8     | C3, C4, C5, C6 | C1                                | `perf-check`                            | Drag, viewport, playback                          |
| 9     | D1, D2, D3     | D0                                | `perf-check`                            | Eager gate                                        |
| 10    | C7, D4, D5, E1 | D1 (C7)                           | `design-token-migration`, `perf-check`  | Motion and CSS budgets                            |
| 11    | A9, A10        | A2                                | `write-tests`                           | Small server costs, measured broadcast decision   |
| 12    | E2             | E1                                | `add-ui-component`                      | Largest UI refactor last                          |

A1 is hotfix-sized and can be handed out before anything else in this document.

## 9. Corrections to the work-breakdown documents

| Doc and section               | Was                                                    | Now (this document)                                                |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `00-index.md` §4, Phase 5 row | eager gzip ≤ 200 kB                                    | ≤ 110 kB gate, ≤ 100 kB target (§2.1)                              |
| `10` §2                       | working targets (95 kB home path)                      | §2.1 is binding; 95 kB is a stretch goal requiring a router change |
| `10` §3                       | 68 `motion.*` sites, six layout sites                  | 47 importing files; after C4 three layout sites remain (§6 C4)     |
| `10` §9                       | `vite-bundle-visualizer` dev dependency                | `measure-bundle.mjs`, no dependency (§2.3)                         |
| `11` §6                       | bounded gesture set for playback arming                | remove the listener after unlock, re-arm on failure (C6)           |
| `11` §7                       | normalised slice store                                 | superseded by §3 / C1                                              |
| `12` §2.1                     | enable `connectionStateRecovery`                       | not enabled (A7)                                                   |
| `12` §2.4                     | limiter inside `createSocketHandler`, needs B-21 first | `socket.use` middleware, no B-21 dependency (A6)                   |
| `12` §3.2                     | remove `unref()`, add `keepProcessAlive` option        | keep `unref()`, add `clearAll()` (A8)                              |
| `13` §5.2                     | `ConnectionBanner` waits for the overlay host          | render now from the store, move onto the host later (B2)           |
| `13` §6.1                     | playlist edits re-emit the deck "to the host"          | to the requesting socket only; reply with the edited track (A10)   |
| `13` §6.2                     | narrow events planned                                  | deferred behind the 64 kB measurement gate (A10)                   |

## 10. Compliance and security notes

- A1 closes a game-integrity leak (B-30) and removes Spotify requests triggered by
  unauthorised sockets, reducing calls to a third-party processor (GDPR Art. 28, Art. 32).
- A6 is an availability control for an internet-facing service (ISO/IEC 27001 Annex A.8.6
  capacity management, A.8.20 network security). It is implemented in-house; no new third-party
  package or service. Client addresses for the OAuth callback limit stay in memory for the
  window only and are never logged or shipped to the audit sink (GDPR Art. 5(1)(c), (e)).
- A9 drops the unused `user-read-email` scope (data minimisation, GDPR Art. 5(1)(c);
  decision 9). Display-name logging and payload auditing to Axiom stay as decided and remain
  subject to review before any client-facing deployment.
- A8's `server_stopped` audit event carries no personal data.
- No change in this document broadens the personal data stored, logged or shipped.

## 11. Open owner questions

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
