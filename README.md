# TuneTrack Beats

TuneTrack Beats is a real-time multiplayer music party game: players place songs on a
timeline by release year. It is mobile-first, runs in the browser with no install, and the
server is the single source of truth for every room.

## Project structure

```txt
apps/
  web/             # React + Vite frontend (PWA)
  server/          # Express + Socket.IO backend
  e2e/             # Playwright scenarios against a fake Spotify server
packages/
  shared/          # Shared contracts, event names, Zod schemas, constants
  game-engine/     # Framework-independent gameplay rules
docs/              # Start at docs/README.md: rules, live plan, operations, archive
```

## Local development

Prerequisites: Node.js 20+, npm 10+.

```bash
npm install
npm run dev          # builds packages/shared and packages/game-engine, then starts server + web
```

- Web app: `http://localhost:5173`
- Backend health: `http://localhost:3001/health`
- Spotify features need the variables in `apps/server/.env.example` copied to
  `apps/server/.env` with your own development app values.

`packages/shared` and `packages/game-engine` are consumed from `dist/` at runtime. After
editing either package, rebuild it (`npm run build -w @tunetrack/shared`) before running the
server or the E2E suite; `npm run dev` and `npm run e2e` do this automatically.

## Commands (repo root)

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run e2e          # Playwright, builds server and web first
npm run e2e:headed
npm run format       # Prettier, includes markdown
```

Run one workspace directly with `-w`, for example `npm run dev -w apps/web`.

## Documentation

- [docs/README.md](docs/README.md) — the index: what is normative, what is live, what is archived.
- [CLAUDE.md](CLAUDE.md) — product, game and engineering rules every change must follow.
- [Live plan](docs/plans/2026-10-project-review/00-index.md) — the review programme and its work breakdown.
