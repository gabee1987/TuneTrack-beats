# 12 — Defect Register

Every item the product owner reported, with the root cause found in the code, the specific
fix, and how to prove it. Items are ordered by how cheaply they can be fixed relative to
their user impact, so this doubles as the wave W1 work list.

**Rule for all of them** (`AGENT.md` section 7): write the failing test first. A fix without
a test that failed beforehand has not been shown to address the reported problem.

Status legend: **Confirmed** — root cause read in the source. **Hypothesis** — mechanism
identified but needs a live reproduction to confirm which of several candidates is firing.
**Partially fixed** — the reported problem has already been improved since it was raised.

---

## B1 · Song editor opens under the playlist editor and cannot be closed

**Severity:** S1 · **Status:** Confirmed · **Finding:** F-25 · **Effort:** very small

### Root cause

`apps/web/src/pages/LobbyPage/components/PlaylistEditModal.tsx` line 128 renders
`PlaylistTrackDetailsSheet` without a `presentation` prop, so it takes the default
`"contained"` (`PlaylistTrackDetailsSheet.tsx` line 29). Contained mode uses
`.detailsOverlay`, which in
`apps/web/src/pages/LobbyPage/components/playlistEditChrome.module.css` is:

    .detailsOverlay {
      position: absolute;
      inset: 0;
      z-index: 2;     /* line 94 */
      ...
    }

while the parent sheet's own header, in the same file, is:

    .header {
      position: relative;
      z-index: 4;     /* line 43 */
      ...
    }

The parent header therefore paints above the details sheet. Because the details sheet is
right-aligned and full-height, its own header — and its close button — sit exactly under
the parent header, which also intercepts the taps aimed at them.

The same component behaves correctly from `SpotifyOpenedPlaylistPanel.tsx` line 246 and
`SpotifyCandidateReviewPanel.tsx` line 224, because both pass
`presentation="fullscreen"`, which resolves to `.detailsOverlayFullscreen`
(`position: fixed; z-index: 1400`).

### Fix

**Immediate (one line, shippable in wave W1):** pass `presentation="fullscreen"` from
`PlaylistEditModal`, matching the two working call sites, and change
`.detailsOverlayFullscreen`'s `z-index: 1400` to `var(--z-sheet-nested)` once the token
scale from Doc 06 section 2 exists.

**Structural (wave W2):** remove the `presentation` prop entirely and route the sheet
through the overlay host, which assigns the nested layer automatically. Doc 06 section 5.
The prop is the bug: it let three call sites of one component disagree about layering.

While in the file, reduce the duplicate `.detailsSheet` block at line 313 (inside
`@media (max-width: 520px)`) to only the properties it actually overrides.

### Verification

- Component test: render `PlaylistEditModal` with three fixture tracks, click a row, assert
  the details form is visible and its close button is the topmost element at its own
  coordinates (`document.elementFromPoint`, or assert the click handler fires).
- Component test: close by button, by scrim, and by Escape.
- Component test: assert all three call sites render the sheet with the same layer.
- E2E E14 (Doc 11 section 5.3).
- Manual M6.

---

## B2 · Navigation is inconsistent; back does not close panels; the reset modal lingers

**Severity:** S1 · **Status:** Confirmed · **Findings:** F-26, F-27, F-27b · **Effort:** medium

This is three reported symptoms with one shared cause. Treating them separately produces
three patches; treating them together produces a system.

### Root causes

**(a) No overlay participates in history.** A search for `popstate`, `history.pushState`
and `useBlocker` across `apps/web/src` returns nothing. All nine overlays are plain
`useState` booleans, so browser back and Android hardware back navigate the route instead of
closing the panel. This is the whole of "if we are on the settings panel and press the
browser back button, it should just close the panel".

**(b) The reset modal is inside the page being unmounted.** `RoomResetModal` is rendered by
`GamePage.tsx` (lines 46-51) and `LobbyPage.tsx` (lines 24-28), and portals to
`document.body` at `z-index: 1500`. `handleClosedRoomReset` sets `isOpen` false and
navigates in the same handler; React batches both, so `location.key` changes in the same
render and `AnimatePresence` (`AppRoutes.tsx` line 46, `mode="sync"`) marks the old page as
exiting. Framer Motion renders an exiting child from its previously captured element, so the
exiting subtree never sees `isOpen={false}` and the portal keeps painting until the 320 ms
transition ends. Hence "the page is navigating underneath but the modal stays there".

