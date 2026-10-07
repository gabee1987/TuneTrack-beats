# TuneTrack — Decision Log

Concrete implementation decisions and open questions, so they do not stay hidden in code.
Append dated entries; do not rewrite history. Exception recorded below: on 2026-10-06 the log
was consolidated once (duplicates of `CLAUDE.md` game rules removed, one wrong entry
corrected, five GamePage entries merged, dates added from git history).

Game rules themselves live in [`CLAUDE.md`](../CLAUDE.md) → Game Rules and are not repeated
here; this log records _why_ and _when_ they were decided.

---

## Decided

### Animation feel over the motion budget (2026-10-07)

- **The animations shortened or removed in `05` C7 are restored**: the TT settings and
  game-menu height slides, the playlist row slide after a removal, the Lobby status-dot pulse
  and Premium sheen, the looping wrong-placement pulse, the challenge border and the
  correct-placement, celebration and token-flyout timings. Kept from C7: the 280 ms reorder.
  Why: the owner found every one of them worse and saw no performance problem with the
  originals. The 500 ms ceiling now applies to plain state transitions; longer motion is an
  allowlisted owner choice (`00-index.md` decision 19). The placement popup was redesigned
  (badge, drawn mark, rings, confetti or shards, word-by-word message).

### Largest-CSS gate (2026-10-07)

- **The largest stylesheet may be up to 42 kB** (was 20 kB, `05` §2.1). Why: Vite emits one
  stylesheet per JS chunk, so after the barrels were dissolved the remaining size is styles that
  load together on the Game and Lobby routes; splitting them adds requests without saving bytes.
  Host-only editors load lazily instead (`05` D4; `00-index.md` decision 18).

### Deck-exhaustion discards (2026-10-07)

- **Every card that leaves play without reaching a timeline is discarded**, not only wrong
  placements and TT skips: cards of host-skipped or auto-skipped turns, cancelled challenges and
  a removed active player return too. Why: fewer cards are lost for good, so a small deck lasts
  longer and the finish-on-empty rule triggers as late as possible. A TT skip draws before it
  discards so a paid skip never returns the same card. Engine rule shipped (`05` A3); the lobby
  indicator is still pending (`04` WP 2).

### Phase 5 and 6 owner decisions (2026-10-07)

Answers to `05-performance-and-robustness-plan.md` §11 and `06-structure-and-test-plan.md` §10:

- **Deck and discard pile both empty: most cards wins**, ties go to whoever reached that count
  first. A shared win was declined because it changes the single-winner contract. Implementation
  pending (`05` A3).
- **The home-screen ambient background stays** as the only decorative motion, limited to the
  home screen, `transform`/`opacity`, and paused when the tab is hidden or reduced motion is on.
- **Dev dependencies approved:** `@vitest/coverage-v8`, `eslint-plugin-react-hooks`; layer
  boundaries use ESLint's built-in `no-restricted-imports` instead of a plugin.
- **No CI for now.** The local `verify` script is the gate; the GitHub Actions workflow (`06` T4)
  stays specified and parked, and would need a compliance review before it is enabled.

### Host-flow owner decisions (2026-10-07)

Answers to the open questions of `docs/plans/2026-10-project-review/04-host-flow-ux-spec.md` §13:

- **Duplicate player names are allowed and suffixed.** A second "Player One" in the same room is
  stored and shown as "Player One 2" for that room only; identity stays by player id and session.
  Rejecting the join was declined because it adds a dead end to joining. Resolves the open entry
  of 2026-04-04. Implementation pending (WP 9).
- **First-run hints are a first-game tutorial.** The two-per-visit cap is removed; every relevant
  hint appears at the moment its control matters, one at a time, and counts as seen only when
  acknowledged. "Show hints again" restarts the tutorial immediately. Implementation pending
  (WP 8).
- **The bundled deck is called "Practice deck (no audio, 40 songs)".**

### Documentation reset and owner decisions (2026-10-06)

