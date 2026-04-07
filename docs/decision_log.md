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
- the challenger gains `+1 TT`
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