**(c) `push` and `replace` are chosen inconsistently.** Doc 06 section 3.2 tabulates nine
navigation call sites; four use the wrong one. Notably a game start pushes over the lobby,
so back from the game lands on a lobby that no longer exists.

### Fix

1. **Overlay host** (Doc 06 section 4): one app-level host mounted as a sibling of
   `RouterProvider`, outside the transition tree. Overlays live in a stack, participate in
   history via `popstate`, trap and restore focus, and lock body scroll.
2. **Move `RoomResetModal` into the host** as a non-dismissible `blocking` entry, which
   removes cause (b) structurally — the entry is no longer inside the page being unmounted.
3. **Navigation rule**, recorded in `docs/decision_log.md`: a navigation caused by state
   that no longer exists uses `replace`; a navigation the user chose uses `push`. Apply to
   all nine call sites.
4. **Guard the transition** (Doc 06 section 3.1): add `pointerEvents: "none"` to the exit
   variant in `coreMotionTokens.ts` so an exiting page can never receive input, and add
   `onExitComplete` with a development warning.
5. **Extend `getRouteOrder`** so `/play` and `/join/:id` sit between Home and Lobby, giving
   every transition a direction.

### Verification

- Component tests (Doc 11 section 4): Escape / scrim / back each close only the topmost
  entry; a non-dismissible entry ignores all three; focus returns to the trigger; body
  scroll locks and restores.
- Component test: `RoomResetModal` unmounts when its reason clears, even mid-navigation.
- E2E E12, E13, E14.
- Manual M5, M6, M11, M17 (the installed PWA is where back behaviour most often differs).

---

## B3 · Similar controls do not look or feel the same

**Severity:** S2 · **Status:** Confirmed · **Findings:** F-30, F-31, F-33 · **Effort:** large

### Root cause

Four parallel button systems and two icon-button systems coexist; only 9 of 69 page
components use the intended primitives layer. Full inventory in Doc 01 F-30 and F-31.

### Fix

Doc 07, phases 1-3: collapse to one `Button` with a closed variant set, one `IconButton`,
one shared icon module, promote the seven missing primitives, and retire the 94 hardcoded
hex values plus roughly 300 raw-pixel spacing values. Guard with the filesystem tests in
Doc 11 section 4 and `no-restricted-imports` so the consolidation cannot regress.

### Verification

Doc 07 acceptance criteria; `/dev/ui` as the review surface; screenshot pairs per migrated
file.

---

## B4 · Card drag competes with scrolling on iPhone

**Severity:** S1 · **Status:** Confirmed (mechanism) / needs device confirmation of the fix ·
**Finding:** F-35 · **Effort:** small to medium

### Root cause

Three factors compound:

1. **Only a `PointerSensor`, with a 4 px distance constraint.**
   `apps/web/src/pages/GamePage/components/TimelinePanel.tsx` lines 122-128 configures
   `useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } })`
   with `DRAG_ACTIVATION_DISTANCE_PX = 4` (`gamePage.constants.ts` line 1). At 4 px, a scroll
   gesture and a drag gesture are indistinguishable at activation time, so whichever of the
   browser and dnd-kit claims the gesture first wins — non-deterministically.
2. **The scroll container hands the gesture to the compositor.**
   `apps/web/src/pages/GamePage/components/timelinePanelShell.module.css` sets
   `-webkit-overflow-scrolling: touch` with `scroll-snap-type: y proximity` in the mobile
   portrait block (lines 355-370), and `touch-action: pan-x` in the landscape block
   (line 414). On iOS Safari, `-webkit-overflow-scrolling: touch` promotes the container to
   a momentum-scrolling layer that can begin scrolling before pointer events reach the
   sensor.
3. **`touch-action: none` covers too little.** It is set only on
   `.previewCardDraggable` (`timelineCards.module.css` lines 140-145). A touch that lands on
   the wrapper `.timelineItem`, on padding, or on an inner text node is not covered, so the
   browser retains its default touch behaviour for that target.

### Fix

1. **Add a `TouchSensor` for coarse pointers** with a press-and-hold constraint, which is
   dnd-kit's documented remedy for exactly this conflict:

       useSensor(TouchSensor, {
         activationConstraint: { delay: 180, tolerance: 8 },
       })

   Select sensors by pointer type: `TouchSensor` on coarse pointers, `PointerSensor` on fine
   pointers. Use the viewport store from Doc 03 section 4 for the pointer-type signal so
   there is one source of truth.
   180 ms is short enough to feel immediate and long enough that a flick is unambiguously a
   scroll. Tune on device between 150 and 250 ms.
