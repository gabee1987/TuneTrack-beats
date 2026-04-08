# TuneTrack — Iteration 05 Main Menu And Lobby PWA UX Refactor Plan

> This plan defines the redesign and refactor of the main menu and lobby host
> settings experience for mobile-first, PWA-friendly usage.
>
> It is intended to be stable enough to follow across multiple sessions.
>
> It should be executed in alignment with:
> - `docs/tunetrack_full_architecture.md`
> - `docs/tunetrack_technical_implementation_plan.md`
> - `docs/decision_log.md`
> - `docs/iteration_04_frontend_challenge_tt_plan.md`

---

## 1. Iteration Goal

Refactor the main menu and lobby host settings experience so the app feels
natural on phones, especially in landscape, while remaining strong in portrait
and desktop.

This iteration is about:
- clear information hierarchy
- touch-friendly interaction design
- PWA-safe layout behavior
- maintainable React structure
- readable, modular CSS and component boundaries

This iteration is not only a visual redesign. It is also a structural cleanup
of page responsibilities, reusable layout primitives, and installable-web-app
readiness.

---

## 2. Product Outcome

After this iteration:
- the main menu should act like a mobile-first entry screen instead of a simple
  centered form
- the lobby should support quick host setup on phones without feeling cramped
- host settings should be grouped and easier to scan
- the app should be safer to use as a PWA on mobile browsers and installed mode
- both screens should be easier to extend without growing into monolithic page
  files

---

## 3. User Experience Targets

## 3.1 Main menu targets

The main menu should answer these quickly:
- what TuneTrack is
- what the user should do first
- where to enter room code
- where to enter player name
- what the primary action is
- where local device preferences live

The screen should feel:
- immediate
- spacious but not empty
- easy to use with thumbs
- stable in both portrait and landscape

## 3.2 Lobby targets

The lobby should answer these quickly:
- what room the player is in
- whether the connection is healthy
- who is in the room
- who is the host
- whether the current user can edit settings
- what the most important host actions are
- which settings matter before starting

The host setup flow should feel:
- grouped
- progressive
- readable at a glance
- easy to adjust with one hand on mobile

## 3.3 PWA targets

The app should behave well when:
- opened in a mobile browser
- opened after installation to home screen
- the browser UI changes viewport height
- the device has safe-area insets
- the device rotates between portrait and landscape

---

## 4. Design Principles

The redesign must follow these principles:

- Mobile-first: start from constrained phone layouts, then scale upward.
- Landscape-first gameplay prep: lobby and setup should work especially well in
  mobile landscape because that is likely during party use.
- One dominant action per section: avoid multiple equally loud CTAs.
- Progressive disclosure: advanced or conditional settings should not compete
  with core setup fields.
- Touch ergonomics: controls must be comfortable on phones, not desktop-sized
  controls shrunk onto mobile.
- Fast scanning: headings, summaries, values, and actions should be easy to
  parse without reading long text.
- Consistent visual language: chips, cards, toggles, sliders, and section
  actions should feel systematic.
- Accessibility by default: visible focus states, clear labels, strong contrast,
  and no essential hover-only behavior.

---

## 5. Engineering Principles

The refactor must follow these coding principles:

- Single Responsibility Principle:
  - page containers orchestrate
  - child components present UI sections
  - helpers format data
  - hooks/controllers manage view state and derived actions
- Open/Closed Principle:
  - layout sections should be extensible without rewriting page files
- Separation of concerns:
  - socket orchestration and route behavior stay separate from UI rendering
  - styling concerns stay in CSS modules or shared styling primitives
- Readability first:
  - short, intention-revealing component names
  - small props with explicit responsibilities
  - avoid giant JSX trees in one file
- Reuse with restraint:
  - shared primitives only where the interaction pattern is truly common
  - do not force abstraction too early

---

## 6. Current Codebase Assessment

Current state observed:
- `HomePage.tsx` is a single page component with local form state and direct
  navigation logic
- `LobbyPage.tsx` contains socket lifecycle handling, room state orchestration,
  host settings rendering, player list rendering, and room actions in one file
- both pages use CSS modules but with mostly page-local layout primitives
- `AppShellMenu` exists and can remain as a secondary/preferences entry point
- `vite-plugin-pwa` is installed but not configured in `apps/web/vite.config.ts`

