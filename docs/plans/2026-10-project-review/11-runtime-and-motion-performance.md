# 11 — Runtime and Motion Performance

> **Status (2026-10-07):** Phase 2 shipped as `05` C7 (Phase 1 reverted, decision 19), Phases 3–6 as C5, C6, C1 and C2,
> and the §8 drag-move items as `05` C3. The S1/S2 device traces and `runtime-baseline.md` are open.
> **Folded from** `docs/plans/2026-09-stability-performance/03-runtime-and-motion-performance.md`
> on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.
> Addresses findings **F-04, F-08 – F-13, F-15** of `01-review-findings.md`. The old audit
> numbers F-06–F-11 are not used in this document. Source line references date from
> 2026-09-08 and are indicative only.
> Owning layers: `apps/web/src/pages/GamePage`, `apps/web/src/pages/LobbyPage/components`,
> `apps/web/src/hooks`, `apps/web/src/main.tsx`, `apps/web/src/features/motion`.
>
> **Binding budgets, order and corrections (2026-10-07):** `05-performance-and-robustness-plan.md` §2 (budgets), §8 (rollout order), §9 (corrections to this document). Where they differ, `05` wins.

Startup cost is `10-bundle-and-startup.md`. This document covers the cost of the app while
it is running: frames dropped during scroll and drag, unnecessary React work, timers, and
battery.

## 1. Measurement before change

None of the fixes below should be made without a before/after trace. Establish the
baseline first, on a real mid-range Android device and a real iPhone, not on a desktop
throttled profile — the reported problems are device-specific.

**Scenarios to record (Chrome DevTools Performance, 6x CPU throttle for the emulator
runs, and a physical-device trace via remote debugging):**

| #   | Scenario                                                    | What to capture                                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| S1  | Playlist editor: scroll a 300-track list top to bottom      | FPS, scripting time, longest task                          |
| S2  | Game page: drag the preview card across a 10-card timeline  | FPS during drag, dropped frames, sensor activation latency |
| S3  | Game page: idle for 30 s during a turn with playback active | commits per second, total scripting time                   |
| S4  | Rotate the device / collapse the iOS address bar            | layout+recalc count, number of React commits               |
| S5  | Reveal to next-turn transition                              | longest task, dropped frames                               |

Store the traces and a one-line summary per scenario in
`docs/plans/2026-10-project-review/runtime-baseline.md`.

**Additional instrumentation worth adding temporarily** (remove before merge):
a `useEffect` render counter on `GamePage`, `TimelinePanel`, `GamePageHeader` and
`PlaylistTrackList` logging commit counts per scenario. This turns "feels slow" into a
number.

## 2. Phase 1 — Stop spring-animating virtualised rows

**Reverted 2026-10-07 (decision 19).** C7 removed the row springs; the owner wanted the slide
after a removal back, so the springs stay. `PlaylistTrackList.test.tsx` covers open, selection
and removal. The S1 trace is open.

## 3. Phase 2 — Bring timeline reorder motion inside the design budget

**Shipped 2026-10-07 (`05` C7).** Reorder 280 ms with `motionEasePrimitives.standard`, throttle
90 ms; the preview slot's width transition uses the standard duration and ease. The
reduced-motion rule in `globals.css` cuts dnd-kit's inline transition. Proof:
`motionBudget.test.ts`. The S2 re-trace is open.

## 4. Phase 3 — One source of truth for viewport state

**Shipped 2026-10-07** as `05` C5: `features/viewport/viewportStore.ts` owns the only window
`resize` listener plus the `visualViewport` and media-query listeners, coalesces them per
frame, notifies layout consumers only on a layout-mode change and writes `--app-height` from
`visualViewport.height` only when it changed. Proof: `features/viewport/viewportStore.test.ts`;
`pageLayoutMode.test.ts` is unchanged. Open: replacing `--app-height` with `100dvh` (follow-up),
and the device checks (rotation commits, address-bar collapse, iOS keyboard on the lobby form).

