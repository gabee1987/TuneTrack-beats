# GamePage — Remaining Refactors

> Extracted 2026-09-08 from `../archive/gamepage_refactor_handoff.md` section 4.
> Each item was re-checked against the code at commit `37ccf20`. This file replaces that
> section; the archived handoff is history only.
>
> **Priority:** low. Nothing here is a user-visible defect. Do these opportunistically,
> or when touching the file in question for another reason. The live programme in
> `2026-09-stability-performance/` takes precedence.

## Done — no action needed

| Item | Verified state |
| --- | --- |
| **4.1.A — Tighten hook return contracts** | Complete. `useGamePageDerivedState`, `useGamePageCapabilityState`, `useGamePageStatusState`, `useGamePageTimelineState` and `useTimelinePanelDragState` all declare explicit `Use*Result` return interfaces. `useGamePageDerivedState` composes small named sub-contracts (`GamePageDerivedPlayerState`, `...InteractionState`, `...ChallengeState`, `...PreferenceState`, `...TimelineViewState`) rather than one god interface, exactly as recommended. |
| **4.1.B — Reduce controller return verbosity** | Complete, via the recommended option 1. `useGamePageController` assembles named bundles (`actionState`, `capabilityState`, `displayState`, `preferenceState`, `timelineState`, `playerState`) and hands them to `buildGamePageControllerResult`. |
| **4.1.E — CSS ownership migration** | Complete. `GamePage.module.css` no longer exists; it was split into `gamePageChrome`, `gamePageMenu`, `gamePagePlayback` and `gamePageStatus` modules. |
| **4.1.F — Extract timeline header UI** | Complete. `components/TimelinePanelHeader.tsx` exists and owns the title, count and active/mine switcher. |
| **4.2.A — RoomRegistry decomposition** | Substantially complete. Split into `RoomLobbyService`, `RoomGameplayService`, `RoomConnectionService`, `RoomStore` and `RoomTimerCoordinator`. **But see item R1 below** — the decomposition left two layers of pass-through façade behind. |

## Open items

### R1 — Collapse the `RoomService` / `RoomRegistry` double façade
**Origin:** 4.2.A, partially done · **Owner:** `2026-09-stability-performance/04-backend-stability-and-sessions.md` section 4

`RoomRegistry` (285 lines) is now almost entirely one-line delegations to the three room
services, and `RoomService` (696 lines) wraps `RoomRegistry` again. Every new socket event
costs two mechanical edits. Already planned in detail; tracked there, not here.

### R2 — Add tests around the new seams
**Origin:** 4.1.G · **Owner:** `2026-09-stability-performance/11-testing-strategy.md`

Partially addressed. Selector-level tests exist (`gamePageStatusSelectors.test.ts`,
`gamePageTimelineSelectors.test.ts`, `gamePageTimelineItemViewModels.test.ts`,
`gamePageTransitionEventDetectors.test.ts`, `buildGamePageAssemblyModel.test.ts`,
`timelinePanelCelebrationState.utils.test.ts`,
`transitions/timelinePreviewTransitionState.test.ts`).

Still missing, and blocked until the jsdom harness lands:

- Hook-level tests for `useGamePageStatusState`, `useGamePageTimelineState`,
  `useGamePageCapabilityState`.
- Component behaviour tests for `TimelinePanel`, `ChallengeActionPanel`, `TurnActionDock`,
  `FinishedStatePanel`.

These are already listed in the testing plan's phase 1 priority list. Tracked there.

### R3 — Split `GamePageHeader` if it grows further
**Origin:** 4.1.D · **Status:** conditional, not yet triggered

`GamePageHeader.tsx` is 220 lines. `HeaderLeadersStrip` was already extracted. The
remaining recommended splits (`GamePageStatusChips`, `GamePageHeaderActions`) are **not**
justified yet — the file is inside its soft limit and the concerns are still legible.

**Trigger to act:** the file passes roughly 250 lines, or a new chip/control/host tool is
added to it. Two things will touch it soon, so re-evaluate then:

- Doc 07 phase 1 replaces its inline `IconButton` and chip markup with primitives.
- Doc 12 item B6 changes `.headerLeaderChip` from `outline` to `border`.

Also note: its hand-written `areHeaderModelsEqual` comparator compares `roomState` by
reference, so the memo never actually prevents a re-render on a state update. That is
finding F-11 and is owned by Doc 03 section 7.

### R4 — Consolidate repeated hook option interfaces
**Origin:** 4.1.C · **Status:** open, low value

Several `Use*Options` interfaces repeat the same function shapes — `getPlayerName`,
`getPossessivePlayerName`, `updateViewPreferences` — and the same player-identification and
room-state subsets.

**Recommended approach if attempted:** extract only the repeated *function* types into a
small `GamePage.types.ts` addition (e.g. `GetPlayerName`, `UpdateViewPreferences`). Do
**not** create a shared `GamePageContextOptions` bag; the handoff explicitly warned against
that and the warning is still right.

**Recommendation: leave it.** The duplication is a few type aliases, it is explicit, and it
does not impede change. Revisit only if a signature change starts requiring edits in five
files at once.

### R5 — Shared contract review
**Origin:** 4.2.B · **Owner:** partly `2026-09-stability-performance/` docs 02 and 05

The handoff's review questions have concrete answers now, from the 2026-09-08 audit:

| Question | Answer | Owner |
| --- | --- | --- |
| Are frontend-facing types grouped cleanly? | No. `packages/shared/src/index.ts` is one barrel with no `sideEffects: false`, so the web bundle ships 54.88 kB of Zod it never uses (F-02). | Doc 02 section 4 |
| Are hidden versus public data boundaries explicit enough? | Mostly. `currentTrackCard.releaseYear` is correctly omitted during `turn` and `challenge`, but nothing tests that, so a regression would silently leak the answer to the game. | Doc 05 section 6.3 |
| Are challenge/reveal payloads shaped to support the UI without leaking authority? | Yes — but the whole `PublicRoomState` is rebroadcast on every mutation, including an unbounded-feeling `history` array (F-11). | Doc 05 section 6 |

Nothing left to do here that is not already tracked.

## Summary

Five of the nine original items are complete. Of the four that remain, three are already
owned by the live programme (R1, R2, R5), one is conditional and not yet triggered (R3),
and one is recommended for closure without action (R4).
