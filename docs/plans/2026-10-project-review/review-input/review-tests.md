# TuneTrack-beats — Test Suite, Tooling and Developer Workflow Review

Date: 2026-10-06. Branch `fix/stability-hardening`. Read-only review; suites were not run
here. Counts are from `grep` of `it(`/`test(` openers and are approximate (±5 %).
All paths are relative to `C:\Coding\TuneTrack-beats`.

---

## 1. Inventory

| Workspace              | Files | Tests (approx.) | Kind                                                                        |
| ---------------------- | ----: | --------------: | --------------------------------------------------------------------------- |
| `packages/game-engine` |     2 |              31 | Pure unit (`tests/gameFlow.test.ts`, `tests/placementRules.test.ts`)        |
| `packages/shared`      |     1 |               2 | Pure unit (`src/events/schemas.test.ts`)                                    |
| `apps/server`          |    23 |            ~137 | Unit + real Socket.IO integration (`tests/roomFlow.test.ts`)                |
| `apps/web`             |    59 |            ~230 | 40 pure-function files, 19 RTL component/hook files (`.test.tsx`), 3 guards |
| `apps/e2e`             |     1 |              16 | Playwright, Chromium only, two browser contexts                             |
| **Total**              |    86 |            ~415 |                                                                             |

Doc 11 section 1 baseline was 47 files / 240 tests; the suite has grown by ~39 files and
~175 tests since, essentially all of it in the directions Doc 11 asked for.

Note: the task brief mentioned two large E2E spec files; only one exists
(`apps/e2e/tests/room-entry.spec.ts`, 848 lines, 16 tests).

### jsdom + React Testing Library

Wired and working.

- `apps/web/vitest.config.ts:14-23` — `environment: "jsdom"`, `setupFiles`, `globals: false`,
  `pool: "threads"`, source aliases for `@tunetrack/shared` and `@tunetrack/game-engine`.
  One environment for all files (the comment at lines 19-21 explains why
  `environmentMatchGlobs` was rejected). `css: true` from Doc 11 section 3.1 is **not** set;
  CSS-module class names therefore resolve to `undefined` in tests
  (`TimelinePanel.test.tsx:60-66` works around exactly this).
- `apps/web/vitest.setup.ts` — jest-dom matchers, `cleanup()` in `afterEach`, stubs for
  element rects, `matchMedia`, `ResizeObserver`/`IntersectionObserver`, storage (with a
  throwing variant), `visualViewport`, sequential `crypto.randomUUID`, `scrollIntoView`,
  `HTMLMediaElement.play/pause/load`.
- `apps/web/src/test/` — `renderWithProviders.tsx` (I18n + AppLoading + AppToast +
  MemoryRouter; **no** `OverlayProvider`, which does not exist in the codebase),
  `fakeSocket.ts` (241 lines, full Socket.IO double incl. `emitWithAck`, reconnect, ack
  queue), `fakeSpotifyPlayer.ts` (198 lines, both end-of-track shapes, blockable
  `activateElement`), `roomStateFixtures.ts` (placeholder-only builders per phase),
  `harness.test.tsx` (16 self-tests of the harness).
- Component tests exist: 19 `.test.tsx` files. Coverage of the _shared_ UI is almost nil
  (see section 2).

### Coverage thresholds

None. No `coverage` key in any vitest config; `@vitest/coverage-v8` is not installed
(`node_modules/@vitest/` contains only `expect, mocker, pretty-format, runner, snapshot,
spy, utils`). `coverage/` is already in `.gitignore:14`.

### CI

None. `.github/` does not exist. No other CI config found. `apps/e2e/playwright.config.ts:9`
already branches on `process.env.CI` for reporters, so the config is CI-ready.

---

## 2. Coverage gaps by risk

Legend: **Yes** = covered with a named file; **Partial** = exercised indirectly or thinly;
**No** = no test found.

### Game engine (`CLAUDE.md`: deepest tests)

| Critical path           | Status  | Evidence                                                                                                                                                                                                                                                                 |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Placement correctness   | Yes     | `packages/game-engine/tests/placementRules.test.ts:11-47` (before/after/between/wrong/same-year), `gameFlow.test.ts:155-245`                                                                                                                                             |
| Challenge outcomes      | Yes     | `gameFlow.test.ts:315-596, 862` (open window, first-claim wins, no-TT reject, success + TT award, failure + TT deduct, never below 0, duplicate-slot reject, nobody claims)                                                                                              |
| Turn progression        | Yes     | `gameFlow.test.ts:215-303` (discard + advance, pass interrupted turn, manual skip, unknown player, reveal outside phase)                                                                                                                                                 |
| Same-year edge cases    | Partial | Only `placementRules.test.ts:47` ("every slot inside a same-year block"). No same-year test through `GameFlowService`/`ChallengeFlowService` (e.g. challenger picks a different slot inside the same-year block — both correct; `revealState.validSlotIndexes` content). |
| TT actions              | Yes     | `gameFlow.test.ts:596-862` (award cap 5, skip once per turn, buy for 3 TT, buy reaches target)                                                                                                                                                                           |
| Deck exhaustion         | No      | `gameFlowHelpers.ts:39` enforces a minimum deck at start; no test for the deck running out mid-game or for what `TurnFlowService` does when `drawCard` has nothing left.                                                                                                 |
| Player removal mid-turn | Partial | `gameFlow.test.ts:615` removes a player; removing the _active_ player or the _challenger_ during a challenge window is untested at engine level.                                                                                                                         |