## 5. Phase 4 — Contain playback-progress re-renders

**Shipped 2026-10-07** as `05` C6, simplified (`05` §9): controls and progress are separate
memoised contexts; the provider publishes position snapshots on player events, with no
interval and no `timeupdate`; only `PlaybackTabContent` interpolates, at 1 s, while playing and
visible. The 55-minute token-refresh interval is unchanged. Proof:
`hooks/HostPlaybackProvider.progress.test.tsx`, `hooks/useInterpolatedPlaybackPosition.test.ts`.

## 6. Phase 5 — Remove the global capture-phase pointer listener

**Shipped 2026-10-07** as `05` C6 (`05` §9): the capture `pointerdown` listener stays only until
a gesture reaches a ready player, and is re-armed on `autoplay_failed` or a new player. Proof:
`hooks/HostPlaybackProvider.gesture.test.tsx`. Open: the iOS Safari and Android Chrome
autoplay check after the first interaction, and the iOS drag re-test for `20` B4.

## 7. Phase 6 — Reduce realtime render churn

**Shipped 2026-10-07** as `05` C1 and C2, superseding the slice store (`05` §3): stable action
handlers, scalar header and action-panel models, memoised timeline models, and structural
sharing of each `state_update` (`pages/GamePage/reuseUnchangedReferences.ts`). A token change
for another player re-renders the header once and neither the action panels nor the timeline
items. Proof: `pages/GamePage/GamePage.renderBudget.test.tsx`,
`hooks/useGamePageActions.identity.test.tsx`, `components/TimelinePanel.test.tsx`,
`reuseUnchangedReferences.test.ts`. The connection-status case is not separately asserted.

## 8. Other items found during the audit

Small, isolated, no dependencies. Fold into whichever wave is convenient. The three drag-move
items (F-12) shipped 2026-10-07 as `05` C3; the backdrop-filter item is part of F-15.

| Item                                                                 | Location                                                                                                               | Change                                                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backdrop filters on frequently-repainted surfaces                    | `gamePageChrome.module.css` lines 325-341, `AppLoadingOverlay.module.css` line 12, `RoomResetModal.module.css` line 12 | `backdrop-filter: blur(24px)` on scrolling chips is expensive on mobile GPUs. Reduce radius, or drop the filter on coarse pointers. Measure in S2 first. |
| `AppLoadingOverlay` uses three infinite CSS animations while visible | `AppLoadingOverlay.module.css`                                                                                         | Acceptable, but confirm the `prefers-reduced-motion` block at the end of that file actually stops all three.                                             |
| `PlaylistTrackList` `overscan: 10`                                   | `PlaylistTrackList.tsx`                                                                                                | 10 rows above and below is generous at 68 px each; try 5 after Phase 1 and measure.                                                                      |

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
  `apps/web/src/pages/GamePage/hooks/HostPlaybackProvider.test.ts` — extend it to assert
  this).

## 10. Risk register

| Risk                                                                          | Mitigation                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removing row springs makes the playlist feel "cheaper"                        | Add entry/exit animation for added and removed rows only; that is where motion carries meaning.                                                                               |
| Shorter reorder duration feels abrupt                                         | Tune once, with a trace, using the token easing set; 280 then 320 ms are the two candidates.                                                                                  |
| The viewport store changes layout-mode timing and breaks a layout assumption  | Existing pure tests for `resolvePageLayoutMode` are untouched; add a store test with fake `matchMedia` and `visualViewport`.                                                  |
| Splitting the playback context misses a consumer and the progress bar freezes | Grep every `useHostPlaybackContext` call site as part of the change; the playback tab is the only progress consumer today.                                                    |
| The normalised room store diverges from server truth                          | Diff slices by serialised content only; never merge, always replace a changed slice wholesale. Server authority is preserved because the client still holds no derived truth. |
