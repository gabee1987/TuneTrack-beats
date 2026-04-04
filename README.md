# TuneTrack Beats

TuneTrack Beats is a real-time multiplayer music party game where players place
songs into a timeline based on their release date. Built with a mobile-first,
browser-based experience and smooth, interactive gameplay.

## Vision

TuneTrack Beats aims to create a frictionless digital party-game experience that
feels tactile, social, and easy to start from any browser.

Core product goals:
- zero-install browser gameplay
- mobile-first party UX
- realtime multiplayer rooms
- server-authoritative game state
- timeline-based music guessing gameplay
- extensible playback and storage architecture

## Tech Stack

Frontend:
- React
- TypeScript
- Vite
- Framer Motion
- Socket.IO Client
- Zustand
- CSS Modules

Backend:
- Node.js
- TypeScript
- Express
- Socket.IO
- Zod
- Pino

Shared/domain:
- npm workspaces monorepo
- shared DTO/event/schema package
- framework-independent game-engine package

Testing/tooling:
- Vitest
- ESLint
- Prettier

## Project Structure

```txt
apps/
  web/             # React/Vite frontend
  server/          # Express + Socket.IO backend
packages/
  shared/          # Shared DTOs, event names, schemas, constants
  game-engine/     # Framework-independent gameplay rules
docs/              # Architecture docs, implementation plans, decision log
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+

### Install Dependencies

```bash
npm install
```

### Start The App

Start frontend and backend together from the repo root:

```bash
npm run dev
```

Open the web app:

```txt
http://localhost:5173
```

Backend health endpoint:

```txt
http://localhost:3001/health
```

### Useful Commands

Run all validation commands from the repo root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Run one workspace directly:

```bash
npm run dev -w apps/web
npm run dev -w apps/server
```

## Development Principles

- Keep game rules in `packages/game-engine`, not in React components or Socket.IO
  handlers.
- Keep shared event names, payload types, and validation schemas in
  `packages/shared`.
- Treat the server as the source of truth for room/game state.
- Prefer small, feature-scoped commits.
- Validate external input with Zod at backend boundaries.
- Keep the UI mobile-first and touch-friendly.

## Realtime Event Contract

Primary client to server events:
- `join_room`
- `update_room_settings`

Primary server to client events:
- `player_identity`
- `state_update`
- `error`

Shared event names and payload contracts live in `packages/shared`.

## Documentation

- [Full architecture](docs/tunetrack_full_architecture.md)
- [Technical implementation plan](docs/tunetrack_technical_implementation_plan.md)
- [Iteration 01 foundation plan](docs/iteration_01_foundation_plan.md)
- [Decision log](docs/decision_log.md)
