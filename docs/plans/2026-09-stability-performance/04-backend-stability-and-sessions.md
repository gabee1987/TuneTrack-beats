# 04 — Backend Stability and Session Ownership

> Addresses findings **F-12, F-16 – F-20**.
> Owning layers: `apps/server/src/rooms`, `apps/server/src/app`.
> `packages/game-engine` stays pure; nothing in this document adds transport, timers or
> logging to it.

This is the highest-priority wave in the programme. F-12 loses player state and leaks
memory; everything else in the reconnect story depends on the server's ownership model
being correct first.

## 1. Phase 1 — Fix in-game disconnect lifecycle · **S1**

**Finding:** F-12.

### 1.1 The defect

`apps/server/src/rooms/RoomConnectionService.ts` `removePlayerBySocketId`:

    const roomState = this.markPlayerDisconnected(membership);

    if (roomState?.status === "lobby") {
      this.timers.scheduleReconnect(
        membership.sessionId,
        this.timers.reconnectGracePeriodMs,
        () => { /* remove player, emit */ },
      );
    }

    return roomState;

An in-game disconnect takes the `markPlayerDisconnected` path, which sets
`reconnectExpiresAtEpochMs = now + IN_GAME_RECONNECT_DISPLAY_MS` (180 000 ms) and schedules
a host-transfer timer and, if relevant, a turn-skip timer — but **never** schedules the
player's own removal. Results:

- the client counts down to an expiry that has no server-side effect;
- an abandoned player stays in `players` and `timelines` for the process lifetime;
- the room is never deleted, because deletion only happens inside
  `removePlayerBySessionId`, which is reached only from the lobby timer;
- `CLAUDE.md`'s rule "Last player leaves → room removed" does not hold in-game.

### 1.2 The design

Three distinct grace periods, all currently conflated:

| Period | Purpose | Current | Proposed |
| --- | --- | --- | --- |
| **Turn skip** | Advance play past a disconnected active player | 60 s, scheduled | unchanged |
| **Host transfer** | Move host role away from a disconnected host | 15 s, scheduled | unchanged |
| **Session eviction (lobby)** | Remove a player who left the lobby | 30 s, scheduled | unchanged |
| **Session eviction (in game)** | Remove a player who abandoned a running game | 180 s, **not scheduled** | 180 s, **scheduled** |

Rules for in-game eviction, all of which must be re-checked inside the timer callback
because state may have moved on (per `CLAUDE.md`: timers always recheck state before
mutating):

1. Fire only if the player is still `connectionStatus === "disconnected"`.
2. Fire only if the room still exists and still contains that player.
3. Remove the player from `roomState.players`, `roomState.timelines` and
   `gameState.players` / `gameState.timelines` (the existing private
   `removePlayerFromGameState` helper already does the game-state half).
4. If the removed player was the active turn player, advance the turn first — reuse
   `advanceTurnIfDisconnectedActivePlayer`, which already handles this.
5. If the removed player was a claimed challenger, cancel the challenge first — reuse
   `cancelChallengeIfDisconnectedChallenger`.
6. If the removed player was the host, transfer host — reuse `applyHostTransfer` with
   `requireConnectedTarget: true`; if no connected candidate exists, the room is
   effectively empty, so go to rule 7.
7. If no players remain, clear all timers for the room, delete the room, clear its
   redirects, clear its memberships, clear its Spotify tokens and playback session, and
   emit nothing (there is nobody to emit to).
8. If the game had already reached `finished`, evict immediately with no grace period —
   there is nothing to reconnect into.

### 1.3 Implementation shape

Rather than adding another branch to `removePlayerBySocketId`, extract the policy so it is
readable and testable in isolation:

- New pure module `apps/server/src/rooms/disconnectPolicy.ts`:

      export interface DisconnectPolicy {
        evictionDelayMs: number | null;   // null = never evict automatically
        scheduleHostTransfer: boolean;
        scheduleTurnSkip: boolean;
      }

      export function resolveDisconnectPolicy(input: {
        roomStatus: RoomStatus;
        isHost: boolean;
        isActiveTurnPlayer: boolean;
        isClaimedChallenger: boolean;
        grace: { lobbyMs: number; inGameMs: number; hostTransferMs: number; turnSkipMs: number };
      }): DisconnectPolicy;

