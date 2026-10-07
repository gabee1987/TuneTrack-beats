# 13 — Network Protocol and Client Resilience

> **Status (2026-10-06):** Phase 1 partially shipped (first-connect/reconnect split, idempotent `create_room`), Phases 3 and 4 shipped (connection effects independent of `t`; acknowledged, idempotent actions). Open: the `GAME_ALREADY_STARTED` recovery dialog and `instanceId` (Phase 1), the durable session id still cleared on room close (Phase 2, the next proof for B8), socket client policy and connection-state model (Phase 5), narrow events and `revision` (Phase 6).
> **Folded from** `docs/plans/2026-09-stability-performance/05-network-protocol-and-resilience.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.
>
> **Binding budgets, order and corrections (2026-10-07):** `05-performance-and-robustness-plan.md` §2 (budgets), §8 (rollout order), §9 (corrections to this document). Where they differ, `05` wins.

> Review findings owned here: F-02, F-17, F-20, F-21 (Phase 5 of the review programme sets the budgets, this document holds the work breakdown) and B-16 (Phase 6). F-01 (`crypto.randomUUID` unguarded in `emitAction`) is on the hotfix track in `00-index.md` §4. Bug register: B8 (`20-bug-register.md`).
> Owning layers: `apps/web/src/services/socket`, the two room-connection hooks,
> `apps/server/src/realtime`, `packages/shared/src/events`.
> Depends on `12-backend-stability-and-sessions.md` (server ownership must be correct first).

The product complaint is "network inconsistencies — it has to be rock solid". The audit
found four independent causes, in rough order of impact:

1. A host reconnect issued the wrong join command and hard-failed — **shipped**, Phase 1.
2. Nothing told the client whether an action succeeded — **shipped**, Phase 4.
3. Changing language rebuilt the connection and re-joined — **shipped**, Phase 3.
4. The socket client has no reconnect policy and no handshake identity — **open**, Phase 5.

## 1. Phase 1 — Make joining idempotent and reconnect-safe · **S1** · partially shipped

### Shipped

- Client: the `create` intent is honoured once (`hasAttemptedCreateRef` in
  `apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts`); every later `"connect"`
  re-joins instead of re-creating.
- Server: `RoomLobbyService.createRoom` treats a repeat `create_room` from the owning
  session as a rejoin via `restorePlayerSession` and throws `ROOM_ALREADY_EXISTS` only for
  a different session (commit `b022d14`).
- Proof: E2E E8 ("a host reconnects inside the recovery window and remains host",
  `apps/e2e/tests/room-entry.spec.ts`) — no `ROOM_ALREADY_EXISTS`, no recovery UI, host-only
  reveal authority retained.
- Not separately verified on 2026-10-06: the `socket.recovered === true` short-circuit and
  stripping `intent` from the URL after the first create. Treat both as open until a test
  proves them.

### 1.3 Give `GAME_ALREADY_STARTED` a recovery path — open

Today `useGameRoomConnection.isClosedRoomError` recognises only `ROOM_NOT_FOUND` and
`ROOM_MEMBERSHIP_NOT_FOUND`, so `GAME_ALREADY_STARTED` becomes an ordinary toast on a page
with no room state. The lobby model flags the code, but no recovery dialog variant exists.

- Add `GAME_ALREADY_STARTED` to the set that triggers the recovery modal, and change that
  modal's copy from "the room was reset" to a variant that says the game is in progress and
  the seat is gone. Two distinct reasons need two distinct messages — see
  `15-design-system-consolidation.md` §5 on the recovery-dialog contract.
- Keep the session id intact when recovering from this (see Phase 2).

### 1.4 Server restart is a distinguishable case — open

After a server restart, all rooms and memberships are gone, so a rejoin returns
`ROOM_NOT_FOUND`. That currently shows the same modal as a host closing the room, which is
misleading. Add a lightweight server-instance identifier:

- The server generates a random `instanceId` at boot and includes it in the handshake
  (Socket.IO `io.on("connection")` can emit it, or it can ride on the
  `PlayerIdentity` payload).
- The client remembers the last seen `instanceId` in `sessionStorage`. If it changes, the
  client knows the server restarted and can say so plainly rather than blaming the room.

This is a small addition to `packages/shared/src/events/serverEvents.ts` and pays for
itself the first time a deployment happens mid-session.

### Acceptance

- [x] E2E: host creates a room, socket drops beyond the recovery window, reconnects, and
      is still host of the same room with no error emitted (E8).
- [ ] Server integration test for the same scenario (still absent; see
      `19-testing-strategy.md`).
- [ ] Integration test: two different sessions racing `create_room` on the same room id —
      first wins, second receives `ROOM_ALREADY_EXISTS`.
- [ ] Integration test: same session emitting `create_room` twice — second is treated as a
      rejoin and returns the same `playerId` (code shipped in `b022d14`; a dedicated test was
      not verified).
- [ ] Integration test: joining a running game with an unknown session receives
      `GAME_ALREADY_STARTED` and the client shows the in-progress recovery dialog.
- [ ] Manual: reload a `/lobby/:id?intent=create` URL and confirm no error.

## 2. Phase 2 — Stabilise the client session identity · **S1** · open — next proof for B8

**Review finding:** F-17. **Bug register:** B8 ("Remaining").

`resetPlayerSession()` (`apps/web/src/services/session/playerSession.ts`) deletes the
durable `tunetrack.playerSessionId`. It is still called from the room-closed handlers of
both `apps/web/src/pages/GamePage/hooks/useGameRoomConnection.ts` and
`apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts` (verified 2026-10-06).
Clearing a _room_ must not clear the _device identity_, because that identity is the only
thing that makes reconnect possible. B8's "Completed" list implies session handling is
finished; it is not until this phase lands, which is why it is B8's next proof.

Change:

- Remove `resetPlayerSession()` from both room-closed handlers.
- Keep the function, but restrict it to a deliberate user action ("forget this device" in
  settings) and to a schema-version bump. It is a legitimate capability, just not part of
  ordinary room teardown.
- Introduce an explicit `clearRoomSession()` that clears only room-scoped client state:
  the cached `roomState`, `currentPlayerId`, and any room-scoped `sessionStorage` keys.
  Recovery should call this.

Additionally, `playerSession.ts` mirrors every value into both `localStorage` and
`sessionStorage` with a read-through that back-fills. That is more machinery than the
problem needs and doubles the failure surface: no access in this file is wrapped in
try/catch, so storage-disabled Safari crashes the game page in `useMemo` (F-17). Rework as:

- one `deviceStorage` helper with try/catch on every access, returning `null` on failure;
- `localStorage` as the source of truth, `sessionStorage` used only as a same-tab cache;
- a `SCHEMA_VERSION` prefix on keys so a future shape change can be migrated rather than
  silently mis-parsed.

The player profile (`apps/web/src/features/profile/playerProfile.ts`,
`17-room-and-player-identity-flow.md`) shipped before this helper existed and keeps its own
storage access; F-17 notes that it and `playerSession.ts` own the same
`tunetrack.playerDisplayName` key with opposite notions of which is legacy. Move the profile
store onto `deviceStorage` and settle key ownership in this phase.

### Acceptance

- [ ] Closing a room and returning home preserves `tunetrack.playerSessionId`.
- [ ] Rejoining a _different_ room after a close reuses the same session id.
- [ ] Every storage access is inside a try/catch; a test with a throwing storage stub
      renders the app without error.
- [ ] Existing `playerSession.test.ts` extended, not replaced.
- [ ] One module owns `tunetrack.playerDisplayName`.

## 3. Phase 3 — Remove `t` from the connection effects · **S2** · shipped

Both room-connection hooks hold `t` in a `translateRef` and no longer list it in the
connection effect's dependency array; a language change no longer tears down listeners or
re-emits a join (B8 ledger: "Language changes no longer rebuild the room connection").
Deviation: the plan's dependency audit kept `navigate` as "stable", but review finding
F-21 shows `useGameRoomConnection`'s effect still depends on it and re-runs `JoinRoom` on
any pathname change — keep `navigate` in a ref as well (owned by review Phase 5). A
component test counting emits across a language change was not verified; add it under
`19-testing-strategy.md` if absent.

## 4. Phase 4 — Acknowledged, idempotent client actions · **S2** · shipped

Landed as planned: `ActionAck` in `packages/shared/src/events/actionAck.ts`,
`emitAction` in `apps/web/src/services/socket/emitAction.ts` (pending / rejected / timeout /
offline results, bounded retry), optional `requestId` on every mutating payload, and a
per-room `requestId` LRU in `apps/server/src/rooms/RoomStore.ts` that replays the earlier
ack instead of re-applying. Proof: `createSocketHandler.test.ts` (ack on success, schema
failure, thrown error, absent ack) plus per-action replay and component tests; the
settings, profile and rename actions also went through the acknowledged path rather than
staying fire-and-forget. Known defect: F-01 — `emitAction` calls `crypto.randomUUID()`
unguarded, which throws on plain-HTTP LAN play; the fix (reuse the `sessionId.ts` fallback)
is on the hotfix track in `00-index.md` §4.

## 5. Phase 5 — Honest connection state in the UI · **S2** · open

**Review findings:** F-02, F-20, F-21. **Bug register:** B8 ("Remaining").

### 5.1 Configure the socket client

`apps/web/src/services/socket/socketClient.ts` still passes only `{ autoConnect: false }`
(verified 2026-10-06). Replace with an explicit policy:

    io(url, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      randomizationFactor: 0.5,
      timeout: 10_000,
      auth: { sessionId: getOrCreatePlayerSessionId() },
    })

`reconnectionAttempts: Infinity` is correct for this product: a party host who walks out of
Wi-Fi range and comes back should reconnect, not be told to reload. The capped 5 s delay
keeps recovery fast without hammering the server.

`auth: { sessionId }` lets the server identify the device at handshake time, which enables
the `12-backend-stability-and-sessions.md` §2 recovery path and lets the server log a
stable identifier without waiting for an application-level join.

Security note: the session id is an opaque random UUID with no personal data and no
authority of its own — the server still validates every membership and permission against
its own maps. Do not let it become a bearer token; specifically, never accept a client's
claim about which player it is without checking `sessionMemberships`.

### 5.2 A single connection-state model

The English literals `"Connecting"` / `"Connected"` / `"Disconnected"` are still produced
in `useLobbyRoomConnection.ts` and compared by string in `LobbyHeader.tsx` (F-20). Replace
them with a typed state exposed from the socket service, not from a page hook:

    export type ConnectionState =
      | { status: "connecting" }
      | { status: "connected" }
      | { status: "reconnecting"; attempt: number }
      | { status: "offline"; since: number }
      | { status: "server_restarting" };

- Derived from `connect`, `disconnect`, `connect_error`,
  `io.on("reconnect_attempt")` and the `ServerShuttingDown` event from
  `12-backend-stability-and-sessions.md` §3.1 (still open there: no SIGTERM/SIGINT
  handling exists yet).
- Exposed through a `useConnectionState()` hook backed by `useSyncExternalStore`, so it is
  a single subscription rather than per-page state. Neither `ConnectionBanner` nor
  `useConnectionState` exists today.
- Rendered by one app-level `ConnectionBanner` in the overlay host from
  `14-navigation-and-overlays.md` §4, so every screen gets the same treatment. The game
  page currently has no connection-loss feedback at all: `useGameRoomConnection` never
  subscribes to `disconnect`, and `GamePageReconnectToast` / `usePlayerReconnectToast`
  exist with zero importers (F-02). The toast answers a different question ("who is
  back?"); either mount it deliberately alongside the banner, visually distinct, or delete
  it.
- All copy goes through i18n keys in both `en.properties` and `hu.properties`.

### 5.3 Queue user intent while offline

When `status` is `offline` or `reconnecting`, a mutation should not be silently dropped.

- `emitAction` returns `"offline"`, and the calling controller decides: gameplay actions
  are **refused** with a clear message (the server is authoritative and the game may have
  moved on), while low-stakes preference changes are applied locally and re-sent on
  reconnect. Today offline and rejected acks are reset to `idle` silently (F-02).
- Do not build a general-purpose offline action queue. For a server-authoritative realtime
  game, replaying stale intent after a 30 s gap is worse than refusing it. Recorded in
  `docs/decision_log.md` (2026-10-06).

### Acceptance

- [ ] No English literal reaches the UI from a connection code path.
- [ ] `ConnectionBanner` appears within 1 s of a drop and clears on recovery, on every route,
      including the game page.
- [ ] A gameplay action attempted while offline shows a refusal, not a silent no-op.
- [ ] `resolveServerUrl.test.ts` unchanged; new `connectionState.test.ts` covers each
      transition including `server_restarting`.
- [ ] `useGameRoomConnection`'s connect effect runs once per room id; `navigate` is held in
      a ref (F-21).

## 6. Phase 6 — Shrink the broadcast payload · **S2** · open

**Review finding:** B-16. Sequenced last because it is the riskiest change and because
`11-runtime-and-motion-performance.md` §7 (client-side slice diffing) is its natural
counterpart.

### 6.1 What is being sent today

`registerSocketHandlers` emits the full `PublicRoomState` to the whole room on every
mutation. The object includes every player, every player's full timeline, `settings`,
`turn`, `challengeState`, `revealState`, up to 30 `history` entries and
`currentTrackCard`. A TT-token award re-sends all of it — roughly 60–70 kB per event at six
players with thirty cards each (B-16). Every playlist-editor edit additionally re-emits the
whole imported deck (up to about 300 kB) to the host.

### 6.2 Recommended approach: field-scoped updates, not a generic delta protocol

A generic JSON-patch delta protocol was considered earlier and never started. It is not
the right first step: it is complex, it makes ordering load-bearing, and it interacts badly
with Socket.IO recovery replay.

Instead, add a small number of **narrow, named** events for the high-frequency mutations
that touch one field, and keep `state_update` as the full-state fallback:

| New event                   | Payload                                                             | Replaces a full broadcast for    |
| --------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| `player_connection_changed` | `{ roomId, playerId, connectionStatus, reconnectExpiresAtEpochMs }` | connect / disconnect / reconnect |
| `player_tokens_changed`     | `{ roomId, playerId, ttTokenCount }`                                | award / remove / spend TT        |
| `room_settings_changed`     | `{ roomId, settings }`                                              | every host settings toggle       |
| `turn_changed`              | `{ roomId, turn, currentTrackCard }`                                | turn advance                     |

Rules:

- `state_update` remains the authority and is still sent on join, on reconnect, on phase
  changes (`turn` to `challenge` to `reveal` to `finished`), and whenever a narrow event
  would be ambiguous. When in doubt, send the full state — correctness first.
- Every narrow event carries a monotonically increasing `revision` from the room record.
  The client applies a narrow event only if `revision === localRevision + 1`; otherwise it
  requests a full `state_update`. This is what makes the scheme safe under recovery replay
  and out-of-order delivery, and it is far simpler to reason about than a patch protocol.
- Add `revision: number` to `PublicRoomState`, incremented in `RoomStore.setRoom`. No
  revision counter exists today.

### 6.3 Also trim what is in the full state

- `history` is already capped at 30. Consider moving it behind an explicit
  `get_game_history` request, since it is only rendered in the game menu's History tab
  (`gameMenu/HistoryTabContent.tsx`). That removes the largest field from the common path.
- Playlist-editor edits should acknowledge the change and send the edited track, not the
  whole deck (B-16).
- Data-minimisation check: confirm no field in `PublicRoomState` reveals information a
  player should not have. `currentTrackCard.releaseYear` is already omitted during
  `turn`/`challenge` — add a test that locks this in, because a regression here would leak
  the answer to the game.

### Acceptance

- [ ] A TT-token award transmits under 300 bytes instead of the full room state.
- [ ] `revision` gap handling covered by a test: a client that misses event `n` requests and
      receives a full state.
- [ ] A test asserts `currentTrackCard.releaseYear` and `sourceReleaseYear` are absent from
      the payload during `turn` and `challenge` for every player.
- [ ] Measured bytes-per-turn recorded in
      `docs/plans/2026-10-project-review/network-baseline.md` before and after (no baseline
      file has been created yet).

## 7. Risk register

| Risk                                                                  | Mitigation                                                                                                                                                                                   |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idempotent `create_room` masks a genuine collision                    | Only the owning session is treated as a rejoin; a different session still gets `ROOM_ALREADY_EXISTS`. The racing-sessions test (Phase 1 acceptance) is still to be written.                  |
| `connectionStateRecovery` replays packets the client is not ready for | Full `state_update` is last-write-wins, so replay is safe today; the `revision` guard in Phase 6 keeps it safe after narrow events land.                                                     |
| Acks change error surfacing and hide errors a page currently shows    | The legacy `Error` event is still emitted alongside acks; remove it only when every action is acknowledged and the connection banner exists.                                                 |
| Narrow events drift out of sync with full state                       | `revision` guard plus a rule that any ambiguity sends full state. Add a test that applies a random interleaving of narrow and full updates and asserts the client state equals the server's. |
| `reconnectionAttempts: Infinity` masks a dead server                  | The `server_restarting` state and the `instanceId` check give the user an honest message; the banner shows elapsed offline time.                                                             |
