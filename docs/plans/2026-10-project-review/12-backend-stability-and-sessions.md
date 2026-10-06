# 12 — Backend Stability and Session Ownership

> **Status (2026-10-06):** Phase 1 (in-game identity retention) and Phase 3.3 (lifecycle
> periods from configuration) shipped. Phase 2 (Socket.IO configuration and rate limiting),
> Phase 3.1 (graceful shutdown), Phase 3.2 (timer references), Phase 4 (façade collapse —
> `RoomService.ts` has grown to 718 lines) and Phase 5 (membership indexes) are open.
> **Folded from** `docs/plans/2026-09-stability-performance/04-backend-stability-and-sessions.md`
> on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.
> Addresses findings **B-07, B-08, B-11, B-15** of `01-review-findings.md`, with a dependency
> on **B-16**. The membership-index work (Phase 5) has no register entry; see `00-index.md`.
> The old audit numbers F-12, F-16–F-20 are not used in this document.
> Owning layers: `apps/server/src/rooms`, `apps/server/src/app`, `apps/server/src/realtime`.
> `packages/game-engine` stays pure; nothing in this document adds transport, timers or
> logging to it.

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

**Finding:** B-15 (recovery assumption), B-07 (abuse surface, no rate limit), T-08
(`createSocketServer` untested).

E2E E7 and E8 already prove that the session-id rejoin path restores a guest or host after
a short in-game interruption (`13-network-protocol-and-resilience.md`). Everything below is
open.

`apps/server/src/app/createSocketServer.ts` currently sets only `cors` and
`maxHttpBufferSize`.

### 2.1 Connection state recovery

Socket.IO 4.6+ `connectionStateRecovery` transparently restores the session id, rooms and
missed packets across a short disconnection. For a game played on phones in a living room
this is the single highest-value server setting available.

    connectionStateRecovery: {
      maxDisconnectionDuration: 120_000,
      skipMiddlewares: false,
    }

Consequences that must be handled deliberately:

- **Correction (B-15):** the 2026-09 plan assumed that a recovered socket keeps a valid
  membership because `RoomStore.socketMemberships` is keyed by socket id. It does not: the
  disconnect handler (`registerDisconnectHandler` in `realtime/handlers/lobbyHandlers.ts`)
  calls `RoomConnectionService.removePlayerBySocketId` immediately, so the membership is
  gone before any recovery can occur, and enabling the option alone changes nothing. The
  design must either defer membership removal until the recovery window has elapsed (a
  timer owned by `RoomTimerCoordinator`, re-checking state before it fires) or treat a
  socket with `socket.recovered === true` as an implicit rejoin that re-establishes the
  membership from the session id. Decide this before implementation and write the chosen
  variant into `13-network-protocol-and-resilience.md` §3, because the client must not
  blindly re-emit a join on recovery.
- `skipMiddlewares: false` keeps the audit middleware
  (`registerSocketAuditMiddleware`) running on recovery, which is what we want for
  traceability.
- Missed packets are replayed. Because every mutation currently broadcasts full room state
  (B-16), replay is safe — the last packet wins. Once
  `13-network-protocol-and-resilience.md` §4 introduces deltas, replay ordering becomes
  load-bearing; that document carries the dependency.

### 2.2 Heartbeat tuning

Defaults are `pingInterval: 25 000`, `pingTimeout: 20 000`. A backgrounded mobile browser
can be throttled hard enough to miss a ping, producing a spurious disconnect. Set:

    pingInterval: 20_000,
    pingTimeout: 25_000,

A `pingTimeout` longer than `pingInterval` gives the client a full extra interval to
respond before the server gives up, which is the right trade for this workload. Document
the reasoning inline as a non-obvious "why" comment.

### 2.3 Transport policy

Leave the default upgrade path (polling then WebSocket) — it is the most compatible.
Do **not** force `transports: ["websocket"]`; some domestic networks and captive portals
break it, and this app has to work at a family gathering.

### 2.4 Per-socket rate limiting

There is currently no limit on how fast a client can emit. A buggy or hostile client can
drive unbounded `list_rooms`, `refresh_spotify_token` or `place_card` traffic, each of
which triggers work and, for the Spotify ones, outbound third-party calls. B-07 adds that
`import_playlist` performs the full Spotify fetch before any authorisation check and that
the OAuth callback is unlimited too; the authorisation ordering is Phase 5 of the review
programme, the limiter is this phase.

Add a small token-bucket guard in the realtime layer — this is a transport concern and
belongs in `apps/server/src/realtime/`, not in `rooms/`:

- New `apps/server/src/realtime/rateLimit.ts`: per-socket, per-event token bucket with a
  default of 20 events per 10 s and tighter buckets for the expensive events:

  | Event class                                                            | Limit     |
  | ---------------------------------------------------------------------- | --------- |
  | Gameplay mutations (`place_card`, `confirm_reveal`, ...)               | 10 / 5 s  |
  | Discovery / search (`search_spotify_*`, `generate_spotify_candidates`) | 5 / 10 s  |
  | `refresh_spotify_token`                                                | 3 / 60 s  |
  | `list_rooms`, `get_room_preview`                                       | 10 / 10 s |
  | Everything else                                                        | 20 / 10 s |

