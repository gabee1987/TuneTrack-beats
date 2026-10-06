# 20 — Active Defect Register

> **Status (2026-10-06):** accurate against code. Seven active defects; thirteen resolved.
> **Folded from** `docs/plans/2026-09-stability-performance/12-bug-register.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`. The findings register `01-review-findings.md` holds the review findings (`B-`/`F-`/`U-`/`D-`/`T-` ids); this file holds user-visible defects (`B1`–`B20`).

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
| B2  | S1       | Open                               | Remaining overlay-stack component tests                                |
| B8  | S1       | Partially fixed                    | Explicit client recovery state and server transport tuning             |
| B14 | S1       | Needs reproduction                 | Capture route, connection state and overlays when the UI becomes inert |
| B18 | S2       | Open                               | Reproduce and instrument a page exit that never completes              |
| B4  | S1       | Open; device confirmation required | iPhone drag-versus-scroll test                                         |
| B3  | S2       | Open                               | Design-system consolidation acceptance criteria                        |
| B11 | S3       | Partially fixed                    | One shared destructive icon-button treatment                           |

## B2 · Navigation and overlays behave inconsistently

**Severity:** S1 · **Status:** Open · **Plan:** `14-navigation-and-overlays.md`

### Remaining problem

Overlays do not share one history-aware owner. Browser or Android back can navigate away
instead of closing the topmost panel, and page-owned portals can outlive the state change
that initiated navigation.

### Required outcome

- Back closes only the topmost dismissible overlay.
- Blocking overlays ignore back, Escape and scrim dismissal.
- Room closure uses replacement navigation and leaves Home immediately interactive.
- Music Setup and nested playlist and track editors close one level at a time in stack
  order.
- Focus and body-scroll state are restored when an overlay closes.

### Verification

- [x] E12: host closes a room; both clients reach Home and Start works immediately.
- [x] E13: back closes game settings without leaving or remounting the game.
- [x] E14: back/close unwinds track editor, playlist editor, and Music Setup one level at a
      time without leaving the lobby.
- Component coverage for stack order, focus restoration, scroll locking and blocking entries.

## B8 · Network recovery needs final hardening

**Severity:** S1 · **Status:** Partially fixed · **Plans:** `12-backend-stability-and-sessions.md`, `13-network-protocol-and-resilience.md`

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

**Severity:** S1 · **Status:** Needs reproduction · **Plan:** `14-navigation-and-overlays.md`

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

**Severity:** S2 · **Status:** Open · **Plan:** `14-navigation-and-overlays.md`

B10 was fixed by unmounting the action dock during exit, but the underlying risk remains: if
an `AnimatePresence` exit never completes, the old page can retain socket listeners, timers
and portals. An invisible portal may intercept input on the new page.

### Next investigation

- Instrument exit start and `onExitComplete` against a wall-clock budget.
- Record which exiting descendants use layout animation or portals.
- Reproduce before changing transition variants or CSS containment.
- Cover the confirmed trigger with E2E; jsdom cannot prove layout or pointer interception.

## B4 · Card drag competes with scrolling on iPhone

**Severity:** S1 · **Status:** Open; device confirmation required · **Plan:** `11-runtime-and-motion-performance.md`

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

**Severity:** S2 · **Status:** Open · **Plan:** `15-design-system-consolidation.md`

Parallel button, icon-button and dialog implementations still produce inconsistent states,
spacing and interaction behavior. Complete the consolidation in `15-design-system-consolidation.md` onto the shared
primitives and design tokens, then guard the boundary with lint and component tests.

## B11 · Player removal control is only partly consolidated

**Severity:** S3 · **Status:** Partially fixed · **Plan:** `15-design-system-consolidation.md`

The lobby and in-game removal paths now share acknowledged behavior, but the visual control
still needs to use the same destructive `IconButton` variant as comparable remove and
close-room actions. Verify 48 px touch targets, focus state and accessible labels on mobile
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

- bundle/startup performance — `10-bundle-and-startup.md`;
- runtime and motion performance — `11-runtime-and-motion-performance.md`;
- Spotify persistence and playback controls — `16-spotify-session-and-playback.md`;
- room/player identity and metadata correction — `17-room-and-player-identity-flow.md`;
- onboarding hints — `18-onboarding-hint-system.md`;
- remaining E2E and test infrastructure — `19-testing-strategy.md`.

## Tech debt carried over from the GamePage refactor list (archived 2026-10-06)

- **Façade collapse.** `RoomService` (718 lines) wraps `RoomRegistry` (319), both mostly pass-throughs; every new socket event costs two mechanical edits. Finding B-08, owned by Phase 6 of the review programme; `RoomService.ts` also exceeds the 700-line hard limit.
- **Missing seam tests.** Hook tests for `useGamePageStatusState`, `useGamePageTimelineState`, `useGamePageCapabilityState` and component tests for `ChallengeActionPanel`, `TurnActionDock`, `FinishedStatePanel` are still absent (`TimelinePanel`, `ActionDock` and `useGamePageActions` tests exist). Tracked in `19-testing-strategy.md`.
- **`GamePageHeader.tsx` split trigger fired.** The file is 260 lines (trigger was 250). Extract `GamePageStatusChips` and `GamePageHeaderActions` when it is next touched; its `areHeaderModelsEqual` comparator compares `roomState` by reference, so the memo never prevents a re-render (finding F-08).
