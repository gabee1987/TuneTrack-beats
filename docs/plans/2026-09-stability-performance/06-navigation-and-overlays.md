# 06 — Navigation and Overlay System

> Addresses findings **F-25, F-26, F-27, F-27b, F-27c, F-28, F-29**.
> Owning layers: `apps/web/src/app`, `apps/web/src/features/motion`,
> `apps/web/src/features/overlay` (new), `apps/web/src/features/theme/tokens`.

Four reported defects trace to one missing abstraction: there is no overlay system. Every
dialog, sheet and modal is an ad-hoc `useState` boolean plus a `createPortal`, with its own
hand-picked `z-index`, no history participation, and no shared focus or scroll management.

This document builds that abstraction. It is a prerequisite for Doc 07 (design system),
Doc 09 (room flow) and Doc 10 (hints), so it belongs early.

## 1. Current inventory of overlays

| Overlay | Implementation | Portal target | z-index | Back button |
| --- | --- | --- | --- | --- |
| App shell menu (settings) | `features/app-shell/components/AppShellMenuDialog.tsx` | `document.body` | 1200 | ignores |
| Room reset / recovery | `features/ui/RoomResetModal.tsx` via `MotionDialogPortal` | `document.body` | 1500 | ignores |
| App loading overlay | `features/loading/AppLoadingOverlay.tsx` | in-tree | 1600 | ignores |
| Playlist editor | `pages/LobbyPage/components/PlaylistEditModal.tsx` (bespoke portal) | `document.body` | 1200 | ignores |
| Song editor (track details) | `pages/LobbyPage/components/PlaylistTrackDetailsSheet.tsx` | in-tree **or** `document.body` | 2 **or** 1400 | ignores |
| Spotify setup | `pages/LobbyPage/components/spotify/SpotifySetupModal.tsx` | via `MotionDialogPortal` | 130 | ignores |
| Song info | `pages/GamePage/components/SongInfoModal.tsx` | in-tree | 1100 | ignores |
| Kick confirmation | `pages/GamePage/gameMenu/GameMenuPlayerItem.tsx` via `MotionDialogPortal` | `document.body` | 1600 | ignores |
| Adaptive select sheet | `pages/LobbyPage/components/AdaptiveSelectSheet.tsx` via `BottomSheet` | in-tree | `--z-sheet` (400) | ignores |
| Generic dialog | `features/ui/primitives/Dialog.tsx` via `MotionDialogPortal` | `document.body` | `--z-dialog` (500) | ignores |
| Toasts | `features/toast/AppToastStack.tsx`, `pages/GamePage/components/GamePageToastStack.tsx` | in-tree | `--z-toast` (600) | n/a |

Nine different overlays, six different z-index conventions, two of which are below the
page content they are supposed to cover. No back-button handling anywhere.

## 2. Phase 1 — One z-index scale, enforced · **S2**

**Finding:** F-28.

### 2.1 Extend the token scale to cover reality

`apps/web/src/features/theme/tokens/primitives.ts` lines 74-83 currently stop at
`celebration: 700`. The scale needs a layer for each real stacking context, with gaps for
in-component stacking:

| Token | Value | Purpose |
| --- | --- | --- |
| `--z-base` | 0 | Page content |
| `--z-raised` | 10 | Cards, chips, elevated surfaces within a page |
| `--z-sticky` | 100 | Sticky headers, scroll fades |
| `--z-nav` | 200 | Bottom docks, action bars |
| `--z-overlay` | 300 | Scrims below sheets |
| `--z-sheet` | 400 | Bottom sheets, side sheets |
| `--z-sheet-nested` | 450 | A sheet opened from a sheet — **fixes F-25** |
| `--z-dialog` | 500 | Modal dialogs |
| `--z-dialog-nested` | 550 | Confirmation opened from a dialog |
| `--z-hint` | 600 | Onboarding coach marks (Doc 10) |
| `--z-toast` | 700 | Toasts and banners |
| `--z-celebration` | 800 | Win/celebration effects |
| `--z-blocking` | 900 | App loading overlay, recovery modal — nothing may cover these |

