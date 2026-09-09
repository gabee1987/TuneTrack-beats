# 11 — Testing Strategy

> Addresses findings **F-44 – F-47**.
> This is wave **W0**: it lands before any other work in the programme, because most of
> the changes planned elsewhere are currently unverifiable.

## 1. Where we are

    Workspace          Files  Tests   Kind
    apps/server           17    108   unit + socket integration     (good)
    apps/web              28    101   pure functions only           (no component tests)
    packages/game-engine   2     31   pure rules                    (good depth, narrow breadth)
    ------------------------------------------------------------------------
    total                 47    240

All 240 pass. The problem is not quality, it is **shape**:

- `apps/web/vitest.config.js` has no `environment: "jsdom"` and no `setupFiles`, so no
  component can be rendered — even though `@testing-library/react`,
  `@testing-library/jest-dom` and `@testing-library/user-event` are all installed (F-44).
- There is no E2E harness of any kind, so the core multiplayer loop has never been
  exercised automatically (F-45).
- No workspace measures coverage and there is no CI gate (F-47).
- Server coverage has a specific hole exactly where Doc 04's highest-severity fix lands:
  disconnect and reconnect **during a game** (F-46).

`CLAUDE.md` asks for component tests for rendered behaviour and E2E for join, place,
challenge and reveal flows. Neither exists yet.

## 2. Target shape

| Layer | Tool | What it proves | Target count |
| --- | --- | --- | --- |
| Engine rules | Vitest, pure | Placement, challenge, reveal, turn progression, same-year edges, the new metadata override | 31 to approximately 90 |
| Server orchestration | Vitest + real Socket.IO client | Room lifecycle, disconnect/reconnect, host transfer, authorisation, timers, rate limits, acks, idempotency | 108 to approximately 180 |
| Shared contracts | Vitest, pure | Zod schemas accept valid and reject invalid payloads; contract-shape guards | new, approximately 40 |
| Web pure logic | Vitest, pure | Selectors, mappers, reducers, the overlay stack, the hint scheduler | 101 to approximately 150 |
| Web components | Vitest + jsdom + RTL | Every primitive, every overlay, every controller-driven page section | new, approximately 120 |
| Web guards | Vitest, filesystem | z-index tokens, no hex literals, no CSS barrels, i18n key parity | new, approximately 8 |
| End to end | Playwright | The multiplayer loop across two browser contexts, plus reconnect | new, approximately 15 |

## 3. Phase 1 — Turn on component testing · **blocking**

**Finding:** F-44. Half a day of work that unblocks most of the programme.

### 3.1 Vitest configuration

Replace `apps/web/vitest.config.js` (currently a bare object literal) with a proper
`defineConfig` in TypeScript, matching the server's shape:

- `environment: "jsdom"`
- `setupFiles: ["./vitest.setup.ts"]`
- `globals: false` — keep explicit imports, consistent with the current tests
- `css: true` so CSS-modules class names resolve in assertions
- `resolve.alias` for `@tunetrack/shared` and `@tunetrack/game-engine` pointing at source,
  mirroring `apps/server/vitest.config.ts`, so tests do not depend on a prior build
- `environmentMatchGlobs` so existing pure tests keep running in `node` and stay fast

### 3.2 Setup file

`apps/web/vitest.setup.ts` must provide the browser APIs this app uses, all of which are
absent or incomplete in jsdom:

| API | Why it is needed | Approach |
| --- | --- | --- |
| `matchMedia` | `useMediaQuery`, `usePageLayoutMode`, framer-motion's reduced-motion, `AppShellMenuDialog` | Configurable stub with a helper to set matches per query |
| `ResizeObserver` | `AppShellMenuSheet`, `useTimelineOverflowState` | Stub with a manual trigger |
| `IntersectionObserver` | Hint anchors (Doc 10) | Stub with a manual trigger |
| `visualViewport` | Viewport store (Doc 03 section 4) | Stub |
| `navigator.vibrate` | `triggerPressHaptic` | `vi.fn()` |
| `crypto.randomUUID` | `sessionId`, request ids | Deterministic sequence so ids are assertable |
| `localStorage` / `sessionStorage` | Profile, preferences, hints | In-memory implementation **plus** a throwing variant, because the throwing case is a real defect class (Doc 05 section 2) |
| `window.Spotify` | Playback SDK | Full fake player — see 3.4 |
| `Element.prototype.scrollIntoView` | Lobby advanced-settings scroll | `vi.fn()` |
| `HTMLMediaElement` play/pause | Free-tier preview playback | Stubs that drive the real event listeners |
| `requestAnimationFrame` | Coalesced viewport updates | jsdom has it; expose a flush helper |