Phase 2 of the review programme (`docs/plans/2026-10-project-review/00-index.md`) rewrote
`CLAUDE.md`, merged `AGENT.md` into it and deleted that file, trimmed both engineering-rules
files to layer-specific rules, folded the trimmed 2026-09 remediation documents into the
review folder as documents 10–20 and archived the originals, archived both architecture
documents and the GamePage refactor list, and consolidated this log. Product decisions taken
the same day:

- **Host may skip any turn, any time**, regardless of the active player's connection state.
  The 60 s safety auto-skip stays as a fallback. (Previous wording limited the manual skip to
  offline players; the code never did.)
- **Deck exhaustion → reshuffle.** Discarded cards (wrong placements and TT skips) are
  reshuffled into a new deck; cards on timelines stay out. The lobby shows how many cards the
  deck needs for the player count and win target and warns when the deck is smaller.
  Implementation pending (finding B-06).
- **No silent practice deck.** Start is blocked until a deck exists; the practice deck is an
  explicit host choice. Implementation pending (finding U-01).
- **Touch target 48 × 48 px** everywhere (matches `--size-touch-target`); the 44 px figure
  is retired.
- **File-size hard limit 700 lines** = must split; type-specific soft limits remain guidance.
- **Host creation flow is streamlined, not restructured:** existing screens and navigation
  stay; no one-tap-host redesign, no wizard.
- **Spotify login stays per room** pending compliance review; the UI must say so.
- **PII in logs and audit stays as is** for the trusted-party deployment; revisit before any
  public deployment.
- **Keep `react-router-dom`.** A hand-rolled router was rejected: the saving does not justify
  the risk; bundle work targets lazy loading and `LazyMotion` instead.
- **No offline action queue.** Actions issued while disconnected are rejected with visible
  feedback; acknowledged actions with bounded retry are the recovery mechanism.
- **Overlay history uses same-path router-state entries**, not raw `pushState` (decided by
  the shipped Settings and Music Setup implementations, E13/E14).

### Music setup and nested playlist editors use one history record per depth (2026-10-02)

Music Setup, the playlist editor and the nested track editor each push one same-path
router-state entry. Save, cancel, close, browser Back and Android Back remove only the top
entry, so the stack unwinds one level at a time. Closing the playlist editor removes its
portal rather than leaving hidden interactive DOM.

### Settings back-button history (2026-10-01)

Opening `AppShellMenu` pushes a same-path React Router state entry; Back removes it and closes
Settings without leaving the page. Route transitions are keyed by pathname, so a same-path
entry never remounts the page or rebuilds its socket connection.

### In-game disconnect retention and manual recovery (2026-09-30)

An in-game socket disconnect is temporary absence, not a leave or a kick. The player's
identity, timeline, tokens and turn position stay reserved while the room exists; only a
host kick or room closure removes them. All clients see that the active player is offline and
the host can skip the turn. Host transfer remains a separate 30 s rule. Whole-room reclaim is
governed by the next entry and must never be implemented by evicting players one by one.

### All-players-offline room expiry (2026-09-30)

If every player in an in-progress room stays offline continuously for one hour the server
closes the whole room: memberships, redirects, timers, Spotify tokens and playback session
together. Any reconnect cancels the cleanup; a later all-offline period starts a fresh hour.
`ALL_PLAYERS_OFFLINE_ROOM_TTL_MS` (default `3600000`), `RECONNECT_GRACE_MS`,
`HOST_TRANSFER_GRACE_MS` and `TURN_SKIP_GRACE_MS` are validated environment settings.

### Room-directory visibility on trusted networks (2026-09-28)

The room directory exposes each lobby's room code, host display name, player count and
status to connected players who are not in a room, and only to them. Keep
`PublicRoomSummary` to those four fields. Appropriate for the trusted LAN/party deployment;
reassess authentication and public discovery before any unrestricted internet deployment.