2. **Move `touch-action: none` up to the element that carries the drag listeners.** Verify
   in the DOM which node receives `attributes`/`listeners` from `useSortable` — currently
   `PreviewCard` — and set `touch-action: none` there and on its interactive descendants.
3. **Replace `-webkit-overflow-scrolling: touch`.** It has been unnecessary since iOS 13 for
   momentum scrolling and is actively harmful here. Remove it and re-test scrolling feel.
4. **Reconsider `scroll-snap-type: y proximity`** on a container that is also a drop target.
   Snap points fight a drag that ends between them. Try removing it; if the snapping is
   wanted, restrict it to when no drag is active by toggling a class on drag start.
5. **Add a visible press-and-hold affordance.** With a delay constraint, the user needs
   feedback that the hold registered: a small scale or shadow change on the card at
   activation. Without it, a delay sensor feels broken rather than deliberate. Use
   `transform` only.
6. **Re-test with the global pointer listener removed** (F-10, Doc 03 section 6). A
   capture-phase `pointerdown` listener on `window` is a plausible additional contributor and
   is being removed anyway.

### Verification

- E2E in WebKit (Doc 11 section 5.4): a fast swipe scrolls and does not reorder; a hold then
  move reorders and does not scroll. Drive with real `touchstart`/`touchmove`/`touchend`
  events, not mouse events.
- Component test: sensor selection follows pointer type.
- Manual M1, M2, M3 on a physical iPhone. This one genuinely requires hardware.

---

## B5 · Settings panel flickers when opened from the gameplay area

**Severity:** S2 · **Status:** Confirmed · **Finding:** F-29 · **Effort:** small

### Root cause

Three independent contributors, all in the `AppShellMenu` chain:

1. **The dialog chunk is fetched at tap time.**
   `apps/web/src/features/app-shell/AppShellMenu.tsx` renders `AppShellMenuDialog` inside
   `<Suspense fallback={null}>`. The chunk is 8.55 kB. The existing `onMouseEnter` /
   `onFocus` / `onTouchStart` preloads help on desktop, but on a tap the fetch and the click
   are one gesture, and the `null` fallback means nothing renders in between.
2. **The enter animation is skipped.**
   `apps/web/src/features/motion/MotionPresence.tsx` defaults `initial = false`, so the
   dialog's `AnimatePresence` does not animate on mount. The sheet appears instantly rather
   than transitioning in, which reads as a pop.
3. **The scroll fades appear one frame late.**
   `apps/web/src/features/app-shell/components/AppShellMenuSheet.tsx` lines 47-88 compute
   `showTopFade` / `showBottomFade` in a `useEffect` plus a `ResizeObserver`, both starting
   `false`. The gradients therefore fade in after the first paint. The active-tab pill
   (lines 130-144) also animates opacity 0 to 1 on every mount, so the tab indicator fades in
   each time the menu opens.

### Fix

1. Preload the dialog module when the app shell mounts on the Lobby and Game routes, via
   `apps/web/src/app/preloadRoutes.ts` (Doc 02 section 7.4). Give the `Suspense` fallback
   the scrim, so the transition starts immediately even on a cold chunk.
2. Change `MotionPresence`'s default to `initial = true`, and pass `initial={false}`
   explicitly at the two call sites that need it (`AppRoutes`, `HeaderLeadersStrip`).
3. Measure the scroll overflow in `useLayoutEffect` so the first committed paint is already
   correct, or replace the JS measurement with a CSS-only edge mask. Remove the pill's
   mount animation and give it a `layoutId` so it slides between tabs instead of fading in.
4. While in the file: `isMobileSheet` is computed during render from
   `window.matchMedia("(max-width: 720px)").matches` and never updates. Move it to the
   viewport store (Doc 03 section 4).

### Verification

- Component test: the sheet renders with its fade classes already correct on first commit
  (assert immediately after render, before flushing effects).
- Component test: the tab pill does not animate on mount but does on a tab switch.
- 60 fps screen capture, frame-stepped, showing one continuous enter animation.
- Manual M4.

---

## B6 · Leaderboard chip bottom border is cut off in the gameplay area

**Severity:** S2 · **Status:** Confirmed · **Finding:** F-32 · **Effort:** very small

### Root cause

In `apps/web/src/pages/GamePage/gamePageChrome.module.css`:

    .headerLeadersStrip {          /* lines 222-228 */
      display: flex;
      gap: var(--space-2);
      overflow-x: auto;
      max-width: 100%;
      scrollbar-width: none;
    }

    .headerLeaderChip {            /* lines 242-251 */
      ...
      outline: 1px solid var(--color-border-subtle);
      ...
    }

