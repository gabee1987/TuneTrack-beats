# TuneTrack Mobile/Desktop Assembly Separation Plan

## Purpose

This document defines the implementation plan for phase 1 of the agreed frontend rework:

1. mobile/desktop assembly separation

This plan is architecture-first.
It intentionally does not cover the later performance/prop-contract phase except where this phase must prepare for it.

This plan follows and must remain compatible with:

- [tunetrack_full_architecture.md](./tunetrack_full_architecture.md)
- [tunetrack_technical_implementation_plan.md](./tunetrack_technical_implementation_plan.md)
- [backend_engineering_rules.md](./backend_engineering_rules.md)
- [tunetrack_beats_mobile_ui_plan_brief.md](./tunetrack_beats_mobile_ui_plan_brief.md)

---

## Core Objective

Separate mobile UI from desktop UI at the page assembly layer.

The app should stop relying on one shared responsive page tree that tries to serve two different products through CSS and scattered conditional rendering.

Instead, each major page should have:

- one shared logic/controller layer
- one mobile assembly
- one desktop assembly
- one page-root resolver that chooses which assembly to render

This is the architectural target for:

- `HomePage`
- `LobbyPage`
- `GamePage`

---

## Non-Negotiable Principles

### 1. Split At The Assembly Layer Only

The separation belongs at the page assembly layer, not at the game-rule layer and not at the transport layer.

Correct:

- separate mobile and desktop page trees
- shared hooks underneath
- shared domain logic underneath

Incorrect:

- duplicated controller logic
- duplicated room/game orchestration
- duplicated gameplay rules

### 2. Shared Logic Remains Single-Source

The following stay shared:

- page controllers
- derived state hooks
- selectors
- domain mappers
- service calls
- socket orchestration

Only layout, composition, and interaction shell differences should split.

### 3. Avoid CSS-Only Separation

We are not building a single page tree with:

- many breakpoint-only structural changes
- hidden desktop subtrees on mobile
- hidden mobile subtrees on desktop

That is explicitly what this phase is trying to eliminate.

### 4. Avoid Deep `isMobile ? ... : ...` Branching

The device/layout choice should happen near the page root.

The deeper the branch lives, the more mixed and fragile the architecture becomes.

### 5. Prepare For Performance Work Without Prematurely Doing It

This phase should create the structure that makes later performance work easier:

- smaller render trees
- per-layout chunking
- cleaner page models

But it should not collapse into a performance-only refactor.

---

## Architectural Target

For each major page:

```text
pages/
  HomePage/
    HomePage.tsx
    HomePage.types.ts
    hooks/
    mobile/
    desktop/
    components/

  LobbyPage/
    LobbyPage.tsx
    LobbyPage.types.ts
    hooks/
    mobile/
    desktop/
    components/

  GamePage/
    GamePage.tsx
    GamePage.types.ts
    hooks/
    mobile/
    desktop/
    components/
```

Responsibilities:

- `Page.tsx`
  page resolver only
- `mobile/*`
  mobile-specific top-level assembly
- `desktop/*`
  desktop-specific top-level assembly
- `hooks/*`
  shared orchestration and derived state
- `components/*`
  shared page-local building blocks used by one or both assemblies
- `features/ui/*`
  reusable primitives across the app

---

## Resolver Design

Each page root should become a thin resolver.

Target pattern:

```tsx
export function HomePage() {
  const controller = useHomePageController();
  const layoutMode = usePageLayoutMode();

  return layoutMode === "mobile" ? (
    <HomePageMobile controller={controller} />
  ) : (
    <HomePageDesktop controller={controller} />
  );
}
```

The root page should not:

- own mobile-specific JSX
- own desktop-specific JSX
- contain mixed structural branching for both trees

---

## Layout Resolution Strategy

We need one shared layout-selection mechanism for the app.

### Deliverable

Add:

- `apps/web/src/hooks/usePageLayoutMode.ts`

Optionally later:

- `apps/web/src/app/layout/layoutMode.ts`
- dev override support through preferences

### Return Contract

```ts
type PageLayoutMode = "mobile" | "desktop";
```

### Inputs

The decision should be based on:

- viewport width
- pointer type
- possibly orientation
- optionally future manual override

### Rules

Recommended default rule:

- mobile when the device is touch-first and under the mobile threshold
- desktop otherwise

### Guardrails

- do not use user-agent sniffing as the primary source
- do not let tiny viewport changes constantly rebuild the app between mobile and desktop trees
- prefer stable layout choice for the current page session if needed

---

## Lazy Loading Requirement

Point 1 should include assembly-level lazy loading.

Why:

- if desktop is selected, mobile assembly should not be loaded
- if mobile is selected, desktop assembly should not be loaded
- this is part of true separation, not an optional extra

Pattern:

```tsx
const HomePageMobile = lazy(() => import("./mobile/HomePageMobile"));
const HomePageDesktop = lazy(() => import("./desktop/HomePageDesktop"));
```

Resolver chooses one branch only.

This gives:

- cleaner bundle boundaries
- lower unnecessary load
- better profiling

---

## Shared Model Direction

This phase should move toward page-scoped assembly models.

We do not need to perfect every model immediately, but the split should be built in a way that supports this target.

### HomePage Example

```ts
interface HomePageMobileModel {
  topBar: HomePageTopBarModel;
  hero: HomePageHeroModel;
  joinForm: JoinRoomFormModel;
}

interface HomePageDesktopModel {
  masthead: HomePageDesktopMastheadModel;
  hero: HomePageHeroModel;
  joinForm: JoinRoomFormModel;
}
```

