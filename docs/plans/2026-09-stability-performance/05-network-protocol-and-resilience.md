# 05 — Network Protocol and Client Resilience

> Addresses findings **F-11, F-13, F-14, F-15, F-21 – F-24**.
> Owning layers: `apps/web/src/services/socket`, the two room-connection hooks,
> `apps/server/src/realtime`, `packages/shared/src/events`.
> Depends on Doc 04 (server ownership must be correct first).

The product complaint is "network inconsistencies — it has to be rock solid". The audit
found four independent causes, in rough order of impact:

1. A host reconnect issues the wrong join command and hard-fails (**F-13**).
2. Nothing tells the client whether an action succeeded (**F-21**).
3. Changing language rebuilds the connection and re-joins (**F-15**).
4. The socket client has no reconnect policy and no handshake identity (**F-22**).

## 1. Phase 1 — Make joining idempotent and reconnect-safe · **S1**

**Findings:** F-13, F-24.

### 1.1 Client: separate "first connect" from "reconnect"

`apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts` registers `handleConnect`
as the `"connect"` listener, and `handleConnect` chooses `CreateRoom` vs `JoinRoom` from
the `intent` query parameter. Socket.IO fires `"connect"` on every reconnect, so a host
re-creates a room that already exists and receives `ROOM_ALREADY_EXISTS`.

Change:

- Track `hasCompletedInitialHandshakeRef`. The `create` intent is honoured **once**; every
  subsequent `"connect"` emits `JoinRoom`.
- Prefer using Socket.IO's own signal where available: with
  `connectionStateRecovery` enabled (Doc 04 section 2.1), a recovered socket keeps its
  membership server-side, so on `socket.recovered === true` the client should emit
  **nothing at all** and simply wait for the next `state_update`. Emit a join only when
  the connection is genuinely new.
- Strip `intent` from the URL after the first successful create, using
  `navigate(pathname, { replace: true })`, so a manual page reload of a lobby URL never
  attempts a re-create.

### 1.2 Server: make `create_room` idempotent for its owner

Defence in depth — the client fix alone is not sufficient, because a stale tab or a
double-tap can still produce a second `create_room`.

In `apps/server/src/rooms/RoomLobbyService.createRoom`, before throwing
`ROOM_ALREADY_EXISTS`:

- if the room exists **and** `getSessionMembership(sessionId)` points at that same room
  **and** the room still lists that player, treat the call as a rejoin and delegate to
  `connection.restorePlayerSession(...)`. Return the existing `JoinRoomResult`.
- Only throw `ROOM_ALREADY_EXISTS` when the room exists and belongs to a different
  session.

This preserves server authority (the session id is the client's claim, but the server's
own membership map is the arbiter) and removes an entire class of user-visible failure.

### 1.3 Give `GAME_ALREADY_STARTED` a recovery path

**Finding:** F-24. Today `useGameRoomConnection.isClosedRoomError` recognises only
`ROOM_NOT_FOUND` and `ROOM_MEMBERSHIP_NOT_FOUND`, so
`GAME_ALREADY_STARTED` becomes an ordinary toast on a page with no room state.

- Add `GAME_ALREADY_STARTED` to the set that triggers the recovery modal, and change that
  modal's copy from "the room was reset" to a variant that says the game is in progress and
  the seat is gone. Two distinct reasons need two distinct messages — see Doc 07 section 5
  on the recovery-dialog contract.
- Keep the session id intact when recovering from this (see Phase 2).

### 1.4 Server restart is a distinguishable case

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

- [ ] Integration test: host creates a room, socket drops beyond the recovery window,
      reconnects, and is still host of the same room with no error emitted.
- [ ] Integration test: two different sessions racing `create_room` on the same room id —
      first wins, second receives `ROOM_ALREADY_EXISTS`.
- [ ] Integration test: same session emitting `create_room` twice — second is treated as a
      rejoin and returns the same `playerId`.
- [ ] Integration test: joining a running game with an unknown session receives
      `GAME_ALREADY_STARTED` and the client shows the in-progress recovery dialog.
- [ ] Manual: reload a `/lobby/:id?intent=create` URL and confirm no error.

## 2. Phase 2 — Stabilise the client session identity · **S1**

**Finding:** F-14.

`resetPlayerSession()` (`apps/web/src/services/session/playerSession.ts` lines 66-69)
deletes the durable `tunetrack.playerSessionId`. It is called from both
`handleClosedRoomReset` implementations. Clearing a *room* must not clear the *device
identity*, because that identity is the only thing that makes reconnect possible.