`overflow-x: auto` makes the element a scroll container in **both** axes — the computed
`overflow-y` becomes `auto` too — so content painted outside the content box in the block
direction is clipped. An `outline` paints *outside* the border box by definition. The strip
has no block padding, so the chip's bottom outline edge falls in the clipped region.

### Fix

Preferred: change `.headerLeaderChip` from `outline` to `border`, which paints inside the
border box and is also what the `Chip` primitive uses — so this fixes the defect and removes
a design-system inconsistency in the same edit. Adjust padding by 1 px if the size shift
matters.

If the outline must stay (it avoids affecting layout), add `padding-block: 2px` to
`.headerLeadersStrip` and compensate elsewhere.

Then audit the other three `outline`-on-chip usages found during the audit
(`.menuActionButton`, `.menuKickPlayerButton`, `.dangerAction`) and normalise them in
Doc 07 phase 1.

### Verification

- Component test: `HeaderLeadersStrip` renders three leaders; assert the chip's computed
  border is present. (jsdom will not prove the clipping, so pair with the visual check.)
- Screenshot at a viewport narrow enough to force horizontal scrolling, with the bottom edge
  visible.
- Manual M7.

---

## B7 · Playback is inconsistent: mid-song starts, and sometimes needs a manual start

**Severity:** S2 · **Status:** Confirmed · **Findings:** F-37, F-39 · **Effort:** small

### Root cause, part 1 — mid-song starts

`apps/server/src/spotify/SpotifyApiClient.playTracksOnDevice` (lines 523-538) sends
`PUT /me/player/play` with `body: JSON.stringify({ uris: spotifyTrackUris })` and **no
`position_ms`**. When the requested URI is already the device's current track and is paused
part-way through, Spotify resumes rather than restarts.

Reinforcing it, `useSpotifyPlaybackSdk.waitForPlayingUri` short-circuits to success when
`currentTrackUriRef.current === spotifyTrackUri && isPlayingRef.current`, so an
already-playing identical URI is reported as a successful start with no seek.

### Root cause, part 2 — manual start needed

`useSpotifyPlaybackSdk` handles `autoplay_failed` by logging to the console and failing the
pending confirmation. `useHostPlayback` then retries on the ladder `[0, 2500, 6000]` ms and
gives up silently. `HostPlaybackState` exposes no flag for "a gesture is required", so the
UI cannot prompt. The host is left with a silent player and no affordance.

The retry ladder is also the wrong remedy for this failure: an autoplay block will never
succeed on retry without a user gesture, so the three attempts are wasted time.

### Fix

Doc 08 phases 1 and 2:

1. Send `position_ms: 0` by default, with an optional `startPositionMs` parameter.
2. Add `expectRestart` to `playTrack` so an intentional restart skips the already-playing
   shortcut and waits for a low `position`.
3. Add `needsUserGesture` to `HostPlaybackState`; set it on `autoplay_failed` and on retry
   exhaustion; clear it on any successful confirmation.
4. Branch the retry ladder: keep it for device-visibility failures, skip it entirely for
   autoplay blocks.
5. Render a prominent "Tap to play" control in the turn action dock while
   `needsUserGesture` is true.

### Verification

- `apps/server/tests/spotify/SpotifyApiClient.test.ts`: the request body contains
  `position_ms: 0`.
- Component test with the fake Spotify player (Doc 11 section 3.4): `autoplay_failed` sets
  `needsUserGesture` and the dock renders the control.
- Component test: no retry occurs after an autoplay block.
- Manual M9.

---

## B8 · Network inconsistencies; it must be rock solid

**Severity:** S1 · **Status:** Confirmed · **Findings:** F-13, F-15, F-16, F-21, F-22 ·
**Effort:** large

### Root causes, in order of impact

1. **A host reconnect issues the wrong command and hard-fails.**
   `apps/web/src/pages/LobbyPage/hooks/useLobbyRoomConnection.ts` registers
   `handleConnect` as the `"connect"` listener; `handleConnect` emits `CreateRoom` when
   `intent === "create"`. Socket.IO fires `"connect"` on every reconnect, and
   `apps/server/src/rooms/RoomLobbyService.createRoom` (lines 45-52) throws
   `ROOM_ALREADY_EXISTS` whenever the room exists. A host who briefly loses Wi-Fi cannot
   get back into their own lobby. **This is very likely the specific event behind the
   report.**
