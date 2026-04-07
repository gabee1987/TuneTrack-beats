# TuneTrack — Iteration 03 Challenge And TT Token Plan

> This plan builds directly on Iteration 02 and must follow the vision,
> architecture, and engineering rules in `docs/tunetrack_full_architecture.md`
> and `docs/tunetrack_technical_implementation_plan.md`.

## Implementation Status

Status: **completed**

---

## 1. Iteration Goal

Add the first server-authoritative challenge/veto mechanic and an optional
TuneTrack Tokens (`TT`) game mode on top of the existing turn/reveal loop.

By the end of this iteration, players should be able to:
- see their current TT balance
- challenge the active player's pending placement during a challenge window
- let the server award challenge ownership to the first valid challenger only
- let the challenger choose an alternative slot in the active player's timeline
- resolve whether the original player or the challenger was right
- award TT to the challenger on a successful challenge
- steal the challenged card into the challenger's timeline when Beat! is correct
- let the host decide whether TT-based gameplay is enabled for the room
- let the host manually award TT during the game for MVP testing
- spend 1 TT to skip the current track on your own turn
- spend 3 TT to claim the current song, auto-place it correctly into your own
  timeline, skip Beat for that turn, and go to manual reveal
- keep the existing normal placement flow working when no challenge happens

This iteration should prioritize **fair server-side challenge ownership and
clear challenge UX** over advanced animation polish.

---

## 2. Hard Rules To Preserve

- Server remains the only source of truth for room/game/challenge/token state
- Game rules still belong in `packages/game-engine`
- Socket contracts and payload schemas still belong in `packages/shared`
- Clients must never decide who won the challenge race
- Clients must never directly mutate TT balances
- Hidden release-year data must remain hidden until reveal
- MVP storage remains in memory
- UI must remain mobile-first and touch-friendly

---

## 3. Gameplay Rule Target For Iteration 03

## 3.1 Normal placement flow with challenge window

Recommended turn flow:

1. Active player selects a slot
2. Active player confirms placement
3. Server stores the pending original placement
4. Server opens a challenge window
5. If nobody challenges in time, reveal resolves the original placement
6. If one player challenges first, that challenger chooses a replacement slot
   in the active player's timeline
7. Server resolves original placement vs challenger placement
8. Server awards TT and awards the card if the challenger was right
9. Server advances to the next turn or finishes the game

## 3.2 Challenge race rule

Only the first valid non-active-player challenge request should win the right to
challenge.

Server must reject:
- challenge requests from the active player
- challenge requests after the challenge window has closed
- challenge requests when another challenger has already won the race
- challenge requests in the wrong room phase

## 3.3 Recommended challenge outcome policy

For Iteration 03, use this simple resolution model:
- if the original placement was correct, the active player keeps the card and
  the challenger loses 1 TT
- if the original placement was wrong and the challenger chooses a valid slot,
  the challenger steals the card into their own timeline automatically and
  gains 1 TT
- if both original placement and challenger placement are wrong, the card is
  discarded and the challenger loses 1 TT

Reasoning:
- This matches the agreed Hitster-style Beat reward rule
- This keeps challenge outcomes meaningful and easy to understand in reveal
- Winner detection must consider the challenger timeline when a steal succeeds

## 3.4 TT token rules for first version

Recommended MVP TT rules when TT mode is enabled:
- each player starts with 0 TT by default
- successful challenge grants +1 TT to the challenger
- TT is displayed in lobby and game views
- spending 1 TT can skip the current song on your own turn, but only once per
  turn
- spending 3 TT can claim the current song immediately, place it into the
  correct slot on your own timeline automatically, and go straight to reveal
- a TT-buy turn does not open a Beat window

Recommended host setting:
- `TT mode enabled`

Why:
- It lets the room host choose between a simpler classic placement game and a
  more strategic token-driven game

Implementation note:
- If Iteration 03 becomes too large, challenge + TT earning should be
  implemented first, and skip/buy-card TT spending can move to the next section
  or the next iteration without changing the long-term rule.

---

## 4. Main Scope

### In scope

