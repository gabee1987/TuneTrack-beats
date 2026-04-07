# TuneTrack — Iteration 04 Frontend Challenge And TT UI Plan

> This plan is the detailed frontend execution companion for Iteration 03.
> It assumes the current backend/server-authoritative challenge and TT logic is
> already in place.
>
> It must follow:
> - `docs/tunetrack_full_architecture.md`
> - `docs/tunetrack_technical_implementation_plan.md`
> - `docs/iteration_03_challenge_tokens_plan.md`

---

## 1. Iteration Goal

Build a clear, mobile-first gameplay UI for challenge and TT interactions so
players can:
- understand whose turn it is immediately
- see the active timeline clearly
- understand when Beat is available
- understand what slot the active player chose
- understand who claimed Beat first
- place a challenge slot without confusion
- understand reveal outcomes at a glance
- see and spend TT confidently
- manually verify room settings and TT rules during real party-style testing

This phase is primarily about **clarity, legibility, and interaction flow**.

It is not mainly about visual polish or final animation richness yet.

---

## 2. Current Iteration 03 Check

Iteration 03 server work is already in place enough for frontend completion.

Implemented server-side prerequisites:
- public challenge state in room snapshots
- first-click Beat ownership
- challenge deadline support
- manual host challenge resolution
- challenge reveal outcome data
- TT balances in public player state
- host manual TT awarding
- TT skip action
- TT buy-current-card action
- one skip per turn enforcement
- no Beat window on TT-buy turns
- reconnect/session recovery for ongoing games

Conclusion:
- Iteration 03 server/backend acceptance is functionally satisfied
- frontend-focused completion is the next logical step

---

## 3. Frontend Rules To Preserve

- Frontend must never decide challenge winners
- Frontend must never mutate gameplay state locally as truth
- Frontend only reflects authoritative room snapshots and emits intents
- Hidden release year stays hidden until reveal
- Mobile usability is more important than desktop density
- The active gameplay surface should stay focused and uncluttered
- TT controls must only appear when TT mode is enabled
- Host-only controls must stay visibly separated from player controls

---

## 4. UX Targets

## 4.1 Primary gameplay priorities

Every screen in active gameplay should answer these questions within seconds:
- Whose turn is it?
- What card is currently being judged?
- What timeline is currently being judged?
- What action can I take right now?
- Is Beat available right now?
- If Beat was claimed, who owns it now?
- What happened on reveal?

## 4.2 Mobile-first interaction target

Primary interaction rules:
- one dominant action per step
- large touch targets
- horizontal timeline scrolling is acceptable
- no tiny labels required for comprehension
- use repeated visual language for:
  - active slot
  - original choice
  - Beat choice
  - awarded/stolen card
  - disabled actions

## 4.3 Dev-only context

Current developer panels are useful for testing, but Iteration 04 should clearly
separate:
- player-facing gameplay UI
- temporary dev/testing helpers

Recommended approach:
- keep a single `SHOW_DEVELOPER_CONTEXT_PANELS` flag
- do not mix dev-only text into core gameplay sections
- all core gameplay must remain understandable even if the dev panels are off

---

## 5. Scope

### In scope

- GamePage gameplay layout cleanup
- TT action area
- clearer challenge phase messaging
- clearer reveal phase messaging
- active timeline visualization improvements
- non-active player read-only challenge context
- host manual controls in game
- player list TT readability improvements
- responsive/mobile layout pass
- frontend wording cleanup
- browser manual QA checklist

### Out of scope

- drag-and-drop timeline interactions
- advanced Framer Motion reveal choreography
- final visual identity/theme overhaul
- Spotify playback UI integration
- service worker/PWA manifest polish
- account/profile UX

---

## 6. Files Expected To Change

Primary files:
- `apps/web/src/pages/GamePage/GamePage.tsx`
- `apps/web/src/pages/GamePage/GamePage.module.css`
- `apps/web/src/pages/LobbyPage/LobbyPage.tsx`
- `apps/web/src/pages/LobbyPage/LobbyPage.module.css`

Possible support files:
- `apps/web/src/features/game/...`
- `apps/web/src/features/timeline/...`
- `apps/web/src/features/challenge/...`
- `apps/web/src/features/tokens/...`