2. **Nothing acknowledges an action.** Every client action is a bare `socket.emit`; the only
   feedback is a global `Error` event with no correlation to the action. The client cannot
   distinguish accepted, rejected, dropped and slow.
3. **A language change rebuilds the connection.** Both room-connection effects list the
   i18n `t` callback in their dependency arrays
   (`useLobbyRoomConnection.ts` line 236, `useGameRoomConnection.ts` line 152), so switching
   language tears down every listener and re-emits a join — which then hits cause 1.
4. **The server has no mobile-network configuration.**
   `apps/server/src/app/createSocketServer.ts` sets only `cors` and `maxHttpBufferSize`: no
   `connectionStateRecovery`, no ping tuning, no rate limiting.
5. **The client has no reconnection policy.** `socketClient.ts` passes only
   `{ autoConnect: false }`: no backoff configuration, no handshake `auth`, and the
   connection status strings reaching the UI are untranslated English literals.

### Fix

- Doc 05 section 1 — reconnect always joins; `create_room` is idempotent for its owning
  session; `GAME_ALREADY_STARTED` gets a recovery path; a server `instanceId` distinguishes
  a restart from a closed room.
- Doc 05 section 3 — `t` moves to a ref; the connection effect runs exactly once per room.
- Doc 05 section 4 — acknowledgements with request ids and server-side idempotency for the
  five non-idempotent gameplay actions.
- Doc 05 section 5 — explicit reconnection policy, handshake `auth: { sessionId }`, one typed
  connection-state model, and a single localised connection banner.
- Doc 04 section 2 — `connectionStateRecovery`, ping tuning, per-socket rate limits.
- Doc 04 section 1 — the in-game disconnect lifecycle (B10's neighbour, and a genuine state
  loss).

### Verification

- E2E E7 to E12 — these fail against current code and are the proof that the work landed.
- Server tests per Doc 11 section 6.
- Component test: a language change emits nothing and drops no listener.
- Manual M10.

---

## B9 · A track that finishes during a placement cannot be restarted

**Severity:** S1 · **Status:** Confirmed · **Finding:** F-38 · **Effort:** small

### Root cause

`apps/web/src/pages/GamePage/hooks/useHostPlayback.ts` `resume()`:

    if (sdkHasActiveContext) {
      sdkResume();
      return;
    }
    const uri = currentUriRef.current;
    if (uri) { void playTrack(uri) ... }     // unreachable in practice

`hasActiveContext` is set `true` in `useSpotifyPlaybackSdk`'s `player_state_changed`
handler on the first state event and is cleared only by `resetPlaybackState()`, which runs
on room close and on teardown. While the player stays connected it is permanently `true`.

When a single-URI context finishes, Spotify reports `paused: true` with an exhausted queue,
so `player.resume()` has nothing to resume. Because `hasActiveContext` is still `true`, the
fallback that would re-issue the URI is never reached. The host presses play and nothing
happens.

There is also no `restart` member on `HostPlaybackState`, so no UI control can express
"play this again" even if the host wanted to.

### Fix

Doc 08 section 3:

1. Derive `hasEnded` in `player_state_changed`, detecting both known end-of-context shapes
   (`paused` with `position` at or near 0 and no next tracks; `paused` with
   `position >= duration`). Clear it on any unpaused state and on every new `playTrack`.
2. Set `hasActiveContext` false when `hasEnded` becomes true, so the flag means what its
   name says.
3. Rewrite `resume()` to fall through to `restart()` whenever `hasEnded || !hasActiveContext`.
4. Add `restart()` to the contract and wire a restart control into the turn action dock, so
   pause, play and restart are available at any point in a turn.
5. Give the free-tier preview path the same `restart()` and reset `lastPreviewUrlRef` on
   card change rather than comparing URLs, so a repeated preview can replay.

The important property to preserve: **no state exists in which the host cannot get audio
going again.** Any doubt falls through to a re-issue.

### Verification

- Component test with the fake Spotify player: emit an end-of-track state, call `resume()`,
  assert `playTrack` is called and `player.resume()` is not.
- Component test: `restart()` from all five states (never played, playing, paused mid-track,
  ended, autoplay-blocked).
- Component test: free-tier replay of the same preview URL.
- Manual M8.

---

## B10 · Home screen is unresponsive after closing a room

**Severity:** S1 · **Status:** **Partially fixed — diagnosis corrected** · **Finding:** F-27c

### Confirmed on retest (2026-09-08)