- Public player TT balance
- Host-only TT mode setting
- Challenge window state
- Optional challenge timeout room setting
- First-click challenge ownership
- Challenger slot selection UI
- Challenge reveal/result display
- TT reward on successful challenge
- Host-only manual TT awarding during a game for MVP testing and song/artist
  callouts
- Spend 1 TT to skip the current song on your own turn when TT mode is enabled
- Limit skip usage to once per turn
- Spend 3 TT to claim the current song directly into your own timeline when TT
  mode is enabled
- Shared challenge/token contracts
- Game-engine challenge/token state transitions
- Server socket handlers for challenge flow
- Tests for challenge race, challenge resolution, and token rewards
- README / decision-log updates if behavior changes

### Out of scope

- Advanced challenge countdown animations
- Drag-and-drop placement
- External playback integration
- Persistent storage

---

## 5. Recommended Build Order

1. Extend shared challenge/token state and socket contracts
2. Extend game-engine domain with challenge and TT transitions
3. Wire server challenge handlers and challenge-window lifecycle
4. Build challenge UI and TT display in GamePage/LobbyPage
5. Add automated tests for challenge race and TT rewards
6. Update docs and decision log

Reasoning:
- Contracts and pure rules should come before UI
- Server-side race ownership must be testable before visual polish
- TT display is only useful after the server has authoritative balances

---

## 6. Phase 1 — Shared Contracts And Public State

## 6.1 Extend public player state

Update `packages/shared/src/game/player.ts` so each player exposes a TT balance.

Recommended field:

```ts
ttTokenCount: number;
```

## 6.2 Add public challenge state

Add a public challenge state object to shared room state.

Recommended shape:

```ts
type ChallengePhase = "open" | "challenger_placement" | "resolved";

interface PublicChallengeState {
  phase: ChallengePhase;
  originalPlayerId: string;
  originalSelectedSlotIndex: number;
  challengerPlayerId: string | null;
  challengeDeadlineEpochMs: number | null;
  challengerSelectedSlotIndex: number | null;
}
```

Recommended `PublicRoomState` additions:
- challenge state object
- a room phase that can represent challenge stages clearly

Suggested phase model:
- keep `status = "turn" | "challenge" | "reveal" | "finished"`
- use `challengeState.phase` for sub-states inside `challenge`

## 6.3 Add challenge socket events

Recommended client-to-server events:
- `claim_challenge`
- `place_challenge`
- `award_tt`
- `skip_track_with_tt`
- `buy_timeline_card_with_tt`

Recommended server-to-client events:
- continue using `state_update`
- continue using `error`

Payload recommendation:

```ts
interface ClaimChallengePayload {
  roomId: string;
}

interface PlaceChallengePayload {
  roomId: string;
  selectedSlotIndex: number;
}

interface AwardTtPayload {
  roomId: string;
  playerId: string;
  amount: number;
}
```

Notes:
- `claim_challenge` is the first-click race event
- `place_challenge` submits the challenger's alternative slot
- `award_tt` is a host-only MVP helper for manual token registration

## 6.4 Add Zod schemas

Add schemas for all new challenge payloads in
`packages/shared/src/events/schemas.ts`.

Validation rules:
- room ID must use existing room ID rules
- slot index must be a non-negative integer
- payloads must not accept player IDs for ownership-sensitive operations; the
  server should infer the acting player from socket membership

## 6.5 Acceptance criteria

- Shared package exports challenge/token state and payload schemas
- Public state can represent turn, challenge, reveal, and finished stages
- No shared public shape leaks the current card's hidden release year early

---

## 7. Phase 2 — Game Engine Challenge And TT Rules

## 7.1 Extend game-engine domain

Add pure domain objects in `packages/game-engine/src/domain`:
- `ChallengeState`
- `TokenWallet` or a simple TT field on `GamePlayer`

Recommended internal challenge fields:
- original player ID
- original selected slot index
- challenger player ID
- challenger selected slot index
- challenge deadline timestamp if timing is handled in state
- challenge phase

## 7.2 Add challenge lifecycle service

