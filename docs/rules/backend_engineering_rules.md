# TuneTrack Backend Engineering Rules

> Scope: `apps/server` and its use of `packages/game-engine` and `packages/shared`.
> [`CLAUDE.md`](../../CLAUDE.md) owns the layer table, the core architecture rules, coding
> principles, file-size rule and testing expectations; this file only adds the server-specific
> rules that follow from them. Where the two disagree, the stricter rule applies and the
> conflict is raised. Rewritten 2026-10-06 (documentation reset, Phase 2 of the review programme).

## 1. Socket handlers are protocol adapters

Every client event is registered through `realtime/createSocketHandler.ts` and does exactly
this, in order:

1. parse the payload with the shared Zod schema (`packages/shared/src/events/schemas.ts`);
2. resolve the acting player from the socket's session, never from the payload;
3. call one service or orchestrator method;
4. acknowledge the action and broadcast the resulting room state, or acknowledge a
   client-safe error.

`handle` may return a promise; its rejection takes the same path as a thrown error. A
request/result event whose client waits on a result event (music setup, playback) answers
its failures there through `failureReply`; the ack and the audit record are sent either way.

Handlers never contain gameplay rules, never mutate room state directly, never duplicate
authorisation that the service performs, and never branch on gameplay outcomes. A handler
file that grows a second responsibility is split, not extended.

## 2. Acknowledged, idempotent mutations

- Every mutating client event carries an optional `requestId` and returns an ack
  (`packages/shared/src/events/actionAck.ts`). The ack is the only success/failure channel
  for that action; `state_update` is the state channel.
- The server keeps a bounded per-room LRU of handled `requestId`s (`rooms/RoomStore.ts`).
  A replayed request returns the original ack and performs no second mutation.
- A new mutating event is complete only when it has: shared event name and payload type,
  Zod schema, handler registration with ack, replay guard coverage, an error code in
  `realtime/errorMessages.ts` with both i18n catalogue keys on the client, and a server test.

## 3. Validation at the boundary

- Socket payloads and HTTP inputs are parsed before any service call. Business logic never
  re-validates shape; it validates **authority and phase**.
- Environment is parsed once in `app/env.ts` through Zod with explicit defaults. No
  `process.env` reads anywhere else.
- URL fields that reach clients (`artworkUrl`, `previewUrl`, redirect URIs) are restricted
  to `https:` in the shared schema.

## 4. Explicit, narrow mutation

- Every room mutation happens through one clearly named method on the owning room service
  (`RoomLobbyService`, `RoomGameplayService`, `RoomConnectionService`).
- Validate fully before mutating anything; never leave state half-changed when an operation
  turns out to be invalid. Authorisation checks (host, membership, phase) come **before**
  side effects such as clearing Spotify tokens or timers.
- Membership bookkeeping, game flow, timers and transport semantics are separate steps,
  not one branch.
- Prefer returning new snapshots over in-place edits; isolate mutation to the owning class.
- `RoomRegistry` and `RoomService` are façades. Do not add logic to them; add it to the
  narrower collaborator and expose it. Collapsing the double façade is tracked work.

## 5. Domain boundary

- "Is this slot valid?", "what does a successful challenge do?", "who is next?" and "what
  happens when a player leaves in phase X?" belong in `packages/game-engine`. The engine
  must handle player removal in **every** phase (`turn`, `challenge`, `reveal`).
- "Who may send this event?", "when does the challenge window auto-resolve?" and "how is
  internal state projected for clients?" belong in `rooms/`.
- Imported-deck mutation and deck-exhaustion handling belong in `rooms/` orchestration
  calling engine functions, never in handlers.

## 6. Errors

- Use stable, typed error codes for every failure category a client can act on: a
  `ServerErrorCode` thrown as `DomainError` (server) or `GameRuleError` (engine); map them to
  client-safe messages in one place (`realtime/errorMessages.ts`). `emitServerError` sends any
  other error as the handler's fallback code and logs it at `error` with its stack.
- Never leak stack traces, internal messages, third-party API responses or file paths to
  clients. Unexpected errors become a generic code plus a server log with a correlation id.
- Do not throw a generic error where a domain code exists.

## 7. Mapping

