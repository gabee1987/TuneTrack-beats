# TuneTrack Beats — Mobile UI Design System & Implementation Guide (Codex-Ready)

## Scope

This document defines a **mobile-only UI/UX system** for TuneTrack Beats. Desktop is intentionally out of scope. The goal is to enable **direct implementation** with React (PWA) using clean architecture and best-in-class mobile UX patterns.

---

## Core Product Intent

A **premium, playful, card-driven music game** with:

- fast, tactile interactions
- minimal cognitive load during gameplay
- strong visual identity
- smooth, unified motion system

---

## Hard Design Rules (from requirements)

### 1. Touch-first controls

- Minimum touch target: **44–48px**
- Primary actions: **56–64px height**
- Thumb-reachable zones prioritized (lower 60% of screen)
- Avoid clustered actions

### 2. Playful but clean

- Use **color intentionally**, not everywhere
- Limit simultaneous accents to **2–3 active colors per screen**
- Maintain high readability (contrast first, aesthetics second)
- The UI must feel **striking, fluid, and premium**, not like generic rounded rectangles placed on a screen

### 3. Minimal-first main menu

- Large **hero vector / illustration**
- App title integrated into visual
- **Single dominant CTA** (Start / Continue)
- Secondary actions hidden or subtle
- The first impression should be memorable and immediately recognizable

### 4. Onboarding-style lobby & setup

- Max **2–3 options per screen**
- Clear **step progression indicator**
- Each step = single responsibility
- Smooth transitions between steps
- Initial setup should feel like a **guided premium onboarding flow**, not a form wizard

### 5. Gameplay = zero distraction

- Only **essential UI visible by default**
- Secondary info:
  - hidden
  - collapsible
  - or gesture-revealed

- The screen should stay readable at a glance during active play

### 6. Fullscreen menu instead of slide-in

- Modal takeover
- Clear separation from gameplay
- Smooth animated entry/exit
- Structured as **multi-screen flow**, not one overloaded screen
- Animation should feel premium and creative, not just a plain slide

### 7. Animation harmony

- All motion must feel like part of the same system
- Consistent:
  - easing
  - duration
  - direction

- Menu flow, onboarding flow, gameplay feedback, and reveal moments should all feel related

### 8. Orientation support

- The mobile UI must support **portrait and landscape**
- Layouts should not simply stretch between orientations
- Portrait and landscape should each have intentional composition rules

### 9. Portrait gameplay timeline rule

- In **portrait**, the timeline must **not** be a long horizontal strip
- Use a **grid-based timeline system** with smaller cards
- Players should be able to see multiple timeline cards at once without awkward sideways scanning

### 10. Theme support

- UI must be compatible with **dark mode and light mode**
- Dark mode can be the flagship mode, but the design system must remain coherent in light mode
- Contrast, hierarchy, and playful visual identity must survive theme switching

### 11. Unambiguous action feedback

- Every player action must clearly communicate:
  - what happened
  - whether it succeeded
  - what changed
  - what the next state is

- No ambiguous state changes
- Interaction feedback must be visible, fast, and easy to understand

## Visual System

### Color System

#### Base

- Background: #0B0F1A (deep navy/black)
- Surface: #121826
- Elevated: #1A2235

#### Accents (choose 2–3 active at a time)

