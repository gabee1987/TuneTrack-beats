# 03 — Runtime and Motion Performance

> Addresses findings **F-06 – F-11**.
> Owning layers: `apps/web/src/pages/GamePage`, `apps/web/src/pages/LobbyPage/components`,
> `apps/web/src/hooks`, `apps/web/src/main.tsx`, `apps/web/src/features/motion`.

Startup cost is Doc 02. This document covers the cost of the app while it is running:
frames dropped during scroll and drag, unnecessary React work, timers, and battery.

## 1. Measurement before change

None of the fixes below should be made without a before/after trace. Establish the
baseline first, on a real mid-range Android device and a real iPhone, not on a desktop
throttled profile — the reported problems are device-specific.

**Scenarios to record (Chrome DevTools Performance, 6x CPU throttle for the emulator
runs, and a physical-device trace via remote debugging):**

| # | Scenario | What to capture |
| --- | --- | --- |
| S1 | Playlist editor: scroll a 300-track list top to bottom | FPS, scripting time, longest task |
| S2 | Game page: drag the preview card across a 10-card timeline | FPS during drag, dropped frames, sensor activation latency |
| S3 | Game page: idle for 30 s during a turn with playback active | commits per second, total scripting time |
| S4 | Rotate the device / collapse the iOS address bar | layout+recalc count, number of React commits |
| S5 | Reveal to next-turn transition | longest task, dropped frames |

Store the traces and a one-line summary per scenario in
`docs/plans/2026-09-stability-performance/runtime-baseline.md`.

**Additional instrumentation worth adding temporarily** (remove before merge):
a `useEffect` render counter on `GamePage`, `TimelinePanel`, `GamePageHeader` and
`PlaylistTrackList` logging commit counts per scenario. This turns "feels slow" into a
number.

## 2. Phase 1 — Stop spring-animating virtualised rows

**Finding:** F-06. **Scenario:** S1. **Expected effect:** the largest single scroll win.

`apps/web/src/pages/LobbyPage/components/PlaylistTrackList.tsx` lines 38-58 currently
gives every visible row a framer-motion spring driven by `virtualItem.start`. During a
scroll, `start` changes on every tick, so each of roughly 15 visible rows runs an
independent physics simulation, each writing a transform per frame through React.

### Change

- Render each row as a plain `<div>` positioned with
  `style={{ transform: `translateY(${virtualItem.start}px)` }}`, plus the existing
  `position: absolute; top: 0; left: 0; width: 100%`.
- Keep `@tanstack/react-virtual` exactly as configured (`estimateSize: 68`,
  `overscan: 10`, `getItemKey` by track id). The virtualiser is not the problem.
- If a row-level animation is genuinely wanted, restrict it to **entry and removal** of
  rows (add/delete a track) via `AnimatePresence` on the row set, not to scroll position.
  Per `CLAUDE.md`: motion must answer "what just happened?", and scrolling does not need
  an answer.
- Consider `content-visibility: auto` on the row container as a cheap follow-up; measure
  before keeping it, as it can interact badly with the sticky selection toolbar.

### Acceptance

- [ ] S1 re-trace shows no per-frame scripting attributable to framer-motion.
- [ ] Scrolling a 300-track list holds 60 fps on the reference Android device, or at least
      shows a measurable improvement recorded in `runtime-baseline.md`.
- [ ] Selecting, removing and opening a track from the list still works; covered by a new
      component test (Doc 11 section 4).

## 3. Phase 2 — Bring timeline reorder motion inside the design budget

**Finding:** F-07. **Scenario:** S2.

`apps/web/src/pages/GamePage/gamePage.constants.ts`:

