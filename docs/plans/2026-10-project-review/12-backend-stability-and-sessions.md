# 12 — Backend Stability and Session Ownership

> **Status (2026-10-07):** Phase 1 (in-game identity retention), Phase 2 (Socket.IO configuration
> and rate limiting), Phase 3.1 (graceful shutdown) and Phase 3.3 (lifecycle periods from
> configuration) shipped; Phase 3.2 (timer references) is superseded by `05` A8. Phase 4 (façade
> collapse — `RoomService.ts` is 703 lines) and Phase 5 (membership indexes) are open.
> **Folded from** `docs/plans/2026-09-stability-performance/04-backend-stability-and-sessions.md`
> on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.
> Addresses findings **B-07, B-08, B-11, B-15** of `01-review-findings.md`, with a dependency
> on **B-16**. The membership-index work (Phase 5) has no register entry; see `00-index.md`.
> The old audit numbers F-12, F-16–F-20 are not used in this document.
> Owning layers: `apps/server/src/rooms`, `apps/server/src/app`, `apps/server/src/realtime`.
> `packages/game-engine` stays pure; nothing in this document adds transport, timers or
> logging to it.
>
> **Binding budgets, order and corrections (2026-10-07):** `05-performance-and-robustness-plan.md` §2 (budgets), §8 (rollout order), §9 (corrections to this document). Where they differ, `05` wins.

Reconnect behaviour depends on the server making transport loss, host transfer, turn
recovery and explicit removal separate policies. The rules below are the product rules as
stated in `CLAUDE.md`; this document only plans the server work that upholds them.

## 1. Lifecycle rules and Phase 1 — Retain in-game identities without stalling play

### 1.1 Room and player lifecycle rules (normative, as stated in `CLAUDE.md`)

- A host disconnect starts a 30 s grace period (`HOST_TRANSFER_GRACE_MS`) before the host
  role transfers to the first remaining connected player.
- An offline in-game player stays reserved — identity, timeline, tokens and turn position —
  until reconnect, host removal (kick) or room close. There is no in-game reconnect
  deadline, so `reconnectExpiresAtEpochMs` is `null` in-game.
- A room in which every player stays offline for `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS` (default
  1 h) is closed as a unit; any reconnect cancels that cleanup.
- A room is removed when the last player explicitly leaves, is kicked, or the host closes it.
  A transport disconnect never removes a room on its own.
- The host may skip the active turn for **any** player at **any** time, regardless of
  connection state (owner decision 8, `00-index.md` §5). The 60 s turn auto-skip
  (`TURN_SKIP_GRACE_MS`) remains the safety fallback when the active player is offline.
- The lobby keeps its 30 s reconnect-and-removal behaviour (`RECONNECT_GRACE_MS`).

### 1.2 Phase 1 — Shipped

**Shipped (owner decisions of 2026-09-30, recorded in `docs/decision_log.md`).**
`RoomConnectionService` marks an in-game player disconnected, publishes no reconnect
deadline, schedules only the host-transfer and turn-recovery timers, and closes an
all-offline room atomically after the configured TTL. Proving tests:
`apps/server/tests/rooms/disconnectLifecycle.test.ts` (fake timers; retained identity after
24 simulated hours; all-offline cleanup at exactly one hour, cancelled by reconnect) and
Chromium E2E E10 (offline turn visible to all, host skip) and E11 (all-offline expiry with
a short TTL override). Deviation from the plan: the plan limited host `skip_turn` to offline
players; the code never did, and decision 8 confirms the code.

## 2. Phase 2 — Configure Socket.IO for mobile networks

**Shipped 2026-10-07** as `05` A6 and A7: recovery stays off (the session-id rejoin restores
everything; the former §2.1 design is superseded), `pingInterval` 20 s and `pingTimeout` 25 s,
default transports, and a per-socket `socket.use` token bucket (`realtime/rateLimit.ts`,
`RATE_LIMITED`, no disconnect) instead of a limiter inside `createSocketHandler`, so the async
handlers are covered too. Proof: `apps/server/tests/app/createSocketServer.test.ts`,
`apps/server/tests/realtime/rateLimit.test.ts`. Remaining: the 10 s flight-mode device check.

