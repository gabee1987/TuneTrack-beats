# TuneTrack — Technical Implementation Plan

> This document is the engineering companion to `tunetrack_full_architecture.md`.
> The product vision, gameplay model, and architecture principles from that file are treated as fixed base rules.
> If implementation details conflict with the vision document, the vision document wins.

---

## 1. Product Rule Lock

TuneTrack remains a mobile-first, server-authoritative, realtime multiplayer, PWA-ready party game where players place songs into chronological timelines and interact through token/challenge mechanics.

Non-negotiable rules:
- Browser-first, no native app requirement
- Server is the single source of truth
- Game rules live in a framework-independent game engine
- Frontend is touch-first and optimized for party play
- MVP does not require accounts, matchmaking, a database, or per-client playback
- Architecture must stay modular enough to add persistence and new playback providers later

---

## 2. Recommended Repository Strategy

Use a single repo with npm workspaces so frontend, backend, and shared logic evolve together without duplicating contracts.

```txt
tunetrack-beats/
  apps/
    web/
    server/
  packages/
    game-engine/
    shared/
  docs/
  .gitignore
  package.json
  package-lock.json
  tsconfig.base.json
  eslint.config.js
  prettier.config.js
  README.md
  tunetrack_full_architecture.md
  tunetrack_technical_implementation_plan.md
```

Why this structure:
- `apps/web` contains UI and browser-only client code
- `apps/server` contains Socket.IO, room orchestration, and runtime infrastructure
- `packages/game-engine` contains pure deterministic gameplay logic with no React/Socket.IO dependencies
- `packages/shared` contains shared types, event contracts, validators, and constants
- `docs` can hold protocol notes, decisions, and future extension plans

---

## 3. Exact Tech Stack

### 3.1 Frontend

Core stack:
- React
- TypeScript
- Vite
- Framer Motion
- Socket.IO Client

Routing and state:
- `react-router-dom` for screen routing
- `zustand` for lightweight client UI state
- `@tanstack/react-query` only if/when HTTP APIs appear; not required for the initial WebSocket-first MVP

Styling:
- CSS Modules for component-scoped styles
- CSS custom properties for theme tokens
- Avoid bringing in a heavy UI framework early; this game needs custom tactile interactions

PWA:
- `vite-plugin-pwa`
- Web App Manifest
- Service worker enabled after core gameplay is stable

Testing:
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `playwright` for key browser flows later in MVP

### 3.2 Backend

Core stack:
- Node.js
- TypeScript
- Express
- Socket.IO

Validation and config:
- `zod` for runtime validation of env vars and event payloads
- `dotenv` for local environment loading

Logging:
- `pino`
- `pino-pretty` for local development output

Storage:
- MVP: in-memory repositories implemented behind interfaces
- Future: Redis for room/session state, PostgreSQL for durable entities/history

Testing:
- `vitest`
- `supertest` for HTTP health endpoints
- Socket.IO integration tests through server/client test harnesses

### 3.3 Shared Packages

`packages/game-engine`:
- TypeScript only
- No framework/runtime coupling
- Can use small utility libraries only if they do not leak into domain design
- Prefer no external dependency unless there is a strong reason

`packages/shared`:
- TypeScript types and enums
- Zod schemas for socket payloads
- Shared constants
- No React imports
- No server-only imports

### 3.4 Tooling

Formatting/linting:
- `eslint`
- `typescript-eslint`
- `prettier`

Dev workflow:
- `concurrently` to run frontend and backend together
- `tsx` for running TypeScript server code in development

Build:
- `typescript`
- `vite`

Optional but recommended soon:
- `husky` + `lint-staged` for pre-commit quality gates after initial scaffolding

---

## 4. NPM Workspace Package Map

### Root package

Install at repo root:
- `typescript`
- `eslint`
- `typescript-eslint`
- `prettier`
- `concurrently`
- `vitest`

Root `package.json` responsibilities:
- Define workspaces
- Provide top-level scripts for `dev`, `build`, `test`, `lint`, and `format`
- Keep shared tooling versions centralized