- Primary: Purple (#7C5CFF)
- Secondary: Cyan (#00D4FF)
- Energy: Pink (#FF4D9D)
- Optional: Orange (#FF8A3D)

#### Semantic

- Success: #22C55E
- Warning: #F59E0B
- Error: #EF4444

### Theme Support

#### Dark mode (primary)

- Deep navy/black bases
- Neon accents with subtle glow
- Strong contrast hierarchy

#### Light mode (new direction — based on provided reference)

Use a **soft pastel, airy, premium look** instead of flat white.

##### Light Palette Principles

- Background: warm off-white / soft beige gradient (not pure white)
- Surfaces: slightly tinted (peach, cream, light lavender hints)
- Accents: soft gradients instead of harsh solid colors

##### Suggested Tokens

- Background: #F6F3EF → #F1E8E1 (subtle gradient)
- Surface: #FFFFFF with 60–80% opacity overlay feel
- Elevated surface: soft tinted panels (peach / sand tones)

##### Accent Strategy

- Primary: soft green gradient (like CTA in reference)
- Secondary: warm orange / peach gradient cards
- Supporting: lavender / soft purple

##### Gradients (important)

- CTA buttons → green gradient (soft, not neon)
- Hero cards → warm gradient (orange → peach)
- Background → subtle diagonal or radial gradient

##### Shadows & Depth

- Very soft shadows (low opacity, high blur)
- Slight inner highlights
- No heavy dark shadows like in dark mode

##### Glass / Surface Feel

- Slight translucency
- Frosted card feel (very subtle)
- Rounded, smooth, friendly surfaces

##### Contrast Rules

- Text must remain highly readable
- Avoid low-contrast pastel-on-pastel combinations

##### Motion Adjustment for Light Mode

- Reduce glow-based feedback
- Use scale, opacity, and elevation instead

### Typography

- Headline: Bold, high contrast
- Body: Medium weight, high readability
- Metadata: muted opacity (~70%)

### Shapes

- Radius scale:
  - small: 10
  - medium: 16
  - large: 24
  - pill: full

### Surface Language

The interface should not feel like a collection of generic rounded boxes.

Use:

- layered cards with visual personality
- shape accents
- subtle asymmetry where useful
- soft glow edges
- gradient framing
- sculpted action surfaces
- playful depth cues

The goal is a **fluid, memorable, premium mobile product feel** inspired by top-tier consumer apps, while remaining readable and implementable.

## Motion System (CRITICAL)

### Library Recommendation (React)

👉 **Framer Motion** for core animations (with spring physics)

Optional:

- **React Spring** for more advanced, physics-heavy interactions

### Motion Tokens

- Fast: 140ms
- Standard: 200–260ms
- Emphasized: 300–420ms
- Reveal: 450–650ms

### Easing & Physics

- Prefer **spring-based animations over linear timing**
- Default spring:
  - stiffness: medium-high
  - damping: medium

- Avoid overly bouncy or cartoon-like motion

---

## Sticky / Elastic Interaction Model (Android-inspired)

### Core Concept

UI elements should feel:

- slightly **attached to surrounding layout**
- **resistant at first**
- then **release with intent**

This mimics modern Android system interactions (e.g., notification swipe behavior).

---

### 1. Sticky Drag Behavior

#### Behavior Phases

1. **Initial drag (resistance)**
   - element moves slower than finger
   - feels “connected” to original position

2. **Tension phase**
   - resistance increases slightly
   - surrounding UI subtly reacts (spacing / opacity / blur)

3. **Break / release**
   - after threshold → element detaches
   - motion becomes faster and freer

4. **Settle**
   - snaps into new state
   - small spring settle animation

---

### 2. Application in TuneTrack

#### Timeline card drag

- slight resistance when starting drag
- nearby cards “stretch apart”
- insertion point becomes visible
- release → snap into position with confidence

#### Swipe actions (future use)

- card sticks slightly to list
- after threshold → pops out
- partial swipe → elastic return

#### Menu transitions

- not just linear slide
- slight **elastic expansion / compression feel**

---

### 3. Implementation Pattern (Framer Motion)

Use:

- `drag` with constraints
- `dragElastic` (0.2–0.4 range)
- `dragTransition` with custom spring

Example guideline:

- low movement → high resistance
- high movement → reduced resistance

---

### 4. Feedback Through Motion

Every motion should communicate intent:

- resistance → "this is still part of current state"
- release → "action is committed"
- snap → "new state confirmed"
- bounce back → "invalid / cancelled"

---

### 5. UX Rule

Motion must answer:

- what is happening?
- is it allowed?
- is it confirmed?

If motion does not clarify intent, it should be simplified.

---

## Key Screens (Detailed)

### 1. Landing / Main Menu

#### Layout

- Fullscreen hero illustration
- Title integrated visually
- Bottom anchored CTA

#### Components

- Primary button (Start / Continue)
- Optional small secondary action (Join)

#### Behavior

- Subtle animated background
- CTA glow or pulse (very subtle)

---

### 2. Lobby / Setup (Onboarding Flow)

#### Structure

Each step = separate screen

Examples:

1. Choose mode
2. Select playlist
3. Configure rules

#### UI Rules

- Max 2–3 inputs per screen
- Clear CTA: "Next"
- Progress indicator (dots or stepper)

#### Transitions

- Horizontal slide between steps

---

### 3. Gameplay Screen

#### Layout Goals

- Clean and readable
- Minimal active UI chrome
- Strong focus on the current song card and timeline state
- Secondary systems should not visually compete with gameplay

#### Portrait Layout

- Top: compact status strip
- Middle: current song card / active play area
- Bottom or lower-middle: **grid-based timeline presentation**
- Timeline cards should be smaller, readable, and spatially organized so multiple items are visible at once
- Avoid forcing horizontal scanning across a thin strip

#### Landscape Layout

- More room can be used for broader timeline visibility
- Horizontal or hybrid timeline layout may be used if it improves scanning
- Keep active card and placement target visually obvious

#### Hidden UI

- Score → toggle, peek panel, or quick overlay
- Menu → dedicated entry point
- Rules / extra metadata → moved out of main play surface

#### Priority

- Card interaction clarity
- Timeline readability
- Immediate state feedback
- Orientation-aware layout

#### Feedback Rules

Every action must clearly signal outcome:

- selected
- moved
- inserted
- confirmed
- invalid
- revealed
- scored

No action should leave the player uncertain about the current state.

---

### 4. Fullscreen Menu

#### Trigger

- button from gameplay

#### Structure

Separate screens inside menu:

- Settings
- Rules
- Exit
- Players

#### Layout

- Vertical list or cards
- Large touch targets

#### Motion

- Slide up + fade
- Reverse on exit

---

### 5. Reveal Screen

#### Purpose

Feedback moment

#### Elements

- Year reveal (animated)
- Success/fail state
- Score change

#### Motion

- Emphasized animation
- Quick but impactful

---

## Component System

### Primary Button

- Large, pill shape
- Gradient or solid accent
- Strong feedback on press

### Card System

Reusable for:

- songs
- players
- actions

### Timeline Slot

- clear drop zones
- animated spacing

---

## Layout System

### Structure Pattern

- Header (optional minimal)
- Content (primary)
- Action zone (bottom anchored)

### Spacing

- 8pt grid
- generous padding

---

## Interaction Model

### Gestures

- tap (primary)
- drag (timeline)
- swipe (navigation optional)

### Feedback

- immediate visual response
- no lag

---

## Architecture Mapping (React)

### Folder Structure

```
components/
  ui/
  game/
  lobby/
  menu/

screens/mobile/
  landing/
  lobby/
  gameplay/
  menu/

hooks/

animations/

theme/
```

### Principles

- separation of concerns
- reusable primitives
- no monolithic components

---

## Codex Implementation Prompt

```text
Create a mobile-first React PWA UI for TuneTrack Beats.

Requirements:
- touch-first large controls (min 44px)
- playful but clean modern design
- minimal main menu with hero visual + single CTA
- onboarding-style lobby with 2–3 inputs per step
- clean gameplay screen with minimal UI
- fullscreen animated menu instead of slide-in
- unified animation system using Framer Motion
- card-based interaction model

Architecture:
- separate mobile screens from desktop
- reusable UI components
- clean structure

Design:
- dark mode + vibrant accents
- strong hierarchy
- smooth animations
```

---

## Final Direction Summary

Design TuneTrack Beats mobile as:

👉 A **premium, playful, card-driven mobile game UI**
👉 With **minimal distractions during gameplay**
👉 And **highly polished, unified animations**

---

## Next Step (Recommended)

1. Create **wireframes for 3 screens** (Landing, Lobby, Gameplay)
2. Define **component API contracts**
3. Generate **first React implementation via Codex**

---

If you want, next I can:

- design **actual screen wireframes (dev-ready)**
- or generate **React component code structure immediately**
