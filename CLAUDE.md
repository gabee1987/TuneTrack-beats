# TuneTrack-beats — CLAUDE.md

## Vision

TuneTrack is a **mobile-first, real-time multiplayer party game** where players
place songs into a chronological timeline. It must feel better than a physical
card game, require zero install, and scale from a local party to online play.

Design goals: frictionless social experience, fast turns, hidden information
until reveal, tactile touch interactions, smooth animations.

---

## Game Rules

- A host creates a room; players join via browser (no install required).
- The host draws a card (song) from the deck and plays audio on the host device. The host also plays the game, participate in the turn order.
- The active player guesses where the song's release year fits on their timeline relative to cards already placed.
- **Correct placement** → card stays on the player's timeline. **Wrong** → card is discarded.
- First player to collect **N cards** (configurable, default 10, range 3–30) wins.
- Each player starts with 1 revealed card (host can override per player in lobby).
- **Same-year rule**: every slot inside a same-year block is a valid placement.
- **TT Tokens** enable special actions: skip current card, buy an extra card, challenge.
- **Challenge**: any player who has at least one TT token can challenge a placement before reveal; outcome is resolved server-side.
- Host can configure reveal confirmation mode: `host_only` or `host_or_active_player`.
- Host disconnect → first remaining player inherits host role. Last player leaves → room removed.

---

## Look & Feel

### Personality

The app is **playful but purposeful** — every visual choice should reinforce
clarity of action, not compete with it. Whimsy lives in motion and colour
accents; the information hierarchy is always unambiguous.

### Theming

- **Dark theme is the default and primary design target.**
- The theme system must support additional themes from day one — colours,
  surfaces, and shadows must use **CSS custom properties / design tokens**, never
  hardcoded values.
- New themes should be addable by swapping a token set, not by touching
  component code.

### Animations & Motion

- Follow **Material 3 motion principles**: emphasise, enter, exit.
  - Elements that enter the screen use an **emphasised decelerate** easing curve.
  - Elements that exit use an **emphasised accelerate** easing curve.
  - Transitions between states use a **standard easing** curve.
- Motion must **communicate state change**, not decorate it. Every animation
  should answer "what just happened?"
- Duration should feel snappy on mobile: prefer 200–350 ms for most transitions,
  up to 500 ms only for large-screen entries or celebration moments.
- Respect `prefers-reduced-motion` via a shared motion helper — never scattered
  one-off checks.

### Mobile vs Desktop UI

- **Mobile and desktop are separate UI assemblies**, not the same layout
  squished or stretched with media queries.
- Mobile UI is the primary design surface: thumb-reachable controls, large touch
  targets (minimum 44 × 44 px), no hover-only affordances.
- Desktop UI may introduce richer layouts (sidebars, wider timelines, keyboard
  shortcuts) but must never regress the mobile experience.
- Shared logic (hooks, services, game state) is common; only the assembly and
  layout layer diverges per platform.

---

## Tech Stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| Frontend       | React 18, TypeScript, Vite, Framer Motion, CSS Modules, PWA |
| Backend        | Node.js, TypeScript, Socket.IO                              |
| Drag           | @dnd-kit                                                    |
| State (client) | Zustand (app-wide UI prefs only)                            |
| Validation     | Zod (shared schemas)                                        |
| Storage (MVP)  | In-memory; future: Redis / PostgreSQL                       |

### Monorepo Structure

```
apps/server      — Node.js + Socket.IO backend
apps/web         — React + Vite frontend
packages/game-engine  — pure gameplay rules, zero framework deps
packages/shared  — shared types, event contracts, Zod schemas
```

---

## Architecture Principles

### Core Rules (non-negotiable)

- **Server is the single source of truth.** Never trust client-computed state.
- **Game rules live in `packages/game-engine`** — no Socket.IO, no Express, no timers, no logging inside the engine.
- **Transport concerns belong at the edges** (`realtime/` layer only).
- **Validation at boundaries** — always parse socket payloads through Zod schemas before service calls.
- **Mapping is centralized and pure** — `mapGameStateToPublicRoomState` etc.; mappers do not mutate or orchestrate.
- **Orchestration is explicit** — state transitions through clearly named methods, no hidden mutation via helper side effects.
- **Timers are orchestration concerns** — centralized owner, clear cleanup, always recheck state before mutating.