`ChallengeFlowService.ts` (258 lines), `TurnFlowService.ts` (268) and `TtActionService.ts`
(142) are all tested only through the `GameFlowService` facade — acceptable, but the
engine's 31 tests is the same number Doc 11 recorded; the target of ~90 has not moved.

### Server orchestration

| Critical path     | Status  | Evidence                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Room lifecycle    | Yes     | `apps/server/tests/roomFlow.test.ts` (create, join, rename, settings, close, kick, room limit, directory push), `rooms/RoomLobbyService.test.ts`, `rooms/RoomStore.test.ts`, `rooms/roomCodeGenerator.test.ts`                                                                                              |
| Reconnect         | Yes     | `roomFlow.test.ts:162, 281, 383, 436, 465, 1029` (lobby + in-game identity restore, stale-socket drop), `hostTransfer.test.ts:82-157`, `rooms/disconnectLifecycle.test.ts` (all-offline TTL, cancel on reconnect)                                                                                           |
| Host transfer     | Yes     | `hostTransfer.test.ts` (30 s default, lobby no-auto-transfer, manual transfer rejects), `roomFlow.test.ts:529`, `rooms/playbackHandoff.test.ts`                                                                                                                                                             |
| Authorization     | Partial | Non-host rejects: `hostTransfer.test.ts:241`, `playlistMetadata.test.ts:70`, `gameFlow.test.ts:155, 802`. No systematic matrix: non-member sockets emitting gameplay events, non-active player `place_card` at the socket boundary, host-only `skip_turn`/`award_tt`/`kick` by a guest at the socket layer. |
| Timer resolution  | Yes     | `challengeFlow.test.ts:295-351` (auto-resolve after deadline, owner can place after original timer), `hostTransfer.test.ts:6`, `disconnectLifecycle.test.ts`. `ChallengeTimerManager`, `DisconnectTimerManager`, `RoomTimerCoordinator` are never imported directly — covered only through `RoomRegistry`.  |
| State mapping     | Yes     | `rooms/roomStateMappers.test.ts` (15 tests: year hidden in turn/challenge, present in reveal/finished, history cap, skip deadline reset)                                                                                                                                                                    |
| Idempotent replay | Yes     | `roomFlow.test.ts:646, 867, 1377, 1454` replay every mutating action once                                                                                                                                                                                                                                   |
| Room leak guard   | No      | Doc 11 section 6 asked for `afterEach` asserting `roomCount === 0`; no test references `roomCount`.                                                                                                                                                                                                         |
| Env / bootstrap   | Partial | `app/applyLocalEnvFile.test.ts`, `clientOrigin.test.ts`. `app/env.ts` (Zod env schema incl. the `NODE_ENV=test` guard for Spotify overrides at `env.ts:89-99`), `createSocketServer` options, `index.ts` shutdown: **No**.                                                                                  |
| HTTP routes       | No      | `http/healthRoutes.ts`, `http/spotifyRoutes.ts` (OAuth callback) untested; `supertest` is a devDependency but no test imports it.                                                                                                                                                                           |

### Realtime boundary

| Critical path           | Status  | Evidence                                                                                                                                                                                                                        |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema validation       | Partial | `realtime/createSocketHandler.test.ts:115, 186` (invalid payload → ack + compat error). `packages/shared/src/events/schemas.test.ts` tests **1 of 35** schemas (`createRoomPayloadSchema`). Doc 11 targeted ~40 contract tests. |
| Event-to-service wiring | Partial | `roomFlow.test.ts` drives ~20 of the client events end-to-end through `registerSocketHandlers`. No test imports `handlers/*.ts` directly; `spotifyHandlers.ts` (340 lines) has one indirect test (`roomFlow.test.ts:1758`).     |
| Client-safe errors      | Yes     | `createSocketHandler.test.ts:35-83, 240`                                                                                                                                                                                        |
| Broadcasts              | Yes     | `roomFlow.test.ts:49, 111` (directory only to sockets outside rooms; expiry push), state broadcasts asserted throughout `roomFlow`                                                                                              |
| Rate limiting           | n/a     | No `rateLimit`/`RATE_LIMITED` anywhere in `apps/server/src` or `packages/shared/src`; Doc 11's `rateLimit.test.ts` has nothing to test yet.                                                                                     |