| Constant | Current | Proposed | Reason |
| --- | --- | --- | --- |
| `TIMELINE_REORDER_DURATION_MS` | 860 | **280** | `CLAUDE.md`: 200-350 ms for most transitions |
| `TIMELINE_REORDER_THROTTLE_MS` | 180 | **90** | Must be shorter than the animation, not longer, so a reorder is never queued against a running one |
| `DRAG_ACTIVATION_DISTANCE_PX` | 4 | see Doc 12 item B4 | Sensor rework, not a tuning change |
| `DRAG_EDGE_SCROLL_MAX_STEP_PX` | 20 | 20 | Keep |
| `DRAG_EDGE_SCROLL_ZONE_PX` | 120 | 96 | 120 px is over half the height of a short landscape timeline row |

`TIMELINE_REORDER_EASING` is `cubic-bezier(0.16, 1, 0.3, 1)` — a strong overshoot ease.
Replace with the project's standard token value
(`cubic-bezier(0.2, 0, 0, 1)`, exported from `features/theme/tokens/primitives.ts` as
`motionEasePrimitives.standard`) so reorder motion matches the rest of the app. Reorder is
a state change, not a celebration.

Do the durations as one change and re-trace S2 before tuning further. 280 ms may feel
abrupt against the current overshoot; if so, 320 ms with the `emphasized` ease is the
next candidate, still inside budget.

### Acceptance

- [ ] No motion constant in `gamePage.constants.ts` exceeds 500 ms.
- [ ] Reorder easing references a design token rather than a literal curve.
- [ ] S2 re-trace shows no overlapping reorder animations during a slow drag.
- [ ] Reduced-motion path still short-circuits to `motionDurations.instant`.

## 4. Phase 3 — One source of truth for viewport state

**Finding:** F-08. **Scenario:** S4.

Two independent problems, one fix.

### 4.1 `usePageLayoutMode` is subscribed per consumer

Currently each call site owns a `resize` listener and a `useState`. Replace with a single
external store, read via `useSyncExternalStore`:

- New `apps/web/src/features/viewport/viewportStore.ts`:
  - one `resize` listener, one `visualViewport` `resize`/`scroll` listener where available;
  - coalesced through `requestAnimationFrame` so a burst of resize events produces one
    notification;
  - holds `{ width, height, isCoarsePointer }` and notifies only when the derived
    **layout mode** changes, not when pixel dimensions change. This is the key win: an
    iOS address-bar collapse changes `height` continuously but never changes
    `"mobile" | "desktop"`, so consumers should not re-render at all.
- `usePageLayoutMode()` becomes `useSyncExternalStore(subscribeLayoutMode, getLayoutMode)`.
- `resolvePageLayoutMode` in `apps/web/src/app/layout/pageLayoutMode.ts` stays pure and
  keeps its existing tests unchanged.

### 4.2 `--app-height` is written on every resize event

`apps/web/src/main.tsx` lines 6-8 and 35 write a custom property on `documentElement` from
an unthrottled listener, and never remove it.

- Move this into the viewport store as a subscriber, coalesced through the same
  `requestAnimationFrame`.
- Prefer `window.visualViewport.height` where available; it is the value that actually
  matches the visible area when the iOS keyboard is open, which is the case the current
  code gets wrong.
- Write the value only when it differs from the last written value, to avoid a needless
  style invalidation.
- Consider replacing `--app-height` usage with `100dvh` where the CSS allows it, and keep
  the custom property only for the cases that still need JS. Do this as a follow-up, not
  in the same change.

### Acceptance

- [ ] Exactly one `resize` listener registered by application code (assert in a test by
      spying on `window.addEventListener`).
- [ ] Rotating the device produces at most two React commits in `GamePage`.
- [ ] Collapsing the iOS address bar produces **zero** layout-mode commits.
- [ ] Existing `pageLayoutMode.test.ts` still passes unmodified.
- [ ] The iOS keyboard no longer pushes the lobby form off-screen (manual check; this is a
      latent bug the `visualViewport` change also fixes).

## 5. Phase 4 — Contain playback-progress re-renders

**Finding:** F-09. **Scenario:** S3.

`useSpotifyPlaybackSdk` publishes `position` once per second into
`HostPlaybackProvider`'s context value, re-rendering every consumer of
`useHostPlaybackContext()` for the entire game.

### Change

Split the playback context into two:

1. **`HostPlaybackControlsContext`** — stable identity: `isReady`, `unlockPlayback`,
   `pause`, `resume`, `seek`, and the new `restart` / `needsUserGesture` from Doc 08.
   This value changes only when a capability changes, so consumers re-render rarely.
2. **`HostPlaybackProgressContext`** — `{ isPlaying, position, duration }`, consumed only
   by the component that actually renders a progress bar
   (`pages/GamePage/gameMenu/PlaybackTabContent.tsx`).

Then:

- Run the interpolation interval **only while a progress consumer is subscribed**. A
  subscriber count in the provider, or simply gating on "the playback tab is the active
  menu tab", removes the ticking entirely for the common case where the menu is closed.
- Raise the tick to 500 ms only while visible (smooth enough for a progress bar), and stop
  it on `document.visibilitychange` to `hidden` — a backgrounded party host should not be
  burning a timer.
- Keep the 55-minute token-refresh interval, but move it to the same visibility-aware
  scheduler so a backgrounded tab refreshes on resume rather than on a timer that mobile
  browsers throttle unpredictably anyway.

### Acceptance

- [ ] With the game menu closed, S3 re-trace shows **zero** periodic commits from playback.
- [ ] With the playback tab open, the progress bar still advances smoothly.
- [ ] Backgrounding the tab stops the interval; foregrounding resumes it and re-syncs
      position from the SDK rather than from interpolation.
- [ ] Token refresh still occurs before expiry after a long background period; covered by
      a unit test with fake timers.

## 6. Phase 5 — Remove the global capture-phase pointer listener

**Finding:** F-10.

`HostPlaybackProvider` calls `activateElement()` on every `pointerdown` anywhere in the
app, in the capture phase, for the whole game.

### Change

- Arm the SDK on a **bounded** set of gestures instead: the turn action dock's primary
  buttons, the timeline drag start, and the playback tab's controls. These are the gestures
  that precede a track change, which is the actual requirement.
- Implement as an explicit `armPlayback()` exposed on the controls context (Phase 4), called
  from those handlers. This makes the dependency visible instead of ambient.
- Keep a single non-capture, `passive: true`, `{ once: true }` `pointerdown` listener as a
  first-gesture fallback for the case where the host's first interaction is somewhere
  unexpected; re-arm it whenever the SDK reports `autoplay_failed`.

### Acceptance

- [ ] No capture-phase global listener remains in `apps/web/src`.
- [ ] Autoplay on track change still works on iOS Safari and Android Chrome after the
      host's first interaction (manual device check — this cannot be asserted in jsdom).
- [ ] S2 re-trace shows no per-touch scripting from the playback provider.
- [ ] Re-test the iOS drag scenario with this listener removed and record the result in
      Doc 12 item B4; it is a suspected contributor.

## 7. Phase 6 — Reduce realtime render churn

**Finding:** F-11 (the wire-format half of this is Doc 05 section 4).

Even with a smaller payload, every `state_update` replaces `roomState` wholesale, so every
selector downstream of it recomputes and every memo keyed on `roomState` invalidates.
`GamePageHeader` already has a hand-written `areHeaderModelsEqual` comparator
(`components/GamePageHeader.tsx`) which compares `previousModel.roomState === nextModel.roomState`
by reference — so it re-renders on every single state update regardless of whether
anything it displays changed.

### Change

- Introduce a normalised client-side room store fed by `state_update`, holding
  independently-referenced slices: `players`, `timelinesByPlayerId`, `settings`, `turn`,
  `challengeState`, `revealState`, `currentTrackCard`, `history`. On each update, replace
  only the slices whose serialised content differs. This keeps object identity stable for
  untouched slices, so existing memoisation starts working as intended.
- Repoint the derived-state hooks (`useGamePageDerivedState`, `useGamePageTimelineState`,
  `useGamePageStatusState` and siblings) at slices rather than at whole `roomState`.
- Replace `areHeaderModelsEqual`'s `roomState` reference check with checks on the specific
  slices the header renders (`players` for standings, `settings.ttModeEnabled`,
  `turn.turnNumber`, `status`, `roomId`, `hostId`).