## 3. Phase 3 — Graceful shutdown and timer ownership

**Finding:** B-11.

### 3.1 Shutdown

**Shipped 2026-10-07** as `05` A8: `apps/server/src/app/shutdown.ts` runs one bounded sequence
per process (clear timers, `ServerShuttingDown`, close with a 2 s drain, `server_stopped`, Axiom
drain, exit 0, or 1 after 5 s or on failure). Proof: `apps/server/tests/app/shutdown.test.ts`.

### 3.2 Timer references

**Superseded 2026-10-07** by `05` A8: `unref()` stays because the HTTP listener keeps the process
alive; the `keepProcessAlive` option is dropped. `clearAll()` shipped on both managers and on
`RoomTimerCoordinator`.

### 3.3 Room capacity and grace periods from configuration

**Shipped 2026-09-30.** `MAX_ACTIVE_ROOMS`, `RECONNECT_GRACE_MS`, `HOST_TRANSFER_GRACE_MS`, `TURN_SKIP_GRACE_MS` and `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS` are validated in `apps/server/src/app/env.ts` (defaults 5, 30 s, 30 s, 60 s, 1 h) and injected through `RoomRegistry`; E2E overrides only the long waits it exercises. B-28 notes the defaults are duplicated in `RoomRegistry`; Phase 6 of the review programme owns that nit.

### Acceptance

- [x] `SIGTERM` during an active game logs `server_stopped`, notifies clients, clears all
      timers and exits 0 within 5 s (`tests/app/shutdown.test.ts`, stubbed `process`).
- [x] `RoomTimerCoordinator.clearAll()` leaves zero pending timers (same test, fake timers).
- [ ] An unhandled rejection is logged at `fatal` with an audit record before exit.
- [ ] `docs/operations/axiom_logging_setup.md` updated with the new `server_stopped` audit
      action.

## 4. Phase 4 — Collapse the double delegation layer

**Finding:** B-08, owned by Phase 6 of the review programme; `06-structure-and-test-plan.md` S1–S2
packages and orders it (and corrects B-08: `requireHost` is not dead). This is a maintainability change with no
behavioural intent. Schedule it **after** Phases 1–3, and treat any behaviour change as a
defect.

The owner's hard file-size limit is **700 lines** (decision 3, `00-index.md` §5).
`RoomService.ts` is at 718 lines on 2026-10-06 (696 when this plan was written) and is one
of only two source files in the repository that violate the hard rule. B-29 lists the
further backend splits, which are maintainability work rather than rule violations.