### LobbyPage Example

```ts
interface LobbyPageMobileModel {
  header: LobbyHeaderModel;
  summary: LobbySummaryModel;
  hostSetup?: LobbyHostSetupModel;
  roster: LobbyRosterModel;
}

interface LobbyPageDesktopModel {
  header: LobbyHeaderModel;
  mainColumn: LobbyMainColumnModel;
  sideColumn: LobbySideColumnModel;
}
```

### GamePage Example

```ts
interface GamePageMobileModel {
  header: GameHeaderModel;
  timeline: TimelinePanelModel;
  actions: MobileActionDockModel;
  reveal: RevealModel;
  finished: FinishedStateModel;
}

interface GamePageDesktopModel {
  header: GameHeaderModel;
  board: GameDesktopBoardModel;
  sidebar: GameDesktopSidebarModel;
  reveal: RevealModel;
  finished: FinishedStateModel;
}
```

These models are important because they are the eventual replacement for oversized prop lists.

---

## Page-By-Page Rollout Order

### Step 1. Shared Layout Infrastructure

Build first:

- `usePageLayoutMode`
- layout mode contract
- layout thresholds/constants
- tests for layout decision logic

This is the shared foundation.

### Step 2. HomePage First

Why first:

- smallest page
- lowest risk
- easiest place to establish the pattern

Target work:

- `HomePage.tsx` becomes resolver only
- add `mobile/HomePageMobile.tsx`
- add `desktop/HomePageDesktop.tsx`
- keep `useHomePageController` shared
- keep `JoinRoomForm` shared unless layout divergence demands separate versions

Success criteria:

- page root becomes thin
- one mobile tree
- one desktop tree
- no responsive architecture tricks in the root

### Step 3. LobbyPage Second

Why second:

- moderate complexity
- real section-order differences between touch-first and wider layouts
- good test of column-vs-stack composition

Target work:

- `LobbyPage.tsx` becomes resolver only
- add `mobile/LobbyPageMobile.tsx`
- add `desktop/LobbyPageDesktop.tsx`
- reuse:
  - `useLobbyPageController`
  - `useLobbyRoomConnection`
  - `useLobbyRoomActions`
- move section order and grouping into assemblies

Success criteria:

- mobile stack and desktop column structure are separate trees
- page-local shared pieces remain reusable
- controller logic stays single-source

### Step 4. GamePage Design Pass Before Coding

`GamePage` should not be split blindly.

Before implementation, define:

- what mobile prioritizes
- what desktop keeps visible at once
- which components can stay shared
- which components need separate shells

This is mandatory because `GamePage` is the heaviest page and the most likely to regress if split too quickly.

### Step 5. GamePage Third

After the design pass:

- `GamePage.tsx` becomes resolver only
- add `mobile/GamePageMobile.tsx`
- add `desktop/GamePageDesktop.tsx`
- keep `useGamePageController` shared
- move current mixed assembly logic into mobile and desktop trees

Success criteria:

- no major mixed-layout tree remains in the page root
- mobile and desktop can evolve independently
- gameplay state remains shared

---

## Page-Specific Design Constraints

### HomePage

Mobile:

- hero-first
- strong, minimal CTA/form
- touch-first composition

Desktop:

- more breathing room
- broader hero treatment
- possible form/sidebar separation

### LobbyPage

Mobile:

- onboarding-like flow
- stacked sections
- low cognitive load

Desktop:

- multi-column information layout
- more persistent overview
- side column is acceptable

### GamePage

Must follow the mobile brief.

Mobile:

- touch-first
- minimal distraction
- timeline-first interaction
- portrait layout must not depend on a long horizontal strip
- secondary systems moved into overlays/docks/sheets as needed

Desktop:

- higher information density
- more persistent support context
- wider timeline/board visibility

The mobile and desktop `GamePage` assemblies should feel like intentionally different products built on the same game logic.

---

## Testing Requirements For Phase 1

Point 1 should remain protected by automation.

We should add and keep tests for:

- layout selector rules
- page assembly config/model selectors
- mobile/desktop menu config selectors
- pure page display selectors where layout choice depends on prepared models

Verification standards:

- `npm run verify -w apps/web`
- `npm run build -w apps/web`

Every page migration should keep these green.

---

## Anti-Patterns To Avoid

- rendering both mobile and desktop page assemblies at once and hiding one with CSS
- branching on device mode throughout deeply nested components
- duplicating controller logic for layout variants
- moving orchestration state to Zustand only to avoid prop passing
- building fake “shared” abstractions that are only wrappers for one usage
- trying to solve structural differences with more breakpoints instead of separate assemblies

---

## Completion Criteria For Point 1

Point 1 is complete when:

- `HomePage`, `LobbyPage`, and `GamePage` each resolve layout at the page root
- each page has explicit mobile and desktop assembly entry points
- shared hooks remain the single source for orchestration and derived state
- mobile and desktop can evolve independently without turning page roots back into mixed trees
- layout-level lazy loading is in place
- CSS is no longer the primary architecture mechanism for cross-device structure
- verification remains green

---

## Important Sequencing Note

Spotify integration should come after this phase.

That remains the correct order:

1. mobile/desktop assembly separation
2. render/performance and prop-contract cleanup
3. Spotify/domain-data integration
4. replace JSON test cards with real generated song cards

This is the current active phase and should be completed before moving on.