- Wire it inside `createSocketHandler` so every registered handler is covered by
  construction and no handler can forget it. Note that five async handlers currently bypass
  `createSocketHandler` (B-21); route them through it first, or the limiter has holes.
- On breach: emit the existing `Error` event with a new code `RATE_LIMITED`, log at `warn`,
  and record an audit event. Do not disconnect — a legitimate client with a stuck button
  should recover, not be ejected.
- Add `RATE_LIMITED` to `apps/server/src/realtime/errorMessages.ts` and to
  `apps/web/src/features/i18n/localizedErrors.ts` with a user-facing message in both
  catalogues.

This is a defence-in-depth control, in line with ISO/IEC 27001 Annex A.8 expectations for
availability of an internet-facing service, and it is cheap.

### Acceptance

- [ ] New test `apps/server/tests/app/createSocketServer.test.ts` asserts the configured
      options (recovery window, ping values, buffer size, CORS validator wiring).
- [ ] New test `apps/server/tests/realtime/rateLimit.test.ts` covers: under-limit passes,
      over-limit emits `RATE_LIMITED`, bucket refills, buckets are per-socket and
      per-event-class, and no socket is disconnected.
- [ ] An integration test drops and restores a client socket inside the recovery window
      and asserts the player is still a room member with no rejoin emitted.
- [ ] Manual check: put a phone in flight mode for 10 s during a game, restore it, and
      confirm play continues with no error toast.

## 3. Phase 3 — Graceful shutdown and timer ownership

**Finding:** B-11.

### 3.1 Shutdown (open)

`apps/server/src/index.ts` has no signal handling. Add an explicit shutdown sequence, kept
in its own module (`apps/server/src/app/shutdown.ts`) so `index.ts` stays a wiring file:

1. Stop accepting new HTTP connections (`httpServer.close()`).
2. Emit a new `ServerToClientEvent.ServerShuttingDown` to all connected sockets so clients
   can show an honest message instead of a silent disconnect, and so the client can decide
   not to treat it as a network fault (`13-network-protocol-and-resilience.md` §3).
3. `io.close()` with a short drain window (2 s).
4. Clear every timer via a new `RoomTimerCoordinator.clearAll()`.
5. Flush the Axiom sink (`apps/server/src/app/axiomLogSink.ts`) and await it with a
   bounded timeout.
6. Log `server_stopped` as an audit event, mirroring the existing `server_started`.
7. `process.exit(0)`, or exit non-zero if any step timed out.

Register for `SIGTERM` and `SIGINT`, and make the handler idempotent so a second signal
does not restart the sequence.

The `unhandledRejection` and `uncaughtException` handlers that log at `fatal` through the
audit sink before exiting, together with guarding every timer callback, are on the hotfix
track of `00-index.md` §4 (B-11) and may land before this phase; this phase owns the
ordered shutdown sequence and must not duplicate them.

### 3.2 Timer references (open)

`DisconnectTimerManager.schedule` and `ChallengeTimerManager.schedule` both call
`handle.unref()`. That is convenient for tests but means a pending challenge window or
reconnect grace period cannot keep the process alive and vanishes without a trace on
shutdown.

- Remove `unref()` from production behaviour and make it an explicit constructor option
  (`{ keepProcessAlive: false }`) that the test setup passes. This keeps tests fast while
  making production behaviour correct.
- Add `clearAll()` to both managers and to `RoomTimerCoordinator`, used by the shutdown
  sequence and by test teardown.

### 3.3 Room capacity and grace periods from configuration

**Shipped 2026-09-30.** `MAX_ACTIVE_ROOMS`, `RECONNECT_GRACE_MS`, `HOST_TRANSFER_GRACE_MS`, `TURN_SKIP_GRACE_MS` and `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS` are validated in `apps/server/src/app/env.ts` (defaults 5, 30 s, 30 s, 60 s, 1 h) and injected through `RoomRegistry`; E2E overrides only the long waits it exercises. B-28 notes the defaults are duplicated in `RoomRegistry`; Phase 6 of the review programme owns that nit.

### Acceptance

- [ ] `SIGTERM` during an active game logs `server_stopped`, notifies clients, clears all
      timers and exits 0 within 5 s. Verified by a test that spawns the server module with
      a stubbed `process`.
- [ ] `RoomTimerCoordinator.clearAll()` leaves zero pending timers (assert with fake timers).
- [ ] An unhandled rejection is logged at `fatal` with an audit record before exit.
- [ ] `docs/operations/axiom_logging_setup.md` updated with the new `server_stopped` audit
      action.

## 4. Phase 4 — Collapse the double delegation layer

**Finding:** B-08, owned by Phase 6 of the review programme (`00-index.md` §4); this section
is the work breakdown that phase will package. This is a maintainability change with no
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

Each step keeps `apps/server/tests/roomFlow.test.ts` and the other integration suites
green without modification, because they exercise the socket surface rather than the
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