Within a component, stacking must stay in the 1-9 range so it can never escape its layer.

### 2.2 Migrate every raw literal

40+ declarations across 20 files currently use raw values from `-1` to `5000`. Migrate
mechanically, file by file, mapping each to the closest token. Values 1-9 that are local
stacking inside a component stay as literals — that is legitimate and should be documented
as the one exception.

Notable remappings:

| Location | Current | Becomes |
| --- | --- | --- |
| `playlistEditChrome.module.css` `.overlay` | 1200 | `--z-sheet` |
| `playlistEditChrome.module.css` `.detailsOverlay` | 2 | `--z-sheet-nested` **and `position: fixed`** (see Phase 5) |
| `playlistEditChrome.module.css` `.header` | 4 | 4 (local, inside the sheet) |
| `gamePageActionPanelsDock.module.css` | 5000, 900, 154 | `--z-nav` |
| `gamePageActionPanelsChallenge.module.css` | 880 | `--z-nav` |
| `SongInfoModal.module.css` | 1100 | `--z-dialog` |
| `AppShellMenu.module.css` `.menuOverlay` | 1200 | `--z-sheet` |
| `gamePageMenu.module.css` (kick confirm) | 1600 | `--z-dialog-nested` |
| `RoomResetModal.module.css` | 1500 | `--z-blocking` |
| `AppLoadingOverlay.module.css` | 1600 | `--z-blocking` |
| `SettingField.module.css` | 1600 | `--z-sheet-nested` |
| `spotifySetupShell.module.css` | 130 | `--z-sheet` |
| `timelinePanelShell.module.css` | 1400 | `--z-raised` (it is in-page content, not an overlay) |
| `timelineCelebration.module.css` | 30 | `--z-celebration` |

### 2.3 Enforcement

Add a lint rule so this cannot regress. Either:

- `stylelint` with `declaration-property-value-allowed-list` restricting `z-index` to
  `var(--z-*)` and the integers `-1` through `9`; or
- if adding stylelint is unwanted, a Vitest test that globs every `*.module.css`, extracts
  `z-index` declarations and asserts each is either a `--z-*` var or in `[-1, 9]`.

The test option keeps the toolchain unchanged and is preferred. Write it **before** the
migration so it starts red and turns green as files are converted.

### Acceptance

- [ ] The enforcement test passes over all CSS modules.
- [ ] Visual check of every overlay in the section 1 inventory, in both themes and both
      layout modes, confirming correct stacking.

## 3. Phase 2 — Fix the page-transition layer · **S1**

**Findings:** F-26, F-27c.

### 3.1 Guard the transition against orphaned exits

`apps/web/src/app/AppRoutes.tsx` uses `MotionPresence mode="sync"` keyed on
`location.key`. Under `sync`, a second navigation that lands while a child is still exiting
can leave that child mounted. Because `PageTransition` is
`position: absolute; inset: 0; z-index: 2` with a full-viewport `min-height`, an orphan
covers the whole screen and swallows every tap — the most likely mechanism behind F-27c.

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

### 3.2 Consistent back semantics

The product requirement is: "the back button should always go back where I came from,
including the phone's back button."

Current state: navigation is a mix of `navigate(path)`, `navigate(path, { replace: true })`
and `navigate("/")`, chosen inconsistently. Concretely:

| Call site | Current | Should be |
| --- | --- | --- |
| `usePlayPageController.openLobby` | push | push (correct) |
| `useHomePageController.handleStart` | push to `/play` | push (correct) |
| `useLobbyRoomConnection.handleStateUpdate` game start | push to `/game/:id` | **replace** — the lobby is gone once the game starts, so back should leave the game, not return to a dead lobby |
| `useLobbyRoomConnection.handleStateUpdate` rename | replace | replace (correct) |
| `useLobbyRoomConnection.handleRoomClosed` | push to `/` | **replace** — the room no longer exists |
| `useGameRoomConnection.handleRoomClosed` | push to `/` | **replace** |
| `handleClosedRoomReset` (both) | replace | replace (correct) |
| `LobbyPageMobile.applySetupChanges` rename | push / replace | **remove entirely** — Doc 09 section 3 |
| `JoinRoomPage.handleSubmit` | push to lobby | replace, so back returns to the invite context rather than re-entering it |