### Backend Layer Ownership

| Layer                  | Owns                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `app/`                 | bootstrap, env, wiring                                                |
| `http/`                | health checks                                                         |
| `realtime/`            | socket event registration, payload parsing, error mapping, broadcasts |
| `rooms/`               | room lifecycle, membership, orchestration, state mapping              |
| `decks/`               | deck loading, validation, normalization                               |
| `packages/game-engine` | rules, placement, challenge/reveal, turn progression                  |
| `packages/shared`      | public contracts, payload schemas, constants                          |

### Frontend Layer Ownership

| Layer         | Owns                                                                  |
| ------------- | --------------------------------------------------------------------- |
| `pages/`      | screen assembly only; composed from sections + controller hooks       |
| `components/` | focused presentational pieces                                         |
| `features/`   | cross-page capabilities (theme, motion, preferences)                  |
| `hooks/`      | generic reusable hooks only; page-specific hooks live under that page |
| `services/`   | browser integrations: socket client, storage, PWA, vibration          |
| `utils/`      | pure helpers, no side effects, no UI                                  |

### SOLID & Modularity

- One module, one reason to change.
- Composition over large multipurpose files.
- Prefer extraction over accumulation when files grow large.
- Do not add responsibilities to `RoomRegistry`; extract to narrower collaborators instead.
- File size soft limits: component ~200 lines, controller hook ~300, service ~300, utility ~150. Above 500 lines = must split.

### Animation Rules

- Framer Motion for meaningful state transitions (mount/unmount, gameplay feedback, overlays).
- CSS for static layout, simple hover/focus/disabled states.
- @dnd-kit owns drag mechanics; Framer Motion may decorate drag outcomes only.
- Backend-driven transitions use a dedicated coordinator hook — never let raw prop changes race with local timers.
- Animate `transform` and `opacity`; avoid layout-affecting properties (`width`, `height`, `margin`) on mobile.
- Respect `prefers-reduced-motion` via shared helpers, not scattered one-off checks.

---

## Coding Principles

- **Clean over clever.** Readability and maintainability is key, performance and light battery usage is king.
- **No comments on what code does** — names explain that. Only comment a non-obvious _why_.
- **No premature abstraction.** Extract after second or third meaningful repetition, not the first coincidence.
- **No error handling for impossible cases.** Trust internal guarantees; validate only at system boundaries.
- **Boolean names read like facts**: `isChallengeOwner`, `canConfirmBeatPlacement`.
- **No long nested ternaries** for multi-branch UI; use named helpers or early returns.
- **Logging only for**: startup, shutdown, socket connect/disconnect, unexpected errors, notable room lifecycle events and helpful dev logs. Never inside the game engine.
- **Security**: never trust client permissions or client-computed correctness; validate membership and phase before every mutation.

---

## Workflow

### Before Coding

1. Identify whether the change is **transport, orchestration, mapping, or engine logic**.
2. Choose the owning layer first.
3. Check if the change affects public contracts in `packages/shared`.
4. Ask if something is unclear rather than guessing — wrong assumptions compound in this architecture.

### During Coding

- Validate at boundaries (Zod schemas).
- Keep engine logic pure, orchestration explicit, mapping centralized.
- Keep files small; if a file grows beyond soft limits, extract don't accumulate.
- Keep timer ownership and cleanup clear.
- Prefer narrow props over passing raw server state into components.

### Review (before finishing)

- Did gameplay rules end up in the wrong layer?
- Did a large file get larger instead of being extracted?
- Did we duplicate boundary logic or mapping?
- Did we preserve server authority?
- Did we improve or weaken testability?
- Did we protect mobile performance?
- Can a future reader find the logic quickly?

### Testing

- **Game engine** gets the deepest tests: placement correctness, challenge outcomes, turn progression, same-year edge cases.
- **Server orchestration**: room lifecycle, reconnect, authorization, timer resolution, state mapping.
- **Realtime boundary**: schema validation, event-to-service wiring, client-safe errors, room broadcasts.
- **Frontend**: unit tests for pure helpers/selectors; component tests for rendered behavior; E2E for join, place, challenge, reveal flows.
- Do not use logs as a substitute for tests.