Change:

- Remove `resetPlayerSession()` from both `handleClosedRoomReset` functions.
- Keep the function, but restrict it to a deliberate user action ("forget this device" in
  settings) and to a schema-version bump. It is a legitimate capability, just not part of
  ordinary room teardown.
- Introduce an explicit `clearRoomSession()` that clears only room-scoped client state:
  the cached `roomState`, `currentPlayerId`, and any room-scoped `sessionStorage` keys.
  Recovery should call this.

Additionally, `playerSession.ts` mirrors every value into both `localStorage` and
`sessionStorage` with a read-through that back-fills. That is more machinery than the
problem needs and doubles the failure surface (a private-window `localStorage` throw is
not caught anywhere in this file — every access is unguarded). Rework as:

- one `deviceStorage` helper with try/catch on every access, returning `null` on failure;
- `localStorage` as the source of truth, `sessionStorage` used only as a same-tab cache;
- a `SCHEMA_VERSION` prefix on keys so a future shape change can be migrated rather than
  silently mis-parsed.

Doc 09 section 2 builds the player profile on top of this helper, so do it here.

### Acceptance

- [ ] Closing a room and returning home preserves `tunetrack.playerSessionId`.
- [ ] Rejoining a *different* room after a close reuses the same session id.
- [ ] Every storage access is inside a try/catch; a test with a throwing storage stub
      renders the app without error.
- [ ] Existing `playerSession.test.ts` extended, not replaced.

## 3. Phase 3 — Remove `t` from the connection effects · **S2**

**Finding:** F-15.

Both room-connection effects list the i18n `t` callback in their dependency arrays, so a
language change tears down all socket listeners and re-emits a join.

Change (identical in both hooks):

- Hold `t` in a ref updated on every render:
  `const translateRef = useRef(t); translateRef.current = t;`
- Use `translateRef.current` inside `handleError`.
- Remove `t` from the dependency array.

While in these files, audit the remaining dependencies:

| Dependency | Stable? | Action |
| --- | --- | --- |
| `navigate` | Stable in react-router v6 | keep |
| `playerSessionId` | `useMemo(..., [])` | keep |
| `roomId` | Route param | keep |
| `displayName` (lobby) | Derived from a query param, **changes on rename** | remove — Doc 09 section 3 stops the rename from changing it |
| `intent` (lobby) | Derived from a query param | keep, but see Phase 1.1 which strips it after use |
| `rememberedDisplayName` (game) | `useMemo(..., [])` | keep |

The goal is that the connection effect runs **exactly once per room id**, for the whole
lifetime of that room. Anything that re-runs it is a bug.

### Acceptance

- [ ] Switching language mid-lobby and mid-game does not emit any socket event and does
      not drop any listener. Assert in a component test by counting emits on a stub socket.
- [ ] Renaming yourself in the lobby does not re-run the connection effect (this depends
      on Doc 09 section 3 landing).
- [ ] `useLobbyRoomConnection.test.ts` extended with a language-change case.

## 4. Phase 4 — Acknowledged, idempotent client actions · **S2**

**Finding:** F-21. This is the structural fix for "it feels unreliable".

### 4.1 The contract

Today every action is `socket.emit(event, payload)` and the only feedback channel is a
global `Error` event with no correlation to the action that caused it. Introduce
acknowledgements, which Socket.IO supports natively and which cost nothing when unused.

Add to `packages/shared/src/events/`:

    export interface ActionAck<TResult = void> {
      ok: boolean;
      requestId: string;
      code?: string;          // error code when ok === false
      result?: TResult;
    }

Server side, in `apps/server/src/realtime/createSocketHandler.ts`:

- Accept an optional ack callback as the handler's second argument.
- On schema failure, call `ack({ ok: false, requestId, code: invalidPayload.code })`
  **and** keep emitting the existing `Error` event for backward compatibility during
  migration.
- On thrown error, call `ack({ ok: false, requestId, code })`.
- On success, call `ack({ ok: true, requestId })`.
- Keep the room broadcast exactly as it is: the ack says "your action was accepted", the
  broadcast says "here is the new truth". Do not return state in the ack; that would
  create a second source of truth on the client.

Client side, in `apps/web/src/services/socket/`:

- New `emitAction<TPayload>(event, payload, options)` helper that:
  - generates a `requestId`;
  - uses `socket.timeout(ms).emitWithAck(...)` (Socket.IO 4.6+) with a default 8 s timeout;
  - resolves to a discriminated result `{ status: "ok" } | { status: "rejected", code } |
    { status: "timeout" } | { status: "offline" }`;
  - returns `"offline"` immediately when `socket.connected === false`, rather than letting
    Socket.IO buffer the emit indefinitely.

### 4.2 Idempotency

Retries and the recovery-replay behaviour from Doc 04 section 2.1 make it possible for the
server to see the same action twice. For most events this is harmless (settings toggles are
idempotent by nature) but three are not: `place_card`, `place_challenge`,
`buy_timeline_card_with_tt`, `skip_track_with_tt`, `award_tt`.

- Add an optional `requestId` to those payload schemas in
  `packages/shared/src/events/schemas.ts`.
- Keep a small per-room LRU of recently applied `requestId`s (last 32) in `RoomStore`.
- On a repeat, return the previous ack result and do **not** re-apply. This is a server-side
  guard, so it holds regardless of client behaviour.

This is also a correctness improvement independent of retries: it stops a double-tap on
"Confirm placement" from consuming two cards.

### 4.3 Client UX built on the ack

Per-action feedback becomes possible for the first time:

- Buttons that trigger a mutation enter a pending state until the ack resolves, and are
  disabled while pending. This alone removes the double-tap class of bug.
- `"rejected"` shows the localised error for the code, attributed to the action the user
  just took.
- `"timeout"` shows "we did not hear back — retrying" and retries once, then surfaces a
  retry affordance. Because of 4.2, the retry is safe.
- `"offline"` shows a persistent connection banner (see Phase 5) instead of a toast.

Migrate incrementally, highest-risk actions first: `place_card`, `confirm_reveal`,
`place_challenge`, `claim_challenge`, `start_game`, `close_room`. Settings toggles can stay
fire-and-forget until last.

### Acceptance

- [ ] `createSocketHandler.test.ts` extended: ack on success, ack on schema failure, ack on
      thrown error, and ack absent (older client) does not break the handler.
- [ ] New test: replaying the same `requestId` for `place_card` applies the placement once
      and returns the same ack twice.
- [ ] Component test: pressing "Confirm placement" twice in quick succession emits one
      action and the button is disabled between press and ack.
- [ ] Component test: an ack timeout shows the retry affordance and a single retry.

## 5. Phase 5 — Honest connection state in the UI · **S2**

**Findings:** F-22, F-23.

### 5.1 Configure the socket client

`apps/web/src/services/socket/socketClient.ts` currently passes only
`{ autoConnect: false }`. Replace with an explicit policy:

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
the Doc 04 section 2 recovery path and lets the server log a stable identifier without
waiting for an application-level join.

Security note: the session id is an opaque random UUID with no personal data and no
authority of its own — the server still validates every membership and permission against
its own maps. Do not let it become a bearer token; specifically, never accept a client's
claim about which player it is without checking `sessionMemberships`.

### 5.2 A single connection-state model

Replace the three hardcoded English strings (`"Connecting"`, `"Connected"`,
`"Disconnected"`) with a typed state exposed from the socket service, not from a page hook:

    export type ConnectionState =
      | { status: "connecting" }
      | { status: "connected" }
      | { status: "reconnecting"; attempt: number }
      | { status: "offline"; since: number }
      | { status: "server_restarting" };

- Derived from `connect`, `disconnect`, `connect_error`,
  `io.on("reconnect_attempt")` and the new `ServerShuttingDown` event from
  Doc 04 section 3.1.
- Exposed through a `useConnectionState()` hook backed by `useSyncExternalStore`, so it is
  a single subscription rather than per-page state.
- Rendered by one app-level `ConnectionBanner` in the overlay host from Doc 06 section 4,
  so every screen gets the same treatment. `GamePageReconnectToast` already exists for
  *other players'* reconnects — keep that, it answers a different question ("who is back?"),
  and make sure the two are visually distinct.
- All copy goes through i18n keys in both `en.properties` and `hu.properties`.

### 5.3 Queue user intent while offline

When `status` is `offline` or `reconnecting`, a mutation should not be silently dropped.

- `emitAction` returns `"offline"`, and the calling controller decides: gameplay actions
  are **refused** with a clear message (the server is authoritative and the game may have
  moved on), while low-stakes preference changes are applied locally and re-sent on
  reconnect.
- Do not build a general-purpose offline action queue. For a server-authoritative realtime
  game, replaying stale intent after a 30 s gap is worse than refusing it. Record this
  decision in `docs/decision_log.md`.

