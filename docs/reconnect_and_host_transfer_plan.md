# Reconnect And Host Transfer Plan

> Purpose: define a robust, UX-friendly reconnect and host-transfer system for
> TuneTrack Beats.
>
> This plan is intentionally detailed enough to resume implementation in a later
> chat without rediscovering the architecture. It should be implemented in small,
> testable steps and kept aligned with `backend_engineering_rules.md` and
> `frontend_engineering_rules.md`.

## 1. Goals

- Let players reconnect to the same room, player identity, timeline, TT tokens,
  turn state, and host permissions after refresh, browser close, socket drop, or
  reopening the room from the same device.
- Prevent `Unknown player` UI states caused by removing players while game state
  still references their IDs.
- Keep active games moving when the host leaves by automatically transferring
  host to another connected player.
- Let the host manually transfer host role to another player from the in-game
  Players tab.
- Keep the backend professional and teachable: explicit domain concepts,
  separated responsibilities, focused tests, no ad hoc socket-handler logic.

## 2. Current State

Relevant existing implementation:

- Shared room state lives in `packages/shared/src/game/roomState.ts`.
- Shared socket contracts live in `packages/shared/src/events/clientEvents.ts`,
  `serverEvents.ts`, and `schemas.ts`.
- Backend room orchestration is currently concentrated in
  `apps/server/src/rooms/RoomRegistry.ts`.
- `RoomService` delegates room operations to `RoomRegistry`.
- The frontend sends `sessionId` with `join_room`.
- Browser session ID is stored in `sessionStorage` by
  `apps/web/src/services/session/playerSession.ts`.
- Lobby reconnect works only while the same tab/session is alive and while the
  short server grace period has not expired.
- After deferred removal, the backend removes the player from `roomState.players`
  and deletes their timeline entry. Game state can still reference that player,
  which can produce `Unknown player` labels in the frontend.
- Host currently migrates implicitly when the removed host leaves, but this is
  tied to player removal rather than a clear host-transfer policy.

## 3. Product Decisions

### 3.1 Player Reconnect

Reconnect should be treated as recovering a reserved player seat, not as joining
the room again.

The server should keep player records during an active game even when the socket
disconnects. A disconnected player is still part of the game unless the room is
closed or a future explicit removal/kick feature removes them.

### 3.2 Host Disconnect

If the host disconnects from an active room and at least one other connected
player exists, host role should transfer automatically to another connected
player so the game can continue.

The disconnected former host remains a normal disconnected player and can later
reconnect to their own seat. They do not automatically reclaim host role unless
the current host transfers it back manually.

### 3.3 Manual Host Transfer

The current host can transfer host role to any other player from the game menu's
Players tab.

Recommended first behavior:

- Allow transfer to connected players only.
- Hide or disable transfer for the current host's own list item.
- Show transfer actions only to the current host.
- Keep the action available during lobby and active game, unless a specific
  gameplay state later proves it should be restricted.

### 3.4 Automatic Host Selection

Automatic transfer should be deterministic and simple.

Recommended rule:

1. Pick the first connected non-host player in current `players` order.
2. If no connected player exists, keep the current host reserved and mark them
   disconnected.
3. When any non-host player reconnects and the host is still disconnected with
   no connected host, transfer host to the first connected player.

This keeps behavior predictable and avoids hidden scoring or turn-order logic.

## 4. Target UX

### 4.1 Other Players See Host Leaving

When host disconnects and another host is available:

- Roster updates immediately.
- Old host shows as disconnected.
- New host receives host controls.
- Optional transient status: `Host transferred to Alice.`

When no other connected player is available:

- Room remains recoverable.
- UI may show: `Waiting for someone to reconnect.`

### 4.2 Former Host Reconnects

If the former host returns after automatic transfer:

- They reconnect as their original player.
- Their display name, timeline, tokens, and turn identity are preserved.
- They see normal player controls unless the current host transfers host back.

### 4.3 Current Host Manual Transfer

In the game menu Players tab:

- Each player row can expand on touch/click.
- For the host, expanded rows for other connected players reveal a
  `Transfer host` action.
- Confirm before transfer:
  `Transfer host controls to Alice?`
- After success, the menu updates immediately and the old host loses host-only
  controls.

### 4.4 Reconnect Entry Points

Recommended later frontend behavior:

- Opening `/game/:roomId` should auto-reconnect if the browser has a valid room
  recovery token.
- Home page should eventually show `Resume game ABCD` when a recoverable room is
  found locally.

This document focuses the implementation plan on backend correctness and the
in-game manual host-transfer UX first.

## 5. Backend Architecture

### 5.1 Shared Contracts

Add explicit public connection state to player state.

Likely update:

```ts
export type PlayerConnectionStatus = "connected" | "disconnected";

export interface PublicPlayerState {
  id: PlayerId;
  displayName: string;
  isHost: boolean;
  connectionStatus: PlayerConnectionStatus;
  disconnectedAtEpochMs: number | null;
  reconnectExpiresAtEpochMs: number | null;
  ...
}
```

Add a client event:

```ts
TransferHost: "transfer_host"
```

Payload:

```ts
export interface TransferHostPayload {
  roomId: RoomId;
  playerId: PlayerId;
}
```

Schema:

```ts
export const transferHostPayloadSchema = z.object({
  roomId: roomIdSchema,
  playerId: z.string().trim().min(1),
});
```

### 5.2 Reconnect Credential

Current `sessionStorage` is too narrow. It survives refresh but not all browser
close/reopen cases and does not support a polished resume flow.

Recommended target:

- Frontend stores a durable per-room recovery token in `localStorage`.
- Server stores token hash or opaque membership secret in room membership state.
- Join can continue to accept `sessionId` for now, but the better long-term
  model is `join_room` plus `reconnectToken` or a dedicated `restore_room`
  event.

Phased implementation:

1. First add connection status and host transfer while keeping current
   `sessionId`.
2. Then add durable room recovery token and local resume UX.

This avoids mixing identity persistence, host transfer, and UI expansion into one
large risky change.

### 5.3 Room Domain Structure

`RoomRegistry.ts` is already large. Host transfer and reconnect should be used
as a chance to split responsibilities, not add more inline complexity.

Recommended modules:

- `apps/server/src/rooms/RoomRegistry.ts`
  Public facade used by `RoomService`. Coordinates repositories and policies.

- `apps/server/src/rooms/RoomRepository.ts`
  Owns `roomsById`, socket memberships, session memberships, and lookups.

- `apps/server/src/rooms/RoomMembershipService.ts`
  Owns join, restore, disconnect marking, reconnect marking, and player
  connection status transitions.

- `apps/server/src/rooms/HostTransferService.ts`
  Owns host authorization, manual transfer, automatic transfer policy, and
  host flag normalization.

- `apps/server/src/rooms/RoomStateMapper.ts`
  Owns `mapGameStateToPublicRoomState` and track/timeline mapping helpers.

- `apps/server/src/rooms/RoomTimers.ts`
  Owns reconnect cleanup timers and challenge timers, or at minimum separates
  timer coordination from membership rules.

Do not move everything at once unless tests are already protecting behavior.
Preferred sequence is extract one responsibility at a time.

### 5.4 Host Transfer Domain Rules

Manual transfer:

- Validate socket membership exists.
- Validate room exists.
- Validate requester is current host.
- Validate target player exists in same room.
- Validate target player is not current host.
- Validate target player is connected.
- Set `hostId` to target player.
- Normalize all `players[].isHost`.
- Emit full state update.

Automatic transfer:

- On disconnect, mark socket disconnected.
- If disconnected player is host, attempt automatic host transfer.
- Transfer only to a connected player.
- If no connected players exist, keep hostId unchanged.
- On reconnect, if current host is disconnected and at least one connected
  player exists, ensure there is a connected host.

Important invariant:

- `roomState.hostId` must always reference an existing player in
  `roomState.players`.