Current structural weakness:
- too much responsibility in page files
- weak mobile layout primitives
- no persistent plan for PWA-safe viewport handling
- host controls and informational UI are too interleaved in the lobby

---

## 7. Scope

### In scope

- main menu redesign
- lobby host settings redesign
- shared mobile/PWA page shell primitives
- extraction of page sections into clearer components
- lightweight controller/helper extraction where appropriate
- responsive behavior for portrait and landscape
- baseline PWA configuration and metadata
- accessibility and interaction cleanup for these flows

### Out of scope

- full game page redesign in this iteration
- backend gameplay rule changes
- server socket protocol changes unless strictly required
- full theme system redesign
- advanced install prompts or custom offline UX beyond baseline PWA setup

---

## 8. Target Information Architecture

## 8.1 Main menu page

Recommended section order:

1. App chrome row
2. Brand and value proposition
3. Quick join form
4. Optional supporting info or tips
5. Preferences/menu entry point

Main menu should have:
- a clear title and short supporting copy
- one strong primary CTA
- room code and player name fields near the CTA
- no crowded top-right-only experience on mobile

## 8.2 Lobby page

Recommended section order:

1. Lobby top bar with room, connection state, and global menu access
2. Lobby summary card
3. Host setup panel or player waiting panel
4. Player roster
5. Secondary destructive action area

Host setup panel internal structure:

1. Setup overview
2. Core game rules
3. TT mode group
4. Per-player starting card controls
5. Primary start action
6. Secondary close/cancel action

---

## 9. Target File Structure

Recommended end-state structure:

- `apps/web/src/pages/HomePage/HomePage.tsx`
- `apps/web/src/pages/HomePage/HomePage.module.css`
- `apps/web/src/pages/HomePage/hooks/useHomePageController.ts`
- `apps/web/src/pages/HomePage/components/...`
- `apps/web/src/pages/LobbyPage/LobbyPage.tsx`
- `apps/web/src/pages/LobbyPage/LobbyPage.module.css`
- `apps/web/src/pages/LobbyPage/hooks/useLobbyPageController.ts`
- `apps/web/src/pages/LobbyPage/components/...`
- `apps/web/src/features/mobile-shell/...` or similar shared page-shell area
- `apps/web/src/features/forms/...` only if repeated patterns justify it

Extraction must remain pragmatic. The goal is clarity, not maximum file count.

---

## 10. Detailed Execution Plan

## 10.1 Phase A — Shared Mobile And PWA Foundations

### Objective

Create the layout and styling primitives needed by both pages before redesigning
individual screens.

### Required work

- introduce mobile-safe viewport handling for app pages
- add safe-area padding support for notched devices
- define shared spacing, card, and section patterns if genuinely reusable
- support sticky footer or anchored action behavior where useful
- make landscape layouts feel deliberate rather than accidental

### Technical direction

Possible implementation pieces:
- global CSS variables for safe-area spacing
- page wrappers using `100dvh` with fallbacks
- reusable shell classes or a small shared component for page framing
- orientation-aware grid rules

### Acceptance criteria

- pages avoid broken `100vh` behavior on mobile browser chrome changes
- bottom controls remain reachable on phones
- landscape and portrait both keep readable spacing

---

## 10.2 Phase B — Main Menu UX Redesign

### Objective

Transform the main menu into a stronger mobile-first entry flow.

### Required UX improvements

- stronger page hierarchy
- clearer room-join flow
- larger touch targets
- more intentional CTA placement
- reduced visual emptiness without clutter
- menu/preferences access that does not compete with joining a room

### Recommended component split

- `HomePageHero`
- `JoinRoomForm`
- `HomePageActions` or equivalent

### Behavior requirements

- room code and player name remain easy to edit
- submit path remains simple and reliable
- blank values still prevent navigation
- remembered player name behavior remains intact

### Mobile requirements

- form fields must be large enough for fast editing
- labels must remain visible and explicit
- CTA should remain close to inputs
- landscape layout may place hero and form side by side if space allows
- portrait layout should keep the form near the lower natural thumb zone

### Acceptance criteria

