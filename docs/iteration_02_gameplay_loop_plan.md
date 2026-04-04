# TuneTrack — Iteration 02 Gameplay Loop Plan

> This plan builds directly on Iteration 01 and must follow the vision,
> architecture, and coding rules in `docs/tunetrack_full_architecture.md` and
> `docs/tunetrack_technical_implementation_plan.md`.

---

## 1. Iteration Goal

Create the first playable server-authoritative game loop from lobby to turn
resolution using a static seed deck and a simple timeline UI.

By the end of Iteration 02, players should be able to:
- join a room in the lobby
- let the host start the game
- let the host configure room defaults and per-player starting card counts
- see whose turn it is
- see the current track card without its hidden year
- place that card into a selected timeline slot
- submit the placement
- see a reveal/resolution result
- have the server update the timeline and advance the turn
- eventually reach the configured target card count and end the game

This iteration should prioritize **correct game state and a complete turn loop**
over final drag-and-drop polish or external playback integration.

---

## 2. Hard Rules To Preserve

- Server remains the only source of truth for room/game state
- Game rule logic belongs in `packages/game-engine`
- Socket event names, payload types, and validation schemas belong in
  `packages/shared`
- React components must not directly decide whether a card placement is correct
- Hidden release-year data must not be sent to clients before reveal
- MVP storage remains in memory
- No accounts, no matchmaking, no database, no per-client playback yet
- UI must stay mobile-first and touch-friendly

---

## 3. Main Scope

### In scope

- Static MVP seed deck
- Start game from lobby
- Server-side turn order
- Server-side current card draw
- Public game state snapshots
- Slot-based timeline placement
- Reveal result
- Turn advancement
- Win detection using `targetTimelineCardCount`
- Per-player starting timeline sizes for adjustable difficulty
- Basic game screen UI
- Basic game-over screen/state
- Tests for turn flow and state transitions

### Out of scope

- Framer Motion timeline drag-and-drop polish
- Token actions (`skip`, `buy card`, `challenge`)
- Spotify playback integration
- YouTube playback integration
- Reconnect/session restoration
- Durable persistence
- Accounts / profiles
- Full PWA install polish

These remain valid product goals, but this iteration should finish the core
placement loop first.

---

## 4. Recommended Build Order

1. Extend shared game state and socket contracts
2. Expand game-engine domain and turn/placement rules
3. Add static deck data and deck service on the server
4. Implement server start-game and place-card flow
5. Build game page and basic timeline placement UI
6. Add reveal/game-over UI states
7. Add automated tests for game flow
8. Update docs and decision log

Reasoning:
- Shared contracts and game-engine state should come before UI so the protocol
  stays stable
- Server turn logic should be testable before we polish interaction details
- A simple slot-click timeline is enough to validate gameplay before investing
  in drag mechanics

---

## 5. Phase 1 — Shared Contracts And State Model

## 5.1 Extend shared room/game types

Update `packages/shared/src/game/roomState.ts` and related shared files so
public room snapshots can represent active gameplay.

Recommended shared additions:

- `GamePhase`
  - `lobby`
  - `turn`
  - `reveal`
  - `finished`

- `PublicTurnState`
  - `activePlayerId`
  - `turnNumber`

- `PublicTimelinePlacement`
  - enough information for the frontend to highlight selected/confirmed slot if
    needed

- `PublicRevealState`
  - `playerId`
  - `placedCard`
  - `selectedSlotIndex`
  - `wasCorrect`
  - `validSlotIndexes`

- `PublicRoomState` should be extended with:
  - `phase`
  - `turn`
  - `winnerPlayerId`
  - `revealState`

- `PublicPlayerState` should include:
  - `startingTimelineCardCount`

- `PublicRoomSettings` should include:
  - `targetTimelineCardCount`
  - `defaultStartingTimelineCardCount`
  - `revealConfirmMode`

Important:
- `currentTrackCard` in public state must **not** contain `releaseYear`
- Timeline cards that are already in a player timeline may expose
  `revealedYear`, because they are known cards after placement
- Avoid sending the unrevealed answer year for the current card until reveal

## 5.2 Add new socket events

Client to server:
- `start_game`
- `place_card`
- `confirm_reveal`

Server to client:
- `state_update`
- `error`

Notes:
- We can continue using `state_update` as the main sync event in Iteration 02
- Dedicated events like `turn_start` and `reveal` can be added later if needed,
  but a richer room snapshot is enough for the first loop

## 5.3 Add payload schemas

Create Zod schemas for:
- `start_game`
- `place_card`
- `confirm_reveal`

Recommended payload shapes:

```ts
interface StartGamePayload {
  roomId: string;
}

interface UpdatePlayerSettingsPayload {
  roomId: string;
  playerId: string;
  startingTimelineCardCount: number;
}

interface PlaceCardPayload {
  roomId: string;
  selectedSlotIndex: number;
}

interface ConfirmRevealPayload {
  roomId: string;
}
```

