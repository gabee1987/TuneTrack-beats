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
  `TEST_DECK_RANDOM_VALUE=0.25`) and `vite preview` on `https://127.0.0.1:4173`. Chromium
  only, serial (`fullyParallel: false`), 30 s per test, trace retained on failure.
- `pretest:e2e` builds server and web; packages are built through the server's `prebuild`.
- The backend uses `apps/server/src/decks/test-decks/default-test-deck.json`; the fake Spotify
  playlist is `TESTPLAYLIST1234567890` with ten `E2E_TRACK_n` tracks (1980–1989).
- Every test must end with the fake server reporting `{ unexpectedRequests: [] }`; the shared
  `test.afterEach` already does this. A new Spotify call needs a route in
  `fake-spotify-server.mjs`, not a relaxed assertion.

## 2. Reuse the helpers in `tests/room-entry.spec.ts`

| Helper                                         | Does                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `createNamedPage(browser, name)`               | new context with a fake `window.Spotify.Player`, `tunetrack.language=en` and a saved player profile |
| `hostRoom(page)`                               | `/play` → "Host a game" → returns the room code from `/lobby/<code>`                                |
| `expectLobbyPlayers`, `expectLobbyPlayerCount` | lobby roster assertions by role `listitem`                                                          |
| `expectGamePage(page, roomId)`                 | URL `/game/<code>` and the leaderboard button                                                       |
| `moveCurrentCardAfterTimelineCard(page)`       | mouse-driven drag (`mouse.move/down/move/up`) of the current card                                   |
| `escapeRegex`                                  | for `getByRole("button", { name: new RegExp(roomId) })`                                             |

Always open **two contexts** (host and guest), run the flow, and close both in `finally`.
Display names are placeholders (`"Host Player"`, `"Guest Player"`).

## 3. Writing the scenario

- Name the test for the behaviour: "an offline guest stays in the game while the host manually
  skips their turn". One scenario, one reason to fail.
- Drive the UI by role and accessible name; never by CSS class or text that is only in `hu`.
- Simulate network loss with `context.setOffline(true)`; wait for the shortened grace periods
  with `expect(...).toBeVisible({ timeout })`, never with `page.waitForTimeout`.
- Deck and years are deterministic (`TEST_DECK_RANDOM_VALUE`), so a "correct" versus "wrong"
  placement can be chosen on purpose; see the two placement tests for the slot logic.
- Do not add a third browser project or a mobile emulation project without updating
  `19-testing-strategy.md` §3 — Chromium-only is a recorded open item, not an oversight.

## 4. File placement

The single spec is 848 lines and scheduled to be split (`19-testing-strategy.md` §3). Put a
new scenario in a new file under `tests/` named after the flow (`tests/<flow>.spec.ts`) and
move the helpers it needs into `tests/helpers/` with a plain re-export so the old spec keeps
working. Do not grow `room-entry.spec.ts` further.

## 5. Run and report

```
npm run e2e                        # all, headless
npx playwright test -c apps/e2e tests/<flow>.spec.ts
npm run e2e:headed                 # debugging only
```

Report the scenario names that ran and the trace path for any failure. Follow with
`/plan-status` to record the new proof against the defect or phase it covers.