Suggested root scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev -w apps/server\" \"npm run dev -w apps/web\"",
    "build": "npm run build -ws",
    "test": "npm run test -ws --if-present",
    "lint": "npm run lint -ws --if-present",
    "format": "prettier --write .",
    "typecheck": "npm run typecheck -ws --if-present"
  }
}
```

### `apps/web`

Dependencies:
- `react`
- `react-dom`
- `react-router-dom`
- `socket.io-client`
- `framer-motion`
- `zustand`

Dev dependencies:
- `@vitejs/plugin-react`
- `vite`
- `vite-plugin-pwa`
- `@types/react`
- `@types/react-dom`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `playwright`

### `apps/server`

Dependencies:
- `express`
- `socket.io`
- `cors`
- `zod`
- `dotenv`
- `pino`

Dev dependencies:
- `tsx`
- `@types/node`
- `@types/express`
- `pino-pretty`
- `vitest`
- `supertest`
- `@types/supertest`

### `packages/shared`

Dependencies:
- `zod`

Dev dependencies:
- `typescript`
- `vitest`

### `packages/game-engine`

Dependencies:
- None by default

Dev dependencies:
- `typescript`
- `vitest`

---

## 5. Detailed Project Structure

## 5.1 Frontend App

```txt
apps/web/
  index.html
  vite.config.ts
  src/
    app/
      App.tsx
      router.tsx
      providers/
        SocketProvider.tsx
      styles/
        globals.css
        tokens.css
    pages/
      HomePage/
      LobbyPage/
      GamePage/
      NotFoundPage/
    features/
      lobby/
        components/
        hooks/
        store/
        lobby.types.ts
      game/
        components/
        hooks/
        store/
      timeline/
        components/
        hooks/
        utils/
      tokens/
        components/
      challenge/
        components/
      host-controls/
        components/
    components/
      ui/
      layout/
      feedback/
    hooks/
      useSocketConnection.ts
      useViewportSize.ts
    services/
      socket/
        socketClient.ts
        socketEvents.ts
    types/
      ui.types.ts
    utils/
      formatters.ts
      guards.ts
    main.tsx
```

Frontend rules:
- Page components orchestrate features, they do not contain game rules
- Feature components may own local interaction state, but server-confirmed gameplay state must come from backend snapshots/events
- `packages/game-engine` is not directly responsible for UI behavior; UI maps server state to interactions and visuals
- Animations belong close to UI components, not in shared domain packages

### 5.2 Server App

```txt
apps/server/
  src/
    app/
      createHttpServer.ts
      createSocketServer.ts
      env.ts
      logger.ts
    game/
      GameApplicationService.ts
      mappers/
    rooms/
      RoomService.ts
      RoomRegistry.ts
      ClientSessionRegistry.ts
    realtime/
      registerSocketHandlers.ts
      socketEventSchemas.ts
      socketEventNames.ts
    playback/
      PlaybackProvider.ts
      HostManualPlaybackProvider.ts
    decks/
      DeckService.ts
      TrackNormalizer.ts
    repositories/
      RoomRepository.ts
      InMemoryRoomRepository.ts
    http/
      healthRoutes.ts
    index.ts
  tests/
```

Backend rules:
- Socket handlers validate payloads, call application services, and emit state updates
- Socket handlers must not embed core game rules
- Application services coordinate room state, repositories, and game-engine calls
- Room lifecycle, host identity, and reconnect behavior must be centralized in the room/session layer
- State emitted to clients should be intentionally shaped so hidden information stays hidden

### 5.3 Shared Package

```txt
packages/shared/
  src/
    events/
      clientEvents.ts
      serverEvents.ts
      schemas.ts
    game/
      roomState.ts
      track.ts
      player.ts
      timeline.ts
      tokens.ts
    constants/
      gameplay.ts
    index.ts
```

Shared package rules:
- Every Socket.IO event name and payload shape should be declared here
- Prefer explicit DTOs over ad-hoc inline payloads
- Use schemas for runtime validation at trust boundaries

### 5.4 Game Engine Package

```txt
packages/game-engine/
  src/
    domain/
      GameState.ts
      PlayerTimeline.ts
      TrackCard.ts
      ChallengeState.ts
      TokenWallet.ts
    services/
      TurnService.ts
      PlacementService.ts
      ChallengeService.ts
      TokenService.ts
    rules/
      placementRules.ts
      challengeRules.ts
      tokenRules.ts
      gameEndRules.ts
    index.ts
  tests/
    placement.test.ts
    challenge.test.ts
    turn-flow.test.ts