- users can understand the page and join flow within seconds
- the page feels designed for mobile, not merely responsive
- the code path for submit remains small and readable

---

## 10.3 Phase C — Home Page Refactor For Clean Architecture

### Objective

Move home page behavior out of the large page JSX so presentation stays clean.

### Required work

- extract view logic into a controller hook or helper
- keep navigation and local state setup in one small orchestration layer
- move repeated field metadata or copy into constants if it improves clarity

### Acceptance criteria

- `HomePage.tsx` mostly reads as layout composition
- event handlers are intention-revealing and small
- no unnecessary abstraction is introduced

---

## 10.4 Phase D — Lobby Page Structural Refactor

### Objective

Break the lobby page into clear UI sections and separate orchestration from
rendering.

### Required work

- move socket lifecycle and room orchestration into a controller hook where it
  improves clarity
- isolate derived state and room action handlers
- extract presentation components for the major lobby sections

### Recommended component split

- `LobbyHeader`
- `LobbySummaryCard`
- `LobbyPlayerList`
- `LobbyHostSettingsPanel`
- `LobbyRoomActions`

### Acceptance criteria

- `LobbyPage.tsx` becomes a composition layer
- socket/event behavior is easier to reason about
- host-only and shared UI responsibilities are clearly separated

---

## 10.5 Phase E — Lobby Host Settings UX Redesign

### Objective

Make host settings understandable and efficient on mobile.

### Required UX improvements

- group related settings into sections
- surface default/important values clearly
- distinguish core settings from advanced settings
- make toggle-dependent settings appear only when relevant
- avoid a long undifferentiated stack of sliders

### Recommended settings grouping

Core group:
- cards needed to win
- default starting cards
- reveal confirm mode

TT mode group:
- enable TT mode
- starting TT count
- challenge window mode/duration

Player overrides group:
- per-player starting card sliders

Action group:
- start game
- close room

### Interaction rules

- conditional TT controls appear only when TT mode is enabled
- values should be visible next to controls
- labels should explain impact, not just the raw field name
- destructive actions should be visually separated from primary start action

### Mobile requirements

- controls must work cleanly in portrait and landscape
- sliders/selects/toggles must be finger-friendly
- long pages should keep the primary action discoverable
- landscape can use two-column grouping if it improves scanning

### Acceptance criteria

- host can understand and adjust the room without hunting through the screen
- TT mode setup is obvious
- start and cancel actions are visually distinct and safe

---

## 10.6 Phase F — Player Roster UX Cleanup

### Objective

Keep the roster readable while supporting host-specific adjustments.

### Required improvements

- clearer host badge
- clearer current-player identity
- cleaner status chips
- better stacking behavior on narrow widths
- per-player overrides visually attached to the relevant player card

### Acceptance criteria

- player rows are easy to scan on phones
- host-only controls do not visually overwhelm the roster
- landscape remains compact without becoming dense

---

## 10.7 Phase G — Baseline PWA Enablement

### Objective

Convert the web app from PWA-capable dependencies into actual baseline PWA
configuration.

### Required work

- configure `vite-plugin-pwa`
- define manifest basics
- set app name, short name, theme color, display mode, and icons if available
- ensure install-friendly metadata is present
- verify viewport and browser theme settings support mobile app-like usage

### Constraints

- keep the setup pragmatic
- do not overbuild offline behavior if product requirements are not ready
- baseline installability and shell readiness are enough for this iteration

### Acceptance criteria

- the app has a working PWA plugin configuration
- manifest metadata reflects TuneTrack usage
- app shell colors and viewport settings fit the mobile experience

---

## 10.8 Phase H — Accessibility And Interaction Hardening

### Objective

Ensure the redesigned flows are usable, robust, and consistent.

### Required work

- visible focus states for buttons, inputs, selects, and sliders
- explicit labels and understandable helper copy
- sufficient contrast for text and UI affordances
- motion and transitions kept subtle and non-blocking
- no critical information conveyed by color alone

### Acceptance criteria

- both screens remain usable with keyboard navigation
- focus indication is never lost
- disabled and active states are distinguishable

---

## 10.9 Phase I — Validation And Cleanup

### Objective

Finish with a stable, maintainable result.

### Required work