Also import `@testing-library/jest-dom/vitest` and add an `afterEach` that calls
`cleanup()` and resets all stubs.

### 3.3 Shared test utilities

`apps/web/src/test/` (excluded from the build):

- `renderWithProviders(ui, options)` — wraps in `I18nProvider`, `AppLoadingProvider`,
  `AppToastProvider`, `OverlayProvider` and a `MemoryRouter`, with options for initial
  route, language and layout mode. Every component test uses this, so provider changes are
  a one-file update.
- `createFakeSocket()` — an `EventEmitter`-based Socket.IO double supporting `on`, `off`,
  `emit`, `emitWithAck`, `timeout`, `connected`, `connect`, `disconnect`, plus helpers to
  simulate server events, drops and reconnects. This is the single most valuable test
  utility in the programme: it lets connection behaviour, reconnect behaviour and ack
  behaviour all be tested in jsdom.
- `roomStateFixtures.ts` — builders for `PublicRoomState` in each phase, using **placeholder
  data only**: `roomId: "TEST_ROOM_1"`, players `"Player One"` / `"Player Two"`, track
  `"Test Track"` by `"Test Artist"`, `spotifyTrackUri: "spotify:track:TEST0000000000000000"`.
  No real names, no real Spotify ids, no real playlist URLs.
- `fakeSpotifyPlayer.ts` — see 3.4.

### 3.4 The fake Spotify player

The playback fixes in Doc 08 cannot be verified without this, and it is the difference
between guessing and knowing on the reported playback defects.

A `window.Spotify.Player` double that:

- records `connect`, `disconnect`, `pause`, `resume`, `seek`, `activateElement` calls;
- lets a test emit `ready`, `not_ready`, `player_state_changed`,
  `initialization_error`, `authentication_error`, `account_error`, `playback_error`,
  `autoplay_failed`;
- can produce the two distinct end-of-track state shapes described in Doc 08 section 3.2,
  which is precisely what the F-38 fix must handle;
- can simulate a blocked `activateElement` so `needsUserGesture` is testable.

### 3.5 First component tests to write

Order them so they cover the parts the programme is about to change:

1. Every primitive in `features/ui/primitives` — render, variants, disabled, keyboard,
   `aria-label`. Cheap, and they lock the Doc 07 consolidation.
2. `AppShellMenu` open/close, tab switching, footer actions.
3. `PlaylistEditModal` plus `PlaylistTrackDetailsSheet` — the F-25 defect.
4. `RoomResetModal` for each recovery reason.
5. `TurnActionDock`, `ChallengeActionPanel`, `RevealActionDock` — capability gating by phase
   and role, which is where a regression would be least visible and most damaging.
6. `TimelinePanel` selection and card-info opening (drag is E2E, see 5.4).
7. `GamePageHeader` render-count behaviour, once Doc 03 section 7 lands.

### Acceptance

- [ ] `npm test -w apps/web` runs both node and jsdom suites.
- [ ] `renderWithProviders` renders `HomePage`, `PlayPage`, `LobbyPage` and `GamePage`
      against fixtures with no unhandled errors.
- [ ] The existing 101 pure tests pass unmodified.
- [ ] A test using the throwing-storage variant renders the app without error.

## 4. Phase 2 — Filesystem guard tests · **cheap, high leverage**

Small tests that make the conventions in this programme self-enforcing, rather than relying
on review discipline. All four go in `apps/web/src/test/guards/`.

| Guard | Asserts | Protects |
| --- | --- | --- |
| `zIndexScale.test.ts` | Every `z-index` in `**/*.module.css` is `var(--z-*)` or an integer in `[-1, 9]` | Doc 06 Phase 1 |
| `noHardcodedColors.test.ts` | No hex literal in `**/*.module.css`, with a shrinking allowlist | Doc 07 Phase 3 |
| `noCssBarrels.test.ts` | No module spread-merges CSS-module imports | Doc 02 Phase 4, and the latent collision risk |
| `i18nKeyParity.test.ts` | `en` and `hu` have identical key sets; every `HintId` has title and body keys in both | Doc 02 Phase 3, Doc 10 step 7 |