Server validation rules:
- Only the host can start the game
- Only the host can change room-level or per-player settings
- Only the active player can place the current card
- Only a valid room member can confirm reveal
- `selectedSlotIndex` must be a non-negative integer

## 5.4 Acceptance criteria

- Shared package builds and exports all new types/events/schemas
- Public state can represent lobby, turn, reveal, and finished phases
- No public type leaks the hidden year of the current card before reveal

---

## 6. Phase 2 — Game Engine Expansion

## 6.1 Extend domain model

Add framework-free domain types in `packages/game-engine/src/domain`.

Recommended domain objects:
- `GameState`
- `GamePlayer`
- `DeckCard`
- `PlayerTimeline`
- `TurnState`
- `RevealState`

Recommended internal state fields:
- players
- timelines
- deck / draw pile
- currentCard
- activePlayerId
- turnNumber
- phase
- revealState
- winnerPlayerId
- targetTimelineCardCount

## 6.2 Add start-game rules

Create a deterministic service/rule that:
- validates there are enough players and enough cards
- initializes each player's configured number of starting known cards
- sets the first active player
- draws the first current turn card
- switches phase from lobby to turn

Decision:
- Each player should start with one revealed card by default, but the host can
  override each player's starting-card count individually in the lobby for
  difficulty balancing.

## 6.3 Add turn and placement resolution rules

Build on the existing placement logic and add a service that can:
- accept the active player's selected slot
- evaluate whether placement is correct
- create a reveal result
- commit the card into the player's timeline if correct
- discard or skip insertion if incorrect
- draw the next card
- advance to the next player
- detect whether the active player has reached `targetTimelineCardCount`

Recommended turn resolution policy:
- After placement, enter `reveal` phase first
- After the UI/host confirms reveal, advance to the next `turn` or `finished`

Important decision to make before coding:
- If a player places incorrectly, should they simply not gain the card and the
  current card be discarded?

Recommendation:
- For Iteration 02, yes. Keep the penalty simple until token/challenge mechanics
  are introduced.

## 6.4 Add tests

Create unit tests for at least:
- start-game initialization
- first turn card draw
- correct placement inserts card into timeline
- incorrect placement does not insert card
- same-year block placement remains valid
- turn advances to the next player after reveal confirmation
- winner is detected when a player reaches target card count
- game transitions to finished phase

## 6.5 Acceptance criteria

- Game-engine package exposes pure APIs for start-game, place-card, and
  confirm-reveal flow
- Unit tests cover both correct and incorrect turn outcomes
- No game-engine module imports React, Socket.IO, Express, or Node server code

---

## 7. Phase 3 — Static Deck System

## 7.1 Add MVP seed deck source

Create a static JSON or TypeScript seed deck under `apps/server/src/decks`.

Recommended first format:

```ts
interface SeedTrackCard {
  id: string;
  title: string;
  artist: string;
  releaseYear: number;
  artworkUrl?: string;
  previewUrl?: string;
}
```

Recommendation:
- Use a hand-curated seed deck first, with around 30-60 tracks, enough to test
  gameplay without external APIs
- Avoid provider-specific IDs in the core domain; keep those as optional metadata

## 7.2 Add a DeckService

Create a server-side `DeckService` that:
- loads the static seed deck
- validates deck shape
- shuffles cards
- provides a fresh draw pile when the game starts

Randomness rule:
- Shuffle on the server
- Keep deterministic shuffle injectability for tests if practical

## 7.3 Acceptance criteria

- Server can create a shuffled MVP deck for a room
- Deck cards include hidden `releaseYear` internally
- Current public card sent to clients strips hidden year until reveal

---

## 8. Phase 4 — Server Game Flow Implementation

## 8.1 Extend room state storage

The current `RoomRegistry` stores public lobby state only. For Iteration 02,
introduce a clearer split:

- internal room/game state for server authority
- public room state mapper for client snapshots

Recommended server modules:

```txt
apps/server/src/game/
  GameApplicationService.ts
  mapRoomStateToPublicRoomState.ts
apps/server/src/decks/
  DeckService.ts
  seedDeck.ts
```

`RoomRegistry` or a successor repository should store the internal authoritative
room state, not only the redacted public shape.

## 8.2 Implement `start_game`

Flow:
- host emits `start_game`
- server validates payload and host permission
- server creates/shuffles deck
- server initializes game state through `packages/game-engine`
- server stores updated internal room state
- server broadcasts public `state_update`

## 8.3 Implement `place_card`

Flow:
- active player emits `place_card`
- server validates payload and turn ownership
- server evaluates placement through `packages/game-engine`
- server stores reveal state
- server broadcasts public `state_update` in `reveal` phase

## 8.4 Implement `confirm_reveal`

Flow:
- room member emits `confirm_reveal`
- server advances game state out of reveal phase
- server draws next card or finishes the game
- server broadcasts public `state_update`

Important:
- For Iteration 02, do not let clients manually control whose turn is next
- Do not trust client-provided card IDs or release years for placement
- The client should only send the selected slot index

