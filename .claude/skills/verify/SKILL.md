---
name: verify
description: Run the TuneTrack green gate (typecheck, lint, unit tests, optional E2E) with the right scope and the build-before-run trap handled. Use before reporting any code change as done, or when asked to "verify", "run the tests" or "check everything".
---

# verify — the green gate

Normative source: `CLAUDE.md` → Testing and Working Agreement. This skill only says _how_ to
run the gate without wasting tokens.

## 1. Pick the scope first

| Changed                                              | Run                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| One workspace, no `packages/*` change                | that workspace's `typecheck`, `lint`, `test` (step 3)              |
| `packages/shared` or `packages/game-engine`          | build both packages (step 2), then **every** workspace (step 4)    |
| Realtime, navigation, overlay or room-lifecycle flow | step 4 **plus** `npm run e2e` (step 5)                             |
| Docs only (`*.md`)                                   | `npx prettier --check <files>` and a relative-link check; no tests |

Start with the narrowest command that proves the change, then broaden.

## 2. The build-before-run trap

`@tunetrack/shared` and `@tunetrack/game-engine` resolve `types` to `src` but runtime
`default` to `dist`. Vitest aliases `src` directly (`apps/web/vitest.config.ts`,
`apps/server/vitest.config.ts`), so unit tests do **not** need a build. The server runtime,
`vite build` and Playwright do. After changing either package run:

```
npm run build -w @tunetrack/shared
npm run build -w @tunetrack/game-engine
```

`npm run dev`, `npm run build -w @tunetrack/server` and `npm run e2e` do this automatically
through `predev`, `prebuild` and `pretest:e2e`.

## 3. Single workspace

```
npm run typecheck -w @tunetrack/web      # or @tunetrack/server, @tunetrack/game-engine, @tunetrack/shared
npm run lint -w @tunetrack/web
npm run test -w @tunetrack/web
```

Single file while iterating (no build needed):

```
npm exec -w @tunetrack/web -- vitest run src/path/to/file.test.tsx
npm exec -w @tunetrack/server -- vitest run tests/rooms/RoomStore.test.ts
npm exec -w @tunetrack/game-engine -- vitest run tests/turnFlow.test.ts
```

Paths are relative to the workspace. Run from the workspace, never with `--config` from the
root: the server setup file and the web guard tests resolve paths from the working directory.

Server tests live under `apps/server/tests/` mirroring `src/` (`tests/rooms/`,
`tests/realtime/`, `tests/spotify/`, `tests/decks/`); web tests sit beside the source file;
engine tests under `packages/game-engine/tests/`.

## 4. Whole repository

```
npm run verify   # format, size, typecheck, lint (max 17 web warnings), tests with coverage
```

Baseline on 2026-10-10: 1 089 tests (server 271, web 511, engine 93, shared 214); coverage
thresholds sit in each `vitest.config.ts` and may only rise. A drop in the
count without a deleted test file is a finding, not noise.

## 5. E2E (Chromium only)

```
npm run e2e            # headless; builds server + web first
npm run e2e:headed     # for debugging
```

Facts from `apps/e2e/playwright.config.ts`: fake Spotify server on `127.0.0.1:3102`, backend
on `3101`, Vite preview on `https://127.0.0.1:4173` (self-signed, HTTPS errors ignored,
service workers blocked). Grace periods are shortened (`HOST_TRANSFER_GRACE_MS=5000`,
`ALL_PLAYERS_OFFLINE_ROOM_TTL_MS=2000`). Every test ends by asserting the fake Spotify server
saw no unexpected request. Traces are kept on failure under `apps/e2e/test-results/`.

If a port is busy, a previous run is still alive: stop it, do not change the ports.

## 6. Report

State exactly what ran and what it returned. Paste failing output verbatim in a code block.
Never say "green" for a command that did not run; say which scope was skipped and why.
Do not stage or commit anything — git is the owner's job.