Write each one **before** the migration it guards, so it starts red and turns green as the
work proceeds. That converts each phase into a measurable countdown instead of a judgement
call.

A fifth, in `apps/web`:

| `noRestrictedImports` (ESLint, not Vitest) | `apps/web` may not import `zod`, `@tunetrack/shared/schemas`, or the components deleted in Doc 07 Phase 1 | Doc 02 Phase 2, Doc 07 Phase 1 |

## 5. Phase 3 — End-to-end harness · **blocking for the reconnect work**

**Finding:** F-45.

### 5.1 Tooling

Playwright, as a development dependency in a new `apps/e2e` workspace so it never enters
the runtime dependency graph of either app. Chromium plus WebKit (WebKit matters: several
reported defects are iOS-specific, and WebKit is the closest automatable proxy).

Playwright is a local/CI test runner, not a hosted service, so it needs no third-party
compliance review. If a hosted browser grid or a recording service is ever proposed, raise
it for review first.

### 5.2 Harness requirements

The hard part of E2E here is that this is a multiplayer game with a third-party music
service. The harness must therefore:

- start the real server with a test configuration (in-memory rooms, deterministic room
  codes via an injected generator, short grace periods from the env vars added in
  Doc 04 section 3.3);
- start the built web app via `vite preview`;
- run **two or more browser contexts** so host and guest are genuinely separate clients;
- stub Spotify entirely. Point `SPOTIFY_*` env at a local fake that serves canned
  responses, and inject a fake `window.Spotify` in the browser context. Never call the real
  Spotify API from a test — it is rate-limited, non-deterministic, and would mean test runs
  touching a real third-party account;
- use the deterministic test deck already in the repo
  (`apps/server/src/decks/test-decks/default-test-deck.json`) so placement outcomes are
  predictable.

### 5.3 Scenario list

| # | Scenario | Proves |
| --- | --- | --- |
| E1 | Host creates a room; guest joins; both see two players | Room creation and join (Doc 09) |
| E2 | Host starts the game; both reach the game screen | Game start and navigation |
| E3 | Active player places a card correctly; reveal confirms; turn advances | Core loop |
| E4 | Active player places incorrectly; card is discarded | Core loop |
| E5 | Guest challenges before reveal; challenge resolves server-side | Challenge flow |
| E6 | Play to the target card count; winner is declared | Win condition |
| E7 | Guest's socket is dropped and restored inside the recovery window; play continues with no error | Doc 04 section 2, Doc 05 section 1 |
| E8 | Host's socket is dropped and restored; host is still host, no `ROOM_ALREADY_EXISTS` | **F-13** |
| E9 | Host disconnects permanently; host role transfers within the grace period | Doc 04 section 1 |
| E10 | Guest disconnects permanently mid-game; is evicted after the in-game grace period; the room survives | **F-12** |
| E11 | All players disconnect; the room is removed (assert via the room list) | **F-12** |
| E12 | Host closes the room; both clients land on Home and Start is immediately usable | **F-27c** |
| E13 | Open settings on the game page; press browser back; the panel closes and the game remains | **F-27** |
| E14 | Open the playlist editor, open a song editor from it, edit the year, save, close both with back | **F-25**, **F-27** |
| E15 | First-run session sees the timeline-tap hint after receiving a card | Doc 10 |

E7 to E12 are the scenarios that would have caught the current stability defects, and they
are the reason this harness is worth building.

### 5.4 Drag testing

The iOS drag defect (F-35) is the hardest thing here to automate. Approach:

- In WebKit, drive the drag with `page.dispatchEvent` sequences of real
  `touchstart`/`touchmove`/`touchend` (not `mouse.move`, which bypasses the touch path
  entirely and would test nothing).
- Assert two distinct outcomes from two distinct gestures: a **fast swipe** scrolls the
  timeline and does not reorder; a **hold then move** reorders and does not scroll. That
  pair is exactly the behaviour the fix is meant to produce.
- Accept that Playwright WebKit is not Mobile Safari. Keep a written manual device
  checklist alongside (section 8) and treat the automated test as a regression net for the
  sensor logic, not as proof on real hardware.

### Acceptance

