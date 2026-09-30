# 12 — Active Defect Register

This register contains only actionable defects. Resolved items are kept as a compact ledger
at the end; their full investigations remain available in git history.

Status meanings:

- **Open** — reproduced or supported by source evidence and still needs implementation.
- **Partially fixed** — improved, but the stated exit criteria are not yet satisfied.
- **Needs reproduction** — reported behavior remains possible, but the current trigger has
  not been isolated.

## Current priorities

| ID  | Severity | Status                             | Next proof                                                             |
| --- | -------- | ---------------------------------- | ---------------------------------------------------------------------- |
| B2  | S1       | Open                               | E13-E14 and overlay/navigation component tests                         |
| B8  | S1       | Partially fixed                    | Explicit client recovery state and server transport tuning             |
| B14 | S1       | Needs reproduction                 | Capture route, connection state and overlays when the UI becomes inert |
| B18 | S2       | Open                               | Reproduce and instrument a page exit that never completes              |
| B4  | S1       | Open; device confirmation required | iPhone drag-versus-scroll test                                         |
| B3  | S2       | Open                               | Design-system consolidation acceptance criteria                        |
| B11 | S3       | Partially fixed                    | One shared destructive icon-button treatment                           |

## B2 · Navigation and overlays behave inconsistently

**Severity:** S1 · **Status:** Open · **Plans:** Doc 06, E13-E14

### Remaining problem

Overlays do not share one history-aware owner. Browser or Android back can navigate away
instead of closing the topmost panel, and page-owned portals can outlive the state change
that initiated navigation.

### Required outcome

- Back closes only the topmost dismissible overlay.
- Blocking overlays ignore back, Escape and scrim dismissal.
- Room closure uses replacement navigation and leaves Home immediately interactive.
- Nested playlist and track editors close in stack order.
- Focus and body-scroll state are restored when an overlay closes.

### Verification

- [x] E12: host closes a room; both clients reach Home and Start works immediately.
- E13: back closes game settings without leaving the game.
- E14: back closes the track editor, then its parent playlist editor.
- Component coverage for stack order, focus restoration, scroll locking and blocking entries.

## B8 · Network recovery needs final hardening

**Severity:** S1 · **Status:** Partially fixed · **Plans:** Docs 04-05

### Completed

- Reconnect uses the existing session instead of recreating the room.
- Language changes no longer rebuild the room connection.
- Mutating actions use acknowledgements, bounded retry and request-id replay protection.
- E7-E11 cover guest recovery, host recovery, host transfer, retained offline guests and
  whole-room expiry.
- Lifecycle durations are validated environment settings with production defaults.

### Remaining

- Define and expose one explicit client connection/recovery state instead of scattered
  status strings.
- Finish the connection banner and mobile-friendly retry feedback.
- Decide and verify Socket.IO recovery, ping and rate-limit settings using measured failure
  cases rather than speculative tuning.
- Keep server restart behavior explicit: room state is in memory and is not recoverable
  after a process restart.

## B14 · App can become unresponsive and return Home

**Severity:** S1 · **Status:** Needs reproduction · **Plan:** Doc 06

The original report combined theme switching, settings, playback and unexpected navigation,
but no single current root cause has been proven. Previous speculative transition changes
made stability worse and were reverted.

Do not patch this from theory. On the next reproduction, capture:

- current route and recent navigation;
- socket connection/recovery state;
- open overlays and portalled elements;
- whether an exiting page is still mounted;
- the first console or server error preceding the failure.

If the page is visible but ignores input, investigate B18 first.

## B18 · A stalled page exit can strand portalled UI

**Severity:** S2 · **Status:** Open · **Plan:** Doc 06

B10 was fixed by unmounting the action dock during exit, but the underlying risk remains: if
an `AnimatePresence` exit never completes, the old page can retain socket listeners, timers
and portals. An invisible portal may intercept input on the new page.

### Next investigation

- Instrument exit start and `onExitComplete` against a wall-clock budget.
- Record which exiting descendants use layout animation or portals.
- Reproduce before changing transition variants or CSS containment.
- Cover the confirmed trigger with E2E; jsdom cannot prove layout or pointer interception.

## B4 · Card drag competes with scrolling on iPhone

**Severity:** S1 · **Status:** Open; device confirmation required · **Plans:** Docs 03 and 12

The current 4 px pointer activation threshold does not reliably distinguish a drag from a
scroll on coarse pointers. Momentum scrolling, scroll snap and the narrow
`touch-action: none` boundary can compound the conflict.

### Proposed bounded fix

- Use a delayed `TouchSensor` for coarse pointers and retain `PointerSensor` for fine
  pointers.
- Apply `touch-action` to the actual drag-listener boundary.
- Remove obsolete momentum-scrolling CSS and test whether scroll snap should be disabled
  while dragging.
- Tune the delay on a real iPhone and verify scrolling, dragging and cancellation.

## B3 · Similar controls are inconsistent

**Severity:** S2 · **Status:** Open · **Plan:** Doc 07

Parallel button, icon-button and dialog implementations still produce inconsistent states,
spacing and interaction behavior. Complete Doc 07's consolidation onto the shared
primitives and design tokens, then guard the boundary with lint and component tests.

## B11 · Player removal control is only partly consolidated

**Severity:** S3 · **Status:** Partially fixed · **Plan:** Doc 07

The lobby and in-game removal paths now share acknowledged behavior, but the visual control
still needs to use the same destructive `IconButton` variant as comparable remove and
close-room actions. Verify 44 px touch targets, focus state and accessible labels on mobile
and desktop.

## Resolved ledger

The detailed root-cause narratives and implementation journals for these entries were
removed from the live register on 2026-09-30. They remain in git history.

| ID  | Resolved   | Outcome                                                                              |
| --- | ---------- | ------------------------------------------------------------------------------------ |
| B1  | 2026-09-09 | Track editor opens above its parent and can be closed.                               |
| B5  | 2026-09-09 | Settings entrance/exit flicker fixed.                                                |
| B6  | 2026-09-09 | Leaderboard chip border clipping fixed.                                              |
| B7  | 2026-09-09 | Playback starts deterministically with retry/device transfer coverage.               |
| B9  | 2026-09-09 | Finished tracks can be restarted.                                                    |
| B10 | 2026-09-09 | Home is interactive after room closure; E12 provides regression coverage.            |
| B12 | 2026-09-16 | Player profile is separate from room identity and persists locally.                  |
| B13 | 2026-09-09 | Leaving an active game requires confirmation.                                        |
| B15 | 2026-09-09 | Socket reset no longer replays stale buffered actions or returns an orphaned client. |
| B16 | 2026-09-09 | Realtime rejection logs preserve event attribution and correlation IDs.              |
| B17 | 2026-09-08 | Unverified hardening changes were reverted; re-land rules recorded.                  |
| B19 | 2026-09-10 | TT-bought cards use their own celebration identity.                                  |
| B20 | 2026-09-30 | Generated room codes always satisfy the shared join schema.                          |

## Feature work tracked elsewhere

These are programme work, not defects, and are intentionally not duplicated here:

- bundle/startup performance — Doc 02;
- runtime and motion performance — Doc 03;
- Spotify persistence and playback controls — Doc 08;
- room/player identity and metadata correction — Doc 09;
- onboarding hints — Doc 10;
- remaining E2E and test infrastructure — Doc 11.
