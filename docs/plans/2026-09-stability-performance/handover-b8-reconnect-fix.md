# Handover — B8 root cause #1: host reconnect issues the wrong command

**Audience:** a fresh agent (no memory of prior sessions on this repo). Everything you
need is below or linked. Read `CLAUDE.md` at the repo root first — it is the binding
style/architecture guide for this project and this handover assumes it.

**Scope:** this is a narrow, deliberately small extraction from a much larger backlog
item (B8, "network inconsistencies", tracked in
`docs/plans/2026-09-stability-performance/12-bug-register.md`). Fix only what is
described here. Do **not** pull in the rest of B8 (action acknowledgements, a full
reconnection policy, `connectionStateRecovery`, ping/rate-limit tuning) — those are
separate, larger pieces of work with their own risk profile and are explicitly out of
scope for this task. See "Out of scope" below.

---

## The bug

A host who briefly loses connectivity (elevator, Wi-Fi blip, phone switching to
cellular) is permanently locked out of their own room. There is no recovery — the user
has to fully abandon the room and start over.

## Root cause

`apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts` registers a single
`handleConnect` function as the Socket.IO `"connect"` listener:

```ts
function handleConnect(socketClient: Awaited<ReturnType<typeof getSocketClient>>) {
  setConnectionStatus("Connected");
  setErrorCode(null);
  setErrorMessage(null);
  socketClient.emit(intent === "create" ? ClientToServerEvent.CreateRoom : ClientToServerEvent.JoinRoom, {
    displayName,
    roomId,
    sessionId: playerSessionId,
  });
}
```

(current location: lines 110–119)

Socket.IO fires `"connect"` on **every** reconnect, not just the first connection. The
lobby URL for a host carries `intent=create` for the entire lobby lifetime (it is never
stripped from the URL), so every reconnect re-emits `CreateRoom` for a room the host
already created.

Server-side, `apps/server/src/rooms/RoomLobbyService.createRoom` (lines 46–79) throws
unconditionally the moment the room already exists:

```ts
public createRoom(
  roomId: RoomId,
  displayName: string,
  socketId: string,
  sessionId: string,
): JoinRoomResult {
  if (this.store.hasRoom(roomId)) {
    throw new Error("ROOM_ALREADY_EXISTS");
  }
  // ... (existing-session handling only happens AFTER this point, so it never runs
  //      when the room is the caller's own room)
  ...
}
```

The reconnect hits `ROOM_ALREADY_EXISTS`, the client surfaces it as a hard error, and
the host has no way back into the room they are still, in fact, hosting.

Note the asymmetry: the **join** path already handles this correctly.
`RoomLobbyService.addPlayerToRoom` (lines 81–138) checks
`existingSessionMembership?.roomId === roomId` first and delegates to
`RoomConnectionService.restorePlayerSession` — a rejoin to your own room is a no-op
recovery, not an error. The game page's connection hook
(`apps/web/src/pages/GamePage/hooks/useGameRoomConnection.ts`) only ever emits
`JoinRoom` on connect, so it already benefits from this and is **not** affected by this
bug — no changes needed there. The bug is confined to the lobby page's create-intent
path.

---

## The fix

Two changes, one on each side, both required (defence in depth — see rationale below).

### 1. Client: only ever attempt `CreateRoom` once per mount

In `apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts`:

- Add a ref (e.g. `hasAttemptedCreateRef`) that starts `false`.
- In `handleConnect`, when `intent === "create"`: emit `CreateRoom` only if the ref is
  still `false`, then set it to `true` regardless of outcome. Every subsequent
  `"connect"` (i.e. every reconnect) emits `JoinRoom` instead, using the same
  `playerSessionId` the room was created with.
- This must live inside the existing effect (same effect that currently owns
  `handleConnect`), reset naturally whenever the effect re-runs (new `roomId` /
  `playerSessionId` / etc., same as today), and must **not** be lifted into a new
  `useEffect` — keep the change minimal and inside the existing connection flow.

Why this is safe: the server already treats `JoinRoom` from the room's own host session
as a rejoin (`addPlayerToRoom` → `restorePlayerSession`), so switching to `JoinRoom` on
reconnect is not a behavior change for the host — it is the same path a returning
non-host player already takes today.

### 2. Server: make `createRoom` idempotent for its own session

In `apps/server/src/rooms/RoomLobbyService.createRoom`, reorder the checks so a
same-session recreate of the same room is treated as a rejoin instead of an error:

- Before throwing `ROOM_ALREADY_EXISTS`: if the room exists **and**
  `store.getSessionMembership(sessionId)` points at that same `roomId` **and** the room
  still lists that player as a member, delegate to
  `this.connection.restorePlayerSession(roomId, existingSessionMembership.playerId, socketId, sessionId)`
  and return its result.
