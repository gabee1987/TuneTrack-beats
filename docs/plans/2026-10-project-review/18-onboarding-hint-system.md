# 18 — Interactive First-Run Hint System

> **Status (2026-10-18):** Shipped. Twelve contextual hints as a first-game tutorial (`04` §7.1, shipped 2026-10-18 by `22` S11), the settings toggle, seen count and Show hints again, English and Hungarian copy and E2E scenario E15 are live. Open: history-back dismissal and the 6 kB budget check. The planned `home-start` hint is dropped: the Home sub-label replaces it (`04` §7, shipped 2026-10-13).
> **Folded from** `docs/plans/2026-09-stability-performance/10-onboarding-hint-system.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.

> Owning layer: `apps/web/src/features/hints`. Register findings: U-10 (hint gaps), U-12 (bubble accessibility). Catalogue changes are owned by Phase 4 of the review programme (`00-index.md` §4); component tests and the budget check by Phase 6.

## 1. What was built

The implementation deliberately differs from the original design; this section describes the code, not the plan.

- **State** — `hintState.ts` is a plain `localStorage` module keyed `tunetrack.hints.v1` (seen counts, master enabled flag, version). Changes are announced through a `tunetrack:hints-changed` window event. There is no Zustand store. Storage failure degrades to "enabled, nothing remembered".
- **Catalogue** — `hintRegistry.ts` holds twelve hint ids (`lobby-share-code`, `lobby-music`, `music-needs-check`, `lobby-start`, `game-drag-preview`, `game-timeline-tap`, `game-confirm`, `game-challenge`, `game-tokens`, `game-menu`, `game-next-song`, `game-timeline-switch`). `profile-name` and `lobby-spotify` are retired ids; the planned `home-start` hint was not added.
- **Scheduling** — `hintScheduler.ts` is pure (priority, once-only, enabled gate). `hintCoordinator.ts` runs the first-game tutorial: no per-visit cap, one hint at a time, 1.5 s after arrival and after each acknowledgement, paused while `usePauseHints` holds (the timeline drag); a hint is marked seen only when acknowledged and stays until then. The first gameplay hint is `game-drag-preview`, per the owner's 2026-10-02 correction.
- **Rendering** — `useFirstRunHint` and `FirstRunHint.tsx` attach a hint to a control; a hint is a candidate only while its anchor is at least half on screen (`IntersectionObserver`) and no overlay lies over it (`isUnderOverlay`). `HintBubble.tsx` renders through `LayerPortal` as a polite `role="status"`, above dialogs (`--z-hint`); using the anchor, the dismiss button, an outside tap or Escape (answered before any overlay) acknowledges it.
- **Settings** — a "Help and hints" section in `features/app-shell/components/AppShellMenuPanels.tsx` with the enabled toggle, "Hints: n of 12 seen" and Show hints again, which restarts the tutorial on the current screen and switches hints on.
- **Proof** — `hintScheduler.test.ts`, `hintState.test.ts`, `FirstRunHint.test.tsx` (tutorial with fake timers), `HintBubble.test.tsx`, `AppShellMenuPanels.test.tsx`, the i18n key-parity guard for the en/hu copy, and E2E E15 (`apps/e2e/tests/hints.spec.ts`; every other spec opens devices with hints off). First commit `7d5f1c3`.

## 2. Catalogue rules (normative for every future hint)

- Every hint describes something **not discoverable** from the UI alone. If a control says what it does, it needs no hint; a proposed hint is first a prompt to ask whether the UI itself should be clearer.
- Hint ids are stable and never reused. A new hint needs a registry entry, a title and a body key in **both** `en` and `hu`, and a component test or an E2E assertion.
- Hints form a first-game tutorial (owner decision 12, `04-host-flow-ux-spec.md` §7.1): no per-visit cap; a hint appears only at the moment its control matters, one at a time, never within 1.5 s of arriving on a screen or of the previous dismissal; it counts as seen when acknowledged, not when shown.
- A hint never covers the control it describes nor the primary action of the screen.
- A hint is subtle: one line of title, at most two lines of body, one dismiss affordance, no dimming mask. Motion uses the shared motion tokens and degrades to a fade under `prefers-reduced-motion`.
- The dismiss control is at least 48 × 48 px (owner decision 2, `00-index.md` §5).

## 3. Open items

| Item                                                       | Detail                                                                                                                                                                                                                                                                                     | Owner                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| History-back dismissal                                     | Browser or Android back does not dismiss the current hint. Depends on the overlay history pattern in `14-navigation-and-overlays.md`.                                                                                                                                                      | `14-navigation-and-overlays.md` Phase 3   |
| Tutorial, catalogue, anchor rules, accessibility, layering | Resolved 2026-10-18 by `22` S11 (U-10, U-12, F-05): dismissal on anchor use, anchor visibility, Show hints again and the seen count, `lobby-share-code` and `music-needs-check`, no per-visit cap, `role="status"`; hints sit above dialogs and wait while an overlay covers their anchor. | `22-game-startup-flow.md` S11             |
| Component tests                                            | Shipped 2026-10-10 (`06` T9): `HintBubble.test.tsx` and `FirstRunHint.test.tsx`.                                                                                                                                                                                                           | Review Phase 6 (`19-testing-strategy.md`) |
| Bundle budget                                              | The feature is not lazily loaded and the under-6 kB gzip budget has not been measured.                                                                                                                                                                                                     | `10-bundle-and-startup.md`                |

## 4. Acceptance checklist

- [x] A fresh install walks through every eligible hint during the first game, one at a time, none within 1.5 s of arrival or of the previous dismissal (decision 12). (2026-10-18, `FirstRunHint.test.tsx`; E15)
- [x] Each hint is acknowledged once and never again; an interrupted hint returns at its next moment. (2026-10-18, `FirstRunHint.test.tsx`; E15 reload step)
- [x] "Show hints again" restarts the tutorial on the current screen without a reload. (2026-10-18, `FirstRunHint.test.tsx`, `AppShellMenuPanels.test.tsx`; E15)
- [x] "Show hints again" makes every hint eligible again.
- [x] "Show hints" off suppresses everything immediately without erasing seen progress.
- [ ] Every hint dismisses via button, outside tap, Escape, back, and interaction with its anchor. (All but back, 2026-10-18: `HintBubble.test.tsx`, `FirstRunHint.test.tsx`.)
- [ ] No hint covers the control it describes or the screen's primary action, and no hint renders under another overlay. (The overlay half, 2026-10-18: `FirstRunHint.test.tsx`; placement is checked on devices.)
- [x] Every hint has copy in both `en` and `hu`; parity is covered by the i18n key-parity guard.
- [x] Under `prefers-reduced-motion` hints fade rather than move.
- [x] Blocked storage degrades to enabled-but-unremembered with no error.
- [ ] Feature chunk under 6 kB gzip and lazily loaded.
- [x] Component tests for `HintBubble` and the anchor hook (`HintBubble.test.tsx`, `FirstRunHint.test.tsx`; 2026-10-10, `06` T9).
- [x] E2E: a first-run session starts a game, sees `game-drag-preview`, dismisses it, sees `game-confirm` next, does not see `game-drag-preview` again after reload, and sees it again after Show hints again (E15, 2026-10-18).