The first fix pass treated this as an input-blocking problem: `pointerEvents: "none"` was
added to the page-transition exit variant, plus `contain: layout paint` and a dev warning
(commit `f1dbb51`). **The defect survived that fix**, and the retest produced the decisive
detail: *the settings panel still opens*. Input therefore works. Only navigation is dead.

That eliminates every overlay- and pointer-based mechanism below, because a blocking
overlay would swallow the settings trigger as well. In a data router, only three things
stop a navigation from completing: a blocker, a loader, or an unresolved `lazy()`. There
are no blockers and no loaders on these routes, so the route module is the only candidate
left — and `lazyRoute.ts` contained exactly that failure:

```
window.location.reload();
return new Promise<TModule>(() => {});   // never settles
```

If the reload does not take effect, that promise leaves the navigation pending forever and
**every later navigation queues behind it**. The app keeps answering local input while no
screen change is ever possible again — "the Start button does nothing, only a refresh
helps", with the settings panel still working. A second chunk failure in one session took
the `throw` branch instead, which had no error boundary anywhere in the app to catch it,
so it also produced a silent dead navigation.

Contributing factors found in the same pass:

- `preloadRoutes.ts` memoised the preload promise permanently, so one rejected preload
  poisoned that route for the rest of the session.
- `loadAppShellMenuDialog` memoised its rejection the same way.
- The app had **no `errorElement` / `ErrorBoundary` on any route**, so any route-load
  failure was invisible by construction.

### Fixed in commit `018407c`

- `loadLazyRoute` never returns an unsettled promise; the reload path rejects after a
  4-second grace so the router can render its error element.
- `AppRouteError` added as the root route's `ErrorBoundary`: a real recovery screen with
  Retry and Back-to-home, and it logs the underlying error.
- Rejected preload promises are cleared instead of remembered, and preload warm-ups no
  longer raise unhandled rejections.
- A development warning names any navigation still pending after 8 seconds.

### Still open

If the symptom recurs, the console now identifies it: `[AppRouteError]` for a failed route
load, or `[AppRoutes] the navigation to "..." has been pending` for a stalled one. Capture
that line before changing more code.

### Candidate mechanisms (superseded — kept for the audit trail)

Static reading gives three, all in the same structural area as B2:

1. **An exiting `PageTransition` that never unmounts.** It is
   `position: absolute; inset: 0; min-height: var(--app-height); z-index: 2`
   (`features/motion/PageTransition.tsx`), so an orphan covers the whole screen and
   swallows every tap — permanently, which matches "only after refresh". Under
   `mode="sync"` this is the known failure mode when the presence key changes again while a
   child is still exiting. `handleRoomClosed` (`useGameRoomConnection.ts` lines 109-127)
   navigates from a socket callback and, unlike `handleClosedRoomReset`, does **not** pass
   `replace: true`, so a second navigation can land during the first exit.
2. **A stuck portal overlay.** `RoomResetModal` (1500) or `AppLoadingOverlay` (1600) left
   mounted with `pointer-events: auto`. The loading overlay's 120-second self-timeout would
   read as permanent to a user.
3. **A socket handshake that never settles** after `resetSocketClient()`, leaving `PlayPage`
   connected but never receiving a room list.

### Do this before writing any fix

1. Reproduce on a device with DevTools attached.
2. Inspect `document.body`'s children and
   `document.querySelectorAll('[style*="position: absolute"]')` for a leftover
   `PageTransition` node.
3. Add a temporary `onExitComplete` log to `AppRoutes`' `AnimatePresence` and check whether
   it fires for the game route.
4. Run `document.elementFromPoint(x, y)` at the Start button's coordinates to see what is
   actually receiving the tap.
5. Record the confirmed mechanism here before changing code.

### Fix

The Doc 06 work addresses all three candidates without needing to know which is firing:

- `pointerEvents: "none"` on the exit variant neutralises candidate 1 even if orphans still
  occur, and `onExitComplete` makes them visible in development.
- Moving every overlay into the app-level host neutralises candidate 2.
- Doc 05 section 5's explicit connection-state model makes candidate 3 visible to the user
  as a banner rather than as an inert screen.

Also apply the `replace` rule from B2 to `handleRoomClosed` in both connection hooks.

### Verification

- E2E E12: close the room from the host, then click Start on the home screen immediately —
  no wait, no reload.
- E2E: assert `document.body` has no leftover overlay node after the transition completes.
- Manual M11, on both the browser and the installed PWA.

---

## B11 · Player remove button does not match the token remove or close-room buttons

**Severity:** S3 · **Status:** **Partially fixed** · **Finding:** F-30 · **Effort:** small

