# TuneTrack Frontend Engineering Rules

> Purpose: define the frontend coding rules for TuneTrack so the codebase stays clean, professional, teachable, mobile-first, and robust as the app grows.
>
> This document is intentionally practical. It is not just philosophy. It defines how we structure code, how we decide where logic belongs, and what rules future frontend changes must follow.

## 1. Status Of This Document

This document is a working frontend engineering standard for:

- `apps/web`
- any future frontend-only shared utilities
- frontend-facing contracts that influence UI architecture

This document complements, not replaces:

- [tunetrack_full_architecture.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/tunetrack_full_architecture.md)
- [tunetrack_technical_implementation_plan.md](/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/tunetrack_technical_implementation_plan.md)

If a frontend implementation conflicts with those documents, the architecture documents win.

## 2. Core Intent

TuneTrack frontend must be:

- mobile-first
- touch-first
- PWA-ready
- performant on mid-range phones
- easy to read and change
- strongly separated by responsibility
- consistent with server-authoritative realtime gameplay

The frontend must also serve as learning material. That means we optimize not only for working code, but for code that clearly demonstrates good engineering choices.

## 3. Non-Negotiable Principles

Every frontend change must reinforce these principles:

- Clean, simple code beats clever code.
- Readability beats local optimization unless performance is proven to matter.
- Composition beats giant multipurpose files.
- Server truth beats client inference.
- Explicit data flow beats hidden coupling.
- One module should have one clear reason to change.
- UI behavior should be easy to find from the file structure.
- Styling and motion should support usability first.
- Mobile performance is a product requirement, not a later polish task.

## 4. Frontend Architecture Rules

### 4.1 Layering

Frontend code should be organized into these layers:

- `pages/`
  Screen-level assembly only.
  Pages compose sections, connect route params, and call page-level controller hooks.

- `components/`
  Pure or mostly presentational pieces used inside a page or a feature.
  These should be small, focused, and reusable at the UI level.

- `features/`
  Cross-page frontend capabilities such as theme, app shell, preferences, timeline interaction primitives, or future playback UI.

- `hooks/`
  Only generic hooks that are not page-specific.
  Page-specific orchestration hooks should live under that page’s folder.

- `services/`
  Browser integrations and infrastructure.
  Example: socket client, session storage, PWA registration, vibration, media, analytics.

- `utils/`
  Small pure helpers with no side effects and no UI ownership.

### 4.2 Allowed Responsibilities

Each layer has strict ownership:

- A page component may compose sections, pass props, and decide what renders.
- A page controller hook may orchestrate state, event handlers, view models, and derived booleans for that page.
- A presentational component may format and render data, but should not own business workflow.
- A service may talk to browser APIs, storage, sockets, or external libraries.
- A utility may transform data, but must stay pure.

### 4.3 Disallowed Responsibilities

Avoid these patterns:

- giant page components with rendering, socket wiring, business rules, animation orchestration, and data transformation all mixed together
- components reading directly from many stores when a parent can pass a clean view model
- repeated boolean derivation logic copied across components
- CSS modules acting like hidden state machines
- frontend code inferring hidden game answers from data it should not have

## 5. File Size And Complexity Limits

These are soft limits, but they should be treated seriously.

- React component file target: under 200-250 lines
- controller hook target: under 250-300 lines
- CSS module target: under 250-300 lines
- utility file target: under 150 lines
- if a file exceeds 300 lines, we must ask why
- if a file exceeds 450 lines, splitting is strongly preferred
- if a file approaches 600+ lines, it is considered architectural debt unless there is a very strong reason

Large files usually mean one or more of these problems:

- too many responsibilities
- hidden state coupling
- too many rendering branches
- domain logic leaking into UI
- motion logic mixed into layout logic

## 6. Feature Structure Rules

For non-trivial screens, prefer this shape:

```txt
pages/
  GamePage/
    GamePage.tsx
    GamePage.types.ts
    GamePage.module.css
    gamePage.constants.ts
    gamePage.utils.ts
    hooks/
      useGamePageController.ts
      useTimelineCelebration.ts
    components/
      GamePageHeader.tsx
      GamePageActionPanels.tsx
      TimelinePanel.tsx
      TimelineCelebration.tsx
```

Rules:

- page root file should mostly assemble subcomponents
- complex logic should move into page-local hooks
- view-only subparts should move into child components
- one-off motion systems should become dedicated components or hooks, not inline ad hoc logic
- stateful UI behavior should have a named home

## 7. React Rules

### 7.1 Component Design

Components should be:

- small
- explicit
- prop-driven
- easy to test
- easy to reorder or replace

Prefer:

- one main responsibility per component
- clear prop names based on behavior, not implementation details
- derived display props over raw server state where possible

Avoid:

- components with many unrelated booleans
- components that know too much about room state internals
- components that perform heavy derivation on every render if a parent can prepare that data

### 7.2 Hook Rules

Custom hooks should exist when they:

- coordinate multiple pieces of state
- wrap infrastructure concerns
- provide reusable UI behavior
- prepare a page-level view model

Hooks should not:

- silently mutate unrelated global state
- return huge unstructured bags if a smaller interface is possible
- become dumping grounds for every possible derived variable

When a controller hook gets too large, split it into:

- selectors or derived view-model helpers
- event handler hooks
- timeline interaction hooks
- celebration or animation hooks

### 7.3 State Rules

State should be stored at the lowest level that still keeps the flow clear.

Use:

- local component state for local UI concerns
- page controller state for screen-specific interaction flow
- Zustand only for persistent app-wide UI preferences or truly shared client UI state

Do not put page-specific flow into global stores just to avoid prop drilling.

### 7.4 Conditional Logic Rules

- Avoid long nested ternary operators for multi-branch UI logic.
- Ternaries are acceptable only for simple binary expressions that stay trivially readable.
- When logic involves multiple states, labels, or role-based branches, prefer a named helper, early returns, or a `switch`.
- UI copy selection logic should read like decision-making, not like compressed syntax.
- If a conditional expression needs indentation across several levels, it should usually become a function.

## 8. Data And View Model Rules

Frontend code should not pass raw server state everywhere if only part of it is needed.

Preferred flow:

- server/shared data enters page controller
- controller derives:
  - view flags
  - labels
  - selected entities
  - action enablement
  - UI-specific variants
- components receive narrow props

This gives:

- cleaner components
- lower coupling
- fewer repeated conditions
- safer future refactors

### 8.1 Hidden Information Rule

Do not expose hidden answer data to the client unless there is a deliberate debug-only reason and we have accepted that tradeoff.

For gameplay-critical hidden information:

- prefer not to serialize it at all
- if temporarily needed for debug mode, keep the use explicit and documented

## 9. Service Rules

Services should wrap side effects and platform details.

Examples of service ownership:

- socket lifecycle
- local/session storage
- media capabilities
- vibration
- PWA registration
- telemetry

Rules:

- services must have narrow, clear APIs
- services must not import page components
- services must not depend on CSS or UI rendering
- services should be easy to mock or replace

## 10. Animation And Motion Rules

Motion is part of the product, but motion logic must stay structured.

### 10.1 Motion Principles

- motion must clarify state change
- motion must reinforce feedback
- motion must not hide gameplay truth
- motion must not degrade mobile responsiveness

### 10.2 Motion Architecture

When adding animations:

- isolate animation into dedicated components or hooks
- keep geometry capture and motion triggering out of giant page files where possible
- prefer one animation coordinator per interaction type

Examples:

- timeline reorder motion
- drag overlay motion
- reward/celebration motion
- tab-switch motion

### 10.3 Animation Library Direction

Today the project uses Framer Motion.

Future rule:

- motion decisions should remain behind component-level abstractions so switching or mixing libraries later is possible without rewriting page business logic

If a future animation framework is adopted, it must be chosen based on:

- mobile runtime performance
- gesture support
- interruption/cancellation behavior
- React integration quality
- maintainability

Animation framework choice must never force business logic into animation code.

### 10.4 Framer Motion Usage Rules

Framer Motion is the preferred tool for meaningful UI state transitions, not a replacement for all CSS motion.

Use Framer Motion for:

- route and screen transitions
- mount/unmount animations that need exit behavior
- sheets, dialogs, overlays, and temporary presence-based UI
- gameplay phase feedback such as reveal, challenge, placement, and celebration moments
- coordinated or interruptible animation sequences

Keep CSS for:

- static layout and styling
- simple hover, pressed, focus, and disabled transitions
- small opacity or transform transitions inside stable components
- cheap component-local feedback that does not need React state orchestration

Keep specialist libraries in charge of specialist behavior:

- drag and sortable mechanics stay owned by `@dnd-kit`
- Framer Motion may decorate drag outcomes, but should not duplicate drag state ownership

Performance rules:

- animate `transform` and `opacity` by default
- avoid animating layout-affecting properties such as `width`, `height`, `top`, `left`, `margin`, and `padding`
- avoid heavy paint properties such as large `filter`, `backdrop-filter`, blur, and shadow animation on mobile
- avoid always-on decorative animations during gameplay unless they are proven cheap on real mobile devices
- respect reduced-motion preferences through shared motion helpers, not one-off checks scattered across pages

Architecture rules:

- Framer imports should usually live in `features/motion` or in dedicated animation components
- page controllers must not import Framer Motion
- animation variants and timing tokens that are reused across the app belong in the shared motion layer
- screen/page animation should be applied at the route or assembly boundary, not inside business logic
- server state remains the source of gameplay truth; animation expresses confirmed state and must tolerate interruption or correction

## 11. CSS And Styling Rules

### 11.1 General Styling

Use:

- CSS Modules for component-scoped styles
- theme tokens and CSS variables for colors, surfaces, shadows, spacing intent

Avoid:

- giant page CSS files holding unrelated component systems forever
- magic values duplicated in many places
- styles that rely on fragile DOM structure assumptions

### 11.2 CSS Structure

Prefer this split when a module grows:

- page layout styles remain in the page CSS module
- reusable component styles move with the component
- celebration/overlay/motion styling lives next to that animation component if it becomes substantial

### 11.3 Styling Rules

- style names should reflect role, not appearance only
- avoid vague names like `box`, `item2`, `temp`
- avoid duplicated selectors for the same concept
- avoid using z-index casually; document layered UI systems

## 12. Realtime And Socket Rules

The frontend is a realtime client, not the game authority.

Rules:

- server events define truth
- optimistic UI is allowed only when clearly safe and reversible
- all realtime edge handling should be centralized in controller hooks or services
- socket event handlers should be attached and cleaned up in one clear place
- do not scatter socket subscriptions across many presentational components

## 13. Error Handling Rules

Robustness is required.

Frontend must:

- handle missing room state safely
- handle disconnected or stale states gracefully
- recover from transient socket issues where possible
- present user-facing errors in plain language

Engineering rules:

- never assume values exist when the server contract allows null
- prefer defensive derivation over nested unsafe property access
- user-facing messages should be deliberate, not raw thrown errors

## 14. Performance Rules

Mobile performance matters from day one.

### 14.1 Rendering

- keep render trees small
- avoid passing unstable large objects unless needed
- derive expensive values once per render with `useMemo` only when it truly helps
- do not add `useMemo` or `useCallback` by habit

### 14.2 Interaction

- drag and gesture code must avoid unnecessary state churn
- animation should prefer transform and opacity over layout-affecting properties
- overlays and celebrations must not cause reflow unless intentional

### 14.3 Network And State

- do not duplicate server state into multiple client sources of truth
- keep persistent stores small
- only persist durable user preferences, not volatile game session state

## 15. Naming Rules

Names should communicate intent.

Prefer:

- `useGamePageController`
- `TimelineCelebration`
- `challengeSuccessMessage`

Avoid:

- `data2`
- `miscState`
- `helper`
- `tempLogic`

Booleans should read like facts:

- `isChallengeOwner`
- `canConfirmBeatPlacement`
- `showDevYearInfo`

## 16. Duplication Rules

Do not tolerate copy-paste drift.

If the same concept appears in multiple places:

- centralize constants
- centralize data mapping
- centralize formatting
- centralize animation variants when reused

But do not over-abstract tiny one-off code too early.

Rule of thumb:

- extract after the second or third meaningful repetition
- not after the first tiny coincidence

## 17. Testing Rules

Frontend code should be refactored toward testable seams.

What should be easy to test:

- pure utility behavior
- controller-derived view-model logic
- critical interaction flows
- state transitions driven by room state changes

Recommended testing split:

- unit tests for pure helpers and selectors
- component tests for rendered behavior and interaction
- later end-to-end tests for critical flows like join, place, challenge, reveal

## 18. Refactor Rules For Current Codebase

The following patterns should be actively reduced over time:

- page-local controller hooks that mix socket wiring, state derivation, business branching, and formatting in one file
- multi-hundred-line UI components that own both rendering and interaction systems
- large CSS modules that style many separate concepts
- repeated derivation of challenge, reveal, and timeline display state

### 18.1 Preferred Refactor Direction For GamePage

Target future split:

- `useGameRoomConnection`
  socket subscription and room/player synchronization

- `useGameTimelineViewModel`
  visible timeline, preview card, slot markers, labels

- `useGameActions`
  handlers for place, challenge, resolve, confirm, skip, buy

- `useChallengeCelebration`
  trigger, timing, and animation state for Beat success/failure UI

- `TimelinePanel`
  timeline composition only

- `PreviewCard`
  card rendering only

- `TimelineCelebration`
  message animation only

This does not need to happen all at once, but all future work should move in this direction rather than making `GamePage` denser.

## 19. PR And Change Rules

Every frontend change should be explainable in these terms:

- what responsibility is being added or changed
- where that responsibility belongs
- why the chosen placement is better than the nearest alternative

Before merging a frontend change, ask:

- Did this make a large file larger when it should have been split?
- Did UI code absorb logic that belongs in a hook or utility?
- Did we introduce new duplication?
- Did we increase coupling to server state shape unnecessarily?
- Did we protect mobile performance?
- Did we preserve touch-first interaction quality?

## 20. Practical Checklist For Future Iterations

Use this checklist before adding a frontend feature.

### 20.1 Before Coding

- define what part is view, behavior, service, and data mapping
- decide what file owns the new responsibility
- decide whether the feature needs a dedicated component or hook

### 20.2 During Coding

- keep files small and focused
- keep props narrow
- avoid mixing presentation with orchestration
- keep motion isolated
- keep server truth explicit

### 20.3 Before Finishing

- scan for duplication
- scan for file growth
- scan for naming clarity
- scan for mobile impact
- scan for hidden layout-shift side effects
- scan for whether a future reader can find the logic quickly

## 21. Rule For Future Codex Iterations

When modifying the frontend, future work should explicitly follow this document.

That means:

- prefer refactoring over stacking more logic into already large files
- propose cleaner boundaries when a change crosses concerns
- document tradeoffs when we knowingly accept temporary debt
- keep the codebase suitable as a teaching example

## 22. Immediate Next Step Recommendation

The next frontend refactor should likely focus on `GamePage` and related timeline files, because that area currently carries the most orchestration, branching, styling growth, and animation complexity in one surface.

Suggested first refactor batch:

1. extract connection and socket event handling from `useGamePageController`
2. extract timeline-derived view-model logic from `useGamePageController`
3. split `TimelinePanel` into render, drag behavior, and celebration concerns
4. move oversized CSS responsibilities into component-local modules where sensible

This should be done incrementally, not as a risky rewrite.
