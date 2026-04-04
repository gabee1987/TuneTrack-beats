# TuneTrack — Iteration 01 Foundation Plan

> Goal: create a stable, testable technical foundation for TuneTrack without changing the gameplay vision or architecture rules defined in `tunetrack_full_architecture.md` and `tunetrack_technical_implementation_plan.md`.

---

## 1. Iteration Outcome

By the end of this iteration, the repo should have:
- A working npm workspace monorepo structure
- A Vite React frontend app that boots successfully
- A Node + Socket.IO backend server that boots successfully
- A shared package that defines the first event names, DTOs, and validation schemas
- A game-engine package with the first pure placement/timeline logic and unit tests
- A minimal room flow where one browser can connect to the server and receive a room state update
- A clear foundation for building lobby and gameplay UI in Iteration 02

This iteration is not aiming for full gameplay yet. It is about making the architecture real and safe to extend.

---

## 2. Recommended Execution Order

Build in this exact order:
1. Repository scaffolding and workspace setup
2. Tooling and TypeScript baseline
3. Shared contracts package
4. Game engine package
5. Server app skeleton + first Socket.IO loop
6. Web app skeleton + connection status screen
7. First end-to-end manual check
8. Documentation update and cleanup

Reason for this order:
- Shared contracts and game-engine logic should exist before UI starts depending on unstable shapes
- Server and client can then integrate against a known protocol instead of ad-hoc payloads
- This reduces rework once timeline/challenge UI becomes more complex

---

## 3. Phase 1 — Repository Scaffolding

### 3.1 Create workspace folders

Create this structure:

```txt
apps/
  web/
  server/
packages/
  shared/
  game-engine/
docs/
```

### 3.2 Create root workspace config

Create root `package.json` with:
- `private: true`
- npm workspaces pointing to `apps/*` and `packages/*`
- root scripts:
  - `dev`
  - `build`
  - `test`
  - `lint`
  - `typecheck`
  - `format`

### 3.3 Install root dev tooling

Install at repo root:
- `typescript`
- `eslint`
- `typescript-eslint`
- `prettier`
- `concurrently`
- `vitest`

### 3.4 Create shared root config files

Create:
- `tsconfig.base.json`
- `eslint.config.js`
- `prettier.config.js`

Rules to enforce immediately:
- TypeScript strict mode
- No accidental `any`
- Consistent formatting
- No framework-specific assumptions in shared/game-engine packages

### 3.5 Acceptance criteria

- `npm install` works at repo root
- Workspace packages are recognized
- Root scripts exist, even if some package scripts are still placeholders

---

## 4. Phase 2 — Shared Contracts Package

### 4.1 Create `packages/shared`

Create:

```txt
packages/shared/
  src/
    events/
      clientEvents.ts
      serverEvents.ts
      schemas.ts
    game/
      player.ts
      track.ts
      timeline.ts
      roomState.ts
    constants/
      gameplay.ts
    index.ts
  package.json
  tsconfig.json
```

### 4.2 Define first domain DTOs

Create minimal but explicit types for:
- `PlayerId`
- `RoomId`
- `TrackId`
- `TrackCard`
- `TimelineCard`
- `PublicPlayerState`
- `PublicRoomState`
- `RoomStatus`

Important rule:
- Do not expose hidden release-year data in public card types before reveal.
- If needed, define separate `TrackCardInternal` and `TrackCardPublic` shapes.

### 4.3 Define first Socket.IO event contract

Client to server:
- `join_room`

Server to client:
- `state_update`
- `error`

For this iteration, keep the payloads small but strict.

Example payload responsibilities:
- `join_room` should carry room code and player display name
- `state_update` should return a public room snapshot
- `error` should return a machine-readable code plus a human-readable message

### 4.4 Add Zod validation schemas

Create schemas for:
- `join_room` payload
- public room/player state payloads if useful

Server should validate incoming client payloads with these schemas before touching room logic.

### 4.5 Acceptance criteria

- `packages/shared` builds successfully
- Types are importable from one top-level package entrypoint
- At least `join_room`, `state_update`, and `error` contracts are defined in one shared place
- Invalid `join_room` payloads can be rejected via Zod

---

## 5. Phase 3 — Game Engine Package

### 5.1 Create `packages/game-engine`

Create:

```txt
packages/game-engine/
  src/
    domain/
      TimelineCard.ts
      PlayerTimeline.ts
    rules/
      placementRules.ts
    services/
      PlacementService.ts
    index.ts
  tests/
    placementRules.test.ts
  package.json
  tsconfig.json
```

### 5.2 Implement first pure placement logic

Start with one narrow rule set:
- Given a sorted timeline and a candidate card year, check whether inserting at a specific slot is correct
- Support edge slots and middle slots
- Return a deterministic result object, not UI-specific behavior

Example function shape:
- Input: timeline cards, candidate release year, target slot index
- Output: `{ isCorrect: boolean; expectedSlotIndex: number }`

Rules:
- No React imports
- No Socket.IO imports
- No Express imports
- No direct mutation unless it is clearly controlled and tested

### 5.3 Add unit tests

Cover at least:
- Correct placement before the first card
- Correct placement after the last card
- Correct placement between two cards
- Incorrect placement when dropped into the wrong slot
- Equal-year edge case behavior, with one explicit rule chosen and documented

### 5.4 Acceptance criteria

- `packages/game-engine` test suite passes
- Placement logic is deterministic and framework-independent
- The chosen equal-year behavior is documented in code/tests

---

## 6. Phase 4 — Backend Server Skeleton

### 6.1 Create `apps/server`

Create:

```txt
apps/server/
  src/
    app/
      env.ts
      logger.ts
      createHttpServer.ts
      createSocketServer.ts
    rooms/
      RoomRegistry.ts
      RoomService.ts
    realtime/
      registerSocketHandlers.ts
    http/
      healthRoutes.ts
    index.ts
  package.json
  tsconfig.json
```

### 6.2 Install backend dependencies

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

### 6.3 Implement server bootstrap

Server must:
- Start an Express HTTP server
- Expose `GET /health`
- Start Socket.IO on the same HTTP server
- Load env config from a validated config module
- Log startup information clearly

Suggested env vars:
- `PORT`
- `CLIENT_ORIGIN`
- `NODE_ENV`

### 6.4 Implement minimal in-memory room registry

For Iteration 01, keep room logic intentionally small:
- Create a room in memory if a player joins a non-existing room code
- Add the socket's player to that room
- Assign the first player as host
- Emit a public `state_update` snapshot to that room
- Remove disconnected players from memory in a simple first-pass way

Important:
- This is not final room lifecycle logic yet.
- The goal is a working event loop and clean service boundaries, not complete gameplay.

### 6.5 Register first Socket.IO handlers

Handle:
- socket connection
- `join_room`
- disconnect

Validation rule:
- Parse `join_room` payload with shared Zod schema
- On invalid payload, emit `error`
- On valid payload, call `RoomService`, join socket room, emit `state_update`

### 6.6 Acceptance criteria

- `npm run dev -w apps/server` starts the backend
- `GET /health` returns a success payload
- A Socket.IO client can connect
- Sending `join_room` with valid data returns a `state_update`
- Sending invalid payload returns an `error`

---

## 7. Phase 5 — Frontend App Skeleton

### 7.1 Create `apps/web`

Create:

```txt
apps/web/
  index.html
  src/
    app/
      App.tsx
      router.tsx
      styles/
        globals.css
    pages/
      HomePage/
        HomePage.tsx
        HomePage.module.css
      LobbyPage/
        LobbyPage.tsx
        LobbyPage.module.css
    services/
      socket/
        socketClient.ts
    main.tsx
  package.json
  tsconfig.json
  vite.config.ts
```

### 7.2 Install frontend dependencies

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

### 7.3 Build first UI screens

Home page:
- Display TuneTrack name and short one-line description
- Provide a room code input
- Provide a player name input
- Provide a Join Room button

Lobby page:
- Display connection status
- Display room code
- Display player list from latest `state_update`
- Display which player is host
- No game-start logic yet unless server support is already ready

### 7.4 Add first Socket.IO client service

Implement:
- Connect to backend URL from env config
- Emit `join_room`
- Listen for `state_update`
- Listen for `error`
- Provide basic connect/disconnect status to UI

Suggested frontend env var:
- `VITE_SERVER_URL`

### 7.5 UI rules for this iteration

- Keep design clean and mobile-first, but do not spend time on final visual polish yet
- No complex timeline animations in Iteration 01
- No gameplay card-drag implementation yet
- Focus on proving routing + socket connection + state rendering

### 7.6 Acceptance criteria

- `npm run dev -w apps/web` starts the Vite app
- Home page lets a user enter a room code and display name
- Submitting join navigates to a lobby-like view
- Lobby view can display server-sent room state
- Connection errors are visible in the UI

---

## 8. Phase 6 — First End-to-End Check

### 8.1 Manual verification checklist

Run:
- backend dev server
- frontend dev server

Then verify:
- Browser loads the web app
- User can enter a room code and name
- Client connects to Socket.IO server
- Server accepts `join_room`
- Lobby receives and renders `state_update`
- Opening a second browser tab with the same room code adds another player
- Disconnecting one tab updates room state in the remaining tab, if implemented in this iteration

### 8.2 Automated verification checklist

Run:
- root `npm run typecheck`
- root `npm run test`
- root `npm run lint`

Expected minimum:
- Game-engine placement tests pass
- Shared package compiles
- Server package compiles
- Web package compiles

---

## 9. Phase 7 — Documentation and Cleanup

### 9.1 Update docs

Update or create docs covering:
- How to install dependencies
- How to run frontend and backend in dev mode
- Current workspace structure
- Current implemented socket events
- Any intentionally deferred decisions

### 9.2 Track open architecture decisions

Create a short decision log for unresolved topics:
- Host disconnect behavior
- Reconnect/session identity strategy
- Room code generation rules
- Equal release-year placement rule
- Deck source format for MVP seed data

### 9.3 Acceptance criteria

- A new contributor can run the project from README/docs
- Deferred decisions are explicitly listed instead of hidden in code
- No temporary files or build artifacts are committed

---

## 10. Definition of Done for Iteration 01

Iteration 01 is done when all of these are true:
- Monorepo workspace structure exists
- Frontend app starts
- Backend server starts
- Shared contracts package exists and is used by server/client
- Game-engine package exists and has passing placement tests
- At least one basic room-join flow works over Socket.IO
- Root scripts support dev/build/test/lint/typecheck
- Documentation explains how to run the current system

---

## 11. Explicit Non-Goals for Iteration 01

Do not spend time on these yet:
- Final timeline drag-and-drop UX
- Challenge mechanic UI
- Token economy UI
- Spotify integration
- Database persistence
- Authentication/accounts
- PWA installation polish
- Production deployment

These belong after the foundation is stable.

---

## 12. Recommended First Coding Task

Start with:
1. Create root npm workspace config and TypeScript base config
2. Scaffold `packages/shared` and define the first event/type contracts
3. Scaffold `packages/game-engine` and implement the first placement rule tests

That gives us the safest first slice because it locks the protocol and core rules before UI complexity grows.

---

# End of Iteration 01 Foundation Plan