```

Game-engine rules:
- No Socket.IO, Express, React, browser APIs, or database code
- Functions should be deterministic and easy to unit test
- Prefer immutable state transitions or clearly controlled mutation boundaries
- Keep random decisions injectable so tests stay deterministic
- This package should be able to run as pure TypeScript logic in isolation

---

## 6. Socket Contract Rules

All realtime events must be defined once in `packages/shared`.

Client to server events:
- `join_room`
- `start_game`
- `place_card`
- `confirm`
- `challenge`
- `skip`
- `award_token`

Server to client events:
- `state_update`
- `turn_start`
- `reveal`
- `challenge_start`
- `game_end`
- `error`

Protocol rules:
- Every client event payload must be validated with Zod on the server
- Every server event payload should be typed from shared DTOs
- Server should emit full room snapshots only when safe; otherwise emit redacted state views
- Never trust client-submitted timeline outcomes, token counts, turn ownership, or challenge winner resolution

---

## 7. State Model Implementation Rules

Use two related state shapes:
- Internal authoritative room state on the server
- Public/redacted room state sent to clients

Internal state should include:
- `roomId`
- `status`
- `hostId`
- `players`
- `deck`
- `currentTrackCard`
- `currentTurn`
- `timelines`
- `tokens`
- `challengeState`
- `createdAt`
- `updatedAt`

Client-visible state should include only what the UI needs and must hide unrevealed release-year data until reveal.

Important rule:
- Do not let frontend infer hidden answer data from shared objects before reveal.

---

## 8. MVP Delivery Order

Build in this order:

1. Workspace + tooling setup
   - npm workspaces
   - TypeScript configs
   - ESLint/Prettier
   - Basic app/package scaffolding

2. Shared contracts + game engine foundation
   - Track, player, timeline, room, token, and event types
   - Placement and reveal rules
   - Turn transitions
   - Unit tests

3. Server room + realtime skeleton
   - Create/join room
   - Host assignment
   - In-memory room repository
   - Socket connection lifecycle
   - Broadcast room state

4. Frontend lobby + connection flow
   - Home/lobby screens
   - Join/create room UX
   - Connection state handling

5. Core timeline gameplay
   - Current card display
   - Horizontal timeline UI
   - Slot selection / drag placement
   - Confirm placement
   - Reveal and resolution animations

6. Token + challenge mechanics
   - Token display
   - Skip / buy / challenge actions
   - Server validation and resolution

7. Host playback MVP
   - Manual host controls first
   - Playback provider abstraction
   - Later Spotify-specific integration

8. PWA + polish
   - Manifest
   - Service worker
   - Mobile UX and interaction polish
   - Basic reconnect handling

---

## 9. Coding Standards

Naming:
- Use descriptive names
- Avoid short unclear variables
- Prefer domain language from the game rules

Architecture:
- Keep business rules out of React components and Socket handlers
- Prefer interfaces at repository/provider boundaries
- Keep feature folders cohesive
- Avoid circular dependencies between packages

TypeScript:
- Use strict mode
- Avoid `any`
- Prefer explicit DTOs and domain types
- Validate external input at boundaries

Testing:
- Game engine logic should have strong unit test coverage
- Server event handlers should have integration tests for critical flows
- UI tests should focus on key user flows and fragile interaction logic

Git:
- Work from `develop`
- Use feature branches for non-trivial slices
- Keep commits scoped by feature or refactor unit

---

## 10. Early Engineering Decisions To Lock

These should be decided at the start of implementation and then documented:
- Exact room code format and room creation flow
- Host disconnect and host migration behavior
- Player reconnect/session identity strategy
- Whether one browser can represent only one player per room
- Whether challenge timing is purely server-clock based
- Exact timeline placement representation sent from client to server
- Whether MVP deck data is static JSON, imported playlists, or hand-curated seed data

---

## 11. First Implementation Target

Recommended first milestone:
- Create npm workspace scaffolding
- Create `apps/web`, `apps/server`, `packages/shared`, `packages/game-engine`
- Add strict TypeScript configs
- Define initial shared event names/types
- Implement a tiny game-engine placement validation prototype
- Run one frontend and one backend dev process from the root

This gives us a stable foundation before building UI-heavy timeline interactions.

---

# End of Technical Implementation Plan
