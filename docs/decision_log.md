# TuneTrack — Decision Log

This file records concrete implementation decisions and open questions so they
do not stay hidden in code.

---

## Decided

### Equal release-year placement

If a candidate track has the same release year as one or more adjacent timeline
cards, every slot inside that same-year block counts as a correct placement.

Example:

- Timeline years: `1988, 1990, 1990, 1990, 1994`
- Candidate year: `1990`
- Valid slot indexes: `1, 2, 3, 4`

### Target timeline size

The number of cards needed to win is configurable per room instead of being
hardcoded to 10.

Current limits:

- Minimum: `3`
- Default: `10`
- Maximum: `30`

Only the host can change this setting in the lobby.

### Host disconnect behavior

If the host disconnects during the current lobby skeleton, host role is assigned
to the first remaining player in the room.

If the last player leaves, the in-memory room is removed.

### MVP room storage

Rooms are stored in memory only for the current foundation iteration.

### Starting cards per player

Each player starts with 1 revealed timeline card by default, but the host can
override `startingTimelineCardCount` individually per player in the lobby.

The room also stores `defaultStartingTimelineCardCount`, which is used for
newly joined players.

### Reveal confirmation rule

Reveal confirmation is configurable by room:

- `host_only`
- `host_or_active_player`

Current default is `host_only`.

### Wrong placement penalty

If a player places a card into a wrong slot, the card is discarded and the
player gains no card from that turn.

### Temporary timeline interaction model

Iteration 02 uses a slot-click timeline with a separate placement confirmation
button. Drag-and-drop and challenge/veto interactions are intentionally left
for later iterations.

All clients can see the active player's timeline during a turn, but only the
active player can interact with slot selection and placement confirmation.

### MVP test deck format

Local JSON test decks live in
`apps/server/src/decks/test-decks/`.

The server loads every `.json` file from that folder and expects each card to
contain:

- `id`
- `releaseYear`
- `title`
- `artist`
- `albumTitle`
- `genre` (optional)

Duplicate `id` values are deduplicated by keeping the latest loaded card with
that ID.

---

### Reconnect/session identity strategy

The browser now stores a stable per-tab player session in `sessionStorage`.

Current behavior:

- refreshing the same tab keeps the same player identity
- lobby and in-progress games can be rejoined during a short reconnect grace
  period
- different browser tabs get different player sessions, so multi-tab local
  testing still works

Current server rule:

- disconnected players stay reserved for a short grace period before they are
  removed from the room
- if they reconnect in time with the same session, they regain the same player
  identity and host role if applicable

### Beat challenge reward rule

If a `Beat!` challenge succeeds:

- the challenged card is stolen into the challenger's own timeline
- the challenger does not need to guess a second time on their own timeline

If a `Beat!` challenge fails:

- the challenger loses `1 TT`
- TT can never go below `0`

### Beat timing rule

The challenge timer only gates the initial `Beat!` claim.

Current behavior:

- if nobody claims before the deadline, the server auto-resolves the original
  placement
- if a player claims `Beat!` in time, the timer stops immediately
- after claim, there is currently no extra timer for the challenger's slot
  placement

### MVP TT awarding

For MVP testing, the host can manually award TT during a game.

Reason:

- this supports party-style manual judging for song/artist callouts before
  automated token earning exists
- TT's can be eraned by guessing the current cards artist and song name correctly
- TT is awarded by the host manually to the players

### TT spending actions in MVP

When TT mode is enabled, players can spend TT during their own turn:

- spend `1 TT` to skip the current track and draw the next one
- a player can only skip once per turn
- spend `3 TT` to claim the current song immediately, place it into the
  correct slot on their own timeline automatically, and continue to manual
  reveal
- a TT-buy turn does not open a Beat window

Current enforcement:

- both actions are server-authoritative
- both actions require the acting player to be the active player
- both actions are blocked when TT mode is disabled

### Backend-driven preview-card transition architecture

Frontend animation for preview-card replacement now follows an explicit
backend-driven transition pattern instead of component-local timer guessing.

Current rule:

- the controller emits a typed UI transition event when a server-confirmed skip
  replaces the current preview card
- a dedicated coordinator hook owns temporary displayed card state during the
  animation
- the component renders coordinator output instead of immediately rendering the
  new incoming server data
- preview-card replacement motion is defined in a dedicated motion transition
  module with an explicit contract

Reason:

- this keeps animation behavior stable even when realtime/backend data changes
  arrive asynchronously
- this is the intended pattern for future server-driven UI transitions,
  including later Spotify-backed card data updates

### GamePage transition-event layer and celebration coordinator

GamePage now has a dedicated transition-event detection layer and a dedicated
timeline celebration coordinator.

Current rule:

- `useGamePageTransitionEvents` detects meaningful backend-confirmed UI changes
  and emits typed transition events
- `useGamePageController` passes those events through the page/controller model
  instead of forwarding loose celebration fields and local timer assumptions
- `useTimelinePanelCelebrationState` owns temporary celebration visibility and
  fly-animation cleanup using a named motion contract
- celebration motion variants and cleanup timing live in a dedicated motion
  transition module instead of a generic motion bucket file

Reason:

- this reduces controller coupling
- this makes backend-driven animation behavior easier to trace and reuse
- this creates a cleaner teaching example for future Spotify-backed,
  server-driven UI transitions

### Pure transition detectors and reveal-preview coordinator

GamePage transition detection now prefers pure detector helpers plus thin hook
orchestration, and reveal-preview state now follows the same event/coordinator
pattern as other backend-driven transitions.

Current rule:

- backend-driven event semantics such as skip replacement, celebration, and
  reveal preview detection should live in pure helpers when possible
- the React hook layer should manage deduplication and event-key sequencing, but
  not hide the underlying decision logic in opaque effects
- reveal preview state should pass through a dedicated coordinator so the panel
  consumes one displayed preview model instead of several synchronized raw props

Reason:

- this makes the transition rules directly unit-testable
- this improves confidence when backend data flow becomes more complex
- this keeps the codebase teachable by making animation/event semantics explicit

### Motion layer split by transition responsibility

The shared frontend motion layer now avoids a catch-all gameplay motion token
file for reusable transitions.

Current rule:

- reusable motion exports are grouped by named transition responsibility
- examples now include preview replacement, timeline celebration, action
  surfaces, and token flyouts
- `features/motion/index.ts` remains the stable shared API surface

Reason:

- this makes motion ownership easier to find
- this prevents unrelated animation concerns from drifting into one large file
- this keeps the motion layer aligned with the same explicit-boundary rules used
  elsewhere in the frontend architecture

## Still Open

### Room code generation rules

Current implementation lets the player type any valid room code and creates the
room if it does not exist.

Still to decide:

- Should host-created rooms generate a short random code automatically?
- Should room codes be uppercase-only for easier party sharing?

### Duplicate player names

Current implementation allows duplicate display names.

Still to decide:

- Should duplicate names be blocked within one room?
- Or should we keep allowing them and rely on internal player IDs only?

### Challenge timing authority

Still to decide:

- What is the exact server-authoritative timing model for the challenge window?
- Should late client challenge clicks be rejected based on server timestamps only?

Recommendation:

- Yes, resolve challenge timing with server-side timestamps only.

---

# End of Decision Log