The owner asked to check whether this was already fixed. It has been partly fixed since it
was reported. Current state, read from the source:

### Colour treatment — now consistent

All four danger controls resolve to the same three semantic tokens
(`--color-status-danger-surface`, `--color-status-danger-text`,
`--color-status-danger-border`):

| Control | Class / component |
| --- | --- |
| Player remove (kick) | `.menuActionButton .menuKickPlayerButton` (`gamePageMenu.module.css`) |
| Token remove | `.menuActionButton .menuActionButtonRemove` (same file) |
| Close room, game menu footer | `Button variant="danger"` (`primitives/Button.module.css`) |
| Close room, lobby | `.dangerAction` via `RoomDangerActionButton` |
| Playlist batch delete, track-details cancel | `ActionButton variant="danger"` (`FormControls.module.css` `.buttonDanger`) |

Player remove and token remove are now **byte-for-byte identical** in their danger
declarations, so those two match.

### Geometry and typography — still inconsistent

| Control | Radius | Min height | Padding | Font size |
| --- | --- | --- | --- | --- |
| Player remove / token remove | `--radius-pill` | 44 px | 10px 14px | `clamp(10px, 9cqw, 14px)` (container query) |
| Close room (lobby) | `--radius-pill` | 44 px | 12px 14px | inherited, weight 800 |
| Close room (game menu footer) | `--button-radius` | `--button-min-height` | `--space-3 --space-5` | `--type-label-size` |
| `ActionButton variant="danger"` | `--radius-button` (**not pill**) | none | none | `clamp(11px, 3.8vw, 16px)` |

So four different shapes and four different type rules for the same semantic action. The
44 px min-height is also below the 48 px touch target that `CLAUDE.md` specifies and that
`touchTargetSize` in `primitives.ts` already defines.

### Fix

Doc 07 phase 1: all five become `Button variant="danger"` at the appropriate size. Delete
`.menuActionButton`, `.menuKickPlayerButton`, `.menuActionButtonAdd`,
`.menuActionButtonRemove`, `RoomDangerActionButton`, `RoomPrimaryActionButton` and
`ActionButton`. Add `no-restricted-imports` so they cannot return.

The container-query font sizing on the game-menu buttons is worth keeping as a `Button`
capability rather than losing — narrow player rows genuinely need it. Add it as a size
variant (`size="fit"`) rather than as a bespoke class.

### Verification

- Component test: all five call sites render `Button variant="danger"`.
- `primitives.contract.test.ts` extended to assert the variant set.
- `/dev/ui` shows them side by side at each size.
- Screenshot comparison of the game menu player row, the lobby actions and the playlist
  editor toolbar before and after.

---

## B12 · Player name lives in the room flow and is not remembered

**Severity:** S2 · **Status:** Confirmed · **Finding:** F-40 · **Effort:** medium

### Root cause

The name **is** persisted and **is** read by Lobby and Game, but the two screens where the
user actually types it seed from a constant instead:

- `apps/web/src/pages/PlayPage/hooks/usePlayPageController.ts` line 17:
  `useState(DEFAULT_DISPLAY_NAME)` — `"Player 1"`.
- `apps/web/src/pages/JoinRoomPage/JoinRoomPage.tsx` line 17: the same.

`getRememberedPlayerDisplayName()` exists in `services/session/playerSession.ts` and is
called only by `useLobbyPageController` and `useGamePageController`.

Structurally, identity is modelled as a field on a room-entry form rather than as a property
of the device, which is also why renaming yourself in the lobby re-navigates and re-joins
(`LobbyPageMobile.applySetupChanges`), and why the name travels in the URL as
`?playerName=`.

### Fix

Doc 09 phases 1-3: a `features/profile` store owning name and avatar, persisted through the
hardened storage helper, edited from one sheet reachable from Home, settings and the lobby.
Identity leaves the URL. Renaming in the lobby emits `UpdatePlayerProfile` only, with no
navigation. Room codes come from the server, so the create form collapses to a single
action.

### Verification

- Component test: with a stored name, `PlayPage` and `JoinRoomPage` render it as the
  initial value.
- Component test: renaming in the lobby emits exactly one `UpdatePlayerProfile` and performs
  zero navigations.
- Test: the legacy `tunetrack.playerDisplayName` value is migrated into the new store.
- E2E E1.
- Manual M12.

---

## B13 · Back from the game screen leaves the game without warning

**Severity:** S2 · **Status:** **Fixed** (commit `018407c`) · **Reported:** 2026-09-08 retest