Rule to document in `docs/decision_log.md`: **a navigation caused by state that no longer
exists uses `replace`; a navigation caused by a user choosing to go somewhere uses `push`.**

### 3.3 Route order for the transition direction

`getRouteOrder` in `AppRoutes.tsx` maps `/game/*` to 2, `/lobby/*` to 1 and everything
else to 0. `/play` and `/join/:id` therefore both sit at 0 alongside `/`, so
Home to Play has no direction. Extend the ladder:

    "/"          -> 0
    "/join/:id"  -> 1
    "/play"      -> 1
    "/lobby/:id" -> 2
    "/game/:id"  -> 3

### Acceptance

- [ ] Development warning fires if any page exit exceeds its budget; no warning during a
      normal session.
- [ ] After closing a room, the home screen is immediately interactive — verified by an
      E2E test that clicks Start straight after the close (Doc 11 section 5).
- [ ] Browser back from the game after a game start does not land on a dead lobby.
- [ ] The navigation rule is recorded in `docs/decision_log.md`.

## 4. Phase 3 — An app-level overlay host · **S1**

**Findings:** F-27, F-27b.

### 4.1 Design

One host, mounted **outside** the page-transition tree so it is never captured by an
exiting page, and one stack so ordering, focus, scroll locking and back handling are
solved once.

    apps/web/src/features/overlay/
      OverlayHost.tsx          // renders the stack; mounted in App.tsx, sibling to RouterProvider
      OverlayProvider.tsx      // context + reducer holding the stack
      useOverlay.ts            // open/close API for callers
      overlayStack.ts          // pure reducer + selectors  (unit-tested)
      overlayHistory.ts        // popstate integration       (unit-tested)
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
  systematic fix for F-25.
- Body scroll is locked while any entry is open, and restored (including scroll position)
  when the stack empties. Implement once here; today no overlay locks scroll at all, which
  is why background content moves under open sheets on iOS.
- Focus is trapped in the topmost entry and restored to the trigger on close. No overlay
  does this today, so the app is currently not keyboard- or screen-reader-navigable once a
  dialog opens.
- `aria-modal`, `role="dialog"` and a labelled title are provided by the host, not by each
  caller.

### 4.2 Back-button integration

`overlayHistory.ts`:

- When the stack goes from empty to non-empty, `history.pushState({ overlayDepth: n }, "")`.
- Each additional entry pushes again, so depth matches the stack.
- A `popstate` listener closes the topmost entry and does **not** navigate.
- Closing an entry programmatically (button, scrim, Escape) calls `history.back()` if the
  entry owns a history record, so the two paths converge on one code path rather than
  diverging.
- Guard against re-entrancy with a flag, so a `popstate`-driven close does not itself call
  `history.back()`.
- On route change, close the whole stack and reconcile depth.

This satisfies both reported requirements: the browser back button closes the settings
panel, and Android's hardware back does too (it dispatches the same `popstate`).

Note on interaction with react-router: `history.pushState` calls made outside the router
are visible to it as location changes. To avoid fighting it, push overlay records with the
**same** pathname and only a state change, and verify the router's `useNavigationType`
still reports the transition correctly. If it does not, use react-router's own
`useNavigate(".", { state })` plus `useLocation().state` to carry overlay depth instead.
Decide by experiment early in the phase; write the decision into `docs/decision_log.md`.

### 4.3 Migration

Migrate one overlay at a time, in ascending risk order, keeping the old component's public
props so call sites do not change in the same commit:

1. `SongInfoModal` — simplest, read-only.
2. Kick confirmation in `GameMenuPlayerItem`.
3. `features/ui/primitives/Dialog`.
4. `features/ui/BottomSheet` and `AdaptiveSelectSheet`.
5. `AppShellMenuDialog` (settings) — this is the one the user explicitly asked to close on
   back.
6. `SpotifySetupModal`.
7. `PlaylistEditModal` plus `PlaylistTrackDetailsSheet` as a nested pair — this is the
   F-25 fix, so do it after the nesting machinery is proven.
8. `RoomResetModal` as `kind: "blocking"`, `dismissible: false` — this removes F-27b,
   because the entry lives in the host, not in the page being unmounted.
9. `AppLoadingOverlay` as `kind: "blocking"`.
10. `ConnectionBanner` from Doc 05 section 5.2 — new, built on the host from the start.

`MotionDialogPortal` becomes an internal implementation detail of the host and is no longer
imported by pages.

### Acceptance

- [ ] No page component calls `createPortal` directly.
- [ ] Component tests (Doc 11 section 4): Escape closes the top entry only; scrim click
      closes the top entry only; back closes the top entry and does not navigate; a
      non-dismissible entry ignores all three; focus returns to the trigger; body scroll is
      locked while open and restored after.
- [ ] E2E: open settings on the game page, press browser back, panel closes and the game is
      still on screen.
- [ ] E2E: open the playlist editor, open a song editor from it, press back twice, and land
      back on the lobby.

## 5. Phase 4 — Fix the song-editor layering explicitly · **S1**

**Finding:** F-25. This is the user-visible defect; Phase 3 makes it structurally
impossible, but it is worth stating the concrete change.

`apps/web/src/pages/LobbyPage/components/PlaylistEditModal.tsx` line 128 renders
`PlaylistTrackDetailsSheet` with the default `presentation="contained"`. Contained mode
resolves to `.detailsOverlay { position: absolute; z-index: 2 }`, which is beneath the
parent sheet's `.header { z-index: 4 }`.

Two acceptable fixes, in order of preference:

1. **Preferred (post-Phase 3):** remove the `presentation` prop entirely. The details
   sheet becomes an overlay-host entry, so the host assigns it `--z-sheet-nested` and it is
   always above its parent. The three call sites
   (`PlaylistEditModal`, `SpotifyOpenedPlaylistPanel`, `SpotifyCandidateReviewPanel`) then
   behave identically, which removes the inconsistency that caused the bug.
2. **Interim (if a fix is needed before Phase 3):** pass
   `presentation="fullscreen"` from `PlaylistEditModal`, matching the two working call
   sites, and raise `.detailsOverlayFullscreen`'s `z-index` to `var(--z-sheet-nested)`.
   One-line change, immediately shippable, and it is what Doc 12 item B1 specifies.

Also clean up while there: `playlistEditChrome.module.css` defines `.detailsSheet` twice
(lines 109 and 313), the second inside a `@media (max-width: 520px)` block. That is legal
but confusing; the media-query override should be reduced to only the properties it
actually changes (`width`, `border-left`).

### Acceptance

- [ ] Opening a song from the playlist editor shows the editor above the parent sheet with
      its close button tappable.
- [ ] Saving and cancelling both work and return to the list with the edit applied.
- [ ] The same component renders identically from all three call sites.
- [ ] Component test covers open, edit, save, and close-by-scrim from the playlist editor.

## 6. Phase 5 — Remove the settings-panel flicker · **S2**

**Finding:** F-29. Three causes, three fixes.

### 6.1 The chunk is fetched on tap

`AppShellMenu` renders `AppShellMenuDialog` inside `<Suspense fallback={null}>`, and the
dialog chunk is 8.55 kB. The existing `onMouseEnter` / `onFocus` / `onTouchStart` preloads
help, but on a tap the fetch and the click happen in the same gesture.