### Navigation: push vs. replace (2026-09-08, corrected 2026-10-06)

A navigation caused by state that no longer exists uses `replace`; a navigation the user
chose uses `push`. Applied: lobby → game on start replaces; room-closed redirects replace;
join-room submit replaces when it opens the lobby. Rationale: a `push` entry pointing at a
closed room or a dead lobby produced the unresponsive-home defect (B10) and dead back
navigation.

**Correction:** the original entry claimed the page-transition route order had been extended
to `/ → 0, /join → 1, /play → 1, /lobby → 2, /game → 3`. That change was reverted with the
other unverified hardening (B17) and `AppRoutes.tsx` still uses `/game → 2, /lobby → 1, else
0`. The extension remains open work in `14-navigation-and-overlays.md` §3.3.

### Documentation reorganisation (2026-09-08)

`docs/` held 26 files with no index. Restructured into `rules/`, `operations/`, `plans/` and
`archive/` with `docs/README.md` as the index; 15 plans archived with headers stating what
shipped, what did not and what superseded them; `deploy-render.md` and
`frontend_rework_sequence_plan.md` deleted (in git history); the token contract extracted into
`rules/design_system.md`; the metadata product rules folded into `CLAUDE.md`.

### Backend-driven UI transition pattern (2026-04-24)

Frontend animation that reacts to confirmed server state follows one pattern instead of
component-local timer guessing:

- the controller, or a dedicated transition-event hook built on **pure detector helpers**,
  emits a typed transition event (for example `skip_track_replace`, celebration, reveal
  preview);
- a dedicated coordinator hook (`usePreviewCardTransition`,
  `useTimelinePanelCelebrationState`, the reveal-preview coordinator) owns the displayed data
  and the animation phase and decides when the new server data becomes visible;
- components render the coordinator output as one displayed model, not several raw props;
- motion variants and cleanup timing live in `features/motion`, grouped by transition
  responsibility (preview replacement, celebration, action surfaces, token flyouts), with
  `features/motion/index.ts` as the stable API.

Rationale: realtime data arrives asynchronously; the pattern keeps animation stable,
unit-testable and traceable. The 2026-04 note that hook-level tests had to wait for a DOM
runtime is superseded: jsdom and React Testing Library are wired and component tests exist.

### Beat challenge and TT rules (2026-04-07)

The reward, penalty, timing and spending rules are stated in `CLAUDE.md` → Game Rules.
Rationale recorded here: a successful challenge steals the card so the challenger does not
guess twice; TT never goes below zero; only the claim is timed so the challenger's placement
is not rushed; manual host awarding of TT supports party-style judging of artist and title
callouts before automated earning exists; a TT-buy turn opens no challenge window because
the placement is server-computed.

### Session identity (2026-04-04, amended 2026-09-30)

The browser stores a stable per-tab player session in `sessionStorage`, so refreshing the
same tab keeps the player identity while different tabs stay distinct for local multi-tab
testing. Lobby players may rejoin during the reconnect grace; in-game players stay reserved
(see the 2026-09-30 entries). The host keeps the role during the 30 s transfer grace.

### MVP room storage and test deck format (2026-04-04)

Rooms are stored in memory only. Local JSON test decks live in
`apps/server/src/decks/test-decks/`; the server loads every `.json` file there and expects
`id`, `releaseYear`, `title`, `artist`, `albumTitle` and optional `genre` per card. Duplicate
`id`s keep the latest loaded card.

### Configurable game rules (2026-04-04)

Win target (3–30, default 10), per-player starting cards with a room default, reveal
confirmation mode (`host_only` default) and the same-year placement rule were made
configurable or explicit at this point; definitions are in `CLAUDE.md`. Rationale: a 10-card
race is too long for a short party round, and same-year ambiguity had to be a rule rather
than a bug report.

## Still open

Nothing open. (Duplicate player names, open since 2026-04-04, was decided on 2026-10-07.)

# End of Decision Log
