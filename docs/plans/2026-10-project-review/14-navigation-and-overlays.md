# 14 — Navigation and Overlay System

> **Status (2026-10-08):** Phase 1 (z-index scale and guard, `05` E1), Phase 2 §3.2 (push/replace semantics), Phase 4 (B1, song-editor layering) and Phase 5 (B5, settings flicker) shipped; the browser and Android back button closes settings, Music Setup and the nested playlist/track editors through same-path router state (E13, E14). Phase 3, the overlay host, shipped 2026-10-08 (`05` E2). Open: the transition guard and route order (Phase 2 §3.1, §3.3), the overlay contract (Phase 6).
> **Folded from** `docs/plans/2026-09-stability-performance/06-navigation-and-overlays.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.
>
> **Binding budgets, order and corrections (2026-10-07):** `05-performance-and-robustness-plan.md` §2 (budgets), §8 (rollout order), §9 (corrections to this document). Where they differ, `05` wins.

> Review findings owned here: F-05 (z-index literals and scale) and F-06 (overlay escape/focus/scroll/back coverage). Phase 5 of the review programme sets the budgets and Phase 4 owns the back-button coverage of the host flow; this document holds the work breakdown. Bug register: B2 (`20-bug-register.md`).
> Owning layers: `apps/web/src/app`, `apps/web/src/features/motion`,
> `apps/web/src/features/overlay` (new, does not exist yet), `apps/web/src/features/theme/tokens`.

The reported defects trace to one missing abstraction: there is no overlay system. Every
dialog, sheet and modal is an ad-hoc `useState` boolean plus a `createPortal`, with its own
hand-picked `z-index` and no shared focus or scroll management. History participation now
exists for four overlays, but it is implemented per overlay rather than once.

This document builds that abstraction. It is a prerequisite for
`15-design-system-consolidation.md` Phase 4 (shared dialog, sheet and blocking shells). The
hint system (`18-onboarding-hint-system.md`) and the room flow
(`17-room-and-player-identity-flow.md`) shipped without it, so it no longer blocks them.

## 1. Overlay inventory before the host (2026-10-06; superseded by §4)

| Overlay                     | Implementation                                                                         | Portal target                      | z-index            | Back button             |
| --------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- | ------------------ | ----------------------- |
| App shell menu (settings)   | `features/app-shell/components/AppShellMenuDialog.tsx`                                 | `document.body`                    | 1200               | same-path history (E13) |
| Room reset / recovery       | `features/ui/RoomResetModal.tsx` via `MotionDialogPortal`                              | `document.body`                    | 1500               | ignores                 |
| App loading overlay         | `features/loading/AppLoadingOverlay.tsx`                                               | in-tree                            | 1600               | ignores                 |
| Playlist editor             | `pages/LobbyPage/components/PlaylistEditModal.tsx` (bespoke portal)                    | `document.body`                    | 1200               | same-path history (E14) |
| Song editor (track details) | `pages/LobbyPage/components/PlaylistTrackDetailsSheet.tsx`                             | `document.body`, `position: fixed` | 1400 (B1 fix)      | same-path history (E14) |
| Spotify setup (Music Setup) | `pages/LobbyPage/components/spotify/SpotifySetupModal.tsx`                             | via `MotionDialogPortal`           | 130                | same-path history (E14) |
| Song info                   | `pages/GamePage/components/SongInfoModal.tsx`                                          | in-tree                            | 1100               | ignores                 |
| Kick confirmation           | `pages/GamePage/gameMenu/GameMenuPlayerItem.tsx` via `MotionDialogPortal`              | `document.body`                    | 1600               | ignores                 |
| Adaptive select sheet       | `pages/LobbyPage/components/AdaptiveSelectSheet.tsx` via `BottomSheet`                 | in-tree                            | `--z-sheet` (400)  | ignores                 |
| Generic dialog              | `features/ui/primitives/Dialog.tsx` via `MotionDialogPortal`                           | `document.body`                    | `--z-dialog` (500) | ignores                 |
| Toasts                      | `features/toast/AppToastStack.tsx`, `pages/GamePage/components/GamePageToastStack.tsx` | in-tree                            | `--z-toast` (600)  | n/a                     |

Eleven overlays and six z-index conventions; the token-flyout dock (5000) sits above the
blocking loading overlay (1600). Back-button handling exists for settings, Music Setup, the
playlist editor and the track editor (`pages/LobbyPage/hooks/playlistEditorHistory.ts`);
`SongInfoModal`, the kick confirmation, `RoomResetModal`, `BottomSheet` and the generic
`Dialog` still ignore it (F-06). No overlay handles Escape, moves or restores focus, or
locks body scroll.

## 2. Phase 1 — One z-index scale, enforced · **S2** · shipped

**Shipped 2026-10-07 (`05` E1).** `zIndexPrimitives` and `globals.css` carry the §2.1 scale;
all eighteen literals are migrated. The fly-to-mine card and the token-spend flyout use
`--z-celebration` and the SettingField info overlay `--z-dialog-nested`, not the §2.2 values
(`05` §9). The home toast and menu anchor use local 3 and 2. Proof: `zIndexScale.test.ts`
(every CSS module; `globals.css` equals the primitives). The visual check of every overlay is a
manual device check.

## 3. Phase 2 — Fix the page-transition layer · **S1** · partially shipped

### 3.1 Guard the transition against orphaned exits — open

`apps/web/src/app/AppRoutes.tsx` uses `MotionPresence mode="sync"` keyed on the pathname.
Under `sync`, a second navigation that lands while a child is still exiting can leave that
child mounted. Because `PageTransition` is `position: absolute; inset: 0; z-index: 2` with
a full-viewport `min-height`, an orphan covers the whole screen and swallows every tap.
`AppRoutes.exitingPage.test.tsx` already asserts that an exiting page's effects do not
re-run against the new route and that a same-path history entry does not remount the
route; the unresponsive-after-close symptom itself was fixed and is proven by E12 and
`apps/web/src/app/closeRoomThenStart.test.tsx`. The structural guards below are still
missing (verified 2026-10-06: no `onExitComplete`, no `pointerEvents: "none"` on the exit
variant).

Changes:

- Add `onExitComplete` to the `AnimatePresence` and, in development, log a warning if an
  exit takes longer than twice the configured screen duration. This turns an invisible
  failure into a visible one.
- Add `pointerEvents: "none"` to the `exit` variant in
  `features/motion/coreMotionTokens.ts`. An exiting page must never receive input, and this
  alone neutralises the orphan case even if it still occurs.
- Reconsider `mode="sync"`. `sync` is needed for the cross-slide effect (both pages visible
  simultaneously). Keep it, but make the container a proper stacking and containment context:
  `contain: layout paint` on the wrapper div in `AppRoutes`, so an exiting page cannot
  affect the incoming page's layout.
- Keep the direction-based `zIndex` in the exit variant. The exiting page sitting on top
  during a back navigation is the intended iOS-style effect, not a bug — the bug was that
  it could not be dismissed. With `pointerEvents: "none"` it is correct.

### 3.2 Consistent back semantics — shipped

The rule "a navigation caused by state that no longer exists uses `replace`; a navigation
caused by a user choosing to go somewhere uses `push`" is recorded in `docs/decision_log.md`
("Navigation: push vs. replace", 2026-09-08) and the room-closed paths use `replace`. One
item to re-verify when touching the file: the game-start navigation in
`useLobbyRoomConnection.handleStateUpdate` still reads as a push to `/game/:id` with router
state, where the plan asked for `replace`.

### 3.3 Route order for the transition direction — open

`getRouteOrder` in `apps/web/src/app/AppRoutes.tsx` still maps `/game/*` to 2, `/lobby/*`
to 1 and everything else to 0 (verified 2026-10-06; the `decision_log.md` entry that claims
the ladder was extended is being corrected today). `/play` and `/join/:id` therefore both
sit at 0 alongside `/`, so Home to Play has no direction. Extend the ladder:

    "/"          -> 0
    "/join/:id"  -> 1
    "/play"      -> 1
    "/lobby/:id" -> 2
    "/game/:id"  -> 3

### Acceptance

- [ ] Development warning fires if any page exit exceeds its budget; no warning during a
      normal session.
- [x] After closing a room, the home screen is immediately interactive (E12 "the host
      closes the room and both players can start again immediately";
      `closeRoomThenStart.test.tsx`).
- [ ] Browser back from the game after a game start does not land on a dead lobby
      (re-verify against the push noted in §3.2).
- [x] The navigation rule is recorded in `docs/decision_log.md`.
- [ ] Home to Play and Play to Lobby animate with a forward direction; the reverse animates
      backwards.

## 4. Phase 3 — An app-level overlay host · **S1** · shipped (`05` E2)

**Shipped 2026-10-08** (`05` E2, decision 21; deviations in `05` §9). A declarative
`Overlay` on one stack in `features/overlay` owns the layer, Escape and scrim for the top
entry, focus and its return, the Tab trap, a scroll guard (no root overflow change; `05` §9) and one same-path history entry
per overlay; `LayerPortal` lifts non-modal layers. Every dialog and sheet runs on it, and no
page calls `createPortal`. Proof: `features/overlay/Overlay.test.tsx`, `overlayStack.test.ts`,
`SongInfoModal.test.tsx`, `AdaptiveSelectSheet.test.tsx`, `AppShellMenu.test.tsx`,
`PlaylistEditModal.test.tsx`, `RoomResetModal.test.tsx`, `test/guards/overlaySites.test.ts`,
E2E E13 and E14.

## 5. Phase 4 — Fix the song-editor layering explicitly · **S1** · shipped (B1)

Landed 2026-09-09 as the interim fix: `.detailsOverlay` in `playlistEditChrome.module.css`
became `position: fixed` above the parent sheet's header, the `presentation` prop was
dropped so all three call sites render the track sheet the same way, and the editor can be
closed from inside the playlist editor (B1 ledger in `20-bug-register.md`;
`PlaylistEditModal.test.tsx`, E14). Deviation: the layer is a raw `z-index: 1400`, not
`--z-sheet-nested`; Phase 1 §2.2 migrates it and Phase 3 item 7 makes the host own it.

## 6. Phase 5 — Remove the settings-panel flicker · **S2** · shipped (B5)

Resolved 2026-09-09 (B5 ledger in `20-bug-register.md`): opening settings from the game
page shows a single enter animation, and the render-time `matchMedia` call that fixed the
sheet/dialog presentation at mount is gone from `AppShellMenuDialog`. Deviation from the
plan: `features/motion/MotionPresence.tsx` still defaults to `initial = false`, so the fix
did not go through the default change the plan proposed; any new dialog must pass
`initial` deliberately. The viewport store the plan wanted for rotation handling remains
open under `11-runtime-and-motion-performance.md` §4 (review F-10). No dedicated test for
the flicker was verified.

## 7. Phase 6 — Documented overlay contract · open

The contract was never written. The component and overlay rules live in
`docs/rules/design_system.md` (its §6 already states that overlay components never set
their own z-index and that the host assigns it — marked as a target until Phase 3 lands),
not in `docs/rules/frontend_engineering_rules.md`. Once the host exists, complete §6 of
`docs/rules/design_system.md` with the rules below and add a one-line pointer from
`docs/rules/frontend_engineering_rules.md`:

- All overlays go through `useOverlay`. No page may call `createPortal`.
- `z-index` is a token; the host assigns it. Components never set an overlay `z-index`.
- Every overlay is dismissible unless it represents unrecoverable state.
- Every overlay participates in history as a same-path router-state entry.
- Focus is trapped and restored by the host; callers supply a label only.
- Nested overlays are allowed, at most two deep. A third level is a design smell — use a
  full page instead.
- Every interactive control inside an overlay meets the 48 px touch target
  (`--size-touch-target`).

## 8. Risk register

| Risk                                                                      | Mitigation                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generalising the history pattern regresses the overlays that already work | E13 and E14 stay in the suite; migrate items 5–7 of §4.3 behind the host without changing their behaviour, one overlay per commit.                                                        |
| Body scroll locking breaks iOS momentum scrolling inside sheets           | Lock via `overflow: hidden` plus `position: fixed` with a preserved `top` offset on `body`, the well-known iOS-safe pattern; test on a device, and cover it with an E2E scroll assertion. |
| Focus trapping breaks the drag interaction on the game page               | The timeline is not inside an overlay; the trap applies only to open entries. Verify with the B4 drag tests (`20-bug-register.md`).                                                       |
| Migrating eleven overlays at once regresses several screens               | One overlay per commit, keeping existing props; component test added with each.                                                                                                           |
| The z-index migration changes stacking on a screen nobody checked         | `zIndexScale.test.ts` first, then one file per commit with a screenshot pair in both themes.                                                                                              |
