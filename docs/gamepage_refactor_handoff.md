# GamePage Refactor Handoff

> Purpose: preserve the current refactor state of the `GamePage` feature so future work can continue from a clean, explicit checkpoint.
>
> This document is a practical engineering handoff, not a vague wishlist. It records what has already been improved, what architectural debt still exists, and the recommended order for the remaining refactors.

## 1. Why This Document Exists

The `GamePage` area had started to accumulate too many responsibilities in a few large files:

- page controller orchestration
- derived UI state
- challenge/reveal copy logic
- drag-and-drop behavior
- celebration/fly-to-mine animation behavior
- preview/timeline card rendering
- wide CSS ownership in one page stylesheet

We have already made meaningful progress, but the refactor is not fully complete. This document exists so we can:

- commit safely now
- resume later without losing architectural context
- continue following the frontend engineering rules
- avoid reintroducing the same monolithic patterns we just reduced

## 2. Source Rules To Follow

All future work on this area should continue to follow:

- [frontend_engineering_rules.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/frontend_engineering_rules.md)
- [backend_engineering_rules.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/backend_engineering_rules.md)

Important rules especially relevant to the next phase:

- keep files small and responsibility-focused
- avoid long nested ternaries for multi-branch UI logic
- prefer composition over enlarging existing controller hooks
- keep page files as assembly layers
- keep component-owned CSS with the component when the styling belongs to that subsystem
- use named hooks/components for behavior systems like drag, celebration, overflow, and view state
- prefer explicit contracts over ad hoc prop drift

## 3. Current Refactor Status

### 3.1 What Has Already Been Improved

The `GamePage` area is already in much better shape than before.

#### Controller and Hook Decomposition

These hooks now exist and own clearer responsibilities:

- [useGameRoomConnection.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGameRoomConnection.ts)
  socket lifecycle, connection state, room synchronization

- [useGamePageActions.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageActions.ts)
  room event emission and user action handlers

- [useGamePageDerivedState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageDerivedState.ts)
  now acts much more like a composition/view-model hook than a monolith

- [useGamePageStatusState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageStatusState.ts)
  status text, challenge messaging, celebration message, status badge/detail

- [useGamePageTimelineState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageTimelineState.ts)
  preview card, reveal preview, visible timeline state, chosen slot visibility

- [useGamePageCapabilityState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageCapabilityState.ts)
  capability and availability logic, TT actions, menu tab generation, leading player derivation

- [useGamePageLocalUiState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageLocalUiState.ts)
  local UI state such as selected slot, timeline view, local placed card lifecycle

- [useGamePagePreferencesState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePagePreferencesState.ts)
  grouped preference selector access from Zustand

- [useGamePageActionAvailability.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageActionAvailability.ts)
  challenge/reveal permission logic used by the controller

#### Timeline Component Decomposition

The timeline UI is no longer owned entirely inside one file.

New extracted parts:

- [PreviewCard.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/PreviewCard.tsx)
- [TimelineSortableItem.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelineSortableItem.tsx)
- [TimelineCelebration.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelineCelebration.tsx)
- [useTimelinePanelCelebrationState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useTimelinePanelCelebrationState.ts)
- [useTimelinePanelDragState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useTimelinePanelDragState.ts)
- [useTimelineOverflowState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useTimelineOverflowState.ts)

This means [TimelinePanel.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelinePanel.tsx) is now primarily an assembly component for:

- timeline header/hint rendering
- DnD container wiring
- list rendering
- drag overlay rendering
- fly-to-mine portal rendering

#### Action Panel Decomposition

The action area was also split into smaller components:

- [ActionDock.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/ActionDock.tsx)
- [ChallengeActionPanel.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/ChallengeActionPanel.tsx)
- [FinishedStatePanel.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/FinishedStatePanel.tsx)
- [RevealActionDock.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/RevealActionDock.tsx)
- [TurnActionDock.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TurnActionDock.tsx)

[GamePageActionPanels.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/GamePageActionPanels.tsx) is now a composition shell.

#### CSS Ownership Improvements

Component-owned CSS now exists for:

- [TimelinePanel.module.css](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelinePanel.module.css)
- [GamePageActionPanels.module.css](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/GamePageActionPanels.module.css)

This reduced the size and responsibility spread of:

- [GamePage.module.css](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/GamePage.module.css)

#### Contract Cleanup

[GamePage.types.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/GamePage.types.ts) now contains clearer shared page-local contracts:

- `TimelineView`
- `ChallengeMarkerTone`
- `GamePageCard`
- `GamePageActionHandlers`
- `GamePageControllerExtras`

Several components/hooks now reuse these shared types instead of repeating unions.

## 4. What Still Needs Refactoring

The current state is much healthier, but there is still worthwhile cleanup to do.

### 4.1 Remaining Frontend Refactors