### Acceptance

- [ ] No English literal reaches the UI from a connection code path.
- [ ] `ConnectionBanner` appears within 1 s of a drop and clears on recovery, on every route.
- [ ] A gameplay action attempted while offline shows a refusal, not a silent no-op.
- [ ] `resolveServerUrl.test.ts` unchanged; new `connectionState.test.ts` covers each
      transition including `server_restarting`.

## 6. Phase 6 — Shrink the broadcast payload · **S2**

**Finding:** F-11. Sequenced last because it is the riskiest change and because
Doc 03 section 7 (client-side slice diffing) is its natural counterpart.

### 6.1 What is being sent today

`registerSocketHandlers` emits the full `PublicRoomState` to the whole room on every
mutation. The object includes every player, every player's full timeline, `settings`,
`turn`, `challengeState`, `revealState`, up to 30 `history` entries and
`currentTrackCard`. A TT-token award re-sends all of it.

### 6.2 Recommended approach: field-scoped updates, not a generic delta protocol

A generic JSON-patch delta protocol was considered in the earlier
`refactor_performance_maintainability_plan.md` (Phase 8, never started). It is not the
right first step: it is complex, it makes ordering load-bearing, and it interacts badly
with Socket.IO recovery replay.

Instead, add a small number of **narrow, named** events for the high-frequency mutations
that touch one field, and keep `state_update` as the full-state fallback:

| New event | Payload | Replaces a full broadcast for |
| --- | --- | --- |
| `player_connection_changed` | `{ roomId, playerId, connectionStatus, reconnectExpiresAtEpochMs }` | connect / disconnect / reconnect |
| `player_tokens_changed` | `{ roomId, playerId, ttTokenCount }` | award / remove / spend TT |
| `room_settings_changed` | `{ roomId, settings }` | every host settings toggle |
| `turn_changed` | `{ roomId, turn, currentTrackCard }` | turn advance |

Rules:

- `state_update` remains the authority and is still sent on join, on reconnect, on phase
  changes (`turn` to `challenge` to `reveal` to `finished`), and whenever a narrow event
  would be ambiguous. When in doubt, send the full state — correctness first.
- Every narrow event carries a monotonically increasing `revision` from the room record.
  The client applies a narrow event only if `revision === localRevision + 1`; otherwise it
  requests a full `state_update`. This is what makes the scheme safe under recovery replay
  and out-of-order delivery, and it is far simpler to reason about than a patch protocol.
- Add `revision: number` to `PublicRoomState`, incremented in `RoomStore.setRoom`.

### 6.3 Also trim what is in the full state

- `history` is already capped at 30. Consider moving it behind an explicit
  `get_game_history` request, since it is only rendered in the game menu's History tab
  (`gameMenu/HistoryTabContent.tsx`). That removes the largest field from the common path.
- Data-minimisation check: confirm no field in `PublicRoomState` reveals information a
  player should not have. `currentTrackCard.releaseYear` is already omitted during
  `turn`/`challenge` per the earlier phase-5 work — add a test that locks this in, because
  a regression here would leak the answer to the game.

### Acceptance

- [ ] A TT-token award transmits under 300 bytes instead of the full room state.
- [ ] `revision` gap handling covered by a test: a client that misses event `n` requests and
      receives a full state.
- [ ] A test asserts `currentTrackCard.releaseYear` and `sourceReleaseYear` are absent from
      the payload during `turn` and `challenge` for every player.
- [ ] Measured bytes-per-turn recorded in `docs/plans/2026-09-stability-performance/network-baseline.md`
      before and after.

## 7. Risk register

| Risk | Mitigation |
| --- | --- |
| Idempotent `create_room` masks a genuine collision | Only the owning session is treated as a rejoin; a different session still gets `ROOM_ALREADY_EXISTS`, and there is a test for it. |
| `connectionStateRecovery` replays packets the client is not ready for | Full `state_update` is last-write-wins, so replay is safe today; the `revision` guard in Phase 6 keeps it safe after narrow events land. |
| Acks change error surfacing and hide errors a page currently shows | Keep emitting the legacy `Error` event through the whole migration; remove it only when every action is acknowledged. |
| Narrow events drift out of sync with full state | `revision` guard plus a rule that any ambiguity sends full state. Add a test that applies a random interleaving of narrow and full updates and asserts the client state equals the server's. |
| `reconnectionAttempts: Infinity` masks a dead server | The `server_restarting` state and the `instanceId` check give the user an honest message; the banner shows elapsed offline time. |