- Only throw `ROOM_ALREADY_EXISTS` when the room exists and belongs to a *different*
  session (or the same session's membership doesn't check out) — i.e. a genuine
  room-id collision.
- Leave every other branch of `createRoom` (the `MAX_ACTIVE_ROOM_COUNT` check, the
  existing "session was in a different room" eviction branch) exactly as-is; only the
  ordering/gating around the `hasRoom` throw changes.

Why both sides: the client fix alone isn't sufficient — a stale second tab, a
double-tap, or a client bug elsewhere could still fire a second `CreateRoom` for a room
that already exists, and the server must not treat that as a hard failure for its own
owning session. The server change is the actual safety net; the client change is what
stops the *common* case (an ordinary reconnect) from depending on it at all.

This design (both sides) already exists in more detail in
`docs/plans/2026-09-stability-performance/05-network-protocol-and-resilience.md`,
section 1.1 (client) and 1.2 (server) — read those two subsections for the fuller
rationale if anything here is ambiguous. Do not implement the rest of that document's
section 1 (1.3 `GAME_ALREADY_STARTED` recovery-modal copy, 1.4 server `instanceId`) —
those are separate, out of scope here (see below).

---

## Out of scope — do not implement

- `connectionStateRecovery` / Socket.IO handshake changes (Doc 04, Doc 05 section 5).
- Action acknowledgements / idempotency keys for gameplay actions (Doc 05 section 4).
- `GAME_ALREADY_STARTED` recovery-modal copy changes (Doc 05 section 1.3).
- Server `instanceId` / distinguishing a server restart from a closed room
  (Doc 05 section 1.4).
- The `t` (i18n callback) dependency-array issue in both connection hooks
  (Doc 05 section 3) — a real bug, but unrelated to this one and touches a different
  code path.
- Anything in `apps/web/src/features/motion` or the transition/animation machinery.
  Completely unrelated to this bug, and this codebase has a documented history (B17 in
  the same bug register) of a branch that touched motion/transition code and had to be
  fully reverted after destabilizing the app. Do not go near it.

If you find yourself wanting to touch any of the above to make this fix "complete,"
stop — flag it in your handback notes instead of expanding scope.

---

## Testing

Follow this project's existing conventions (see `CLAUDE.md`, "Testing" section):
server orchestration bugs get server tests; do not rely on manual testing alone.

Add server tests near the existing `RoomLobbyService` usage (see
`apps/server/tests/rooms/` for existing sibling test files and their conventions —
e.g. `RoomStore.test.ts`, `playbackHandoff.test.ts` — for setup patterns, mocking
style, and how `RoomStore`/`RoomTimerCoordinator`/`GameFlowService` are constructed in
tests). At minimum:

1. **Same session, same room, `createRoom` called twice** — second call must not
   throw, must return the same `playerId`, and the room must still have exactly one
   player entry for that session (not a duplicate).
2. **Different session, same room id, `createRoom` called by the second session** —
   must still throw `ROOM_ALREADY_EXISTS` (this is the genuine-collision case; don't
   regress it).
3. A client-side test for `useLobbyRoomConnection` (or the smallest testable unit you
   can extract) confirming: first `"connect"` emits `CreateRoom`; a simulated second
   `"connect"` (reconnect) on the same hook instance emits `JoinRoom`, not `CreateRoom`.

**Verification discipline used throughout this project** (apply it here too): after
writing each test, temporarily revert the corresponding fix, confirm the test fails,
then restore the fix and confirm it passes again. Don't skip this — it's the only way
to know a test actually has teeth rather than passing by accident.

Before handing back:
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

All four must be clean. Report the before/after test counts (this repo tracks that
precisely across changes — see recent bug-register entries for the expected format,
e.g. "X server + Y web + Z engine tests passing").

---

## Process notes

- **Do not commit, push, or otherwise change git state.** Leave all changes in the
  working tree. This is this project's standing convention — the user (not the agent)
  owns every git operation.
- Keep the fix minimal. No refactors, no renames beyond what's needed, no comments
  explaining *what* the code does (names should do that) — only a comment where the
  *why* is genuinely non-obvious (the existing `createRoom`/`addPlayerToRoom` code has
  examples of the right level of comment density; match it).
- When done, update the B8 entry in
  `docs/plans/2026-09-stability-performance/12-bug-register.md`: this fix addresses only
  **root cause #1** of B8's five listed root causes. Do not mark the whole B8 entry
  "Fixed" — add a note under it (following the style of the B7 entry's "first
  pass/second pass" sections) recording that root cause #1 specifically is fixed, what
  was changed, and that root causes #2–#5 remain open and out of scope for this task.
