# 19 — Testing Strategy

> **Status (2026-10-06):** Phase 1 (jsdom harness and test utilities) shipped; Phase 2 shipped for three of four guards; Phase 3 shipped for Chromium (E1–E15, 16 tests); Phase 4 has 7 of 11 planned server test files. Open: the `zIndexScale` guard, drag testing, four server test files (two blocked on features, one on decision 10), and CI (parked, decision 17). Boundary lint and coverage thresholds shipped 2026-10-10 (`06` T2, T3); server coverage holes and web tests 2026-10-10 (`06` T6, T9); E2E split, WebKit and iPhone 13 projects and the runtime budget 2026-10-10 (`06` T11).
> **Folded from** `docs/plans/2026-09-stability-performance/11-testing-strategy.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.

> Register findings: T-01 … T-12 (`01-review-findings.md`). Phase 3 of the review programme turns
> the verify sequence and the manual device checklist (§8) into Claude Code skills (`verify`,
> `write-tests`, `e2e-scenario`); Phase 6 owns test restructuring and additions (T-03 … T-12), the
> CI workflow and the coverage ratchet.
>
> **Structure, test gates and order (2026-10-07):** `06-structure-and-test-plan.md` §2 (gates), §7 (order), §8 (corrections to this document). Where they differ, `06` wins.

## 1. Current numbers (2026-10-06, `npm test` exit 0)

| Workspace              | Files | Tests   | Kind                                                             |
| ---------------------- | ----- | ------- | ---------------------------------------------------------------- |
| `apps/server`          | 23    | 137     | unit + socket integration                                        |
| `apps/web`             | 58    | 230     | pure logic, 19 component test files (`*.test.tsx`), 3 guards     |
| `packages/game-engine` | 2     | 31      | pure rules (unchanged breadth, T-09)                             |
| `packages/shared`      | 1     | 2       | schema contract (34 of 35 payload schemas untested, T-07)        |
| **Unit total**         | 84    | **400** |                                                                  |
| `apps/e2e`             | 1     | 16      | Playwright, Chromium desktop only, one 848-line spec file (T-10) |

## 2. Target shape

| Layer                | Tool                           | What it proves                                                                                             | Target count                        |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Engine rules         | Vitest, pure                   | Placement, challenge, reveal, turn progression, same-year edges, deck reshuffle, the metadata override     | 31 to approximately 90              |
| Server orchestration | Vitest + real Socket.IO client | Room lifecycle, disconnect/reconnect, host transfer, authorisation, timers, rate limits, acks, idempotency | 137 to approximately 180            |
| Shared contracts     | Vitest, pure                   | Zod schemas accept valid and reject invalid payloads; contract-shape guards                                | 2 to approximately 40               |
| Web pure logic       | Vitest, pure                   | Selectors, mappers, reducers, the hint scheduler                                                           | approximately 150                   |
| Web components       | Vitest + jsdom + RTL           | Every primitive, every overlay, every controller-driven page section                                       | 19 files to approximately 120 tests |
| Web guards           | Vitest, filesystem             | z-index tokens, no hex literals, no CSS barrels, i18n key parity                                           | 3 to 4                              |
| End to end           | Playwright                     | The multiplayer loop across two browser contexts, plus reconnect, in Chromium and WebKit                   | 16, split per scenario              |

## 3. Phase 1 — Component testing · **shipped**

`apps/web/vitest.config.ts` (`environment: "jsdom"`, `setupFiles`), `apps/web/vitest.setup.ts`, and
`apps/web/src/test/` with `renderWithProviders.tsx`, `fakeSocket.ts`, `fakeSpotifyPlayer.ts`,
`roomStateFixtures.ts` and `stubs/` (crypto, layout, matchMedia, observers, storage, viewport);
`harness.test.tsx` proves the harness. Commit `749b52a`. Nineteen component test files exist.
Deviation from the plan: `renderWithProviders` is used by only 2 of the 19 component tests and no
`features/ui/primitives` component has a render test (T-04) — the "first component tests to write"
list from the plan is now Phase 6 work.

## 4. Phase 2 — Filesystem guard tests

All guards live in `apps/web/src/test/guards/` and are written **before** the migration they
guard, so each starts red and turns green as the work proceeds.

| Guard                       | Asserts                                                                         | Protects                                                           | Status                                                                       |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `noCssBarrels.test.ts`      | No module spread-merges CSS-module imports                                      | `10-bundle-and-startup.md` Phase 4                                 | **Done**, with a pending-migration allowlist (6 barrels remain)              |
| `noHardcodedColors.test.ts` | No hex literal in `**/*.module.css`                                             | `15-design-system-consolidation.md` Phase 3                        | **Done**, with a shrinking allowlist (94 literals remain)                    |
| `i18nKeyParity.test.ts`     | `en` and `hu` have identical key sets                                           | `10-bundle-and-startup.md` Phase 3, `18-onboarding-hint-system.md` | **Done**, with an allowlist; does not yet assert hint title/body keys (T-12) |
| `zIndexScale.test.ts`       | Every `z-index` in `**/*.module.css` is `var(--z-*)` or an integer in `[-1, 9]` | `14-navigation-and-overlays.md` Phase 1                            | **Open** (T-12); would start red, as intended                                |

A fifth guard is ESLint, not Vitest: `no-restricted-imports` so that `apps/web` may not import
`zod`, `@tunetrack/shared/schemas`, or the legacy components retired by
`15-design-system-consolidation.md` Phase 1, and so that the engine cannot import transport
packages. **Open** (T-02); Phase 3 of the review programme specifies the ruleset for an
implementation agent.

## 5. Phase 3 — End-to-end harness

### 5.1 Shipped (Chromium)

`apps/e2e` Playwright workspace, commit `9e69e02`. `npm run e2e` builds the real server and web
app, serves the production web build through Vite preview, and runs isolated host and guest
browser contexts. Server Spotify endpoints target a local fail-loud sentinel that every scenario
asserts received zero unexpected requests (only the canned E14 OAuth and import requests are
served); browser contexts install a fake Spotify SDK; the deck random source is deterministic. E2E
sets the host-transfer grace to 5 s (production default 30 s) so E8 keeps a realistic reconnect
window. Playwright is a local test runner, not a hosted service, so it needs no third-party
compliance review; a hosted browser grid or recording service would.

Scenario list (all pass in Chromium):

| #   | Scenario                                                                                                                                   | Proves                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| E1  | Host creates a room; guest joins through the live directory and through a direct invite; both see two players                              | Room creation and join (`17-room-and-player-identity-flow.md`)                        |
| E2  | Host starts the game; both reach the game screen                                                                                           | Game start and navigation                                                             |
| E3  | Active player places a card correctly; reveal confirms; turn advances                                                                      | Core loop                                                                             |
| E4  | Active player places incorrectly; card is discarded                                                                                        | Core loop                                                                             |
| E5  | Guest challenges before reveal; challenge resolves server-side                                                                             | Challenge flow                                                                        |
| E6  | Play to the target card count; winner is declared                                                                                          | Win condition                                                                         |
| E7  | Guest's socket is dropped and restored inside the recovery window; play continues with no error                                            | `12-backend-stability-and-sessions.md` §2, `13-network-protocol-and-resilience.md` §1 |
| E8  | Host's socket is dropped and restored; host is still host, no `ROOM_ALREADY_EXISTS`                                                        | Idempotent `create_room` (`13-network-protocol-and-resilience.md` §1.2)               |
| E9  | Host disconnects permanently; host role transfers within the grace period                                                                  | `12-backend-stability-and-sessions.md` §1                                             |
| E10 | Guest disconnects during their turn; all remaining clients see the offline state; only the host manually skips; the guest remains reserved | Owner decision 2026-09-30                                                             |
| E11 | All players disconnect; after the configured expiry the abandoned room closes atomically; any earlier reconnect cancels cleanup            | Owner decision 2026-09-30                                                             |
| E12 | Host closes the room; both clients land on Home and Start is immediately usable                                                            | Exiting page must not intercept input (`14-navigation-and-overlays.md`)               |
| E13 | Open settings on the game page; press browser back; the panel closes and the game remains                                                  | B2, `14-navigation-and-overlays.md` §4                                                |
| E14 | Open Music Setup, then playlist and song editors; edit and save the year; close each layer back to room settings                           | B1, B2                                                                                |
| E15 | First-run session sees the placement-rules hint first; dismissal persists across reload                                                    | `18-onboarding-hint-system.md`                                                        |

### 5.2 Open

- **Shipped 2026-10-10 (`06` T11):** one spec per family on shared fixtures, `webkit` and
  `mobile` (iPhone 13) projects, and a 4-minute budget per project checked after every green run.
  Skipped until fixed: B27 on desktop WebKit, B25 on the phone (`20-bug-register.md`).
- **Drag testing (§5.4).**

### 5.3 Harness requirements (normative for every new scenario)

- Start the real server with a test configuration (in-memory rooms, deterministic room codes via an
  injected generator, short grace periods from the lifecycle env vars).
- Run **two or more browser contexts** so host and guest are genuinely separate clients.
- Stub Spotify entirely. Never call the real Spotify API from a test — it is rate-limited,
  non-deterministic, and would mean test runs touching a real third-party account.
- Use the deterministic test deck already in the repo
  (`apps/server/src/decks/test-decks/default-test-deck.json`) so placement outcomes are predictable.
- Placeholder data only in fixtures and assertions.

### 5.4 Drag testing · **open**

The iOS drag defect (B4) is the hardest thing here to automate. Approach:

- In WebKit, drive the drag with `page.dispatchEvent` sequences of real
  `touchstart`/`touchmove`/`touchend` (not `mouse.move`, which bypasses the touch path entirely and
  would test nothing). Today drag is driven by `page.mouse` only.
- Assert two distinct outcomes from two distinct gestures: a **fast swipe** scrolls the timeline and
  does not reorder; a **hold then move** reorders and does not scroll. That pair is exactly the
  behaviour the fix in `11-runtime-and-motion-performance.md` is meant to produce.
- Accept that Playwright WebKit is not Mobile Safari. Keep the manual device checklist (§8)
  alongside and treat the automated test as a regression net for the sensor logic, not as proof on
  real hardware.

### Acceptance

- [x] `npm run e2e` runs all scenarios headless in Chromium.
- [ ] `npm run e2e` runs all scenarios headless in WebKit and on a mobile viewport — runs; the
      B25 and B27 cases are skipped until fixed.
- [x] Runtime under 4 minutes on a developer machine, measured by a timing reporter
      (`check-e2e-budget.mjs`, per project).
- [x] No E2E file above 700 lines; one file per scenario or scenario group (`06` T11).
- [x] Zero real Spotify calls (the fake fails loudly if bypassed).
- [x] E7 to E12 pass against the hardened code and protect the reconnect, transfer, disconnect,
      expiry and explicit-close boundaries.

## 6. Phase 4 — Close the server coverage holes

| File under `apps/server/tests/`          | Covers                                                                                                                       | Plan reference                                           | Status                                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `rooms/disconnectLifecycle.test.ts`      | In-game identity retention, reconnect without expiry, host transfer, manual and safety turn recovery, and explicit host kick | `12-backend-stability-and-sessions.md` §1.3              | **Done**                                                                                                                |
| `rooms/roomCodeGenerator.test.ts`        | Uniqueness, collision retry, base32 fallback, curated word list                                                              | `17-room-and-player-identity-flow.md` §1                 | **Done**                                                                                                                |
| `app/createSocketServer.test.ts`         | Ping values, recovery off, buffer size, CORS wiring                                                                          | `12-backend-stability-and-sessions.md` §2                | Shipped 2026-10-07 (`05` A7)                                                                                            |
| `realtime/rateLimit.test.ts`             | Buckets, refill, per-socket isolation, `RATE_LIMITED`, no disconnect                                                         | `12-backend-stability-and-sessions.md` §2.4              | Shipped 2026-10-07 (`05` A6)                                                                                            |
| `app/shutdown.test.ts`                   | `SIGTERM` sequence, timer clearing, sink flush, idempotency, unhandled rejection                                             | `12-backend-stability-and-sessions.md` §3.1; hotfix B-11 | Shipped 2026-10-07 (`05` A8)                                                                                            |
| `rooms/metadataOverride.test.ts`         | Host-only, reveal-only, current-track-only, idempotency, deck update, broadcast                                              | `17-room-and-player-identity-flow.md` §3                 | Open; the feature does not exist yet                                                                                    |
| `spotify/SpotifyAuthService.test.ts`     | Callback handling, single-use `state`, expiry, account-type detection, error mapping                                         | Hotfix B-01; `16-spotify-session-and-playback.md` §3.4   | Shipped 2026-10-10 (`06` T6)                                                                                            |
| `spotify/spotifyCredentialStore.test.ts` | Encryption round-trip, wrong key fails closed, absolute and idle expiry, sweep, scope invalidation                           | `16-spotify-session-and-playback.md` §3                  | Blocked; gated by owner decision 10                                                                                     |
| `spotify/noSecretsInLogs.test.ts`        | Token-shaped values never reach a log or audit payload                                                                       | `16-spotify-session-and-playback.md` §3.4 item 6         | Shipped 2026-10-10 (`06` T6)                                                                                            |
| `realtime/actionAcks.test.ts`            | Ack on success/rejection/schema failure; absent-ack compatibility; idempotent replay                                         | `13-network-protocol-and-resilience.md` §4               | Open as a dedicated file; acks are asserted inside `realtime/createSocketHandler.test.ts` and `rooms/RoomStore.test.ts` |
| `rooms/statePayload.test.ts`             | `releaseYear` absent during `turn`/`challenge`; narrow-event `revision` gap handling                                         | `13-network-protocol-and-resilience.md` §6               | Hidden-year half done (see that document §6.3); `revision` half blocked on the feature                                  |

Also add to every existing server integration suite an `afterEach` asserting `roomCount === 0`
(absent today, T-08), which turns any future room leak into an immediate test failure rather than
a slow memory problem. The review added further holes the original plan did not list — server and
engine tests are not typechecked (T-03), no socket authorization matrix (T-08), engine breadth
(T-09), test quality in `useGamePageActions.test.tsx` (T-11; the server half shipped in `06` T5) — all owned by
Phase 6.

## 7. Phase 5 — Coverage measurement and CI · coverage shipped, CI parked (T-01)

Nothing of this phase exists: no coverage configuration (`@vitest/coverage-v8` not installed), no
`.github/` workflow, no root `verify` script (only `apps/web` has one).

### 7.1 Coverage

**Shipped 2026-10-10** (`06` T3): thresholds at the measured baseline in every `vitest.config.ts`,
enforced by `npm run verify`. The floors below remain targets, not gates:

| Workspace              | Statements | Branches | Rationale                                                        |
| ---------------------- | ---------- | -------- | ---------------------------------------------------------------- |
| `packages/game-engine` | 95 %       | 90 %     | `CLAUDE.md`: the engine gets the deepest tests                   |
| `packages/shared`      | 90 %       | 85 %     | Mostly types; the schemas are the testable part                  |
| `apps/server`          | 85 %       | 75 %     | Orchestration and boundaries                                     |
| `apps/web`             | 70 %       | 60 %     | Excluding `*.module.css`, generated files and `DesignSystemPage` |

Exclude from web coverage: `main.tsx`, `vite.config.ts`, `src/test/**`, `pages/DesignSystemPage/**`.

### 7.2 CI

Add a single GitHub Actions workflow: typecheck, lint and guards in parallel, then unit and
component tests, then build, then E2E (Chromium, and WebKit once §5.2 lands).

- Run on pull requests and on pushes to `main`.
- Cache `node_modules` and the Playwright browser downloads.
- Upload the Playwright HTML report and traces on failure — this is what makes a flaky E2E suite
  diagnosable rather than merely annoying.
- Publish coverage as a job summary.
- **No secrets in CI.** Spotify is stubbed, so the workflow needs no `SPOTIFY_*` values and no
  Axiom token. Keep it that way; a CI job that needs production credentials is a CI job that will
  eventually leak them.
- Add a `verify` script at the repository root (`npm run typecheck && npm run lint && npm test`)
  mirroring the one in `apps/web`, so the local and CI commands are the same. Phase 3 of the review
  programme specifies this script and the `verify` skill that wraps it.
- GitHub Actions runs on the infrastructure the repository already lives on and needs no secrets;
  record it in the compliance notes regardless (`00-index.md` §6).

### Acceptance

- [ ] Coverage reported for all workspaces, with the measured baseline committed.
- [ ] CI green on `main` and required for merges.
- [ ] Playwright traces available on failure.
- [ ] No credential of any kind in the CI configuration.
- [ ] Root `verify` script exists and is what CI runs.

## 8. Manual device checklist

Some of the reported defects cannot be automated. This checklist is part of the definition of done
for the work that touches them. The `device-checklist` skill (`.claude/skills/device-checklist/`,
added 2026-10-06) scopes it per change and defines the result format; this table stays the source.

Devices: one iPhone (Safari, plus installed PWA), one mid-range Android (Chrome, plus installed
PWA), one desktop browser.

| #   | Check                                                                                          | Related                                                                 |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| M1  | Drag a card with a slow hold — it drags, the timeline does not scroll                          | B4                                                                      |
| M2  | Swipe the timeline quickly — it scrolls, no card is picked up                                  | B4                                                                      |
| M3  | Drag near the edge — edge auto-scroll works and the card stays under the finger                | B4                                                                      |
| M4  | Open settings from the game page — one smooth animation, no flicker                            | B5                                                                      |
| M5  | Press the phone's back button with settings open — the panel closes                            | B2                                                                      |
| M6  | Press the phone's back button with the song editor open — it closes, the playlist editor stays | B1, B2                                                                  |
| M7  | Leaderboard chips — bottom border fully visible while scrolling the strip                      | B6                                                                      |
| M8  | Let a track finish during a placement, then press play — it restarts                           | B7, B9                                                                  |
| M9  | Draw a previously heard track — it starts from the beginning                                   | `16-spotify-session-and-playback.md` §1                                 |
| M10 | Turn Wi-Fi off for 10 s mid-game, then on — play resumes with no error toast                   | B8, `13-network-protocol-and-resilience.md`                             |
| M11 | Close the room, land on Home, press Start immediately                                          | `14-navigation-and-overlays.md`                                         |
| M12 | Set a name, force-quit the app, reopen — the name is still there                               | `17-room-and-player-identity-flow.md` §1                                |
| M13 | Connect Spotify, close the room, create a new one — no re-login                                | `16-spotify-session-and-playback.md` §3 (gated; expected to fail today) |
| M14 | Rotate the device on every screen — layout adapts with no stuck overlay                        | `11-runtime-and-motion-performance.md`                                  |
| M15 | Open the keyboard on the lobby name field — the field stays visible                            | `11-runtime-and-motion-performance.md` §4.2                             |
| M16 | First-run hints appear once; reset in settings brings them back                                | `18-onboarding-hint-system.md`                                          |
| M17 | Install as a PWA and repeat M4 to M11 — installed-app navigation behaves the same              | B2                                                                      |
| M18 | Enable the OS reduced-motion setting — all motion degrades, nothing breaks                     | `CLAUDE.md`                                                             |

## 9. Test-quality rules

To keep the tests from becoming a maintenance burden:

- **Test behaviour, not implementation.** Query by role and accessible name, not by CSS class. This
  also improves accessibility as a side effect.
- **No snapshot tests of rendered markup.** They fail on every design change and prove nothing.
  Snapshots are acceptable only for pure data transformations.
- **One reason to fail per test.** A test named for a behaviour that asserts six unrelated things
  is a debugging obstacle.
- **Fixtures use placeholder data only** — `TEST_ROOM_1`, `Player One`, `12345`,
  `spotify:track:TEST...`. No real identifiers anywhere in the test suite, per the organisation's
  mock-data rule.
- **No logs as tests** (`CLAUDE.md`). If a behaviour is worth a log line, it is worth an assertion.
- **Deterministic time.** Fake timers for anything involving a grace period, a countdown or a retry
  ladder; never a real sleep (four exist today, T-11).
- **Shared fixtures over duplicated literals.** Deck and room-state fixtures live in one place per
  workspace; a test file does not define its own copy (T-11).
- **Every defect in `20-bug-register.md` gets a test that fails first.** That is the only way to
  know the fix addresses the reported problem rather than something adjacent.

## 10. What remains and who owns it

| Work                                                               | Owner                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| `zIndexScale` guard; ESLint boundary rules; root `verify` script   | Review Phase 3 specifies; implementation agent executes |
| `verify`, `write-tests`, `e2e-scenario` skills                     | Review Phase 3                                          |
| E2E split, WebKit and mobile projects, timing reporter, drag tests | Review Phase 6 (T-10)                                   |
| Phase 4 server files and the review's added holes (T-03 … T-09)    | Review Phase 6, each with the feature it proves         |
| Coverage, CI workflow, ratchet                                     | Review Phase 6 (T-01)                                   |