Recommendation:
- if `GamePage.tsx` becomes too large, Iteration 04 should begin extracting:
  - `PlayersPanel`
  - `TimelinePanel`
  - `ChallengePanel`
  - `RevealPanel`
  - `TurnActionsPanel`

---

## 7. Recommended Build Order

1. Normalize player-facing terminology
2. Stabilize layout hierarchy on GamePage
3. Improve turn-state and challenge-state CTA visibility
4. Improve reveal messaging and result cards
5. Improve TT action discoverability and disabled states
6. Improve mobile spacing, card sizing, and horizontal flow
7. Hide or isolate dev-only diagnostics cleanly
8. Run manual multi-tab QA and finalize docs

Reason:
- wording and flow problems create the most confusion first
- layout should support the state machine before extra polish is added
- mobile QA should happen after the gameplay sections are stable

---

## 8. Detailed Implementation Plan

## 8.1 Section A — Gameplay Information Hierarchy

### Objective

Make the top of GamePage immediately understandable.

### Required behavior

At the top of the screen, the player should always see:
- room name
- current phase
- clear turn status badge
- optional host room control

### Recommended UI shape

Top section order:
1. room header
2. main status badge
3. host utility button if applicable
4. inline error if one exists

### Required wording rules

Prefer:
- `Your turn`
- `Player X is playing`
- `Beat! window is open`
- `Player X claimed Beat!`
- `Reveal`
- `Game finished`

Avoid:
- long instructional paragraphs above the fold
- third-person phrasing for the current player
- vague labels like `What Is Happening` in core UX

### Acceptance criteria

- one short status badge explains the current state
- host-only room controls do not visually compete with gameplay CTA
- current player sees `You` wherever appropriate

---

## 8.2 Section B — Timeline Focus Model

### Objective

Keep one timeline primary at a time, with a clean mental model.

### Required rule

The main gameplay focus should remain:
- the active player's timeline

For non-active players:
- allow quick switching between:
  - active timeline
  - your own timeline

For active players:
- active timeline remains primary

### Required interactions

Active player:
- can preview their selected slot on the active timeline
- can change slot selection before confirming

Non-active player:
- can inspect active timeline
- can switch to own timeline
- cannot interact with slot selection unless they own Beat placement

### Visual rules

Timeline should visibly communicate:
- original selected slot
- Beat-selected slot
- awarded/stolen slot in reveal
- disabled slots for Beat when same slot is forbidden

### Acceptance criteria

- only one timeline is visually primary
- non-active player can still inspect own timeline without losing context
- slot markers are visually clearer than explanatory text alone

---

## 8.3 Section C — Turn Actions Area

### Objective

Make TT actions readable, obvious, and safe.

### Actions included

- `Skip Track (1 TT)`
- `Buy Card (3 TT)`

### Required behavioral rules

`Skip Track`:
- visible only when TT mode is enabled
- enabled only on your own turn
- disabled after one skip was already used that turn
- disabled when player has less than 1 TT

`Buy Card`:
- visible only when TT mode is enabled
- enabled only on your own turn
- disabled when player has less than 3 TT

### Required explanatory rules

The action area should imply:
- these are optional turn actions
- they are different from normal placement
- `Buy` bypasses guessing and Beat

Recommended helper text:
- `Spend TT for special turn actions`
- `Buy places the current song automatically and goes straight to reveal`

### Acceptance criteria

- player understands why a TT action button is disabled
- action costs are always visible
- skip-used state is visually distinct from low-TT disabled state

---

## 8.4 Section D — Challenge Window UX

### Objective

Make Beat flow readable for both active and non-active players.

### Active player view requirements

When challenge window opens, active player should understand:
- their placement is locked
- they cannot press Beat
- other players may challenge
- if nobody challenges, host/timer will resolve

Recommended copy:
- `Challenge window is open`
- `Other players can use Beat! against your placement`

Avoid:
- telling the active player to press Beat
- phrasing that sounds like they still control challenge flow

### Non-active player view requirements

When challenge window opens, non-active player should understand:
- which slot the active player chose
- whether Beat is currently available
- whether they personally can challenge
- whether someone else already claimed Beat

### Claimed Beat view requirements

When Beat is claimed:
- countdown should stop immediately
- screen should show who claimed Beat
- only challenge owner can place slot
- all other players must see read-only ownership state

### Acceptance criteria

- active player and non-active players see different, appropriate wording
- original chosen slot is always visible during challenge
- claimed Beat state is visually distinct from open Beat state