- `RoomConnectionService.removePlayerBySocketId` calls `resolveDisconnectPolicy`, then
  schedules exactly what the policy says. The orchestration stays explicit and the
  decision table becomes unit-testable without any timers.
- Add `evictSessionFromRoom(sessionId)` as a named private method implementing rules 3-8,
  so the timer callback is one line.

`IN_GAME_RECONNECT_DISPLAY_MS` should be renamed `IN_GAME_RECONNECT_GRACE_PERIOD_MS` and
moved next to the other grace periods in `RoomRegistry`, because after this change it is
no longer display-only.

### 1.4 Tests (see Doc 11 section 6)

New file `apps/server/tests/rooms/disconnectLifecycle.test.ts` with fake timers:

- lobby disconnect evicts after 30 s;
- in-game disconnect evicts after 180 s;
- in-game disconnect that reconnects at 179 s is **not** evicted and keeps its timeline,
  TT tokens and turn position;
- evicting the active player advances the turn;
- evicting a claimed challenger cancels the challenge and returns the TT token per the
  engine's existing rule;
- evicting the host transfers host to the first remaining connected player;
- evicting the last player deletes the room and clears its timers, redirects and
  memberships (assert `roomStore.roomCount === 0`);
- a `finished` game evicts immediately;
- `resolveDisconnectPolicy` decision table covered exhaustively as a pure test.

### Acceptance

- [ ] All tests above pass.
- [ ] `RoomStore.roomCount` returns to 0 after every test file completes — add this as an
      `afterEach` assertion in the existing integration suites too, which turns any future
      leak into a test failure.
- [ ] No behavioural change to the lobby path (existing `roomFlow.test.ts` and
      `hostTransfer.test.ts` pass unmodified).

## 2. Phase 2 — Configure Socket.IO for mobile networks · **S2**

**Finding:** F-16.

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

- On a recovered connection, `socket.recovered === true` and the socket **keeps its
  previous id**. `RoomStore.socketMemberships` is keyed by socket id, so a recovered
  socket's membership is still valid and no rejoin is needed. This is precisely the
  behaviour we want, but the client must not blindly re-emit a join — see Doc 05 section 3.
- `skipMiddlewares: false` keeps the audit middleware
  (`registerSocketAuditMiddleware`) running on recovery, which is what we want for
  traceability.
- Missed packets are replayed. Because every mutation currently broadcasts full room state
  (F-11), replay is safe — the last packet wins. Once Doc 05 section 4 introduces deltas,
  replay ordering becomes load-bearing; note this dependency in that document.

### 2.2 Heartbeat tuning

Defaults are `pingInterval: 25 000`, `pingTimeout: 20 000`. A backgrounded mobile browser
can be throttled hard enough to miss a ping, producing a spurious disconnect and, today,
the F-13 rejoin failure. Set:

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
which triggers work and, for the Spotify ones, outbound third-party calls.

Add a small token-bucket guard in the realtime layer — this is a transport concern and
belongs in `apps/server/src/realtime/`, not in `rooms/`:

- New `apps/server/src/realtime/rateLimit.ts`: per-socket, per-event token bucket with a
  default of 20 events per 10 s and tighter buckets for the expensive events:

  | Event class | Limit |
  | --- | --- |
  | Gameplay mutations (`place_card`, `confirm_reveal`, ...) | 10 / 5 s |
  | Discovery / search (`search_spotify_*`, `generate_spotify_candidates`) | 5 / 10 s |
  | `refresh_spotify_token` | 3 / 60 s |
  | `list_rooms`, `get_room_preview` | 10 / 10 s |
  | Everything else | 20 / 10 s |

- Wire it inside `createSocketHandler` so every registered handler is covered by
  construction and no handler can forget it.
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

## 3. Phase 3 — Graceful shutdown and timer ownership · **S3**

**Finding:** F-19.

### 3.1 Shutdown

`apps/server/src/index.ts` has no signal handling. Add an explicit shutdown sequence, kept
in its own module (`apps/server/src/app/shutdown.ts`) so `index.ts` stays a wiring file:

1. Stop accepting new HTTP connections (`httpServer.close()`).
2. Emit a new `ServerToClientEvent.ServerShuttingDown` to all connected sockets so clients
   can show an honest message instead of a silent disconnect, and so the client can decide
   not to treat it as a network fault (Doc 05 section 3).
3. `io.close()` with a short drain window (2 s).
4. Clear every timer via a new `RoomTimerCoordinator.clearAll()`.
5. Flush the Axiom sink (`apps/server/src/app/axiomLogSink.ts`) and await it with a
   bounded timeout.
6. Log `server_stopped` as an audit event, mirroring the existing `server_started`.
7. `process.exit(0)`, or exit non-zero if any step timed out.

Register for `SIGTERM` and `SIGINT`, and make the handler idempotent so a second signal
does not restart the sequence.

Also add handlers for `unhandledRejection` and `uncaughtException` that log at `fatal`
with the audit sink before exiting. Today an unhandled rejection in a Spotify call path
would kill the process with no record of why.

### 3.2 Timer references

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

**Finding:** F-20.

- Move `MAX_ACTIVE_ROOM_COUNT` out of `RoomLobbyService` into `env` as
  `MAX_ACTIVE_ROOMS` (Zod: positive int, default 5) and pass it down through the
  `RoomRegistry` constructor, alongside the grace periods which are already parameters but
  never wired to configuration.
- Add `RECONNECT_GRACE_MS`, `IN_GAME_RECONNECT_GRACE_MS`, `HOST_TRANSFER_GRACE_MS`,
  `TURN_SKIP_GRACE_MS` to `env` with the current values as defaults, so a deployment can
  tune them without a code change.
- Keep validation in `apps/server/src/app/env.ts`; it is already the single validated
  boundary and its error formatting is good.

### Acceptance

- [ ] `SIGTERM` during an active game logs `server_stopped`, notifies clients, clears all
      timers and exits 0 within 5 s. Verified by a test that spawns the server module with
      a stubbed `process`.
- [ ] `RoomTimerCoordinator.clearAll()` leaves zero pending timers (assert with fake timers).
- [ ] An unhandled rejection is logged at `fatal` with an audit record before exit.
- [ ] All new env vars have defaults, so an existing `.env` continues to boot unchanged.
- [ ] `docs/axiom_logging_setup.md` updated with the new `server_stopped` audit action.

## 4. Phase 4 — Collapse the double delegation layer · **S3**

**Finding:** F-17. This is a maintainability change with no behavioural intent. Schedule it
**after** phases 1-3, and treat any behaviour change as a defect.

### 4.1 Current shape

    realtime/handlers/*  →  RoomService (696 lines)  →  RoomRegistry (285 lines)  →  RoomLobbyService
                                                                                  →  RoomGameplayService
                                                                                  →  RoomConnectionService
                                                                                  →  RoomStore / RoomTimerCoordinator

`RoomRegistry` is almost entirely one-line pass-throughs. `RoomService` wraps them again,
adding logging plus all Spotify orchestration. Every new event costs two mechanical edits
in files that are already at or near the size limits in `CLAUDE.md`.

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

- [ ] No file in `apps/server/src` exceeds 400 lines.
- [ ] No class exists whose methods are more than 80 % single-line delegations.
- [ ] Every existing server test passes with **zero** modifications.
- [ ] `CLAUDE.md`'s backend layer-ownership table still describes the code accurately;
      update the table if the new services change it.

## 5. Phase 5 — Index the membership maps · **S3**

**Finding:** F-18. Lowest priority; do it only if the "scale to online play" goal becomes
concrete, or opportunistically while doing Phase 4.

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
  connect/disconnect, unexpected errors, notable room lifecycle events. The new eviction
  and shutdown paths qualify as notable lifecycle events; the rate limiter logs at `warn`
  only on breach.
- Audit events go through the existing `logAuditEvent` sink so the Axiom pipeline
  documented in `docs/axiom_logging_setup.md` keeps working. Note that audit records carry
  `roomId`, `socketId` and `displayName`-free metadata today; keep it that way —
  do not start writing player display names into audit payloads, as that would broaden the
  personal data leaving the service.