### 4.1 Current shape

    realtime/handlers/*  →  RoomService (718 lines)  →  RoomRegistry (319 lines)  →  RoomLobbyService
                                                                                  →  RoomGameplayService
                                                                                  →  RoomConnectionService
                                                                                  →  RoomStore / RoomTimerCoordinator

`RoomRegistry` is almost entirely one-line pass-throughs (`RoomRegistry.requireHost` is dead
code, B-08). `RoomService` wraps them again, adding logging plus all Spotify orchestration.
Every new event costs two mechanical edits in files that are already at or over the size
limit.

### 4.2 Target shape

    realtime/handlers/lobbyHandlers      →  RoomLobbyService
    realtime/handlers/gameplayHandlers   →  RoomGameplayService
    realtime/handlers/playlistHandlers   →  PlaylistService        (new: extracted from RoomService)
    realtime/handlers/spotifyHandlers    →  SpotifyOrchestrator    (new: extracted from RoomService)
    (connection lifecycle)               →  RoomConnectionService

with a thin `RoomServices` container object created in `app/` wiring and handed to the
handler registrars, replacing both façades.

### 4.3 Migration, one handler group at a time

1. Extract Spotify orchestration from `RoomService` into
   `apps/server/src/spotify/SpotifyOrchestrator.ts`. This is the largest single block
   (`buildSpotifyAuthUrl`, `searchSpotifyPlaylists`, `searchSpotifyMusic`,
   `openSpotifyPlaylist`, `generateSpotifyCandidates`, `useSpotifyCandidates`,
   `refreshSpotifyToken`, `playSpotifyTrack`, `registerSpotifyPlaybackDevice`,
   `unregisterSpotifyPlaybackDevice`, `updateSpotifyAuthStatus`) and moving it takes
   `RoomService` well under its limit on its own. It needs the room state accessor and the
   playback-owner guard, which it should receive as narrow injected functions rather than
   the whole registry.
2. Extract playlist orchestration (`importPlaylist`, `loadCuratedPlaylist`,
   `getPlaylistTracks`, `removePlaylistTracks`, `updatePlaylistTrack`) into
   `apps/server/src/decks/PlaylistOrchestrator.ts`.
3. Point `playlistHandlers` and `spotifyHandlers` at the new services.
4. Point `lobbyHandlers` and `gameplayHandlers` at `RoomLobbyService` /
   `RoomGameplayService` directly, moving the logging that lived in `RoomService` into the
   handlers (logging is a transport-edge concern, which is where `CLAUDE.md` puts it).
5. Delete `RoomRegistry` and `RoomService`, keeping `RoomLobbyService.requireHost` /
   `requireSpotifyPlaybackOwner` — move those two guards onto `RoomStore` or a small
   `roomAuthorization.ts`, since they are authorisation predicates, not lifecycle.

Each step keeps the socket suites in `apps/server/tests/realtime/` and the other integration
suites green without modification, because they exercise the socket surface rather than the
internal classes. That is the safety net that makes this refactor tractable.

### Acceptance

- [ ] No file in `apps/server/src` exceeds 400 lines (plan target; the binding rule is
      700 lines, decision 3).
- [ ] No class exists whose methods are more than 80 % single-line delegations.
- [ ] Every existing server test passes with **zero** modifications.
- [ ] `CLAUDE.md`'s backend layer-ownership table still describes the code accurately;
      update the table if the new services change it.

## 5. Phase 5 — Index the membership maps

No register entry; see `00-index.md`. Lowest priority; do it only if the "scale to online
play" goal becomes concrete, or opportunistically while doing Phase 4.

`RoomStore` scans all memberships in eight methods. Add two secondary indexes maintained
alongside the primary maps:

- `socketIdsBySessionId: Map<string, Set<string>>`
- `sessionIdsByRoomId: Map<RoomId, Set<string>>`
- `socketIdsByRoomAndPlayer: Map<`${RoomId}:${PlayerId}`, Set<string>>`

Every mutation path must update all indexes, which is exactly the kind of invariant that
needs a test. `apps/server/tests/rooms/RoomStore.test.ts` already exists; extend it with a
property-style test that performs a randomised sequence of add/remove/retarget/clear
operations and asserts after each step that every index agrees with a brute-force scan of
the primary maps. That test makes the optimisation safe.

### Acceptance

- [ ] No method in `RoomStore` iterates a whole membership map.
- [ ] The index-consistency test passes over at least 500 randomised operation sequences.
- [ ] No behavioural change (all existing tests unmodified).

## 6. Cross-cutting rules for this document

- The game engine stays pure. Every change here is orchestration, store or transport.
- Every timer callback re-checks state before mutating, and every timer has an owner with
  an explicit clear path.
- Server authority is preserved: no client input is trusted for correctness, membership or
  permission at any point.
- Logging stays at the levels `CLAUDE.md` allows: startup, shutdown, socket
  connect/disconnect, unexpected errors, notable room lifecycle events. Explicit player
  removal and shutdown qualify as notable lifecycle events; the rate limiter logs at
  `warn` only on breach.
- Audit events go through the existing `logAuditEvent` sink so the Axiom pipeline
  documented in `docs/operations/axiom_logging_setup.md` keeps working. B-18 records that
  display names are logged at `info` on join/create and that, with payload auditing
  enabled, display names and search queries reach audit events shipped to a US-hosted
  third party. Owner decision 9 keeps this as is for the current trusted-party deployment
  and requires a compliance review before any public or client-facing deployment; no
  change in this document may broaden the personal data leaving the service.