## 8.5 Error handling

Add clear server error codes/messages for:
- room not found
- game not started
- only host can start game
- not active player's turn
- invalid slot index
- cannot confirm reveal in the current phase
- deck exhausted, if applicable

## 8.6 Server tests

Extend `apps/server/tests` with integration tests for:
- host starts game successfully
- guest cannot start game
- active player can place card
- inactive player cannot place card
- reveal confirmation advances turn
- game eventually reaches finished phase

## 8.7 Acceptance criteria

- Server can run a full room game loop using socket events and in-memory state
- Public snapshots are redacted correctly
- Server tests cover the happy path and basic authorization errors

---

## 9. Phase 5 — Frontend Game Screen

## 9.1 Add `GamePage`

Create:

```txt
apps/web/src/pages/GamePage/
  GamePage.tsx
  GamePage.module.css
```

Routing:
- Add `/game/:roomId`
- Lobby should navigate to GamePage when room phase moves out of `lobby`

State source rule:
- GamePage should render directly from server room snapshots and local UI-only
  selection state

## 9.2 Build basic turn UI

GamePage should show:
- room code
- current phase
- active player name
- current card title/artist
- current player's timeline
- slot buttons/targets between timeline cards
- a submit placement button
- a reveal result panel in reveal phase
- winner/game-over state in finished phase

For non-active players:
- show whose turn it is
- show current card metadata
- disable placement controls

For active player:
- allow selecting a slot index
- allow submitting `place_card`

For reveal phase:
- show whether the placement was correct
- show the card's revealed year
- highlight valid slot positions if helpful
- allow confirming reveal

## 9.3 Timeline UI approach for Iteration 02

Use a simple slot-click timeline first, not drag-and-drop.

Example:
- Render cards in order
- Render a selectable slot button before the first card, between cards, and
  after the last card
- Selected slot gets a clear visual highlight
- Submit button sends `selectedSlotIndex`

Why:
- This lets us validate domain/state correctness first
- Drag-and-drop can be added in a later polish iteration without changing the
  server protocol

## 9.4 Update lobby UI

Lobby should show:
- current players
- host-only game settings
- per-player starting-card controls for the host
- host-only Start Game button

Guests should:
- not see host controls
- automatically transition to GamePage when the game starts

## 9.5 Socket/client state handling

Recommended frontend additions:

```txt
apps/web/src/features/game/
  hooks/
  components/
```

Keep business rules out of the UI:
- UI chooses a slot index
- server decides if it was correct
- UI renders the server's reveal result

## 9.6 Acceptance criteria

- Host can start the game from lobby
- Both tabs transition to game UI
- Active player can select a slot and submit placement
- Non-active player cannot submit placement
- Reveal state is shown
- Confirming reveal advances the turn
- Finished state is shown when a player wins

---

## 10. Phase 6 — Documentation And Decision Updates

## 10.1 Update README if needed

If run instructions or available flows change, update `README.md` so local
development remains clear.

## 10.2 Update decision log

Record decisions made during this iteration, especially:
- seed deck format
- whether each player starts with a revealed seed card
- wrong-placement penalty behavior
- exact reveal confirmation ownership
- whether slot-click UI is the official temporary MVP interaction

## 10.3 Add Iteration 02 completion status

At the end of implementation, mark this document with a completion status and
list any deferred gameplay items.

---

## 11. Definition Of Done

Iteration 02 is complete when all of these are true:
- Host can start a game from lobby
- Server creates a room game state from a static seed deck
- A current card is shown without leaking its hidden year before reveal
- Active player can place a card into a timeline slot
- Server evaluates placement using `packages/game-engine`
- Reveal state is shown to both players
- Confirming reveal advances the game to the next turn
- A winner is detected when a player reaches the target timeline size
- Game-over state is displayed
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`
  pass
- README and decision log are updated if behavior or decisions changed

---

## 12. Explicit Non-Goals

Do not expand scope into these unless the core loop is already stable:
- drag-and-drop timeline animations
- token/challenge mechanics
- external playback provider integration
- reconnect/session persistence
- database persistence
- matchmaking/accounts
- production deployment work

---

## 13. Decisions Needed Before Coding

Please decide these before implementation starts:

1. Should each player receive one revealed seed card when the game starts?
   Decision: yes by default, with per-player host overrides.

2. If placement is wrong, should the card simply be discarded and the player
   gains nothing for Iteration 02?
   Recommendation: yes, until token/challenge rules are added.

3. During reveal phase, should only the active player confirm reveal, or can any
   room member confirm?
   Recommendation: only host or active player, but pick one rule and keep it
   consistent.

4. Is a simple slot-click timeline acceptable for Iteration 02 before we add
   drag-and-drop polish?
   Recommendation: yes.

5. Should the seed deck be a hand-curated static local file first?
   Recommendation: yes.

---

# End of Iteration 02 Gameplay Loop Plan