Mapping from internal game state to `PublicRoomState` is centralised in
`rooms/roomStateMappers.ts` and pure: no mutation, no orchestration, no infrastructure.
Hidden information (`currentTrackCard.releaseYear` during `turn` and `challenge`, other
players' hands) is omitted, not blanked, and a test asserts the omission.

## 8. Timers and process lifecycle

- `rooms/RoomTimerCoordinator.ts` owns every timer (challenge auto-resolve, lobby
  reconnect grace, host transfer, turn skip, all-offline room TTL). No timer is created
  anywhere else.
- Every timer has an owner, a cleanup path on room close and on phase change, and
  re-reads current state before mutating; it never trusts values captured at schedule time.
- Timer callbacks are guarded: they log and never throw. The process installs
  `uncaughtException` and `unhandledRejection` handlers that log and exit cleanly, and
  handles `SIGTERM`/`SIGINT` by closing the socket server before exit.
- Durations come from `env` (`RECONNECT_GRACE_MS`, `HOST_TRANSFER_GRACE_MS`,
  `TURN_SKIP_GRACE_MS`, `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS`); the lifecycle rules they
  implement are stated in `CLAUDE.md` → Connection lifecycle.

## 9. Spotify module

- `spotify/` owns OAuth, token refresh, playback sessions and Web API access. Tokens and
  playback sessions are keyed **per room** and cleared when the room closes; they are never
  logged, never broadcast and never persisted beyond the room lifetime (owner decision
  2026-10-06; any change is new processing and needs compliance review first).
- The OAuth `state` is a server-issued, single-use nonce bound to the room and the host;
  requesting an auth URL and completing the callback both require the caller to be the
  current host of that room.
- Playlist import runs only for an authorised host of an existing room and is
  rate-limited.
- Request only the scopes the product uses.

## 10. Security and trust

- Clients are untrusted: never accept client-computed correctness, permissions, room ids
  for another player, or display names in audit-relevant payloads without validation.
- Validate membership and phase before every mutation; validate host before every
  host-only action, including room close, rename, kick, skip, settings and Spotify actions.
- Socket server: bounded `maxHttpBufferSize`, explicit CORS origins, rate limiting on
  connection and per-event, no `unref()` on timers whose work must complete.
- Room state is in memory only and is lost on restart; say so in behaviour, never pretend
  recovery.

## 11. Logging and audit

- Log startup, shutdown, socket connect/disconnect, unexpected errors and notable room
  lifecycle events through `app/logger.ts` (Pino). Nothing in the engine logs.
- Realtime audit events (`realtime/realtimeAuditLogger.ts`, enabled by
  `ENABLE_EVENT_AUDIT`) carry event name, room id, socket id, error code and correlation
  id. Accepted actions are not audited (decision 9). Payload capture (`EVENT_AUDIT_INCLUDE_PAYLOADS`) may contain display names and
  search queries; it stays off outside test sessions. Axiom is a third-party, US-hosted log
  sink: enabling it for a client-facing deployment is new processing (see
  `docs/operations/axiom_logging_setup.md`).
- Logs are not tests.

## 12. Room directory

`realtime/broadcastRoomDirectory.ts` pushes `PublicRoomSummary` (room code, host display
name, player count, status) only to sockets that are **not** in a room. Do not widen the
payload or the audience; room members already receive authoritative room state.

## 13. Persistence readiness

In-memory storage is the MVP decision. Keep storage behind the room store so a repository
can replace it, but introduce abstractions only where they simplify that replacement, not as
ceremony. Engine rules never depend on storage details.

## 14. Naming

Services and methods read like domain or orchestration actions: `claimChallenge`,
`resolveChallengeWindow`, `removePlayerBySocketId`, `mapGameStateToPublicRoomState`. Avoid
`manager`, `helper`, `misc`, `temp` and numbered names.

## 15. Server tests

In addition to the expectations in `CLAUDE.md` → Testing:

- Realtime tests go through `createSocketHandler` with a fake socket, asserting the ack, the
  broadcast and the replay guard.
- Server tests live under `apps/server/tests/`, mirroring the source folders
  (`tests/rooms/disconnectLifecycle.test.ts` is the pattern). Timer tests use fake timers;
  no real sleeps.
- Every authorisation rule has a negative test (non-host, non-member, wrong phase).
- Fixtures use placeholder data only (`TEST_ROOM_1`, `12345`, `Player One`).
