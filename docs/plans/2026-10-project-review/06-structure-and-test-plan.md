# 06 — Codebase Structure and Test Plan

> **Created:** 2026-10-07 on branch `fix/stability-hardening` (Phase 6 of `00-index.md` §4).
> **Status (2026-10-09):** W1 and T1 shipped (code 2026-10-07, file deletions 2026-10-09); T8,
> T10, T5, S1, S2, S3 and S4 shipped 2026-10-09 (§7 rows 1–5 done). Next: S5 (§7 row 6).
> Every finding below was re-verified
> in code on 2026-10-07 (line numbers drift; file and symbol names are the stable reference).
> **Authority:** this document sets the **structural rules, the test and tooling gates and the
> order** of the structure and test work. Step detail stays in `12` §4 (façade collapse), `15`
> (design system), `16` §5 (playback diagnostics) and `19` (testing strategy); where they disagree
> with this document, this document wins and §8 lists the correction. Owner decisions in
> `00-index.md` §5 are binding here; `05` keeps precedence for budgets and for the order of the
> robustness work.

## 0. How to use this document

1. Pick the next open work item from §7 (rollout order). Each item fits one agent session, names
   its owning layer, its "before/after" proof and the skill to use.
2. A structural item changes no behaviour. Run the narrowest relevant tests **before** the change
   and keep them green after it; any behaviour change found on the way is a defect, reported and
   fixed in a separate item with a failing test first.
3. Split a file only along the seams named here or in the referenced plan. Keep public import
   paths stable within an item unless the item says otherwise.
4. Finish with `verify` and `plan-status`; tick the acceptance line here and in the referenced
   work-breakdown document.

## 1. What changed since the review (2026-10-06 → 2026-10-07)

- **The hard-limit offenders grew.** `RoomService.ts` is 723 lines (was 718), `RoomRegistry.ts`
  328 (was 319) and `packages/shared/src/events/schemas.ts` 436 (was 428). `RoomConnectionService`
  shrank to 436 and `SpotifyAuthService` to 458 through the hotfix track. No web file has been
  split since the review; every count in F-26 still holds.
- **Decision 3 applies to test files too.** Plan 19 already treats the 848-line E2E spec as a
  violation. Five files are over 700 lines today: `RoomService.ts` (723),
  `useSpotifyPlaybackSdk.ts` (746), `apps/server/tests/roomFlow.test.ts` (1 933),
  `useGamePageActions.test.tsx` (1 086) and `apps/e2e/tests/room-entry.spec.ts` (848).
  `packages/game-engine/tests/gameFlow.test.ts` is 903 lines.
- **Corrections to the register** (applied to `01-review-findings.md`):
  - B-08: `RoomRegistry.requireHost` is **not** dead. `RoomService.buildSpotifyAuthUrl` calls it
    and `RoomRegistry.isHost` wraps it for the OAuth route; it throws the Spotify-specific code
    `ONLY_HOST_CAN_CONTROL_SPOTIFY_PLAYBACK` for every caller.
  - B-21 grew: **eight** payload handlers bypass `createSocketHandler` (seven in
    `spotifyHandlers.ts`, plus `ImportPlaylist` in `playlistHandlers.ts`), and the store-backed
    idempotency block is repeated **12×** (ten in `gameplayHandlers.ts`, two in `lobbyHandlers.ts`)
    plus two closure-based variants (rename, close). `createSocketHandler` is synchronous only.
  - F-07: `ActionButton` has nine live importers, not three or four.
  - F-23: `getCardGradient` is used three times inside `gamePage.utils.ts`; only its `export` is
    unnecessary. `formatPhaseLabel` is dead.
  - T-07: two of 35 schemas are tested (was one). T-11: eleven bespoke `vi.mock("…/socketClient")`
    blocks (was nine) and five private deck builders in server tests (was four).
- **New facts:** `packages/shared` emits `schemas.test.{js,d.ts}` into `dist/` on every build;
  `packages/game-engine/dist/tests/` holds stale compiled tests from April; `supertest` is a server
  dev dependency that no test imports; no `.prettierignore` exists, so `prettier --check .` fails
  on 26 files today (most of them under `docs/archive/`).
- **Engine removal is covered.** `packages/game-engine/tests/playerRemoval.test.ts` (eleven cases,
  hotfix B-02) proves removal of the active player, the challenger and the winner in every phase.
  T-09 keeps only same-year through the challenge path; deck exhaustion is `05` A3.

## 2. Structural rules and gates (binding)

### 2.1 File size