- [ ] `npm run e2e` runs all scenarios headless in Chromium and WebKit.
- [ ] Runtime under 4 minutes on a developer machine, so it is actually run.
- [ ] Zero real Spotify calls (assert by pointing the fake at a port that fails loudly if
      bypassed).
- [ ] E7 to E12 fail against the current code and pass after Doc 04 and Doc 05 land. Record
      that transition; it is the evidence that the stability work worked.

## 6. Phase 4 — Close the server coverage holes

**Finding:** F-46. Detailed test lists live with their changes; consolidated here:

| New file | Covers | Plan reference |
| --- | --- | --- |
| `tests/rooms/disconnectLifecycle.test.ts` | In-game eviction, room deletion, host transfer on eviction, active-player and challenger eviction, `finished` immediate eviction, the pure policy table | Doc 04 section 1.4 |
| `tests/app/createSocketServer.test.ts` | Recovery window, ping values, buffer size, CORS wiring | Doc 04 section 2 |
| `tests/realtime/rateLimit.test.ts` | Buckets, refill, per-socket isolation, `RATE_LIMITED`, no disconnect | Doc 04 section 2.4 |
| `tests/app/shutdown.test.ts` | `SIGTERM` sequence, timer clearing, sink flush, idempotency, unhandled rejection | Doc 04 section 3.1 |
| `tests/rooms/roomCodeGenerator.test.ts` | Uniqueness, collision retry, base32 fallback, curated word list | Doc 09 section 3.2 |
| `tests/rooms/metadataOverride.test.ts` | Host-only, reveal-only, current-track-only, idempotency, deck update, broadcast | Doc 09 section 5.4 |
| `tests/spotify/SpotifyAuthService.test.ts` | Callback handling, single-use `state`, expiry, account-type detection, error mapping | Doc 08 section 4.4 |
| `tests/spotify/spotifyCredentialStore.test.ts` | Encryption round-trip, wrong key fails closed, absolute and idle expiry, sweep, scope invalidation | Doc 08 section 4.4 |
| `tests/spotify/noSecretsInLogs.test.ts` | Token-shaped values never reach a log or audit payload | Doc 08 section 4.4 item 6 |
| `tests/realtime/actionAcks.test.ts` | Ack on success/rejection/schema failure; absent-ack compatibility; idempotent replay | Doc 05 section 4 |
| `tests/rooms/statePayload.test.ts` | `releaseYear` absent during `turn`/`challenge`; narrow-event `revision` gap handling | Doc 05 section 6 |

Also add to every existing server integration suite an `afterEach` asserting
`roomCount === 0`, which turns any future room leak into an immediate test failure rather
than a slow memory problem.

## 7. Phase 5 — Coverage measurement and CI

**Finding:** F-47.

### 7.1 Coverage

Enable `@vitest/coverage-v8` in all three workspaces with `provider: "v8"` and
`reporter: ["text", "lcov"]`.

Set **initial thresholds at the current measured level**, then ratchet. Guessing a target
produces either a permanently red gate or a meaningless one. Measure first, commit the
numbers, then raise them by a few points per wave.

Proposed eventual floors, to be confirmed against the first measurement:

| Workspace | Statements | Branches | Rationale |
| --- | --- | --- | --- |
| `packages/game-engine` | 95 % | 90 % | `CLAUDE.md`: the engine gets the deepest tests |
| `packages/shared` | 90 % | 85 % | Mostly types; the schemas are the testable part |
| `apps/server` | 85 % | 75 % | Orchestration and boundaries |
| `apps/web` | 70 % | 60 % | Excluding `*.module.css`, generated files and `DesignSystemPage` |

Exclude from web coverage: `main.tsx`, `vite.config.ts`, `src/test/**`,
`pages/DesignSystemPage/**`.

### 7.2 CI

There is no CI configuration in the repository. Add a single GitHub Actions workflow:

    typecheck  ─┐
    lint       ─┼─▶  unit + component  ─▶  build  ─▶  e2e (Chromium + WebKit)
    guards     ─┘

- Run on pull requests and on pushes to `main` and `develop`.
- Cache `node_modules` and the Playwright browser downloads.
- Upload the Playwright HTML report and traces on failure — this is what makes a flaky E2E
  suite diagnosable rather than merely annoying.
- Publish coverage as a job summary.
- **No secrets in CI.** Spotify is stubbed, so the workflow needs no `SPOTIFY_*` values and
  no Axiom token. Keep it that way; a CI job that needs production credentials is a CI job
  that will eventually leak them.