- Exactly one player should have `isHost: true`.
- During an active game, disconnected players remain in `roomState.players`.

### 5.5 Player Removal

Do not remove active-game players as part of normal disconnect.

Recommended cleanup policy:

- Lobby: disconnected players may be removed after a short grace period if the
  game has not started.
- Active game: disconnected players remain until room closes or future explicit
  removal feature exists.
- Empty room: if all players are disconnected, keep the room for a room TTL
  before deletion.

The existing short reconnect grace timer can still exist, but its active-game
  behavior should become "mark stale/recoverable" rather than "delete player."

### 5.6 Error Codes

Add clear domain errors and map them to client-safe messages:

- `ONLY_HOST_CAN_TRANSFER_HOST`
- `HOST_TRANSFER_TARGET_NOT_FOUND`
- `HOST_TRANSFER_TARGET_DISCONNECTED`
- `HOST_TRANSFER_TARGET_IS_ALREADY_HOST`
- `ROOM_MEMBERSHIP_NOT_FOUND`

Socket handlers should not invent these rules. They should parse payloads,
delegate to `RoomService`, and emit errors.

## 6. Frontend Architecture

### 6.1 Session Service

Short term:

- Keep using `getOrCreatePlayerSessionId`.
- Consider moving from `sessionStorage` to `localStorage` only after backend
  supports durable recovery tokens.

Long term:

- Add `roomRecoverySession.ts` under `apps/web/src/services/session`.
- Store per-room recoverable sessions:
  `tunetrack.roomRecoverySessions`.
- Shape:

```ts
interface StoredRoomRecoverySession {
  roomId: string;
  playerId: string;
  displayName: string;
  reconnectToken: string;
  lastSeenAtEpochMs: number;
}
```

### 6.2 Game Actions Hook

Add a host-transfer action near other game actions:

- `useGamePageActions.ts`
  Add `handleTransferHost(playerId: string)`.

- `useGamePageCapabilityState.ts`
  Expose whether host transfer is available.

- `gamePageMenuTabs.tsx`
  Pass action into the Players tab model.

Keep socket emits in page-level action hooks, not in presentational list items.

### 6.3 Players Tab UI

Current request: make player list item expandable on touch and reveal transfer
host button.

Recommended component structure:

- `GamePlayersPanel.tsx`
  Owns list composition and current host context.

- `GamePlayerListItem.tsx`
  Presentational expandable row.

- `useExpandablePlayerRows.ts`
  Optional local UI state if expansion logic grows.

Interaction:

- Tapping a row expands/collapses it.
- Expanded host-only action area appears for eligible target players.
- Transfer button uses a normal button with clear disabled states.
- Confirm with existing modal/dialog pattern if one exists. If not, use
  `window.confirm` as a temporary implementation and document follow-up.

Accessibility:

- Row expansion button should expose `aria-expanded`.
- Transfer button should include target player name.
- Disabled state should explain why transfer is unavailable if the UI already
  has tooltip/hint patterns.

### 6.4 Roster Display

Update player badges:

- Host badge remains.
- Add disconnected visual state when `connectionStatus === "disconnected"`.
- Avoid hiding disconnected players during an active game.
- Do not show `Unknown player` for known disconnected users.

## 7. Implementation Sequence

### Phase 1: Contracts And Tests

1. Add player connection status fields to shared player type.
2. Add `transfer_host` event contract and Zod schema.
3. Update type exports.
4. Add backend tests for manual host transfer and automatic transfer.

Tests should be written before or alongside server implementation so the desired
behavior is locked down.

### Phase 2: Backend Membership Model

1. Update player creation to set `connectionStatus: "connected"`.
2. Change disconnect flow to mark player disconnected instead of immediately
   deleting active-game players.
3. Preserve disconnected players in public room state and timelines.
4. Ensure reconnect marks the player connected and clears disconnect metadata.
5. Keep lobby removal behavior conservative and covered by tests.

### Phase 3: Backend Host Transfer

