# 18 — Interactive First-Run Hint System

> **Status (2026-10-06):** Shipped. Eleven contextual hints, the settings toggle and reset, English and Hungarian copy and Chromium E2E scenario E15 are live. Open: history-back dismissal, dismissal on anchor interaction, anchor visibility, replay and "n of m seen" UI, the 6 kB budget check, and the planned `home-start` hint.
> **Folded from** `docs/plans/2026-09-stability-performance/10-onboarding-hint-system.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.

> Owning layer: `apps/web/src/features/hints`. Register findings: U-10 (hint gaps), U-12 (bubble accessibility). Catalogue changes are owned by Phase 4 of the review programme (`00-index.md` §4); component tests and the budget check by Phase 6.

## 1. What was built

The implementation deliberately differs from the original design; this section describes the code, not the plan.

- **State** — `hintState.ts` is a plain `localStorage` module keyed `tunetrack.hints.v1` (seen counts, master enabled flag, version). Changes are announced through a `tunetrack:hints-changed` window event. There is no Zustand store. Storage failure degrades to "enabled, nothing remembered".
- **Catalogue** — `hintRegistry.ts` holds eleven hint ids (`profile-name`, `lobby-spotify`, `lobby-start`, `game-drag-preview`, `game-timeline-tap`, `game-confirm`, `game-challenge`, `game-tokens`, `game-menu`, `game-next-song`, `game-timeline-switch`). The planned `home-start` hint was not added.
- **Scheduling** — `hintScheduler.ts` is pure (priority, once-only, enabled gate) and `hintCoordinator.ts` applies the 1.5 s quiet period and the cap of two hints per page visit; one hint shows at a time. The first gameplay hint is `game-drag-preview`, per the owner's 2026-10-02 correction.
- **Rendering** — `useFirstRunHint` and `FirstRunHint.tsx` attach a hint to a control; `HintBubble.tsx` renders through `createPortal`. There is no overlay host integration, no `IntersectionObserver`, no `HintAnchor` and no `HintProvider`.
- **Settings** — a "Help and hints" section in `features/app-shell/components/AppShellMenuPanels.tsx` with the enabled toggle and a reset action.
- **Proof** — `hintScheduler.test.ts`, `hintState.test.ts`, the i18n key-parity guard for the en/hu copy, and E2E E15 (`apps/e2e/tests/hints.spec.ts`). First commit `7d5f1c3`.

## 2. Catalogue rules (normative for every future hint)

- Every hint describes something **not discoverable** from the UI alone. If a control says what it does, it needs no hint; a proposed hint is first a prompt to ask whether the UI itself should be clearer.
- Hint ids are stable and never reused. A new hint needs a registry entry, a title and a body key in **both** `en` and `hu`, and a component test or an E2E assertion.
- Hints form a first-game tutorial (owner decision 12, `04-host-flow-ux-spec.md` §7.1): no per-visit cap; a hint appears only at the moment its control matters, one at a time, never within 1.5 s of arriving on a screen or of the previous dismissal; it counts as seen when acknowledged, not when shown.
- A hint never covers the control it describes nor the primary action of the screen.
- A hint is subtle: one line of title, at most two lines of body, one dismiss affordance, no dimming mask. Motion uses the shared motion tokens and degrades to a fade under `prefers-reduced-motion`.
- The dismiss control is at least 48 × 48 px (owner decision 2, `00-index.md` §5).

## 3. Open items

| Item                                 | Detail                                                                                                                                                                           | Owner                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| History-back dismissal               | Browser or Android back does not dismiss the current hint. Depends on the overlay history pattern in `14-navigation-and-overlays.md`.                                            | `14-navigation-and-overlays.md` Phase 3                                               |
| Dismissal on anchor interaction      | Using the anchored control does not dismiss its hint (U-10).                                                                                                                     | `04-host-flow-ux-spec.md` §7 (WP 8)                                                   |
| Anchor visibility                    | Without `IntersectionObserver` a hint can target a control that is off screen; the original design suppressed such hints.                                                        | `04-host-flow-ux-spec.md` §7; viewport work in `11-runtime-and-motion-performance.md` |
| Replay and count UI                  | No "Replay the walkthrough" action and no "n of m hints seen" count in settings (U-10).                                                                                          | `04-host-flow-ux-spec.md` §7 (WP 8)                                                   |
| `home-start` hint and catalogue gaps | `home-start` planned but absent; no share-code or playback hint; the two-per-visit cap hides most game hints on a device that plays one game (U-10; cap removed by decision 12). | `04-host-flow-ux-spec.md` §7 (WP 8)                                                   |
| Bubble accessibility                 | `HintBubble` mixes `role="dialog"` with `aria-live`; it should not steal focus and should be announced politely (U-12).                                                          | `04-host-flow-ux-spec.md` §7 (WP 8)                                                   |
| Component tests                      | Shipped 2026-10-10 (`06` T9): `HintBubble.test.tsx` and `FirstRunHint.test.tsx`.                                                                                                 | Review Phase 6 (`19-testing-strategy.md`)                                             |
| Bundle budget                        | The feature is not lazily loaded and the under-6 kB gzip budget has not been measured.                                                                                           | `10-bundle-and-startup.md`                                                            |
| Layering                             | `--z-hint` (450) sits below `--z-dialog` and the menu sheet, so a hint can render under an open settings sheet (F-05).                                                           | `14-navigation-and-overlays.md` Phase 1                                               |

## 4. Acceptance checklist

- [ ] A fresh install walks through every eligible hint during the first game, one at a time, none within 1.5 s of arrival or of the previous dismissal (decision 12).
- [ ] Each hint is acknowledged once and never again; an interrupted hint returns at its next moment.
- [ ] "Show hints again" restarts the tutorial on the current screen without a reload.
- [x] "Reset hints" makes every hint eligible again.
- [x] "Show hints" off suppresses everything immediately without erasing seen progress.
- [ ] Every hint dismisses via button, outside tap, Escape, back, and interaction with its anchor.
- [ ] No hint covers the control it describes or the screen's primary action, and no hint renders under another overlay.
- [x] Every hint has copy in both `en` and `hu`; parity is covered by the i18n key-parity guard.
- [x] Under `prefers-reduced-motion` hints fade rather than move.
- [x] Blocked storage degrades to enabled-but-unremembered with no error.
- [ ] Feature chunk under 6 kB gzip and lazily loaded.
- [x] Component tests for `HintBubble` and the anchor hook (`HintBubble.test.tsx`, `FirstRunHint.test.tsx`; 2026-10-10, `06` T9).
- [x] E2E: a first-run session starts a game, sees `game-drag-preview` before timeline details, dismisses it, and does not see that hint again after reload (E15).