- run typecheck
- run build
- run relevant tests if any are affected
- remove dead styles and duplicate patterns
- align naming across components, hooks, and CSS modules

### Acceptance criteria

- no broken routes or type regressions
- no obviously duplicated or abandoned UI patterns
- resulting codebase is easier to extend than the pre-refactor state

---

## 11. Detailed UX Rules

## 11.1 Touch target guidance

- primary buttons should feel comfortably tappable
- compact chips must not be the only way to trigger critical actions
- sliders and toggles must have enough spacing to avoid accidental input

## 11.2 Layout guidance

- do not center all content blindly on large mobile screens
- prefer section flow with clear anchors
- reserve centered layouts for hero emphasis, not every page element

## 11.3 Copy guidance

Prefer:
- short, clear labels
- direct instructions
- concise helper copy near controls

Avoid:
- vague placeholder-driven forms
- long paragraphs explaining obvious actions
- duplicated explanatory copy in every section

## 11.4 Visual hierarchy guidance

- primary action should be obvious
- secondary menu/preferences action should be quieter
- destructive room action should be clearly separated
- section summaries should help scanning, not create noise

---

## 12. Technical Risks

Potential risks:

- over-abstracting too early and making the page harder to follow
- making the CSS too global and losing page-level clarity
- introducing PWA setup that conflicts with future backend/network assumptions
- breaking lobby socket flow during controller extraction
- building a good portrait layout but weak landscape behavior

Mitigations:

- refactor in phases and verify after each stage
- keep page orchestration explicit
- isolate PWA config to baseline manifest/service worker behavior
- preserve existing socket event contracts
- test layout assumptions in both portrait and landscape during implementation

---

## 13. Testing Plan

## 13.1 Automated checks

Must run:
- `npm run typecheck --workspace @tunetrack/web` or equivalent project command
- `npm run build --workspace @tunetrack/web` or equivalent project command

Recommended if affected:
- `npm run test --workspace @tunetrack/web`
- `npm run lint --workspace @tunetrack/web`

## 13.2 Manual UX checklist

Main menu:

1. Open in mobile portrait width.
2. Verify room code and player name are immediately discoverable.
3. Verify the primary CTA is obvious and easy to tap.
4. Verify preferences/menu entry does not compete with the join flow.
5. Rotate to landscape.
6. Verify hierarchy still feels intentional, not compressed.
7. Submit valid values and verify navigation still works.
8. Clear fields and verify empty submit is blocked.

Lobby:

1. Join as host on portrait width.
2. Verify room identity and connection state are immediately visible.
3. Verify host settings are grouped and scannable.
4. Toggle TT mode on and verify TT-specific controls appear.
5. Toggle TT mode off and verify TT-specific controls hide cleanly.
6. Verify player list remains readable with several players.
7. Change per-player starting cards and verify controls remain tied to the right
   player.
8. Rotate to landscape and verify the layout improves rather than merely wraps.
9. Verify start action remains discoverable.
10. Verify close room remains clearly secondary and destructive.

PWA:

1. Verify manifest metadata is generated.
2. Verify browser/app theme color is appropriate.
3. Verify the layout respects safe-area and dynamic viewport changes on mobile.

---

## 14. Definition Of Done

This iteration is complete when:

- the main menu feels intentionally designed for phone usage
- the lobby host setup flow is clean, grouped, and mobile-friendly
- landscape support is strong and portrait remains fully usable
- baseline PWA support is configured and appropriate for TuneTrack
- page responsibilities are separated into readable components and hooks
- the refactor preserves existing join/lobby behavior
- validation checks pass

---

## 15. Execution Order Summary

Recommended implementation order:

1. Add shared mobile/PWA layout foundations
2. Refactor and redesign the main menu
3. Extract home page controller and supporting components
4. Refactor lobby orchestration into clearer structure
5. Redesign host settings and player roster UX
6. Add baseline PWA configuration
7. Run validation and cleanup

This order is intentional:
- shared layout rules reduce rework
- main menu is the simpler proving ground
- lobby refactor is safer after the layout approach is established
- PWA config should land once the page shell direction is stable

---

# End Of Iteration 05 Main Menu And Lobby PWA UX Refactor Plan