### Spotify (server)

| Module                                                                             | Status | Evidence                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SpotifyApiClient`                                                                 | Yes    | `tests/spotify/SpotifyApiClient.test.ts` (6)                                                                                                                                                                             |
| `SpotifyTrackMapper`                                                               | Yes    | `tests/spotify/SpotifyTrackMapper.test.ts` (11)                                                                                                                                                                          |
| `spotifyUrlParser`, `spotifyRedirectUri`                                           | Yes    | 10 + 4 tests                                                                                                                                                                                                             |
| `SpotifyPlaybackSessionStore`, `playTrackOnHostDevice`                             | Yes    | 3 + 2 tests                                                                                                                                                                                                              |
| `PlaylistImportService`                                                            | Yes    | `tests/decks/PlaylistImportService.test.ts` (7, incl. 403/404 mapping, dedupe, token cache)                                                                                                                              |
| `SpotifyAuthService`                                                               | **No** | Only constructed in `roomFlow.test.ts:1788`. OAuth `state` single-use, expiry, premium/free detection, error mapping untested.                                                                                           |
| `SpotifyTokenStore`                                                                | **No** | Only constructed. No `encrypt`/`cipher`/`crypto` in the file — tokens are held in plain memory; Doc 11's `spotifyCredentialStore.test.ts` presumes an encrypted store that does not exist. Flag for the security review. |
| `SpotifyDiscoveryService`, `SpotifyMusicSearchService`, `SpotifySmartSearchParser` | **No** | Not referenced by any test.                                                                                                                                                                                              |
| `http/spotifyRoutes.ts`                                                            | **No** | OAuth callback route untested at unit level; exercised only by E14.                                                                                                                                                      |
| No-secrets-in-logs                                                                 | **No** | Doc 11 item not implemented.                                                                                                                                                                                             |

### Frontend

| Critical path                                                                                                                                                                                     | Status  | Evidence                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure helpers / selectors                                                                                                                                                                          | Yes     | 40 pure test files: GamePage selectors, transition detectors, lobby selectors, hint scheduler/state, theme tokens, socket `emitAction` (7), `resolveServerUrl`, session, saved playlists                                                                                                                                                           |
| Component behaviour — pages                                                                                                                                                                       | Partial | `PlayPage.test.tsx`, `LobbyPageMobile.test.tsx` (mocks 6 child components to `null`, `LobbyPageMobile.test.tsx:8-15`), `closeRoomThenStart.test.tsx`, `AppRoutes.exitingPage.test.tsx`. No `HomePage`/`GamePage` render test.                                                                                                                      |
| Component behaviour — action docks                                                                                                                                                                | Yes     | `useGamePageActions.test.tsx` renders `TurnActionDock`, `RevealActionDock`, `ChallengeActionPanel`, `TokenAdjustButtons`, `GameMenuPlayerItem` through harnesses; `ActionDock.test.tsx`, `HeaderLeadersStrip.test.tsx`, `TimelinePanel.test.tsx`                                                                                                   |
| Shared primitives (`features/ui/primitives/*`)                                                                                                                                                    | **No**  | 10 primitives (`Button`, `Dialog`, `Chip`, `IconButton`, `SegmentedControl`, …) have zero render tests. `primitives.contract.test.ts` is 11 lines asserting four token strings, not behaviour.                                                                                                                                                     |
| Shared `features/ui/*` (19 components incl. `BottomSheet`, `RoomResetModal`, `ToggleSwitch`, `RangeField`, `StatusBanner`)                                                                        | **No**  | None rendered in any test. `RoomResetModal` per recovery reason (Doc 11 3.5 item 4) is missing.                                                                                                                                                                                                                                                    |
| Overlays / app shell                                                                                                                                                                              | Partial | `AppShellMenu.test.tsx`, `AppShellMenuDialog.test.tsx`, `AppShellMenuPanels.test.tsx`; `AppLoadingOverlay`, `BottomSheet`, `Dialog` untested                                                                                                                                                                                                       |
| `PlaylistEditModal`                                                                                                                                                                               | Yes     | `pages/LobbyPage/components/PlaylistEditModal.test.tsx` (6)                                                                                                                                                                                                                                                                                        |
| Host playback hooks                                                                                                                                                                               | Yes     | `hooks/useHostPlayback.test.ts` (10, uses `fakeSocket` + `fakeSpotifyPlayer`), `HostPlaybackProvider.test.ts` (5), `HostPlaybackProvider.gesture.test.tsx` (1)                                                                                                                                                                                     |
| `useSpotifyPlaybackSdk`                                                                                                                                                                           | **No**  | SDK script loading / ready callback path untested in isolation                                                                                                                                                                                                                                                                                     |
| Lobby Spotify hooks (`useLobbySpotify`, `useSpotifyAuth`, `useSpotifyPlaylistImport`, `useSpotifyCandidates`, `useSpotifyOpenedPlaylist`, `useSpotifySmartSearch`, `useSavedPlaylistsController`) | **No**  | Only `spotifyQueueTrackIds.test.ts` (17, pure). The host's primary pre-game workflow has no hook-level tests.                                                                                                                                                                                                                                      |
| Room connection hooks                                                                                                                                                                             | Yes     | `useLobbyRoomConnection.test.ts` (10), `useGameRoomConnection.test.ts` (1), `socketClient.test.ts` (3)                                                                                                                                                                                                                                             |
| Guards                                                                                                                                                                                            | 3 of 4  | `noHardcodedColors`, `noCssBarrels`, `i18nKeyParity` present. **`zIndexScale.test.ts` missing** — and the CSS currently has 23×`z-index: 1`, plus raw `1600`, `1400`, `1200`, `1100`, `880` literals against only 5 `var(--z-*)` usages, so the guard would start red as Doc 11 intended. `i18nKeyParity` does not check `HintId` title/body keys. |
| E2E join / place / challenge / reveal                                                                                                                                                             | Yes     | `apps/e2e/tests/room-entry.spec.ts:11, 59, 92, 139` (E1, E3, E4, E5) plus E2, E6–E15 and direct-invite join                                                                                                                                                                                                                                        |

---

## 3. Test quality

### The three large files

**`apps/server/tests/roomFlow.test.ts` — 1933 lines, 23 tests.**
Structure is sound: a single `afterEach` (lines 37-47) disconnects all sockets and closes
servers; helpers at 1783-1933 (`createTestRoomService`, `startTestServer`,
`TestDeckService`, `createClient`, `waitForEvent`, `waitForStateUpdate`, `waitForRoomList`).
Problems:

- Helpers are **file-private**. `challengeFlow.test.ts:7-40`, `hostTransfer.test.ts`,
  `disconnectLifecycle.test.ts` and `ttActions.test.ts` each redefine their own
  `GameTrackCard[]` deck literal with the same "Older Song / Newer Song" shape. No
  `tests/helpers/` directory exists (grep for relative imports between test files returns
  nothing).
- Three unrelated concerns share one `describe`: lobby/directory (49-529), gameplay replay
  (646-1029), moderation (1134-1377), curated playlists (1579-1756), and a separate
  `refresh_spotify_token` describe at 1758.
- Individual tests are 100–220 lines (e.g. `646-866`), asserting start → place → replay →
  reveal → replay → advance. One failure mid-way masks the rest.
- `waitForStateUpdate` (1909) loops without a timeout; a non-matching predicate hangs until
  Vitest's 5 s default, and the failure message is a generic timeout, not "expected phase
  X". `createClient` sets `reconnection: false` and `websocket` transport — good.
- Real `reconnectGracePeriodMs = 500` wall-clock timers in most tests; only one
  `useFakeTimers` call (grep: 1 occurrence) — so several tests pay real time waiting for
  grace periods to expire.

**Split:** `tests/helpers/socketTestServer.ts` (startTestServer, createClient, waiters),
`tests/helpers/decks.ts` (one shared deterministic deck), then
`roomFlow.lobby.test.ts`, `roomFlow.gameplayReplay.test.ts`, `roomFlow.moderation.test.ts`,
`roomFlow.curatedPlaylist.test.ts`. The first two helpers also remove the four duplicated
deck literals.

**`apps/web/src/pages/GamePage/hooks/useGamePageActions.test.tsx` — 1086 lines, 14 tests.**
Lines 37-485 define **twelve** harness components (`PlacementHarness`, `RevealHarness`,
`ChallengePlacementHarness`, … `SkipTurnHarness`) each wiring the hook into one real dock
component. The 12 `describe` blocks (486-1086) each have one or two tests following the
identical "retry one timeout, block duplicate, expose final retry" pattern. This is a
retry-ladder test, written 12 times. It does use the shared `roomStateFixtures` and mocks
`emitAction` (line 25) rather than the socket — a reasonable seam. **Split:** move harnesses
to `useGamePageActions.harnesses.tsx`; keep one file per action family (placement/reveal,
challenge, moderation, TT). Better: test the retry ladder once in `emitAction`-level tests
(already 7 there) and reduce each action test to "emits the right event with the right
payload and gates the button".

**`apps/e2e/tests/room-entry.spec.ts` — 848 lines, 16 tests.**
Well-structured: shared helpers at 706-848 (`createNamedPage`, `hostRoom`,
`expectLobbyPlayers`, `expectGamePage`, `moveCurrentCardAfterTimelineCard`), every test
wrapped in `try/finally` closing contexts, `afterEach` (5-9) asserts zero unexpected fake
Spotify requests. Every test repeats the same 10-line "guest goes to /play, host hosts,
guest clicks directory room, both see 2 players, Start Game" prologue (e.g. 304-322,
407-425, 521-539). **Split** by scenario family (`room-entry`, `core-loop`, `recovery`,
`navigation`, `music-setup`) and extract a `startTwoPlayerGame(browser)` fixture via
`test.extend`. The file name `room-entry` no longer describes its content.

### Brittle patterns found

| Pattern                       | Where                                                                                                                                                                                                                                                                                                                                                  | Assessment                                                                                                                                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Real sleep                    | `apps/server/tests/hostTransfer.test.ts:67` (`setTimeout 25 ms`); `apps/web/.../useHostPlayback.test.ts:93-102` (`3 200 ms` real wait, deliberately — comment explains fake timers would pass vacuously); `apps/e2e/tests/room-entry.spec.ts:547` (`setTimeout 2 500 ms` for the 2 s room TTL) and `:297` (`waitForTimeout(2_000)` for the hint delay) | Four real sleeps. The `useHostPlayback` one adds ~3 s per test × several tests to every web run and violates Doc 11 section 9 "deterministic time"; the fix is injecting the ladder's clock. The E2E ones are acceptable but should become `expect.poll`/`toBeVisible` with timeout. |
| Fake timers                   | `challengeFlow`, `hostTransfer`, `roomFlow`, `disconnectLifecycle`, `TimelinePanel.test.tsx` — all restore in `finally`/`afterEach`                                                                                                                                                                                                                    | Good hygiene.                                                                                                                                                                                                                                                                        |
| Snapshot tests                | none                                                                                                                                                                                                                                                                                                                                                   | Good; matches Doc 11 section 9.                                                                                                                                                                                                                                                      |
| Log assertions                | none (`console`/`logger` spies: 0; `realtimeAuditLogger.test.ts` tests the correlation logic, not output)                                                                                                                                                                                                                                              | Good.                                                                                                                                                                                                                                                                                |
| `.only` / `.skip`             | none                                                                                                                                                                                                                                                                                                                                                   | Good.                                                                                                                                                                                                                                                                                |
| Implementation-detail queries | `TimelinePanel.test.tsx:60-66` counts `<strong>` nodes because CSS-module classes are undefined; `useLeaveGameGuard.test.tsx` (5 `querySelector`/testid uses); `AppShellMenuDialog.test.tsx` (2)                                                                                                                                                       | Setting `css: true` (Doc 11 3.1) or querying by role would remove the need.                                                                                                                                                                                                          |
| Shallow mocking of children   | `LobbyPageMobile.test.tsx:8-15` mocks six child components to `null`                                                                                                                                                                                                                                                                                   | Tests assembly wiring only; fine if intentional, but hides integration regressions.                                                                                                                                                                                                  |
| `vi.mock` of `socketClient`   | 9 web test files mock `../services/socket/socketClient`                                                                                                                                                                                                                                                                                                | `fakeSocket.ts` exists for this; only `harness.test.tsx`, `useHostPlayback.test.ts`, and `HostPlaybackProvider.gesture.test.tsx` actually use it. Standardising on `createFakeSocket` would delete 9 bespoke mocks.                                                                  |
| Order dependence              | none detected; Playwright `fullyParallel: false` and one spec file mean serial execution                                                                                                                                                                                                                                                               | OK, but serial E2E is slow by construction.                                                                                                                                                                                                                                          |
| Non-placeholder data          | `apps/server/vitest.setup.ts:3-4` contains a private LAN address (`192.168.1.83`) as a redirect URI                                                                                                                                                                                                                                                    | Replace with `https://localhost:5173/...` or a `TEST_LAN_HOST` placeholder.                                                                                                                                                                                                          |

### Fixture sharing

- Web: good. `roomStateFixtures.ts` used by 9 files; `fakeSpotifyPlayer` by 3;
  `renderWithProviders` by only 2 (most component tests hand-roll `<I18nProvider>` +
  `MemoryRouter`, e.g. `TimelinePanel.test.tsx:52-58`, `LobbyPageMobile.test.tsx`).
- Server: none. Zero cross-file imports between tests; four deck literals duplicated.
- Engine: `gameFlow.test.ts` builds its own fixtures at lines 1-67.

---

## 4. E2E harness

**Boot sequence** (`apps/e2e/playwright.config.ts:17-62`): three `webServer` entries,
started by Playwright, `reuseExistingServer: false`:

1. `node apps/e2e/fake-spotify-server.mjs` on **3102** (`/health` readiness).
2. `npm run start -w @tunetrack/server` on **3101**, env: `NODE_ENV=test`,
   `CLIENT_ORIGIN=https://127.0.0.1:4173`, `HOST_TRANSFER_GRACE_MS=5000`,
   `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS=2000`, `MAX_ACTIVE_ROOMS=20`,
   `SPOTIFY_ACCOUNTS_BASE_URL`/`SPOTIFY_API_BASE_URL` → the fake on 3102,
   `SPOTIFY_REDIRECT_URI=http://127.0.0.1:3101/api/spotify/callback`,
   `TEST_DECK_RANDOM_VALUE=0.25`.
3. `vite preview --host 127.0.0.1 --port 4173 --strictPort` (HTTPS via `basicSsl`,
   `TUNETRACK_BACKEND_PROXY_TARGET=http://127.0.0.1:3101`; `apps/web/vite.config.ts:138`
   applies the same proxy to `preview`).

`pretest:e2e` (`apps/e2e/package.json:7`) runs `build` of server and web first (which in
turn `prebuild` shared/engine). `baseURL: https://127.0.0.1:4173`, `ignoreHTTPSErrors`,
`serviceWorkers: "block"`, `trace: "retain-on-failure"`, `timeout: 30 s`, expect `10 s`.

**Spotify stubbing** — three layers, all verified:

- Server side: `apps/server/src/app/env.ts:89-99` only allows the base-URL overrides when
  `NODE_ENV=test`, so the production build cannot be pointed at a fake by accident.
- `fake-spotify-server.mjs` serves canned `/accounts/authorize` (302 back with
  `E2E_AUTH_CODE`), `/accounts/api/token`, `/api/me` (premium), one playlist
  `TESTPLAYLIST1234567890` with 10 tracks (years 1980–1989); **every other request is
  recorded and answered 502** (`fake-spotify-server.mjs:76-79`), and
  `room-entry.spec.ts:5-9` asserts `unexpectedRequests: []` after every test.
- Browser side: `createNamedPage` (`room-entry.spec.ts:706-769`) injects a
  `FakeSpotifyPlayer` onto `window.Spotify` via `addInitScript` and seeds `localStorage`
  with language + a placeholder profile.

**Deterministic decks**: `TEST_DECK_RANDOM_VALUE` → `DeckService` injected random source
(`apps/server/tests/decks/DeckService.test.ts` covers the injection); deck is
`apps/server/src/decks/test-decks/default-test-deck.json`. Room codes are
server-generated and read back from the URL (`hostRoom`, 771-781) — no deterministic code
generator is injected, which is fine since tests never hard-code a code.

**Multi-client**: one `BrowserContext` per player; offline is simulated with
`context.setOffline(true/false)` (E7, E8, E10, E11) and permanent disconnect with
`context.close()` (E9, line 436). Drag (`moveCurrentCardAfterTimelineCard`, 805-844) uses
`page.mouse` with `expect.poll` on DOM order — **mouse path only**; Doc 11 section 5.4's
touch-event drag test for WebKit does not exist.

**Projects**: `chromium` with `Desktop Chrome` only (`playwright.config.ts:64-69`). No
WebKit, no mobile viewport/device emulation — despite the app being mobile-first. The
"WebKit remains open" statement in `00-index.md:4` and `11-testing-strategy.md:203` is
accurate.

**Run time**: not measured here (`test-results/.last-run.json` records only
`status: passed`). Lower bound from the config: two full app builds + three server boots +
serial execution of 16 scenarios, two of which sleep 2–2.5 s and one waits a 5 s host
transfer grace. Doc 11's 4-minute acceptance box is unchecked and cannot be verified
without a timing reporter.

**Artefacts**: `test-results/` and `playwright-report/` are in `.gitignore:49-50`;
`apps/e2e/test-results/.last-run.json` exists on disk and is untracked (verified with
`git ls-files`). HTML reporter only when `CI` is set.

---

## 5. Developer workflow

### npm scripts (`package.json:10-20`)

- `predev` builds `@tunetrack/shared` then `@tunetrack/game-engine`; `dev` runs server
  (`tsx watch src/index.ts`) and web (`vite`) concurrently.
- `build`/`test`/`lint`/`typecheck` fan out with `--workspaces --if-present`.
- `e2e`, `e2e:headed` delegate to `@tunetrack/e2e`.
- **No root `verify`**; only `apps/web/package.json:14` has
  `verify: typecheck && lint && test`. Doc 11 section 7.2 asked for the root one.
- `format: prettier --write .` — no `format:check`, no `.prettierignore`
  (`dist/` would be formatted if present; harmless but slow).

### Package resolution — the thing agents get wrong

`packages/shared` and `packages/game-engine` export `types: ./src/index.ts` and
`default: ./dist/index.js` (`packages/shared/package.json:6-13`). Consequences:

- **Typecheck does not need a build** — `tsc` follows the `types` condition into `src`.
- **Vitest does not need a build** — both app vitest configs alias to `src`.
- **Runtime does need a build** — `tsx watch` (server dev), `node dist` (server start,
  E2E) and `vite` (web dev/preview) resolve `default` → `dist`. Editing
  `packages/shared/src` while `npm run dev` is running silently serves stale contracts
  until `npm run build -w @tunetrack/shared`. Unit tests see the new code, the running
  server does not — the classic "tests pass, dev server disagrees" trap. `predev` and the
  `prebuild` hooks cover cold starts only.

### Typecheck scope (what `npm run typecheck` actually checks)

| Workspace              | `include`                                                      | Tests typechecked?                                                                                                                   |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/server`          | `src` only (`apps/server/tsconfig.json:12`)                    | **No** — 23 test files never see `tsc`                                                                                               |
| `packages/game-engine` | `src` only; `types: ["vitest/globals"]` configured but unused  | **No**                                                                                                                               |
| `packages/shared`      | `src` (test lives in `src/events/`)                            | Yes — but the test is also **compiled into `dist/`** (`packages/shared/dist/events/schemas.test.js` exists) and shipped to consumers |
| `apps/web`             | `src`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts` | Yes                                                                                                                                  |
| `apps/e2e`             | `tests`, `playwright.config.ts`                                | Yes                                                                                                                                  |

Base config (`tsconfig.base.json`) is strict: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
`isolatedModules`. Server overrides to `NodeNext` module resolution. No `paths` aliases
anywhere; packages are resolved by workspace name only.

### Lint (`eslint.config.js`)

- ESLint 9.39 flat config, `typescript-eslint` `recommended` (not type-checked), two rule
  overrides (`no-explicit-any: error`, `no-unused-vars` with `_` ignore). `--ext` on the
  workspace scripts is accepted by this ESLint version (verified: `npm run lint -w
@tunetrack/shared` exits clean).
- Scope: server `src tests`; web `src` (not `vitest.setup.ts`/configs); e2e `tests
playwright.config.ts` (not `fake-spotify-server.mjs`); engine `src tests`; shared `src`.
- **No React plugin** (`eslint-plugin-react-hooks` absent — `exhaustive-deps` is not
  enforced in a hook-heavy codebase).
- **No architecture-boundary rules.** No `no-restricted-imports`, no `import/no-restricted-paths`,
  no `eslint-plugin-boundaries`. Nothing stops `packages/game-engine` importing
  `socket.io`, `apps/web/pages/*` importing another page, `apps/web` importing `zod` or
  `@tunetrack/shared/schemas`, or Socket.IO handlers mutating decks (the `CLAUDE.md`
  "Imported-deck mutation belongs in `rooms/`" rule). Doc 11 section 4's
  `noRestrictedImports` row is unimplemented.

### Prettier

`prettier.config.js`: `printWidth: 100`, double quotes, trailing commas. No lint-staged /
husky / pre-commit hook; no `prettier --check` in any script.

### `.claude/settings.local.json`

Allows `npm run *`, `npm test *`, `npx tsc *`, `npx vitest *`, `npm install *`. Sufficient
for an agent to run the verification loop without prompts.

---

## 6. Recommendations (ranked by value)

1. **Root `verify` script + a GitHub Actions workflow.** `"verify": "npm run typecheck &&
npm run lint && npm test"` at the root (Doc 11 7.2); one workflow running
   `verify` → `build` → `e2e` on PRs and pushes to `main`, caching `node_modules` and
   Playwright browsers, uploading `playwright-report/` + traces on failure. No secrets are
   needed (Spotify is fully stubbed). This is the only item that makes everything else
   stick. Playwright is a local runner, not a hosted service; a GitHub-hosted runner is
   infrastructure the organisation already uses for the repository, but note it for the
   compliance file.
2. **Architecture-boundary lint rules** (`no-restricted-imports` per workspace, or
   `eslint-plugin-boundaries`): engine may not import `socket.io`/`express`/`node:*`;
   `realtime/handlers/**` may not import `decks/**`; `apps/web/pages/X` may not import
   `pages/Y`; `apps/web` may not import `zod` or `@tunetrack/shared/schemas`;
   `services/**` may not import `pages/**`. Add `eslint-plugin-react-hooks`. Cheap, and it
   encodes `CLAUDE.md` so agents cannot drift.
3. **Typecheck server and engine tests.** Add `tsconfig.test.json` (or extend `include`)
   in `apps/server` and `packages/game-engine`; stop compiling `schemas.test.ts` into
   `packages/shared/dist` (move it to `packages/shared/tests/` or `exclude` it). Right now
   ~160 tests are type-unchecked and one test file ships in a package build.
4. **Server test helpers and the `roomFlow` split** (section 3): `tests/helpers/` with the
   socket test server, waiters with timeouts and messages, and one shared deck; split into
   four files; add the `afterEach(roomCount === 0)` leak guard Doc 11 asked for.
5. **Shared-primitive and overlay component tests.** `features/ui/primitives/*` (10
   files), `BottomSheet`, `Dialog`, `RoomResetModal` (per reason), `ToggleSwitch`,
   `RangeField`, `StatusBanner` — render, variants, disabled, keyboard, accessible name.
   Use `renderWithProviders` everywhere (currently 2 users) and set `css: true` so class
   assertions work and `TimelinePanel.test.tsx`'s `<strong>`-counting can go.
6. **Spotify server services.** Unit tests for `SpotifyAuthService` (state single-use,
   expiry, account-type detection, error mapping) and `SpotifyTokenStore` (expiry, sweep,
   scope invalidation); a `supertest` test for `http/spotifyRoutes.ts` callback. While
   there, record that the token store is unencrypted in-memory (security-review item, not
   a test item).
7. **Contract tests for the 34 untested Zod schemas** in `packages/shared` — one
   `it.each` table of valid/invalid payloads per schema; ~40 tests, half a day, protects
   every boundary at once.
8. **Replace the four real sleeps** with injected clocks (`useHostPlayback` ladder) or
   `expect.poll`/auto-waiting assertions (E11, E15, `hostTransfer:67`). This alone cuts
   several seconds from every web run.
9. **Engine breadth**: same-year through the challenge path, deck exhaustion, removing the
   active player / challenger mid-window. Also split `gameFlow.test.ts` (903 lines) by
   service (`turnFlow`, `challengeFlow`, `ttActions`).
10. **E2E**: split the spec by scenario family with a `test.extend` fixture for the
    two-player game prologue; add a WebKit project and a mobile-viewport project (at
    least `devices["iPhone 13"]` in Chromium if WebKit install is a problem); add the
    touch-drag test from Doc 11 5.4; add a timing reporter so the 4-minute budget is
    measurable.
11. **Coverage**: install `@vitest/coverage-v8`, report `text` + `lcov`, commit the measured
    baseline as thresholds, ratchet per wave (Doc 11 7.1).
12. **Hygiene**: replace the private LAN address in `apps/server/vitest.setup.ts:4` with a
    placeholder; add `prettier --check` to `verify`; standardise socket mocking on
    `createFakeSocket` and delete the 9 bespoke `vi.mock("…/socketClient")` blocks;
    add the `zIndexScale` guard (it would start red — intended) and extend
    `i18nKeyParity` with `HintId` key checks.

### Doc 11 status: done / open / now unnecessary

| Doc 11 item                                                                                        | Status                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 jsdom + setup + aliases                                                                        | Done (`css: true` and `environmentMatchGlobs` deliberately omitted)                                                                                               |
| 3.2 browser-API stubs                                                                              | Done, incl. throwing storage                                                                                                                                      |
| 3.3 `renderWithProviders`, `fakeSocket`, fixtures                                                  | Done; `OverlayProvider` never existed — drop from the doc                                                                                                         |
| 3.4 fake Spotify player                                                                            | Done, both end-of-track shapes                                                                                                                                    |
| 3.5 first component tests                                                                          | Items 2, 3, 5, 6 done; **1 (primitives), 4 (`RoomResetModal`), 7 (`GamePageHeader`) open**                                                                        |
| 3 Acceptance: pages render against fixtures                                                        | Partial — `PlayPage`, `LobbyPageMobile` yes; `HomePage`, `GamePage` no                                                                                            |
| 4 Guards                                                                                           | 3 of 4 done; `zIndexScale` open; ESLint `noRestrictedImports` open                                                                                                |
| 5 E2E E1–E15 Chromium                                                                              | Done (16 tests), zero-real-Spotify assertion done                                                                                                                 |
| 5 WebKit, mobile viewport, touch drag, <4 min                                                      | Open                                                                                                                                                              |
| 6 `disconnectLifecycle`, `roomCodeGenerator`                                                       | Done                                                                                                                                                              |
| 6 `actionAcks`, `statePayload`                                                                     | Done under different names (`createSocketHandler.test.ts`, `roomStateMappers.test.ts`); `revision` gap handling — no `revision` field exists, **now unnecessary** |
| 6 `rateLimit`, `metadataOverride`, `spotifyCredentialStore` (encryption)                           | **Now unnecessary as written** — the features do not exist; re-scope when/if built                                                                                |
| 6 `createSocketServer`, `shutdown`, `SpotifyAuthService`, `noSecretsInLogs`, `roomCount` afterEach | Open                                                                                                                                                              |
| 7 coverage + CI + root `verify`                                                                    | Open — nothing started                                                                                                                                            |
| 8 manual device checklist                                                                          | Exists only inside Doc 11; not a standalone file                                                                                                                  |

### What to delete

- `packages/shared/dist/events/schemas.test.*` from the build output (via tsconfig
  exclude / relocation).
- `types: ["vitest/globals"]` in `packages/game-engine/tsconfig.json:10` — globals are
  `false` everywhere and tests import explicitly.
- `supertest` + `@types/supertest` devDependencies in `apps/server` if HTTP route tests
  are not written (currently unused).
- The nine bespoke `vi.mock("…/socketClient")` blocks once `createFakeSocket` is adopted.