1. Implement `HostTransferService` or focused host transfer helpers.
2. Add `transferHost` to `RoomRegistry`.
3. Add `transferHost` to `RoomService`.
4. Wire `transfer_host` socket event in realtime handlers.
5. On host disconnect, call automatic transfer policy.
6. On reconnect, ensure host invariant is valid.

### Phase 4: Frontend State And Actions

1. Consume new `connectionStatus` fields in lobby and game player selectors.
2. Add `handleTransferHost` in game action hook.
3. Pass transfer action and eligibility into menu tab/player list view models.
4. Render disconnected state in player rows.

### Phase 5: Players Tab UX

1. Make game Players tab list items expandable.
2. Reveal `Transfer host` action only for current host and eligible target.
3. Add confirmation before transfer.
4. Ensure host-only controls disappear immediately after current host transfers
   away.

### Phase 6: Durable Reconnect Tokens

1. Add backend recovery token generation/storage.
2. Add frontend per-room localStorage recovery store.
3. Add auto-resume on `/game/:roomId`.
4. Add Home page resume affordance.
5. Add room TTL cleanup for empty disconnected rooms.

This phase can be implemented after host transfer because it changes identity
persistence more deeply.

## 8. Test Plan

### Backend Unit Tests

Add or update tests in `apps/server/tests`.

Required cases:

- Host can transfer host to a connected player.
- Non-host cannot transfer host.
- Host cannot transfer to unknown player.
- Host cannot transfer to disconnected player.
- Host cannot transfer to self.
- When host disconnects with connected players present, host transfers to first
  connected non-host.
- Former host reconnects as same player but not host after automatic transfer.
- If host disconnects and no connected players remain, host is not changed.
- When a connected player later reconnects into a room with no connected host,
  host invariant is restored.
- Active-game disconnected players remain in `roomState.players`.
- Active-game references to disconnected players still resolve display names.

### Backend Integration Tests

Add socket-level tests in `roomFlow.test.ts`:

- Manual `transfer_host` emits state update to all clients.
- Old host loses permission after manual transfer.
- New host can perform host-only action after transfer.
- Host socket disconnect triggers automatic host transfer state update.
- Former host reconnect receives original `playerId`.

### Frontend Tests

Add focused tests where current patterns exist:

- Player selector/view model marks disconnected player.
- Players tab exposes transfer action only for current host.
- Transfer action disabled/hidden for self and disconnected target.
- After host changes, host-only menu actions derive from new `hostId`.

### Manual QA

1. Start room with five players.
2. Start game.
3. Play three turns.
4. Disconnect host browser.
5. Verify another connected player becomes host automatically.
6. Verify game can continue.
7. Reopen former host device.
8. Verify former host returns as same player, not host.
9. Current host opens Players tab, expands former host row, transfers host back.
10. Verify host-only controls move back.

## 9. Acceptance Criteria

- No active game state produces `Unknown player` only because someone
  disconnected.
- Host disconnect does not block game continuation when another connected player
  exists.
- Manual transfer host works from the game Players tab.
- Host authorization follows `roomState.hostId`, not stale frontend assumptions.
- Backend host-transfer rules are tested at service/registry level and socket
  flow level.
- Code avoids adding more large responsibilities to `RoomRegistry.ts`; new logic
  is separated or extracted during implementation.
- Frontend UI components remain presentational; socket emits stay in page action
  hooks.

## 10. Implementation Notes

- Prefer explicit helper names such as `markPlayerDisconnected`,
  `markPlayerConnected`, `transferHostToPlayer`, and
  `selectAutomaticHostCandidate`.
- Avoid boolean soup. If connection state grows, introduce a small membership
  model instead of scattering conditions.
- Keep `players` order stable. Automatic host transfer should not reorder the
  roster.
- Keep game-engine pure. Host transfer and connection status are room/session
  concerns, not game rules.
- Do not make frontend infer host availability from socket state. The server
  should publish the authoritative `hostId`, `isHost`, and player connection
  statuses.