#### A. Tighten Hook Return Contracts

Current issue:

- several hooks return inferred object bags
- the structure is cleaner than before, but still somewhat loose
- future edits may accidentally widen or drift contracts

Recommended work:

- add explicit return types for the major page-local hooks where it improves clarity
- especially consider return interfaces for:
  - `useGamePageDerivedState`
  - `useGamePageCapabilityState`
  - `useGamePageStatusState`
  - `useGamePageTimelineState`
  - `useTimelinePanelDragState`

Goal:

- make the hook API explicit
- reduce accidental return-shape drift
- make future refactors safer and easier to review

Suggested approach:

- do not create giant “god interfaces”
- prefer small, named view-model contracts per hook
- colocate return types in `GamePage.types.ts` only if reused across files
- otherwise keep return types local to the owning hook file

#### B. Reduce Controller Return-Object Verbosity

Current issue:

- `useGamePageController` still returns a large flattened object
- this is cleaner than before, but still noisy and easy to expand carelessly

Recommended work:

- consider grouped intermediate return bundles inside the controller
- optionally define a stronger explicit return contract for the extended controller type

Possible options:

1. Keep the public controller shape stable but assemble it from named bundles:
   - `actionState`
   - `displayState`
   - `preferenceState`
   - `timelineState`

2. Introduce a stronger composed return type:
   - `type UseGamePageControllerResult = GamePageController & GamePageControllerExtras`

Goal:

- improve readability at the bottom of the controller
- prevent the controller from turning into another large “return wall”

Important:

- do not break consumers unnecessarily
- do not introduce deep nesting in the public controller unless there is a clear value

#### C. Consolidate Remaining Repeated Option Interfaces

Current issue:

- many hook `Options` interfaces remain page-local and separate
- this is not automatically bad, but a few are probably now overlapping in avoidable ways

Recommended review targets:

- player identification and room-state option subsets
- repeated function signatures like:
  - `getPlayerName`
  - `getPossessivePlayerName`
  - `updateViewPreferences`

Goal:

- reduce duplicated function-shape declarations
- keep contracts explicit without abstracting everything into a shared dumping ground

Rule:

- only extract shared option subtypes when the reuse is meaningful
- do not force every file to import one giant `GamePageContextOptions` type

#### D. Split GamePage Header If It Grows Further

Current state:

- [GamePageHeader.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/GamePageHeader.tsx) is currently acceptable
- it is not yet a major problem

Future risk:

- if more chips, controls, host tools, or leaderboard behavior are added, it may start mixing:
  - chip row rendering
  - leader strip rendering
  - shell menu integration
  - mini standings toggle behavior

Recommended future split if it grows:

- `GamePageStatusChips`
- `GamePageLeadersStrip`
- `GamePageHeaderActions`

Do not split immediately unless the file grows or new behavior gets added there.

#### E. Continue CSS Ownership Migration Carefully

Current progress:

- timeline styling has moved out
- action-panel styling has moved out

Still likely shared in [GamePage.module.css](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/GamePage.module.css):

- header layout and header-specific sub-elements
- page shell and panel layout
- some reveal/challenge/shared section styles

Recommended next CSS pass:

- move header-specific styles to a `GamePageHeader.module.css` if and only if:
  - the header continues evolving
  - its styling grows much further
  - or it starts feeling like a separate subsystem

Do not split page shell layout styles too aggressively. It is fine for `GamePage.module.css` to own:

- `.screen`
- `.panel`
- high-level page layout

#### F. Consider Extracting Timeline Header UI

Current state:

- `TimelinePanel` is much smaller now
- but it still contains the timeline view switcher and heading/count rendering inline

Possible future split:

- `TimelinePanelHeader.tsx`

This would own:

- title
- count
- active/mine switcher

Only do this if:

- more behavior or visuals get added there
- or `TimelinePanel` starts growing again

#### G. Add Tests Around The New Seams

Current issue:

- refactor quality has improved, but the code still relies heavily on compile-time safety only
- the new modular hooks/components create better testing seams that are not yet used

Recommended test priorities:

1. Hook-level derived state tests
   Targets:
   - `useGamePageStatusState`
   - `useGamePageTimelineState`
   - `useGamePageCapabilityState`

2. Interaction behavior tests
   Targets:
   - challenge action availability
   - turn action availability
   - timeline preview/reveal slot display behavior

3. Component behavior tests
   Targets:
   - `TimelinePanel`
   - `ChallengeActionPanel`
   - `TurnActionDock`
   - `FinishedStatePanel`

Important:

- prefer testing behavior and rendered outcomes
- do not write brittle implementation-detail tests

### 4.2 Remaining Backend / Shared Follow-Up Work

We focused primarily on frontend refactor in this phase. To keep the system symmetrical and teachable, the backend side should eventually be reviewed too.

Recommended next backend follow-ups:

#### A. RoomRegistry Decomposition

Likely target:

- [RoomRegistry.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/server/src/rooms/RoomRegistry.ts)

Probable decomposition directions:

- room event dispatch / handler coordination
- public state mapping
- timer coordination / challenge deadlines / reveal timers
- TT-specific side effects
- socket broadcast helpers

Goal:

- make server orchestration mirror the same clarity we now want on the frontend

#### B. Shared Contract Review

Targets:

- `packages/shared`
- any room/public-state contracts used by both server and frontend

Review questions:

- are frontend-facing types grouped cleanly?
- are hidden vs public data boundaries explicit enough?
- are challenge/reveal payloads shaped to support UI cleanly without leaking authority concerns?

Goal:

- keep the server authoritative
- keep frontend mapping simple
- keep shared types teachable and intentional

## 5. Recommended Next Refactor Order

When work resumes, this is the recommended order.

### Phase 1. Stabilize Frontend Contracts

1. Add explicit return types to the key page-local hooks where it improves clarity.
2. Consolidate only the truly shared option/function subtypes.
3. Clean up `useGamePageController` return assembly if it still feels too noisy.

Why first:

- this strengthens the current refactor without changing behavior
- low risk
- protects future iteration quality

### Phase 2. Add Tests To Lock In The Refactor

1. Add tests for status/capability/timeline derived logic.
2. Add a few targeted component behavior tests.

Why second:

- after major structural refactors, tests provide confidence
- this reduces future regressions when we continue splitting server or shared logic

### Phase 3. Backend Symmetry Pass

1. audit `RoomRegistry`
2. identify orchestration vs mapping vs timer responsibilities
3. extract in small slices

Why third:

- frontend is now modular enough that backend symmetry becomes more valuable
- better client/server architectural alignment

## 6. Refactor Rules For The Next Session

When continuing later, follow these rules:

- Do not enlarge `useGamePageController` again.
- Do not push render-specific logic back into `TimelinePanel`.
- Do not move component-specific CSS back into `GamePage.module.css`.
- Do not reintroduce nested multi-branch ternary expressions.
- Prefer adding a new small hook/component over growing an existing large one.
- If a file crosses 250-300 lines again, pause and reevaluate before adding more.
- Keep page-level files focused on composition.
- Prefer explicit names over compressed helper abstractions.

## 7. Good Current Architectural Boundaries

These are the boundaries to preserve:

### Page Assembly

- [GamePage.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/GamePage.tsx)

Should keep owning:

- page composition only

### Page Orchestration

- [useGamePageController.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useGamePageController.ts)

Should keep owning:

- top-level composition of connection, local UI state, preferences, actions, and derived state

Should avoid owning:

- detailed view-model derivation
- render-specific formatting
- component-local behavior systems

### Timeline Subsystem

Should stay distributed across:

- [TimelinePanel.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelinePanel.tsx)
- [PreviewCard.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/PreviewCard.tsx)
- [TimelineSortableItem.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelineSortableItem.tsx)
- [TimelineCelebration.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TimelineCelebration.tsx)
- [useTimelinePanelDragState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useTimelinePanelDragState.ts)
- [useTimelinePanelCelebrationState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useTimelinePanelCelebrationState.ts)
- [useTimelineOverflowState.ts](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/hooks/useTimelineOverflowState.ts)

### Action Subsystem

Should stay distributed across:

- [GamePageActionPanels.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/GamePageActionPanels.tsx)
- [ChallengeActionPanel.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/ChallengeActionPanel.tsx)
- [RevealActionDock.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/RevealActionDock.tsx)
- [TurnActionDock.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/TurnActionDock.tsx)
- [FinishedStatePanel.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/FinishedStatePanel.tsx)
- [ActionDock.tsx](/c:/DevOps/Personal%20Projects/TuneTrack-beats/apps/web/src/pages/GamePage/components/ActionDock.tsx)

## 8. Suggested Resume Prompt For The Next Session

If we want to resume later with minimal context rebuilding, a good starting prompt would be:

> Continue the `GamePage` refactor using `docs/gamepage_refactor_handoff.md` and the frontend/backend engineering rules docs. Start with Phase 1: stabilize hook return contracts and shared option types without changing behavior.

Or, if we want to pivot to backend symmetry:

> Continue from `docs/gamepage_refactor_handoff.md`, but switch to the backend symmetry pass. Audit `RoomRegistry` and propose the first safe extraction slice according to `backend_engineering_rules.md`.

## 9. End-Of-Day Checkpoint

Current state summary:

- the frontend `GamePage` feature is significantly more modular than before
- large monolithic files were reduced
- timeline and action systems now have better ownership boundaries
- component-owned CSS is in place for major subsystems
- local type contracts are cleaner
- the next work should focus on contract tightening, testing, and backend symmetry

This is a safe place to stop and commit.