This is the largest change in this document and should be its own wave. Do it **after**
Doc 05 section 4 lands the delta protocol, because the slice-diffing logic belongs on the
receiving side of that protocol and doing both at once doubles the risk.

### Acceptance

- [ ] Awarding a TT token to one player re-renders the player list and header counters
      only — not the timeline, not the action dock. Assert with render counters in a
      component test.
- [ ] A connection-status change on a non-active player does not re-render the timeline.
- [ ] All existing GamePage selector tests pass unchanged; new tests cover slice identity
      stability across an update that changes nothing.

## 8. Other items found during the audit

Small, isolated, no dependencies. Fold into whichever wave is convenient.

| Item | Location | Change |
| --- | --- | --- |
| `useTimelinePanelDragState` reads `orderedItemIds` from the closure inside `syncPreviewIndexFromActiveRect` while also calling `setOrderedItemIds` | `pages/GamePage/hooks/useTimelinePanelDragState.ts` | Use a ref for the current order so a stale closure cannot compare against an outdated array mid-drag. |
| `getComputedStyle` is called on every drag move via `isGridTimelineLayout` | same file | Resolve layout once on drag start and pass it through; `getComputedStyle` forces a style flush. |
| `querySelectorAll("[data-timeline-card='true']")` on every drag move | same file | Cache the node list on drag start; the DOM does not change during a drag. |
| Backdrop filters on frequently-repainted surfaces | `gamePageChrome.module.css` lines 325-341, `AppLoadingOverlay.module.css` line 12, `RoomResetModal.module.css` line 12 | `backdrop-filter: blur(24px)` on scrolling chips is expensive on mobile GPUs. Reduce radius, or drop the filter on coarse pointers. Measure in S2 first. |
| `AppLoadingOverlay` uses three infinite CSS animations while visible | `AppLoadingOverlay.module.css` | Acceptable, but confirm the `prefers-reduced-motion` block at the end of that file actually stops all three. |
| `PlaylistTrackList` `overscan: 10` | `PlaylistTrackList.tsx` | 10 rows above and below is generous at 68 px each; try 5 after Phase 1 and measure. |

## 9. Battery and thermal notes

`CLAUDE.md` states performance and light battery usage is king. Beyond the above:

- After Phase 4 and Phase 5, the game page should have **no** always-running timers.
  Audit with a temporary `setInterval`/`setTimeout` wrapper that logs every scheduled
  timer with a stack, run a full turn, and confirm the list is empty at idle.
- The three infinite orb animations in
  `pages/HomePage/mobile/AnimatedMenuBackground.module.css` run for as long as the home
  screen is open. They are `transform`/`opacity` only, which is correct, but confirm they
  are paused under `prefers-reduced-motion` and consider pausing them on
  `document.visibilitychange`.
- The Spotify Web Playback SDK holds an audio context and a WebSocket for the whole
  session. It is already correctly gated on `enabled && isPremium`; verify that a
  non-host player never instantiates it (there is a test hook in
  `HostPlaybackProvider.test.ts` — extend it to assert this).

## 10. Risk register

| Risk | Mitigation |
| --- | --- |
| Removing row springs makes the playlist feel "cheaper" | Add entry/exit animation for added and removed rows only; that is where motion carries meaning. |
| Shorter reorder duration feels abrupt | Tune once, with a trace, using the token easing set; 280 then 320 ms are the two candidates. |
| The viewport store changes layout-mode timing and breaks a layout assumption | Existing pure tests for `resolvePageLayoutMode` are untouched; add a store test with fake `matchMedia` and `visualViewport`. |
| Splitting the playback context misses a consumer and the progress bar freezes | Grep every `useHostPlaybackContext` call site as part of the change; the playback tab is the only progress consumer today. |
| The normalised room store diverges from server truth | Diff slices by serialised content only; never merge, always replace a changed slice wholesale. Server authority is preserved because the client still holds no derived truth. |
