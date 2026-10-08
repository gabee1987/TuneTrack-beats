# 14 — Navigation and Overlay System

> **Status (2026-10-07):** Phase 1 (z-index scale and guard, `05` E1), Phase 2 §3.2 (push/replace semantics), Phase 4 (B1, song-editor layering) and Phase 5 (B5, settings flicker) shipped; the browser and Android back button closes settings, Music Setup and the nested playlist/track editors through same-path router state (E13, E14). The overlay host and the first migrations shipped 2026-10-08 (`05` E2a: steps 1–4 and the info dialogs). Open: the transition guard and route order (Phase 2 §3.1, §3.3), §4.3 steps 5–10 (`05` E2b), the overlay contract (Phase 6).
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

## 1. Current inventory of overlays

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

## 4. Phase 3 — An app-level overlay host · **S1** · partly shipped (`05` E2a)

**Review finding:** F-06. **Bug register:** B2 (remaining overlay-stack component tests).

### 4.1 Design

One host, mounted **outside** the page-transition tree so it is never captured by an
exiting page, and one stack so ordering, focus, scroll locking and back handling are
solved once.

    apps/web/src/features/overlay/
      OverlayHost.tsx          // renders the stack; mounted in App.tsx, sibling to RouterProvider
      OverlayProvider.tsx      // context + reducer holding the stack
      useOverlay.ts            // open/close API for callers
      overlayStack.ts          // pure reducer + selectors  (unit-tested)
      overlayHistory.ts        // router-state integration  (unit-tested)
      OverlayScrim.tsx         // shared scrim with the standard fade
      types.ts

Stack entry:

    interface OverlayEntry {
      id: string;
      kind: "dialog" | "sheet" | "blocking" | "hint";
      dismissible: boolean;      // false for the recovery modal
      render: () => ReactNode;
      onDismiss?: () => void;
    }

Behaviour:

- The topmost dismissible entry closes on Escape, on scrim click, and on back.
- `kind` selects the z-layer from the Phase 1 token scale, and nesting depth selects
  between `--z-dialog` and `--z-dialog-nested` (likewise for sheets) — which is the
  systematic fix behind B1.
- Body scroll is locked while any entry is open, and restored (including scroll position)
  when the stack empties. Implement once here; today no overlay locks scroll at all, which
  is why background content moves under open sheets on iOS.
- Focus is trapped in the topmost entry and restored to the trigger on close. No overlay
  does this today, so the app is currently not keyboard- or screen-reader-navigable once a
  dialog opens.
- `aria-modal`, `role="dialog"` and a labelled title are provided by the host, not by each
  caller.

### 4.2 Back-button integration

**Mechanism decided:** overlays record themselves as **same-path React Router history
entries carrying router state**, not raw `history.pushState`. Recorded in
`docs/decision_log.md` (2026-10-06). The decision was settled in practice by E13 and E14:
`AppShellMenu`, Music Setup and the nested playlist/track editors push one same-path
router-state entry each (`pages/LobbyPage/hooks/playlistEditorHistory.ts`), browser and
Android back close only the topmost migrated overlay without leaving or remounting the
page, and programmatic close follows the same history path. Route transitions are keyed by
pathname rather than the opaque history key so that a same-path entry does not remount the
page or rebuild its socket.

`overlayHistory.ts` generalises that pattern so each overlay stops re-implementing it:

- When the stack goes from empty to non-empty, navigate to the current pathname with
  `{ state: { overlayDepth: n } }`; each additional entry pushes again, so depth matches
  the stack.
- A location change whose state carries a lower `overlayDepth` closes the topmost entry and
  does **not** navigate anywhere else.
- Closing an entry programmatically (button, scrim, Escape) calls `navigate(-1)` if the
  entry owns a history record, so the two paths converge on one code path rather than
  diverging.
- Guard against re-entrancy with a flag, so a history-driven close does not itself call
  `navigate(-1)`.
- On a pathname change, close the whole stack and reconcile depth.

The overlays still outside history are `SongInfoModal`, the kick confirmation,
`RoomResetModal` and `BottomSheet` (with `AdaptiveSelectSheet`), plus the generic `Dialog`
primitive (F-06). They are migrated onto the host in §4.3 rather than given one more
bespoke history hook.

### 4.3 Migration

Migrate one overlay at a time, in ascending risk order, keeping the old component's public
props so call sites do not change in the same commit:

1. `SongInfoModal` — simplest, read-only.
2. Kick confirmation in `GameMenuPlayerItem`.
3. `features/ui/primitives/Dialog`.
4. `features/ui/BottomSheet` and `AdaptiveSelectSheet`.
5. `AppShellMenuDialog` (settings) — history already works; move the bespoke entry onto
   the host without changing behaviour (E13 must stay green).
6. `SpotifySetupModal` — as above (E14).
7. `PlaylistEditModal` plus `PlaylistTrackDetailsSheet` as a nested pair — history already
   works (E14); the host assigns `--z-sheet-nested` and removes the raw 1400 literal.
8. `RoomResetModal` as `kind: "blocking"`, `dismissible: false` — the entry lives in the
   host, not in the page being unmounted.
9. `AppLoadingOverlay` as `kind: "blocking"`.
10. `ConnectionBanner` from `13-network-protocol-and-resilience.md` §5.2 — new, built on
    the host from the start.

`MotionDialogPortal` becomes an internal implementation detail of the host and is no longer
imported by pages.

### Acceptance

- [ ] No page component calls `createPortal` directly — ratchet in
      `test/guards/overlaySites.test.ts`; nine files remain for E2b.
- [x] Component tests (`19-testing-strategy.md` §4): Escape closes the top entry only; scrim
      click closes the top entry only; back closes the top entry and does not navigate; a
      non-dismissible entry ignores all three; focus returns to the trigger; body scroll is
      locked while open and restored after — `features/overlay/Overlay.test.tsx` (a
      non-dismissible entry takes no history entry; Back on one is settled with
      `RoomResetModal` in E2b).
- [x] E2E: open settings on the game page, press browser back, panel closes and the game is
      still on screen (E13).
- [x] E2E: open Music Setup, then the playlist and song editors; close each layer and
      verify playlist close reveals Music Setup before Music Setup close returns to room
      settings (E14).
- [x] E2E or component test: back closes `SongInfoModal`, the kick confirmation and an
      `AdaptiveSelectSheet` without leaving the page — `SongInfoModal.test.tsx`,
      `AdaptiveSelectSheet.test.tsx`; the kick confirmation is the same `Overlay`.

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