- Preload the dialog module when the app shell mounts on Lobby and Game, via
  `apps/web/src/app/preloadRoutes.ts` (Doc 02 section 7.4). The settings panel is opened in
  nearly every session, so it belongs in the route's warm set, not behind a hover.
- Keep the `Suspense` boundary as a safety net, but give it a fallback that renders the
  scrim only, so the transition begins immediately even on a cold chunk.

### 6.2 The enter animation is skipped

`apps/web/src/features/motion/MotionPresence.tsx` defaults `initial = false`. That is the
right default for the page-transition `AnimatePresence` (no animation on first paint) but
wrong for dialogs, which should animate in every time.

- Change the default to `initial = true`.
- Pass `initial={false}` explicitly at the two call sites that need it: `AppRoutes` and
  `HeaderLeadersStrip`.
- Audit the remaining `MotionPresence` usages and set the flag deliberately at each.

### 6.3 The scroll fades appear a frame late

`AppShellMenuSheet` computes `showTopFade` / `showBottomFade` in a `useEffect` plus a
`ResizeObserver`, both starting `false`. The gradients therefore pop in after paint.

- Measure in `useLayoutEffect` so the first committed paint already has the correct
  classes.
- Better still, replace the JS measurement with a CSS-only solution: `mask-image` on the
  scroll container combined with `scroll-timeline` where supported, falling back to always-on
  edge masks. The fades are decorative; they do not need a JS observer. Measure both and
  keep the simpler one.
- Remove the mount animation on the active-tab pill (`AppShellMenuSheet` lines 130-144).
  The active tab is not a state *change* on open — it is the initial state. Animate it only
  when the user switches tabs, by keying the `AnimatePresence` on a "has interacted" flag or
  by using framer-motion's `layoutId` on the pill so it slides between tabs instead of
  fading in.

### 6.4 While in this file

`isMobileSheet` in `AppShellMenuDialog` is computed during render via
`window.matchMedia("(max-width: 720px)").matches` and never updates. Replace with the
viewport store from Doc 03 section 4 so it is consistent with `usePageLayoutMode` and
reacts to rotation.

### Acceptance

- [ ] Opening settings from the game page shows a single smooth enter animation with no
      intermediate frame. Verified by a recorded screen capture at 60 fps, frame-stepped.
- [ ] The dialog chunk is already cached by the time the trigger is first tapped on Lobby
      and Game.
- [ ] `MotionPresence` default change does not introduce an animation on the app's first
      paint (check the home screen on a cold load).
- [ ] Rotating the device while settings is open switches between sheet and dialog
      presentation correctly.

## 7. Phase 6 — Documented overlay contract

Once the host exists, write the rules down where implementers will see them, in
`docs/frontend_engineering_rules.md`:

- All overlays go through `useOverlay`. No page may call `createPortal`.
- `z-index` is a token; the host assigns it. Components never set an overlay `z-index`.
- Every overlay is dismissible unless it represents unrecoverable state.
- Every overlay participates in history.
- Focus is trapped and restored by the host; callers supply a label only.
- Nested overlays are allowed, at most two deep. A third level is a design smell — use a
  full page instead.

## 8. Risk register

| Risk | Mitigation |
| --- | --- |
| Overlay history fights react-router's history | Decide by experiment at the start of Phase 3 between raw `pushState` and router state; record the decision. Both are viable; the reducer is agnostic. |
| Body scroll locking breaks iOS momentum scrolling inside sheets | Lock via `overflow: hidden` plus `position: fixed` with a preserved `top` offset on `body`, the well-known iOS-safe pattern; test on a device, and cover it with an E2E scroll assertion. |
| Focus trapping breaks the drag interaction on the game page | The timeline is not inside an overlay; the trap applies only to open entries. Verify with the Doc 12 item B4 drag tests. |
| Migrating nine overlays at once regresses several screens | One overlay per commit, keeping existing props; component test added with each. |
| Changing `MotionPresence`'s default animates something that should not animate | Only two call sites rely on the old default and both are explicitly updated in the same change; audit the rest as a checklist item. |