---

## 8.5 Section E — Reveal UX

### Objective

Make reveal outcomes easy to understand in under 3 seconds.

### Reveal must clearly show

- revealed song identity
- revealed year
- original chosen slot
- Beat slot if any
- whether original placement was right or wrong
- whether Beat succeeded or failed
- where the card ended up
- TT reward/loss result

### Special reveal handling

Normal placement reveal:
- explain correctness and final card owner

Beat reveal:
- explain who challenged
- explain whether Beat succeeded
- explain whether the card was stolen or discarded

TT-buy reveal:
- explain that the player spent 3 TT
- explain Beat was not opened for this turn
- explain where the card was auto-placed

### Acceptance criteria

- reveal copy distinguishes `placement` vs `tt_buy`
- no misleading `No one used Beat!` copy on TT-buy turns
- the awarded player is always clear

---

## 8.6 Section F — Player List UX

### Objective

Keep player state readable without clutter.

### Each player row should communicate

- display name or `You`
- host status if applicable
- current TT count when TT mode is enabled
- active-turn status

### Host-only controls

In-game host player controls may include:
- `+1 TT`

Rules:
- only host sees them
- action button should remain secondary to gameplay
- controls must not appear on non-host screens

### Acceptance criteria

- TT values are visible but subtle
- host controls are obvious to host only
- active player stands out in the list

---

## 8.7 Section G — Lobby UX For TT Mode

### Objective

Make TT settings understandable before game start.

### Required behavior

When TT mode is off:
- TT-specific settings are hidden

When TT mode is turned on:
- starting TT slider becomes visible
- challenge window control becomes visible
- starting TT auto-defaults to `1`
- host can still choose `0`

### Acceptance criteria

- TT mode toggle immediately reveals the right controls
- starting TT behavior matches the agreed rule
- lobby remains readable on mobile

---

## 8.8 Section H — Component Extraction

### Objective

Reduce GamePage complexity if needed.

### Recommended extraction order

1. `PlayersPanel`
2. `TurnActionsPanel`
3. `ChallengePanel`
4. `RevealPanel`
5. `TimelinePanel`

### Extraction rules

- extracted components should stay presentation-focused
- socket emits should remain close to GamePage/container logic unless repeated
- pure formatting helpers can move to utility files

### Acceptance criteria

- GamePage remains understandable
- no extracted component owns server-authoritative game rules

---

## 9. Testing Plan

## 9.1 Automated

Must pass:
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`

Recommended frontend-specific checks:
- ensure disabled TT action button states are rendered correctly
- ensure challenge/reveal copy varies correctly by room state

## 9.2 Manual multi-tab browser checklist

Use 2-3 tabs:

1. Host room and enable TT mode
2. Verify starting TT jumps to `1` automatically when TT mode turns on
3. Set starting TT back to `0` and confirm it is allowed
4. Start game
5. Verify active player sees active timeline clearly
6. Verify non-active player can switch between active timeline and own timeline
7. Place a normal card and open Beat window
8. Verify original chosen slot is obvious on all screens
9. Claim Beat from another player
10. Verify countdown stops immediately
11. Verify only challenge owner can place the Beat slot
12. Resolve reveal and verify copy is clear
13. Use `Skip Track`
14. Verify TT decreases and second skip in same turn is blocked
15. Use `Buy Card`
16. Verify current song is auto-placed correctly
17. Verify no Beat window opens for TT-buy turn
18. Verify reveal copy explains TT-buy correctly
19. Award TT from host and verify a player cannot exceed `5 TT`

---

## 10. Definition Of Done

Iteration 04 is complete when:
- challenge flow is understandable without relying on dev-only text
- TT actions are visible and understandable in normal gameplay
- reveal panels explain placement, Beat, and TT-buy outcomes clearly
- mobile layout remains usable with 2-3 tabs in testing
- host-only controls remain host-only
- frontend reflects all current server rules correctly
- automated checks pass

---

## 11. Recommended Next Step After Phase 04

If this iteration is completed successfully, the next recommended plan should be:
- Iteration 05: mobile polish, animation pass, and dev-only panel cleanup

That would include:
- animation refinement
- visual theme cleanup
- drag/drop decision
- PWA shell readiness
- final MVP presentation pass

---

# End Of Iteration 04 Frontend Challenge And TT UI Plan
