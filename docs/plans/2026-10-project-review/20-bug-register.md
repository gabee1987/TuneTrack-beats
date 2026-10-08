# 20 — Active Defect Register

> **Status (2026-10-08):** accurate against code. Six active defects; fourteen resolved.
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
| B8  | S1       | Partially fixed                    | Phone offline for 10 s during a game recovers without an error toast   |
| B14 | S1       | Needs reproduction                 | Capture route, connection state and overlays when the UI becomes inert |
| B18 | S2       | Open                               | Reproduce and instrument a page exit that never completes              |
| B4  | S1       | Open; device confirmation required | iPhone drag-versus-scroll test                                         |
| B3  | S2       | Open                               | Design-system consolidation acceptance criteria                        |
| B11 | S3       | Partially fixed                    | One shared destructive icon-button treatment                           |

## B8 · Network recovery needs final hardening

**Severity:** S1 · **Status:** Partially fixed · **Plans:** `12-backend-stability-and-sessions.md`, `13-network-protocol-and-resilience.md`

### Completed

- Reconnect uses the existing session instead of recreating the room.
- Language changes no longer rebuild the room connection.
- Mutating actions use acknowledgements, bounded retry and request-id replay protection.
- E7-E11 cover guest recovery, host recovery, host transfer, retained offline guests and
  whole-room expiry.
- Lifecycle durations are validated environment settings with production defaults.
- Closing a room keeps the device session id, and storage access never throws (`05` B1).
- One client connection state drives the Play and Lobby chip and the game banner; offline
  gameplay actions are refused with a toast (`05` B2, E2E `connection-status.spec.ts`).
- Recovery stays off, the heartbeat is 20 s / 25 s and every socket is rate limited (`05` A6,
  A7); a restart ends games with the "server restarted" dialog (`05` A8, B2).

### Remaining

- Confirm on a phone that a 10 s network loss during a game recovers without an error toast.

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

Since 2026-10-07 the playback provider's capture `pointerdown` listener, a suspected
contributor, is removed once playback is unlocked, and a drag move does no layout reads
(`05` C3, C6). The iPhone re-test with both changes is still to be done.

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

| ID  | Resolved   | Outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | 2026-09-09 | Track editor opens above its parent and can be closed.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| B5  | 2026-09-09 | Settings entrance/exit flicker fixed.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| B6  | 2026-09-09 | Leaderboard chip border clipping fixed.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| B7  | 2026-09-09 | Playback starts deterministically with retry/device transfer coverage.                                                                                                                                                                                                                                                                                                                                                                                                    |
| B9  | 2026-09-09 | Finished tracks can be restarted.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| B10 | 2026-09-09 | Home is interactive after room closure; E12 provides regression coverage.                                                                                                                                                                                                                                                                                                                                                                                                 |
| B12 | 2026-09-16 | Player profile is separate from room identity and persists locally.                                                                                                                                                                                                                                                                                                                                                                                                       |
| B13 | 2026-09-09 | Leaving an active game requires confirmation.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| B15 | 2026-09-09 | Socket reset no longer replays stale buffered actions or returns an orphaned client.                                                                                                                                                                                                                                                                                                                                                                                      |
| B16 | 2026-09-09 | Realtime rejection logs preserve event attribution and correlation IDs.                                                                                                                                                                                                                                                                                                                                                                                                   |
| B17 | 2026-09-08 | Unverified hardening changes were reverted; re-land rules recorded.                                                                                                                                                                                                                                                                                                                                                                                                       |
| B19 | 2026-09-10 | TT-bought cards use their own celebration identity.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| B20 | 2026-09-30 | Generated room codes always satisfy the shared join schema.                                                                                                                                                                                                                                                                                                                                                                                                               |
| B21 | 2026-10-07 | Game menu no longer blinks the page through at the end of its fade (`keepFadeOnMainThread`; framer-motion 11 WAAPI hand-off).                                                                                                                                                                                                                                                                                                                                             |
| B22 | 2026-10-07 | Drag edge scroll is dnd-kit's auto-scroll alone at ≤ 200 px/s, without scroll snap while dragging; the per-event scroll had sped up with the event rate after `05` C3.                                                                                                                                                                                                                                                                                                    |
| B23 | 2026-10-07 | A card released half over a neighbour snapped back: the preview moved only once the card centre passed the neighbour's centre, and a crossing inside the reorder throttle was lost on release. The slot under the card centre now wins (8 % keep margin), and the drop recomputes from the release position (`timelineDragGeometry.test.ts`).                                                                                                                             |
| B24 | 2026-10-07 | Spotify playback stalled until reload after a new game: each player build used two token refreshes against a 3-per-minute socket budget, a `RATE_LIMITED` refusal waited out the 10 s timeout, and an unanswered SDK `getOAuthToken` left `connect()` pending for good. One refresh per build, refusals answer at once, the SDK always gets a token, `connect()` times out after 15 s and the build retries; budget 6 per minute (`useSpotifyPlaybackSdk.token.test.ts`). |
| B2  | 2026-10-08 | One overlay host owns every dialog and sheet: Back, Escape and the scrim close only the topmost dismissible overlay, focus and scroll are restored, blocking dialogs ignore Escape and the scrim, and Back on the room-closed dialog resets like its button (`05` E2; `Overlay.test.tsx`, `RoomResetModal.test.tsx`, E12–E14).                                                                                                                                            |

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
- **`GamePageHeader.tsx` split trigger fired.** The file is 264 lines (trigger was 250). Extract `GamePageStatusChips` and `GamePageHeaderActions` in `06` W4. Its comparator no longer compares `roomState` (F-08 resolved 2026-10-07, `05` C1).
