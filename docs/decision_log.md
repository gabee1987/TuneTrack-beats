# TuneTrack — Decision Log

This file records concrete implementation decisions and open questions so they
do not stay hidden in code.

---

## Decided

### In-game disconnect retention and manual recovery (2026-09-30)

An in-game socket disconnect is temporary absence, not an automatic leave or kick.

- The disconnected player's identity, timeline, tokens and turn position remain reserved
  without a reconnect expiry while the room exists.
- Only a host's explicit kick or room closure removes that player from the running game.
- All remaining clients see when the active player is offline.
- The host can skip an offline active player's turn immediately so play does not stall.
- The existing 60-second safety auto-skip remains as a fallback.
- Host transfer remains a separate 30-second rule when the disconnected player is the host.

This lets somebody step away briefly and return to the same game state. Reclaiming an
entire room after every player is offline is governed by the separate decision below; it
must not be implemented by silently evicting individual players.

### All-players-offline room expiry (2026-09-30)

If every player in an in-progress room remains offline continuously for one hour, the
server closes the entire abandoned room.

- Any player reconnecting before the deadline cancels cleanup.
- If everyone disconnects again later, a fresh one-hour timeout starts.
- Cleanup deletes the room, memberships, redirects, timers, Spotify tokens and playback
  session together; it does not kick or delete players one by one.
- `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS` configures the timeout and defaults to `3600000`.
- `RECONNECT_GRACE_MS`, `HOST_TRANSFER_GRACE_MS` and `TURN_SKIP_GRACE_MS` likewise expose
  their existing defaults through validated environment configuration.

### Documentation reorganisation (2026-09-08)

`docs/` held 26 files, roughly 10 400 lines, mostly completed or superseded iteration
plans, with no index and inconsistent status markers. Restructured into
`architecture/`, `rules/`, `operations/`, `plans/` and `archive/`, with `docs/README.md`
as the index.

- 15 plans archived unedited, each with a header stating what shipped, what did not, and
  what superseded it.
- Deleted `deploy-render.md` (documented a deployment path the project moved away from,
  and its only unique content — the cold-start warning — is already in
  `deploy-railway-frontend.md`) and `frontend_rework_sequence_plan.md` (sequencing for a
  finished phase). Both remain in git history.
- Extracted the still-authoritative token and component contract from
  `ui_overhaul_design_system_spotify.md` into `rules/design_system.md`.
- Folded the product rules from `playlist_metadata_curation_plan.md` into `CLAUDE.md`
  (Game Rules -> Track Metadata), since `CLAUDE.md` is the file actually loaded each
  session.
- Extracted the still-open items from `gamepage_refactor_handoff.md` section 4 into
  `plans/gamepage-remaining-refactors.md`; five of nine were already done.

**Rationale:** a contributor or agent opening `docs/` could not tell which documents were
authoritative. Two archived plans were actively misleading — the reconnect plan mixed
shipped reconnect behavior with an unapproved eviction proposal later superseded by the
2026-09-30 owner decision, and the performance plan was paused mid-way with a Phase 8 that
is deliberately not being resumed.

---

### Navigation: push vs. replace (2026-09-08)

Rule: a navigation caused by state that no longer exists uses `replace`; a navigation
caused by a user choosing to go somewhere uses `push`.

Applied in this pass (`docs/plans/2026-09-stability-performance/06-navigation-and-overlays.md`
section 3.2):

- Lobby -> game on game start now replaces. The lobby is gone once the game starts, so
  back should leave the game rather than return to a dead lobby.
- Room-closed redirects to home (both the lobby and the game connection hooks) now
  replace. The room no longer exists, so back should not return to it.
- Join-room submit now replaces when it pushes the lobby route, so back returns to the
  invite context rather than re-entering the join form.
- Route order for the page-transition direction was extended to
  `/ -> 0, /join/:id -> 1, /play -> 1, /lobby/:id -> 2, /game/:id -> 3` so Home <-> Play
  has a direction (previously both sat at 0).

Still push (correct, unchanged): opening the lobby from Play, starting from Home, and
the lobby's own rename replace (already correct).

**Rationale:** the phone's hardware back button and the browser's back button must
always return to where the user actually came from; leaving a `push` entry pointing at
state that no longer exists (a closed room, a lobby that already started its game) is
what produced the unresponsive-home-screen defect (B10 in
`docs/plans/2026-09-stability-performance/12-bug-register.md`) and dead-lobby back
navigation.

---

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

The disconnected host retains the role during the configured 30-second transfer grace.
A reconnect cancels transfer. If the grace expires, the first connected remaining player
becomes host. In-game host identity remains reserved like every other offline player.

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
- lobby players can rejoin during the configured reconnect grace
- in-progress players remain reserved without an individual expiry while the room exists
- different browser tabs get different player sessions, so multi-tab local
  testing still works

Current server rule:

- a lobby disconnect is removed after `RECONNECT_GRACE_MS` unless it reconnects first
- an in-game disconnect is removed only by an explicit host kick or room closure
- a continuously all-offline in-progress room closes after
  `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS`

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
- TT can be earned by guessing the current card's artist and song title correctly
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

### Coordinator test strategy without a DOM-heavy runner

GamePage coordinator coverage now favors pure state helpers when the current
test runtime does not provide the right DOM environment for hook-level animation
tests by default.

Current rule:

- extract coordinator decision logic into pure helpers when practical
- test transition snapshots, display-state derivation, and fly-animation
  eligibility directly in unit tests
- treat higher-level hook/component animation tests as a later enhancement, not
  a reason to hide logic inside untestable effects

Reason:

- this keeps test coverage growing without introducing avoidable test-runtime
  complexity into the repo
- this preserves the architectural goal that backend-driven UI sequencing should
  be explicit and verifiable

### Room-directory visibility on trusted networks

The room directory intentionally exposes each lobby's room code, host display name, player
count, and status to connected players who are not currently inside a room.

Current rule:

- keep `PublicRoomSummary` limited to those four fields
- push directory changes only to sockets outside rooms
- treat this visibility as appropriate for the current trusted LAN/party deployment
- reassess authentication and whether public discovery should exist before exposing the app
  as an unrestricted internet service

Reason:

- a recognizable host name helps nearby players choose the correct party room
- room members already receive richer authoritative room state and do not need directory pushes
- limiting the payload and audience avoids broadcasting gameplay or profile details unnecessarily

## Still Open

### Duplicate player names

Current implementation allows duplicate display names.

Still to decide:

- Should duplicate names be blocked within one room?
- Or should we keep allowing them and rely on internal player IDs only?

---

# End of Decision Log