| Rule                                                                                                                                                                                                                                 | Gate                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| No `.ts`, `.tsx` or `.mjs` file in `apps/` or `packages/` (tests included, `dist/` and generated files excluded) above **700 lines**.                                                                                                | `scripts/check-file-size.mjs`, in `verify` |
| A file listed in the script's allowlist may only shrink; an item that splits it removes the entry. The allowlist starts with the five files in §1 plus `gameFlow.test.ts`.                                                           | same script                                |
| Soft limits from `CLAUDE.md` (component ~200, controller hook ~300, service ~300, utility ~150, CSS module ~300; a `features/ui` primitive's CSS ~200) trigger a split **when the file is next touched**, not a standalone refactor. | review checklist                           |

`scripts/check-file-size.mjs` uses Node built-ins only (like `measure-bundle.mjs` in `05` §2.3),
prints each offender with its count and exits non-zero on a new offender or a grown allowlisted
file.

### 2.2 Layer boundaries

The ruleset in `03-agent-skills-and-tooling.md` §4 is binding with one correction (§8): the engine
may import `@tunetrack/shared/constants`, a dependency-free subpath, and nothing else from shared.
`zod` must never reach the engine, and the engine must never reach `apps/*`.

### 2.3 Test gates

| Gate                                                                                                           | Where                               |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Every test file is typechecked by `npm run typecheck`; no test file is emitted into any `dist/`.               | per-workspace `tsconfig`            |
| No real sleep in any unit, component or E2E test (fake timers, or wait on a condition).                        | review checklist; `write-tests`     |
| Every server integration suite asserts `roomCount === 0` in `afterEach`.                                       | `tests/helpers/socketTestServer.ts` |
| Coverage thresholds equal the measured baseline (rounded down) and may only rise.                              | per-workspace `vitest.config.ts`    |
| E2E total runtime ≤ 4 minutes per browser project on a developer machine, reported by a reporter.              | `apps/e2e`                          |
| `verify` = format check + file-size check + typecheck + lint + unit tests (the only gate; no CI, decision 17). | root `package.json`, CI             |

## 3. Track S — Server and shared structure

### S1 · Handler pipeline (B-21, B-17) · shipped

**Shipped 2026-10-09.** `createSocketHandler` awaits a returned promise and routes its rejection
through the same error mapping, ack and audit `rejected` record; a synchronous handler still
acks in the same tick, so a same-tick replay cannot run twice. A schema failure is now audited
too. The eight bypassing handlers go through it; request/result events keep their result-event
contract through a `failureReply` hook (invalid payload, domain error, unexpected error), and
eight new codes (seven `INVALID_*_PAYLOAD`, `PLAY_SPOTIFY_TRACK_FAILED`) name their failures in
acks and audit. `startAuthorizedRequest` is deleted; four Spotify lookups share one
registration helper. B-17: `logAcceptedSocketEvent` and the never-populated `playerId` and
`durationMs` are deleted, nothing new reaches the audit sink. Deviations: the per-arrival id
queue stays (it carries the 2026-09-09 rejection correlation); successes settle their entry and
only known client events get one, so it is bounded. The twelve copied replay blocks had
already become `roomActionIdempotency` before S1, so the `idempotent: true` flag and the
≥ 100-line reduction no longer apply; close-room keeps its per-socket replay because closing
deletes the room-scoped ack store. Proof: `createSocketHandler.test.ts` (+6),
`realtimeAuditLogger.test.ts` (+2), `tests/realtime/musicSetupReplies.test.ts` (4); every
existing server test and E2E green unchanged.

### S2 · Façade collapse (B-08, B-29 `RoomService`, `RoomRegistry`) · shipped

**Shipped 2026-10-09.** `RoomRegistry.ts` and `RoomService.ts` are deleted. `app/createRoomServices.ts`
builds one `RoomServices` container (`lobby`, `gameplay`, `connection`, `acks`, `store`, `events`,
`playlists` = `decks/PlaylistOrchestrator`, `spotify` = `spotify/SpotifyOrchestrator`) that every
handler, the OAuth route and shutdown receive. `rooms/RoomEvents` announces rename, close, expiry,
socket departure and playback handoff; the Spotify orchestrator subscribes, so `rooms/` imports no
Spotify code. `rooms/roomAuthorization.ts` holds `requireHost` (caller-supplied code), `isHost`
and `requireSpotifyPlaybackOwner`; `RoomActionAcks` owns replay lookup. Durations come only from
`env.ts` (B-28 duplicate defaults gone); tests use `createTestRoomCore` / `createTestRoomServices`.
Deviations: lifecycle logging moved into the room services through `rooms/roomLifecycleLog.ts`,
not into handlers (a handler would have to branch on the game outcome, which §1 of the backend
rules forbids); the other inline host checks in the room services are unchanged; test call sites
changed with construction (each call now names its owning service), so plan 12's "zero test
modifications" did not hold. `RoomLobbyService` (466) and `RoomConnectionService` (462) exceed the
450-line target; their split is S4. Proof: 257 existing server tests green,
`tests/app/createRoomServices.test.ts` (3, wiring), E2E green.

### S3 · Spotify module splits and duplicates (B-29, B-22) · shipped

**Shipped 2026-10-09.** `SpotifyApiClient` became `SpotifyAccountsClient`, `SpotifyCatalogClient`
and `SpotifyPlayerClient` over `spotifyApiTypes.ts` and one status mapping (`spotifyRequest.ts`);
`SpotifyDiscoveryService` became `SpotifyPlaylistSearch`, `SpotifyCandidateGenerator`,
`CandidateSessionStore` and pure `candidateSelection.ts`; playback left `SpotifyAuthService` for
`SpotifyPlaybackController`; music-search mappers moved to `musicSearchMappers.ts`. One
`SpotifyClientCredentials` replaces the three private token wrappers, `decks/trackDedupe.ts` the four
dedupe copies (URI or normalised title + primary artist, so album and compilation copies count once),
`cardToPublicTrackInfo` exists once and the inline playback-result type is gone. Largest Spotify file
333 lines. Deviations: the client-credentials test moved from `SpotifyAuthService.test.ts` to
`SpotifyClientCredentials.test.ts` (the in-flight sharing itself shipped with `05` A9); every Web API
read now maps 401/403/404 the same way. Proof: `tests/decks/trackDedupe.test.ts` (5),
`spotifyClients.test.ts`, `SpotifyCandidateGenerator.test.ts`, every existing Spotify test green.

### S4 · Rooms and timers (B-29, B-28) · shipped

**Shipped 2026-10-09.** Imported-deck mutation moved to `rooms/RoomDeckService` (`services.deck`);
`RoomConnectionService` hands grace decisions to `RoomDisconnectPolicy` and host changes to
`RoomHostTransfer`; one `KeyedTimerManager` replaces both timer managers; `mapRoomStateToSummary`
lives in `roomStateMappers.ts`. B-28: the root `PublicRoomState.targetTimelineCardCount` is gone
(settings only); `CLIENT_ORIGIN` is validated per entry; gameplay handler logs are `debug`;
`spotifyRoutes.ts` awaits the callback and answers 500 on a throw; removing a player while the rest
are offline schedules the all-offline expiry. Deviation: a kick cannot cause that state (the kicker
is the connected host), so the failing test uses the leave path that shares the removal code.
`RoomLobbyService` 339 and `RoomConnectionService` 261 lines. Proof: `disconnectLifecycle.test.ts`
(+1), `tests/http/spotifyRoutes.test.ts` (2), `KeyedTimerManager.test.ts` (3); existing suites green.

### S5 · Shared contracts (B-13, B-23, B-28 contract nits)

- **One source per payload type:** client payload types are `z.input<typeof …Schema>` exported
  from the schema modules; delete the 36 hand-written interfaces in `clientEvents.ts` (they drift
  today: optional-with-default fields are required in the interfaces, and
  `UseSpotifyCandidatesPayload.tracks` has the wrong element type).
- Split `schemas.ts` (436) into `lobbySchemas`, `gameplaySchemas`, `playlistSchemas`,
  `spotifySchemas` behind the existing export path.
- Merge the near-identical track shapes into one public track type plus the curated variant;
  delete the unused `TrackCardInternal`.
- **Gameplay constants have one owner:** `packages/shared/src/constants/` becomes a dependency-free
  subpath export `@tunetrack/shared/constants`; the engine imports TT costs and the token cap from
  it (B-13); `errorMessages.ts` interpolates costs instead of the literals "1 TT" and "3 TT". Add
  `MIN_RELEASE_YEAR` and `MIN_PLAYLIST_TRACK_COUNT` and use them in schemas, services and the web
  (`PlaylistTrackDetailsSheet` `min={1900}`, `SpotifyQuickPicksPanel` `10`).
- Remove contract values nothing produces: `RoomClosedPayload.reason: "closed"`, `"not_host"`,
  the unused `ActionAck<TResult>` generic and `ROOM_EMPTY_AFTER_KICK`. `ServerErrorPayload.code`
  becomes the `ServerErrorCode` union from `05` A4 — do S5 after A4.
- **Before/after:** typecheck across all workspaces is the proof that types still line up; the
  T8 schema tests (§5) land first so behaviour of every schema is pinned before the split.

## 4. Track W — Web structure

### W1 · Dead code and dead files (F-23, F-07 dead buttons, F-25 scripts) · shipped

**Shipped 2026-10-07** (unused exports, dead helpers and duplicate motion branches removed).
The dead files followed on 2026-10-09 after a zero-importer check: both `Room*ActionButton`
components with their CSS and colour-guard entry, `GamePageReconnectToast` (+ CSS),
`usePlayerReconnectToast`, `useGamePageChallengeCelebrationState`, `apps/web/scripts/*.py`,
and the overlay leftovers `MotionDialogPortal`, `modalMotionTokens` and
`playlistEditorHistory` (the overlay ratchet is now a plain rule).

### W2 · `useSpotifyPlaybackSdk` (746, hard violation; F-22)

Split into `spotifySdkLoader.ts`, `useSpotifyToken`, `useSpotifyPlayerLifecycle`,
`useSpotifyPlayRequest` and a pure `playbackPositionInterpolation.ts`. Move the `RoomClosed`
subscription into the room connection hook's callbacks. The console calls move unchanged; the
diagnostics channel is `16` §5 and starts only after this split. **Before/after:** add
`playbackPositionInterpolation.test.ts` and a `useSpotifyPlayerLifecycle` test with
`fakeSpotifyPlayer` **before** moving code; `useHostPlayback.test.ts` green throughout.

### W3 · `useGamePageActions` (455) and its test (1 086)

After `05` C1 (stable handlers). Extract a generic `useAckedAction` (pending state, retry ladder,
toast), then `usePlacementActions`, `useChallengeActions`, `useTtActions`, `useRoomActions`. The
retry ladder is tested **once**, at `useAckedAction`; each family test checks event, payload and
button gating only; the twelve harnesses move to `useGamePageActions.harnesses.tsx`.
**Before/after:** the old test file stays green until the new files cover each family, then it
is deleted; total runtime of the web suite does not grow.

### W4 · Game-page components (F-26, F-16 game half, F-19 leaf props)

After `05` C1 and C5. One item per row:

| File (lines)                     | Split / change                                                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TurnActionDock.tsx` (359)       | `SkipTrackAction`, `BuyCardAction`, `ConfirmPlacementAction`, `OfflinePlayerPanel`, `useTurnSkipCountdown`; one action list rendered by a stacked or flat layout (F-16)    |
| `ChallengeActionPanel.tsx` (303) | `ChallengeCallout`, `ChallengeActionDock`, pure `challengeCountdownStage.ts`                                                                                               |
| `GameMenuPlayerItem.tsx` (357)   | `GameMenuPlayerRow`, `GameMenuPlayerActions`, `KickPlayerConfirmDialog`                                                                                                    |
| `TimelinePanel.tsx` (336)        | `useCorrectPlacementAnimationKey`, `useDragOverlaySize`, `TimelinePanelHints`                                                                                              |
| `GamePage.types.ts` (335)        | `gamePageActionTypes`, `timelinePanel.types`, `gamePageModels.types`                                                                                                       |
| leaf props (F-19)                | `GameMenuPlayerItem` and `PlaybackTabContent` receive narrow props from the controller, not `PublicRoomState` (the other leaves shipped in `05` C1)                        |
| small moves                      | `useMobileControlPortalTarget` out of `ActionDock.tsx` (into the `05` C5 viewport store); `useLeaveGameGuard` takes `isPresent` as an argument instead of importing Framer |

**Before/after:** the component's existing test stays green; a component without one gets a
render test first (T9).

### W5 · Lobby and Spotify setup (F-26)

Coordinate with `04` WPs, which edit the same files; do each split in the same session as the
`04` WP that touches the file, or after it.

| File (lines)                           | Split / change                                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `SpotifyPlaylistSearchPanel.tsx` (448) | `SmartSearchVirtualResultList`, selection toolbar, search-type chips                                                                        |
| `SpotifySetupContent.tsx` (441)        | one section per source tab (`PlaylistUrlImportSection`, `SavedPlaylistsSection`); move `getPlaylistImportAction` and the result row out     |
| `useHostPlayback.ts` (390)             | `useFreeTierPreviewPlayback`, `usePremiumPlayback`, composed by `useHostPlayback`                                                           |
| `useLobbySpotify.ts` (307)             | pure `buildLobbySpotifyState`, `usePlaylistEditorHistory`                                                                                   |
| track-details editing                  | one track-details editor with one save path (salvaged, §9): Quick picks, opened playlists and the playlist editor stop keeping three owners |

`LobbyPageMobile.tsx` (312) is resolved by `04` WP (`useLobbySetupModel`, F-16 lobby half); the
display-name single owner (D7/E6) by `05` B1.

### W6 · CSS modules (15 modules over 300 lines)

Split **when touched**, never as a standalone sweep, and together with the colour and z-index
migrations that touch the same module (`15` Phase 3, `05` E1). Seams: `timelineCards` →
preview/timeline card; `spotifyDiscovery` → search bar / playlist list / smart results;
`spotifySetupShell` → sheet / connect state; `AppShellMenu` → sheet / panels / card-style preview;
`lobbySettings` → player list / host settings / room actions; `timelinePanelShell` → panel / view
switcher / drag overlay; `gamePageChrome` → header / leaders strip / screen; `spotifyPanels` →
opened playlist / quick picks / apply choice; `gamePageActionPanelsChallenge` → challenge callout /
offline panel / action rail; `gamePageMenu` → player item / token actions; `playlistEditChrome` →
sheet / track details / status control; `timelineCelebration` → timeline / correct placement;
`lobbyLayout` → layout / section header; `gamePagePlayback` → playback tab / history tab.
**`SettingField.module.css` (431, a primitive) is the exception and is split first**, together
with replacing its `transition: left` by a `transform` (salvaged, §9). Button consolidation is
`15` Phase 1 and is not repeated here.

## 5. Track T — Tests and tooling

### T1 · Tooling baseline (T-01, T-03, T-12 part) · shipped

**Shipped 2026-10-07**: root `verify` and `verify:full`, `format:check`, `check:size`,
`.prettierignore`, `tsconfig.test.json` in server, engine and shared, wider lint scope. On
2026-10-09 the shared build config excluded `src/**/*.test.ts`, so a clean build ships no test
file (proof: a planted type error in `schemas.test.ts` still fails `typecheck`); the stale
`packages/game-engine/dist/tests/` was removed the same day.

### T2 · Boundary lint (T-02)

Implement `03` §4 (with the §8 correction). Add `eslint-plugin-react-hooks` (approved,
decision 16); express the layer rules with the built-in `no-restricted-imports`, no extra plugin. `exhaustive-deps` starts
as `warn` with the current count recorded and may only fall. **Before/after:** the three fixture
imports in `03` §4 Acceptance fail `npm run lint`; the tree lints clean with seeded allowlists.

### T3 · Coverage and ratchet (T-01)

- `@vitest/coverage-v8` (approved, decision 16) in every Vitest workspace, `reporter: ["text",
"json-summary", "lcov"]`, exclusions from `19` §7.1.
- Measure once, commit the numbers as thresholds (rounded down to whole percent). Each wave that
  adds tests raises the touched workspace's thresholds to its new measured floor; never lower one
  without a written reason in the same change.
- The eventual floors in `19` §7.1 stay targets, not gates.

### T4 · CI workflow (T-01) — **parked (decision 17)**

Not implemented until the owner reopens it; the specification is kept so it can start without
re-planning. One GitHub Actions workflow (compliance review first, §10), on pull requests and pushes to `main`:

1. `npm ci` with the npm cache; `verify` (format, size, typecheck, lint, unit tests with coverage
   summary written to the job summary).
2. `npm run build`; `npm run e2e` (Chromium; WebKit and mobile once T11 lands) with the Playwright
   browser cache; upload the HTML report and traces **on failure only**.

Hardening: `permissions: contents: read`; third-party actions pinned to a full commit SHA; no
secrets, no environment, no Spotify or Axiom values (Spotify is faked; the server's env schema
already supplies test values under `NODE_ENV=test`); artefact retention ≤ 7 days, since traces
contain placeholder data only. The merge requirement on `main` is a repository setting the owner
applies.

### T5 · Server test structure (T-11, T-08 leak guard) · shipped

**Shipped 2026-10-09.** `roomFlow.test.ts` became `tests/realtime/{lobby,gameplayReplay,
moderation,curatedPlaylist}.test.ts` (longest test 59 lines) on helpers in `tests/support/`
(the existing folder, not a new `helpers/`): `socketTestServer.ts` (server, clients,
`createTestRoomService({ deck })`), `waiters.ts` (every wait times out after 2 s naming the
awaited event), `roomFixtures.ts` (host/guest seats, `sendTwice`, `expectAppliedOnce`) and
`decks.ts` (the six private decks are now `buildYearDeck`, `fourDecadeDeck`,
`turnOrderDeck`). `hostTransfer.test.ts` uses fake timers. 238 → 245 server tests (long tests
split, none dropped); suite wall time 3.4 s → 1.5 s. The leak guard is narrower than
planned: teardown clears every room timer the test started, but does not assert
`roomCount === 0`, because in-game rooms deliberately outlive their sockets (reserved players,
1 h offline TTL).

### T6 · Server coverage holes (T-05, T-08, review additions)

| New file                                           | Proves                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `realtime/socketAuthorization.test.ts`             | Table-driven over **every** client event: non-member, guest on host-only events, non-active player on turn actions, wrong phase — each gets its code and no state change |
| `app/env.test.ts`                                  | Env schema defaults, rejections and the `NODE_ENV=test` override guard                                                                                                   |
| `app/createSocketServer.test.ts`                   | Ping values, buffer size, CORS origins (shipped 2026-10-07, `05` A7)                                                                                                     |
| `http/routes.test.ts` (uses `supertest`)           | Health route; OAuth callback success, bad `state`, upstream failure (no hang, S4)                                                                                        |
| `spotify/SpotifyOAuthService.test.ts`              | State single use and expiry, account-type detection, error mapping                                                                                                       |
| `spotify/SpotifyTokenStore.test.ts`                | Per-room isolation, expiry, removal on room close                                                                                                                        |
| `spotify/SpotifySmartSearchParser.test.ts`         | Pure parser cases                                                                                                                                                        |
| `spotify/discovery.test.ts`, `musicSearch.test.ts` | Candidate selection and mapping with a fake catalogue client                                                                                                             |
| `spotify/noSecretsInLogs.test.ts`                  | Token-shaped values never reach a log line or audit payload                                                                                                              |

`rateLimit`, `shutdown`, `metadataOverride` and the `revision` half of `statePayload` arrive with
their features (`05` A6, A8; `17` §3; `05` A10). `supertest` is kept because `http/routes.test.ts`
uses it.

### T7 · Engine (T-09)

Split `gameFlow.test.ts` (903) into `turnFlow`, `challengeFlow` and `ttActions` test files. Add
same-year cases through the challenge path (challenger places inside the same-year block; both
placements valid). Deck exhaustion tests come with `05` A3. Target ≈ 90 engine tests (`19` §2).

### T8 · Shared contracts (T-07) · shipped

**Shipped 2026-10-09.** Table-driven tests for the `lobby`, `gameplay`, `playlist` and `spotify`
families cover all 35 payload schemas: a valid payload passes, each documented limit passes on
its edge and fails one step past it, defaults are applied, and a coverage test fails when an
exported payload schema has no case. Proof: `packages/shared/tests/payloadSchemas.test.ts`
(214 shared tests; raising the name limit to 25 fails exactly the three name cases).

### T9 · Web tests (T-04, T-06, T-11 web)

- `apps/web/vitest.config.ts`: `css: true`, then remove the `<strong>` counting workaround in
  `TimelinePanel.test.tsx`.
- Replace the eleven bespoke `vi.mock("…/socketClient")` blocks with `test/fakeSocket.ts`; make
  `renderWithProviders` the default for component tests.
- `useHostPlayback.test.ts`: fake timers instead of the real 3.2 s wait (the slowest web test).
- Render tests for every `features/ui/primitives` component and for `BottomSheet`, `Dialog`,
  `RoomResetModal` (one case per recovery reason), `ToggleSwitch`, `RangeField`,
  `AppLoadingOverlay`, `HintBubble` and the hint anchor hook (`18`). Query by role and name.
- Hook tests for the lobby Spotify hooks (`useLobbySpotify`, `useSpotifyAuth`,
  `useSpotifyPlaylistImport`, `useSpotifyCandidates`, `useSpotifyOpenedPlaylist`,
  `useSpotifySmartSearch`, `useSavedPlaylistsController`) against `fakeSocket`.
- Page render tests: `HomePage`, `GamePageHeader`; `LobbyPageMobile.test.tsx` stops mocking six
  children to `null` once `04` WP makes the assembly layout-only.

### T10 · Guards (T-12, F-18) · shipped

**Shipped 2026-10-09.** `zIndexScale.test.ts` already existed;
`i18nKeyParity.test.ts` now fails when a `hintRegistry` title or body key is missing from a
catalogue; `noHardcodedColors.test.ts` adds an `rgb()`/`rgba()` ratchet (literal channels
only) seeded with nine files. Proof: a planted missing hint key and a planted `rgba()` in
`HintBubble.module.css` each fail exactly their new test.

### T11 · End to end (T-10)

- Split `room-entry.spec.ts` by family (`lobby`, `gameplay`, `challenge`, `resilience`,
  `navigation`, `hints`) with a `test.extend` fixture that provides a host and a guest in a room
  (replaces the prologue repeated in all sixteen tests); move helpers to `tests/support/`.
- Remove the two real waits (`waitForTimeout(2_000)`, the 2.5 s `setTimeout`): wait on the state
  they stand in for.
- Add a JSON reporter and `apps/e2e/scripts/check-e2e-budget.mjs` (Node built-ins) that fails
  when a project exceeds 4 minutes.
- Add a `webkit` project and a mobile-viewport project (Playwright's `iPhone 13` descriptor); the
  touch-drag pair from `19` §5.4 lands after `05` C3.
- **Before/after:** sixteen scenarios still pass in Chromium after the split, before new projects
  are added.

## 6. What this plan deliberately leaves out

- Mutation testing and a flaky-test quarantine: not needed at this suite size; revisit if CI shows
  repeated flakes.
- A `deploy` skill (proposed by the docs review): declined; deployment is documented in
  `docs/operations/` and changes rarely.
- Pre-commit hooks (`husky`, `lint-staged`): not added; `verify` is the gate, and git is
  the owner's job.
- Splitting files that are under the soft limit or are not touched by a planned change.

## 7. Rollout order

One item = one agent session. Items in the same row can run in parallel sessions only if their
files do not overlap. "After" refers to `04`/`05` packages that edit the same files.

| Order | Items          | After                         | Skills                                       | Why this order                                               |
| ----- | -------------- | ----------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| 1     | **W1**, **T1** | —                             | `verify`                                     | Free deletions; a real `verify` gate before anything moves   |
| 2     | T8, T10, T5    | T1                            | `write-tests`                                | Pin schemas, guards and server test helpers before refactors |
| 3     | S1             | T5, `05` A1                   | `add-socket-action`, `write-tests`           | One handler pipeline; unblocks S2                            |
| 4     | S2             | S1, `05` A2                   | `write-tests`                                | Removes the hard-limit violation and the double façade       |
| 5     | S3, S4         | S2                            | `write-tests`                                | Spotify and rooms splits, duplicate removal                  |
| 6     | S5             | T8, `05` A4                   | `add-socket-action`                          | One contract source; error-code union                        |
| 7     | W2, T7         | —                             | `write-tests`                                | Second hard-limit violation; engine breadth                  |
| 8     | T2, T3         | T1                            | `verify`                                     | Boundary lint and coverage baseline                          |
| 9     | T6, T9         | S2 (T6)                       | `write-tests`                                | Coverage holes, measured by T3                               |
| 10    | T11            | T1                            | `e2e-scenario`                               | E2E split, WebKit, mobile, budget                            |
| 11    | T4             | parked (decision 17)          | `verify`                                     | CI runs the finished gate                                    |
| 12    | W3, W4         | `05` C1, C5                   | `add-ui-component`, `write-tests`            | Game-page splits on stable inputs                            |
| 13    | W5, W6         | the `04` WP touching the file | `add-ui-component`, `design-token-migration` | Split with the change that touches the file                  |

W1 and T1 can be handed out immediately and in parallel.

## 8. Corrections to other documents

| Doc and section            | Was                                                    | Now (this document)                                                                                               |
| -------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `01` B-08                  | `RoomRegistry.requireHost` is dead code                | used by the Spotify auth path; replaced by `roomAuthorization` (S2)                                               |
| `01` B-21                  | five bypassing handlers, block repeated 11×            | eight handlers, 12 + 2 blocks (§1)                                                                                |
| `01` F-07, F-23            | `ActionButton` 3–4 importers; `getCardGradient` unused | nine importers; `getCardGradient` is used internally, only the export goes (W1)                                   |
| `03` §4                    | engine must not import `@tunetrack/shared` at runtime  | may import the dependency-free `@tunetrack/shared/constants` only (S5)                                            |
| `03` §5                    | `verify` = typecheck + lint + test; coverage deferred  | adds `format:check` and `check:size`; coverage is T3                                                              |
| `05` A1                    | host-only: import, candidates, get-tracks              | also `search_spotify_music` (smart search), `search_spotify_playlists` and `open_spotify_playlist` (salvaged, §9) |
| `05` A4                    | proof checks map keys against the union                | also asserts every `ServerErrorCode` has an `en` and `hu` catalogue entry (salvaged)                              |
| `12` §4.2                  | façade collapse scheduled after `12` Phases 1–3        | ordered by §7 here (S1 → S2)                                                                                      |
| `19` §7.2                  | single GitHub Actions workflow                         | parked by decision 17; specification kept in T4                                                                   |
| `19` §1, §5.2, §6, §7, §10 | counts and owners as of 2026-10-06                     | counts in §1; items T1–T11 here own the open work                                                                 |

## 9. Items carried from the review input

The raw review reports were deleted with this phase (retrievable from git history at commit
`4cb4e48`). Everything actionable is in `01`, `04`, `05`, `10`–`20` or here; the items below were
found only in the raw reports and now have an owner.

| Item                                                                                                                                                | Owner                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| The Spotify search and opened-playlist events need only membership, so a guest can spend the room's Spotify quota                                   | `05` A1 (§8)                                                  |
| About ten engine and store error codes have no catalogue entry and show the generic message                                                         | `05` A4 (§8) — resolved 2026-10-07                            |
| The same song on an album and a compilation enters the deck twice (two Spotify ids)                                                                 | S3 (`trackDedupe`) — resolved 2026-10-09                      |
| Spotify Free: no state distinguishes "loading" from "this song has no preview" during a turn                                                        | `16` §2 (Free-tier parity)                                    |
| A playback hint ("audio plays on the host's phone") was proposed and neither added nor declined                                                     | `04` §7 (owner of the catalogue)                              |
| Year-flag patterns miss singles re-released on later albums, soundtracks and "(Radio Edit)"; suggest the earliest known album year for compilations | `04` §3.7                                                     |
| One track-details editor has three owners and three save paths                                                                                      | W5                                                            |
| Swipe-left delete in the playlist editor has no visible affordance; the save button next to the name field is icon-only                             | `04` §8                                                       |
| The four-deep overlay stack has three different close affordances and no breadcrumb                                                                 | `14` Phase 3                                                  |
| `index.html` lacks `preconnect` to the Spotify SDK host and hard-codes the theme colour                                                             | `10`                                                          |
| `SettingField.module.css` animates `left`                                                                                                           | W6                                                            |
| Framer `drag="x"` swipe-to-delete is a second drag system next to @dnd-kit; record it as deliberate                                                 | `docs/rules/frontend_engineering_rules.md` when W5 touches it |
| Dev CORS admits private IPv4 ranges for LAN play; document it                                                                                       | `docs/rules/backend_engineering_rules.md` §10 — done with S4  |
| `savedPlaylists` stores third-party artwork and preview URLs on the device                                                                          | §10 (data-minimisation note)                                  |

## 10. Compliance, security and open owner decisions

- **GitHub Actions** is a third-party processing environment, even though the repository is
  already hosted on GitHub. T4 is parked (decision 17); if it is reopened, it needs the compliance review required for third-party services
  before it is enabled. Supply-chain controls (ISO/IEC 27001 Annex A.8.28 secure coding, A.8.30
  outsourced development; NIS2 Art. 21(2)(d) supply-chain security): read-only token, actions
  pinned to commit SHAs, no secrets, short artefact retention, placeholder data only in traces.
- **New dev dependencies** (`@vitest/coverage-v8`, `eslint-plugin-react-hooks`, approved by
  decision 16) are build-time only and process no personal data, but each widens
  the supply chain; pin through the lockfile and check the installed versions.
- **S1 deletes, rather than wires, accepted-event auditing**, so no additional payloads reach the
  audit sink (GDPR Art. 5(1)(c)).
- **`savedPlaylists`** keeps third-party artwork and preview URLs in device storage. No personal
  data, but it belongs in the storage review that `16` and decision 10 already require before a
  client-facing deployment.
- All new fixtures use placeholder data (`TEST_ROOM_1`, `Player One`, `12345`,
  `spotify:track:TEST…`, `YOUR-RAILWAY-DOMAIN`).

**Owner decisions (2026-10-07):** decision 16 approves `@vitest/coverage-v8` and
`eslint-plugin-react-hooks`, with boundary rules through the built-in `no-restricted-imports`
(no `eslint-plugin-boundaries`); decision 17 parks CI, so `npm run verify` stays the only gate.

## 11. Acceptance

- [ ] No `.ts`/`.tsx`/`.mjs` file in `apps/` or `packages/` above 700 lines; the size-check
      allowlist is empty (decision 3).
- [x] `npm run verify` exists, includes format and size checks, and is the gate (T1).
- [ ] Every test file is typechecked; no `dist/` contains a test file.
- [x] One socket handler pipeline; no copied idempotency block; `RoomRegistry` and `RoomService`
      deleted (S1, S2).
- [ ] One payload type source (Zod), one owner per gameplay constant, no duplicated helper from
      B-22.
- [ ] Boundary lint and the z-index, hint-key and `rgb()` guards run in `verify`.
- [ ] Coverage thresholds committed at the measured baseline in every workspace.
- [ ] E2E split per family, WebKit and mobile projects green, runtime budget reported.
- [ ] (Parked, decision 17) CI green on `main` with traces on failure and no credential in the
      configuration.

## 12. Findings coverage

| Finding | Item       | Finding | Item                  | Finding | Item        |
| ------- | ---------- | ------- | --------------------- | ------- | ----------- |
| B-08    | S2         | F-07    | W1 (dead), `15`       | T-01    | T1, T3, T4  |
| B-13    | S5         | F-16    | W4 (game half)        | T-02    | T2          |
| B-17    | S1         | F-18    | T10, `15`             | T-03    | T1          |
| B-21    | S1         | F-19    | W4 (leaf props)       | T-04    | T9          |
| B-22    | S3         | F-22    | W2, `16` §5           | T-05    | T6          |
| B-23    | S5         | F-23    | W1                    | T-06    | T9          |
| B-28    | S2, S4, S5 | F-24    | `04` §8, `15`         | T-07    | T8          |
| B-29    | S2–S5, T5  | F-25    | W1 (scripts), `05` D5 | T-08    | T5, T6      |
| F-26    | W2–W6      | U-12    | `04` §8, T9           | T-09    | T7, `05` A3 |
|         |            |         |                       | T-10    | T11         |
|         |            |         |                       | T-11    | T5, W3, T9  |
|         |            |         |                       | T-12    | T1, T10     |