Recommended pure service API:
- open challenge window after the active player places a card
- claim challenge for the first valid challenger
- submit challenger slot
- resolve original placement vs challenger placement
- award TT if the challenge succeeds
- continue to next turn after challenge reveal confirmation

Important rule:
- Race ownership should be deterministic from server call order. The game
  engine should reject a second claim once `challengerPlayerId` is already set.

## 7.3 Add token reward rules

Recommended initial rule:
- successful challenger gets +1 TT
- failed challenger loses 1 TT

Potential implementation options:
- store `ttTokenCount` on each `GamePlayer`
- or add a `TokenWallet` domain object and keep one wallet per player

Recommendation:
- start with `ttTokenCount` on `GamePlayer` for a smaller first token slice
- extract a `TokenWallet` value object later when spending actions arrive

## 7.4 Extend unit tests

Add tests for:
- first challenger claim wins and second claim is rejected
- active player cannot challenge their own placement
- no claim is accepted outside challenge phase
- successful challenge inserts the card at challenger slot and awards 1 TT
- successful challenge steals the card into the challenger timeline
- failed challenge does not award TT
- if nobody challenges, original placement resolves as before
- same-year slot rules still work during challenger placement
- winner detection still works after challenge resolution

## 7.5 Acceptance criteria

- Game-engine exposes pure challenge/token transitions
- Existing normal placement tests still pass
- New challenge and TT reward behavior is covered by unit tests
- No game-engine code imports React, Socket.IO, or server modules

---

## 8. Phase 3 — Server Challenge Flow

## 8.1 Extend internal room state

Store internal challenge state alongside game state in the authoritative room
record.

Server should be able to map this into a redacted public snapshot where:
- all clients can see that a challenge window is open
- all clients can see who won challenge ownership
- only safe slot/reveal data is exposed

## 8.2 Implement `claim_challenge`

Flow:
- non-active player taps the challenge button
- client emits `claim_challenge`
- server validates room phase and socket membership
- server asks game-engine to assign challenge ownership if none exists
- server broadcasts `state_update`

Concurrency rule:
- if two clients click near-simultaneously, whichever socket event the server
  processes first wins
- the loser receives a clean error or simply sees the updated state where
  another challenger already owns the challenge

## 8.3 Implement `place_challenge`

Flow:
- challenger selects an alternative slot in the active player's timeline
- client emits `place_challenge`
- server validates that this socket belongs to the current challenger
- server resolves the challenge through game-engine
- server broadcasts `state_update` in reveal phase

## 8.4 Challenge window timeout

Recommended MVP timeout model:
- after active player confirms placement, open a short server-controlled
  challenge window
- if no challenger claims before deadline, auto-resolve the original placement
- host can manually close/resolve the challenge window before timeout
- once a challenger has successfully claimed Beat, the countdown no longer
  blocks the challenger from choosing their slot

Implementation options:
- use an in-memory `setTimeout` per room
- store `challengeDeadlineEpochMs` in public state for UI countdown display
- clear pending timers on room cleanup and on challenge claim

Recommendation:
- make the challenge timeout a host-configurable room setting
- support a no-timeout/manual-host-confirm mode if the host wants party pacing
  to be fully manual
- use one server-owned timeout per room only when timeout mode is enabled

## 8.5 Error handling

Add clear server errors for:
- challenge unavailable in the current phase
- active player cannot challenge their own placement
- another player already claimed the challenge
- only the challenge owner can place the challenge slot
- invalid challenge slot index

## 8.6 Server integration tests

Add tests for:
- one non-active player can claim challenge after active placement
- active player cannot claim challenge
- second challenger is rejected after first claim
- challenger placement resolves correctly and awards TT
- if nobody challenges, timeout path resolves original placement
- host-only reveal confirmation still works after challenge resolution if that
  room setting is active

## 8.7 Acceptance criteria

- Server enforces first-click challenge ownership
- Server controls challenge timeout and auto-resolution
- Public snapshots expose enough challenge state for the UI
- Token rewards come only from server/game-engine logic
- Integration tests cover challenge race and challenge resolution

---

## 9. Phase 4 — Frontend Challenge And TT UI

## 9.1 Show TT balances