Pressing the phone's back button on the game screen dropped the player straight out of a
running game. After the B2 navigation work made the lobby-to-game step a `replace`, back
landed on `/play` (the room setup screen) rather than a dead lobby — correct per the
push/replace rule, but still wrong as a product behaviour: leaving a live game must be a
deliberate act, and the destination is a screen that cannot resume the game.

### Fix

`useLeaveGameGuard` (`pages/GamePage/hooks/useLeaveGameGuard.ts`) uses the data router's
`useBlocker`, guarding **only** `historyAction === "POP"` so the app's own redirects (room
closed, closed-room reset, game start) proceed untouched. A confirmation dialog is shown;
confirming closes the socket first, because the protocol has no "leave room" event, so a
socket close is the only way the server learns the player left deliberately rather than
momentarily.

The guard is disabled once `roomState.status === "finished"`, so leaving a finished game
needs no confirmation.

### Verification

- Manual: press back mid-game, confirm the dialog appears; Cancel keeps the game; Leave
  exits to the previous screen.
- Manual: a host closing the room still redirects everyone home with no dialog.
- Follow-up: a proper `LeaveRoom` protocol event belongs with Doc 04 phase 1.

---

## B14 · Switching light/dark mode can leave the app inert, then bounce to home

**Severity:** S1 · **Status:** **Not diagnosed** · **Reported:** 2026-09-08 retest

Switching the theme sometimes makes nothing interactive, and after a delay the app returns
to the home screen on its own.

### Ruled out by inspection

- **Server-side room closure.** A brief disconnect does not close a room: the server marks
  the player disconnected with a 180 s in-game reconnect window
  (`RoomConnectionService.IN_GAME_RECONNECT_DISPLAY_MS`) and only transfers the host after
  15 s. So the automatic return to home is not a `RoomClosed` broadcast caused by a stall.
- **A theme-driven remount.** `applyTheme` only writes CSS custom properties and the
  `data-theme` attribute; no component keys off the theme id.

### Remaining candidates

1. An automatic `navigate("/")` from a connection hook — both hooks redirect home when the
   remembered display name is missing, and `resetPlayerSession()` clears it.
2. `RoomResetModal` opening on a `ROOM_MEMBERSHIP_NOT_FOUND` error: it is a blocking
   full-screen overlay, which would read as "nothing is interactive".
3. Style invalidation cost: `applyTheme` rewrote every component token on each switch even
   though those are theme-agnostic. Reduced in commit `018407c`, but not proven to be the
   cause.

### Do this before writing a fix

Capture, at the moment it happens: the screen the player was on, whether the settings panel
was open, whether the URL changes when it returns home, and any console output — the new
`[AppRouteError]` and `[AppRoutes] ... pending` warnings will name a route-load failure or
a stalled navigation if either is involved.

---

## Cross-reference

| Reported item | Register entry | Primary plan |
| --- | --- | --- |
| Song editor under previous modal | B1 | Doc 06 section 5 |
| Back-to-home modal, consistent navigation, phone back | B2 | Doc 06 |
| Settings panel should close on browser back | B2 | Doc 06 section 4.2 |
| Robust consistent design system | B3 | Doc 07 |
| Drag/scroll conflict on iPhone | B4 | Doc 12 B4, Doc 03 section 6 |
| Settings panel flicker | B5 | Doc 06 section 6 |
| Leaderboard chip clipped border | B6 | Doc 12 B6, Doc 07 phase 1 |
| Inconsistent playback start | B7 | Doc 08 phases 1-2 |
| Network inconsistencies | B8 | Doc 04, Doc 05 |
| Cannot restart a finished track | B9 | Doc 08 phase 2 |
| Home unresponsive after closing a room | B10 | Doc 06 sections 3-4 |
| Player remove button design | B11 | Doc 07 phase 1 |
| Player name separate from room flow, remembered | B12 | Doc 09 phases 1-3 |
| Back from the game screen needs a confirmation | B13 | Doc 12 B13 |
| Theme switch leaves the app inert | B14 | Doc 12 B14 (undiagnosed) |
| Interactive first-run hints | (feature) | Doc 10 |
| Skeleton loading for all pages | (feature) | Doc 07 phase 5 |
| Host override for wrong metadata | (feature) | Doc 09 phase 4 |
| Bundle size and lazy loading | (programme) | Doc 02 |
| More tests | (programme) | Doc 11 |
| Room creation flow | (programme) | Doc 09 |
| Game session handling, disconnects, reconnects | (programme) | Doc 04, Doc 05 |
| Spotify login session persistence | (programme) | Doc 08 phase 3 |
