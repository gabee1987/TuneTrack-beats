---
name: write-tests
description: Write or fix Vitest tests for TuneTrack in the right layer with the shared harness (engine, server orchestration, realtime boundary, web selectors/components/coordinators), fake timers only, placeholder fixtures. Use when adding tests, when a bug fix needs a failing test first, or when a test is flaky.
---

# write-tests

Rules: `CLAUDE.md` → Testing; `docs/rules/backend_engineering_rules.md` §15;
`docs/rules/frontend_engineering_rules.md` §12; test-quality rules in
`docs/plans/2026-10-project-review/19-testing-strategy.md` §9.

## 1. Which layer, which file

| Behaviour under test                              | Workspace / location                               | Pattern file                                                 |
| ------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Placement, challenge, reveal, turn order, removal | `packages/game-engine/tests/*.test.ts`             | `tests/gameFlow.test.ts`                                     |
| Payload schema bounds                             | `packages/shared/src/events/schemas.test.ts`       | same file                                                    |
| Room lifecycle, reconnect, host transfer, timers  | `apps/server/tests/rooms/*.test.ts`                | `tests/rooms/disconnectLifecycle.test.ts`                    |
| Handler parsing, acks, `requestId` replay         | `apps/server/tests/realtime/*.test.ts`             | `tests/realtime/createSocketHandler.test.ts`                 |
| Public-state mapping, hidden fields               | `apps/server/tests/rooms/roomStateMappers.test.ts` | same file                                                    |
| Spotify module                                    | `apps/server/tests/spotify/*.test.ts`              | `tests/spotify/SpotifyPlaybackSessionStore.test.ts`          |
| Pure selector / detector / view-model             | beside the file, `*.test.ts`                       | `pages/LobbyPage/lobbyHeaderSelectors.test.ts`               |
| Component behaviour                               | beside the component, `*.test.tsx`                 | `features/app-shell/AppShellMenu.test.tsx`                   |
| Connection hook / coordinator with timers         | beside the hook                                    | `pages/GamePage/hooks/HostPlaybackProvider.gesture.test.tsx` |
| Repository-wide invariant                         | `apps/web/src/test/guards/*.test.ts`               | `noHardcodedColors.test.ts` (ratchet)                        |

Server tests mirror `src/` under `tests/`; a few older root-level files
(`challengeFlow.test.ts`, `ttActions.test.ts`, `hostTransfer.test.ts`) stay where they are.

## 2. Harness — never hand-roll these

Web (`apps/web/src/test/`):

- `renderWithProviders(ui, { layout, route, withRouter })` — I18n, loading, toast providers +
  `MemoryRouter`; sets the viewport so `usePageLayoutMode` resolves.
- `fakeSocket.ts` — `createFakeSocket`, `getSharedFakeSocket`, `resetSharedFakeSocket`,
  `socketClientMockForSharedSocket` for `vi.mock("…/services/socket/socketClient", …)`.
- `fakeSpotifyPlayer.ts` — `createFakeSpotifyPlayer`, `installFakeSpotifySdk`.
- `roomStateFixtures.ts` — `TEST_ROOM_ID`, `TEST_HOST_ID`, `TEST_GUEST_ID`, `buildPlayer`,
  `buildTrackCard`, `buildTimelineCard`, `buildRoomSettings`, `buildLobbyRoomState`,
  `buildTurnRoomState`, `buildChallengeRoomState`, `buildRevealRoomState`,
  `buildFinishedRoomState`.
- `vitest.setup.ts` installs storage, matchMedia, observers, viewport and element-rect stubs
  and resets them after each test; do not re-stub them in a file.

Server: `apps/server/vitest.setup.ts` sets the Spotify env. Rooms-level tests use
`createTestRoomCore({ reconnectGracePeriodMs, … })` (`tests/support/roomCore.ts`, env durations
unless overridden), as `disconnectLifecycle.test.ts` does; service-level tests use
`createTestRoomServices({ apiClient, tokenStore, spotify })` (`tests/support/roomServices.ts`).
Socket tests use `apps/server/tests/support/`:

- `socketTestServer.ts` — `startSocketTestServer`, `connectTestClient`,
  `createSocketTestServices({ deck, reconnectGracePeriodMs })`; teardown closes everything and
  clears room timers.
- `waiters.ts` — `nextEvent`, `waitForStateUpdate`, `waitForRoomList`: bounded, and a timeout
  names the awaited event.
- `roomFixtures.ts` — `createRoomAsHost`, `openTwoPlayerLobby`, `startGame`, `sendTwice` +
  `expectAppliedOnce` for `requestId` replay.
- `decks.ts` — `buildYearDeck`, `fourDecadeDeck`, `turnOrderDeck`; no private deck literals.

Engine: plain objects, no mocks.

## 3. Rules that make tests cheap to keep

- **Behaviour, not implementation.** Query by role and accessible name
  (`getByRole("button", { name: "Start Game" })`), never by class.
- **No markup snapshots.** Snapshots only for pure data transformations.
- **One reason to fail per test**; the name states the behaviour.
- **Deterministic time.** `vi.useFakeTimers()` + `vi.advanceTimersByTime()` in a
  `try/finally` that restores real timers. No `setTimeout` sleeps, no `waitFor` polling a
  timer you could advance.
- **Placeholder data only:** `TEST_ROOM_1`, `Player One`, `player-host`, `12345`,
  `spotify:track:TEST…`. No real names, hostnames, account ids.
- **Hidden information is asserted absent**: mapping tests check `releaseYear` is missing
  during `turn` and `challenge`.
- **Bug fix = failing test first.** Write the test, watch it fail with the reported symptom,
  then fix; mention both runs in the report.
- **Guards are ratchets.** Fixing a listed file means removing it from `PENDING_MIGRATION`;
  adding to an allowlist is never allowed.

## 4. Run

```
npm exec -w @tunetrack/web -- vitest run <file>
npm exec -w @tunetrack/server -- vitest run <file>
npm exec -w @tunetrack/game-engine -- vitest run <file>
```

Then `/verify` at the matching scope. Report the test count before and after.