Update LobbyPage and GamePage so each player's current `TT` balance is visible.

Recommended UI:
- small `TT: N` badge beside each player
- keep styling lightweight and readable

## 9.2 Add challenge window UI

During the challenge phase, non-active players should see:
- the active player's timeline
- the current card metadata without hidden year
- a strong challenge CTA button
- a short message explaining that only the first challenger wins

Possible button text ideas:
- `Beat!`

Decision:
- start with `Beat!`

## 9.3 Add challenger placement UI

If the current player is the challenge owner:
- unlock slot selection on the active player's timeline
- show a clear `Confirm Challenge Slot` button

For everyone else:
- show that `{challengerName}` is choosing the challenge slot
- keep timeline read-only

## 9.4 Add challenge reveal UI

Reveal panel should clearly show:
- original player's chosen slot
- challenger's chosen slot if there was one
- revealed card year
- whether original placement was correct
- whether the challenge succeeded
- TT reward result

## 9.5 Keep normal no-challenge flow understandable

If no one challenges before timeout:
- show a short status message that the challenge window expired
- proceed to the existing reveal panel

## 9.6 Acceptance criteria

- Players can see TT balances
- Non-active players can race to challenge during challenge phase
- First challenger can choose an alternative slot
- Other players see challenge ownership and cannot interfere
- Reveal UI makes the challenge outcome understandable
- Existing turn flow still works when no one challenges

---

## 10. Phase 5 — Documentation, Testing, And Manual QA

## 10.1 Automated checks

Before this iteration is considered done, these must pass:
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

## 10.2 Manual browser test checklist

Test with 3 tabs if possible:

1. Host creates a room
2. Two guests join
3. Host starts the game
4. Active player confirms a placement
5. Two non-active players race to click the challenge button
6. Verify only one challenger wins ownership
7. Challenger chooses a slot
8. Reveal resolves and TT reward is shown correctly
9. Next turn starts cleanly
10. Repeat a no-challenge turn and verify timeout auto-resolution
11. As host, manually award `+1 TT` to a player and verify all clients update
12. Continue until a player reaches the win condition

## 10.3 Update docs

Update:
- `README.md` if local usage or gameplay behavior changes
- `docs/decision_log.md` with final challenge and TT decisions
- reconnect/session restoration notes if testing flow changes
- this iteration plan's status and any deferred items

---

## 11. Definition Of Done

Iteration 03 is complete when all of these are true:
- TT balances exist in server state and public player state
- Active placement opens a server-controlled challenge window
- Only the first valid challenger receives challenge ownership
- Challenger can select an alternative slot in the active player's timeline
- Reveal resolves challenge outcomes server-side
- Successful challenges award TT
- Successful Beat challenges steal the card into the challenger timeline
- Host can manually award TT during the game for MVP testing
- Existing no-challenge placement turns still work
- Game-over flow still works
- Automated checks pass
- Docs and decision log are updated

---

## 12. Explicit Non-Goals

Do not expand scope into these until the first challenge/token loop is stable:
- drag-and-drop interaction overhaul
- playback provider integration
- reconnect/session persistence
- database persistence
- matchmaking/accounts

---

## 13. Decisions Needed Before Coding

Please decide these before implementation starts:

1. What should the exact challenge button text be?
   Decision: `Beat!`

2. What should the first challenge reward be?
   Decision: +1 TT for a successful challenge

3. Should the challenge window have a fixed timeout in Iteration 03?
   Decision: this should be configurable by the host

4. If no one challenges in time, should the game auto-resolve the original
   placement immediately?
   Decision: yes, and the host should also be able to manually resolve without
   waiting for the timer

5. If a challenge is claimed, should only that challenger be allowed to choose
   the replacement slot?
   Decision: yes, but this challenger replacement-slot interaction can be
   implemented later if needed

6. Should a failed challenge cost TT already in this iteration?
   Decision: yes, a failed `Beat!` challenge costs 1 TT

7. Does the Beat timer also limit the challenger after they already claimed it?
   Decision: no, the timer only gates the initial Beat claim

---

# End of Iteration 03 Challenge And TT Token Plan