- Add a `verify` script at the repository root
  (`npm run typecheck && npm run lint && npm test`) mirroring the one that already exists
  in `apps/web`, so the local and CI commands are the same.

### Acceptance

- [ ] Coverage reported for all three workspaces, with the measured baseline committed.
- [ ] CI green on `main` and required for merges.
- [ ] Playwright traces available on failure.
- [ ] No credential of any kind in the CI configuration.

## 8. Manual device checklist

Some of the reported defects cannot be automated. This checklist is part of the definition
of done for the waves that touch them, and belongs in the repository so it is actually run.

Devices: one iPhone (Safari, plus installed PWA), one mid-range Android (Chrome, plus
installed PWA), one desktop browser.

| # | Check | Related |
| --- | --- | --- |
| M1 | Drag a card with a slow hold — it drags, the timeline does not scroll | F-35 |
| M2 | Swipe the timeline quickly — it scrolls, no card is picked up | F-35 |
| M3 | Drag near the edge — edge auto-scroll works and the card stays under the finger | F-35 |
| M4 | Open settings from the game page — one smooth animation, no flicker | F-29 |
| M5 | Press the phone's back button with settings open — the panel closes | F-27 |
| M6 | Press the phone's back button with the song editor open — it closes, the playlist editor stays | F-25, F-27 |
| M7 | Leaderboard chips — bottom border fully visible while scrolling the strip | F-32 |
| M8 | Let a track finish during a placement, then press play — it restarts | F-38 |
| M9 | Draw a previously heard track — it starts from the beginning | F-37 |
| M10 | Turn Wi-Fi off for 10 s mid-game, then on — play resumes with no error toast | F-13, F-16 |
| M11 | Close the room, land on Home, press Start immediately | F-27c |
| M12 | Set a name, force-quit the app, reopen — the name is still there | F-40 |
| M13 | Connect Spotify, close the room, create a new one — no re-login | F-36 |
| M14 | Rotate the device on every screen — layout adapts with no stuck overlay | F-08 |
| M15 | Open the keyboard on the lobby name field — the field stays visible | Doc 03 section 4.2 |
| M16 | First-run hints appear once; reset in settings brings them back | Doc 10 |
| M17 | Install as a PWA and repeat M4 to M11 — installed-app navigation behaves the same | F-27 |
| M18 | Enable the OS reduced-motion setting — all motion degrades, nothing breaks | `CLAUDE.md` |

## 9. Test-quality rules

To keep the new tests from becoming a maintenance burden:

- **Test behaviour, not implementation.** Query by role and accessible name, not by CSS
  class. This also improves accessibility as a side effect.
- **No snapshot tests of rendered markup.** They fail on every design change and prove
  nothing. Snapshots are acceptable only for pure data transformations.
- **One reason to fail per test.** A test named for a behaviour that asserts six unrelated
  things is a debugging obstacle.
- **Fixtures use placeholder data only** — `TEST_ROOM_1`, `Player One`, `12345`,
  `spotify:track:TEST...`. No real identifiers anywhere in the test suite, per the
  organisation's mock-data rule.
- **No logs as tests** (`CLAUDE.md`). If a behaviour is worth a log line, it is worth an
  assertion.
- **Deterministic time.** Fake timers for anything involving a grace period, a countdown or
  a retry ladder. There are already three retry ladders and four grace periods in this
  codebase; none should ever be tested with a real sleep.
- **Every defect in Doc 12 gets a test that fails first.** That is the only way to know the
  fix addresses the reported problem rather than something adjacent.

## 10. Sequencing

| Step | Blocking? | Effort |
| --- | --- | --- |
| Phase 1 (jsdom + RTL + utilities + fake socket + fake Spotify) | **Yes** — most of the programme depends on it | small to medium |
| Phase 2 (guard tests) | No, but write each before its migration | small |
| Phase 3 (Playwright harness + E1 to E6) | **Yes** for Doc 04 and Doc 05 | medium |
| Phase 3 (E7 to E15) | Alongside the work they cover | medium |
| Phase 4 (server holes) | With Doc 04, Doc 05, Doc 08, Doc 09 | medium |
| Phase 5 (coverage + CI) | No, but do it early so the ratchet has somewhere to start | small |
