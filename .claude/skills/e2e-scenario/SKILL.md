---
name: e2e-scenario
description: Add or change a Playwright end-to-end scenario in apps/e2e against the fake Spotify server (two-browser host/guest setup, placeholder profiles, shortened grace periods, unexpected-request assertion). Use when a user-visible flow changes or a defect needs an E2E regression test.
---

# e2e-scenario

Rules: `CLAUDE.md` → Testing (E2E covers create, join, place, challenge, reveal, win,
recovery); `docs/plans/2026-10-project-review/19-testing-strategy.md` §9.

## 1. Harness facts (`apps/e2e/`)

- `playwright.config.ts` starts three servers: `fake-spotify-server.mjs` on `3102`, the built
  backend on `3101` (`NODE_ENV=test`, `HOST_TRANSFER_GRACE_MS=5000`,
  `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS=2000`, `MAX_ACTIVE_ROOMS=20`,
  `TEST_DECK_RANDOM_VALUE=0.25`) and `vite preview` on `https://127.0.0.1:4173`.
- Projects `chromium` (Desktop Chrome), `webkit` (Desktop Safari) and `mobile` (iPhone 13,
  WebKit). One worker: every spec shares one backend with timed grace periods. 30 s per test,
  trace retained on failure.
- `pretest:e2e` builds server and web; `posttest:e2e` runs `scripts/check-e2e-budget.mjs`,
  which fails when a project's tests add up to more than 4 minutes.
- The backend uses `apps/server/src/decks/test-decks/default-test-deck.json`; the fake Spotify
  playlist is `TESTPLAYLIST1234567890` with ten `E2E_TRACK_n` tracks (1980–1989).
- A room whose every player is offline closes after 2 s here. A test that takes its only player
  offline loses the room on a slow run; keep a second player online.

## 2. Fixtures and helpers (`tests/support/`)

Import `test` and `expect` from `./support/fixtures`, never from `@playwright/test`.

| Helper                                        | Does                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `openPlayer(name)` fixture                    | context with the fake Spotify SDK, `en` and a saved profile; auto-closed |
| `openRoom({ host, guest })` fixture           | hosted lobby the guest joined from the live directory                    |
| auto fixture                                  | asserts the fake Spotify server saw `{ unexpectedRequests: [] }`         |
| `hostRoom`, `joinFromDirectory`, `startGame`  | room flow (`roomPages.ts`)                                               |
| `expectLobbyRoster`, `expectLobbyPlayerCount` | roster by `listitem`; the viewer is "You" on both layouts                |
| `expectHeaderStatus`, `openGameMenu`          | turn status (hidden on a phone) and the game page's own menu button      |
| `moveCurrentCardAfterTimelineCard`            | mouse drag (`timeline.ts`); touch drag after `05` C3                     |
| `expectRoomClosedOnServer(roomId)`            | socket probe for "the server closed this room" (`roomProbe.ts`)          |

## 3. Writing the scenario

- Name the test for the behaviour: "an offline guest stays in the game while the host manually
  skips their turn". One scenario, one reason to fail.
- Drive the UI by role and accessible name; never by CSS class or text that is only in `hu`.
  The phone and desktop assemblies differ; a helper that works on both beats a project check.
- Simulate network loss with `context.setOffline(true)`; wait on the state, never with
  `page.waitForTimeout` or a timer.
- Deck and years are deterministic (`TEST_DECK_RANDOM_VALUE`), so a "correct" versus "wrong"
  placement can be chosen on purpose; see `gameplay.spec.ts`.
- A case blocked by a known defect gets `test.fixme(<project condition>, "B<n>: …")` and the
  defect a row in `20-bug-register.md`; never weaken the assertion instead.

## 4. File placement

One file per family: `lobby`, `gameplay`, `challenge`, `resilience`, `navigation`,
`hints`, `connection-status`, `session-identity`. Shared steps go to `tests/support/`.

## 5. Run and report

```
npm run e2e                                          # all projects, then the budget check
npx playwright test -c apps/e2e tests/<file>.spec.ts --project=chromium
npm run e2e:headed                                   # debugging only
```

Report the scenario names that ran, per-project durations from the budget check, and the
trace path for any failure. Follow with `/plan-status`.
