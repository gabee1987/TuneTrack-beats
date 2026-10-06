# TuneTrack-beats documentation audit (read-only)

Audit date: 2026-10-06 · Branch `fix/stability-hardening` at `629dc8a` · Scope: every document the owner listed, plus `.claude/`. `docs/archive/` was only listed (15 files, 13.7-42.7 kB each), never read.

Code facts established for this audit (all verified by grep/ls/test run, not from docs):

| Fact                                    | Value                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests now                          | **400 passing / 84 files** — server 137/23, web 230/58, engine 31/2, shared 2/1 (`npm test`, exit 0)                                                                                                                                                                                                                                                                                     |
| Web component tests (`*.test.tsx`)      | 19 (jsdom + RTL wired: `apps/web/vitest.config.ts` sets `environment: "jsdom"`, `setupFiles`)                                                                                                                                                                                                                                                                                            |
| E2E                                     | `apps/e2e` Playwright, **16 tests in one 848-line file** `apps/e2e/tests/room-entry.spec.ts`, Chromium project only                                                                                                                                                                                                                                                                      |
| Guard tests present                     | `noCssBarrels`, `noHardcodedColors`, `i18nKeyParity` (all three with pending-migration allowlists); `zIndexScale` **absent**                                                                                                                                                                                                                                                             |
| Web `src/` top level                    | `app/ features/ hooks/ pages/ services/ test/` — **no `components/`, `utils/` is empty**                                                                                                                                                                                                                                                                                                 |
| Web `features/`                         | app-shell, hints, i18n, loading, mobile-shell, motion, preferences, profile, rooms, theme, toast, ui — **no `overlay/`, no `viewport/`**                                                                                                                                                                                                                                                 |
| Server `src/`                           | app, decks, http, realtime, rooms, **spotify (10 files)**                                                                                                                                                                                                                                                                                                                                |
| Largest server file                     | `apps/server/src/rooms/RoomService.ts` **718 lines**; `RoomRegistry.ts` 319; `RoomConnectionService.ts` 456; `RoomLobbyService.ts` 438                                                                                                                                                                                                                                                   |
| Zustand stores                          | `features/preferences/uiPreferences.ts`, `features/profile/playerProfile.ts` (hints use plain localStorage + custom event)                                                                                                                                                                                                                                                               |
| Hex literals in `*.module.css`          | **94** (unchanged since audit)                                                                                                                                                                                                                                                                                                                                                           |
| Raw `z-index` literals outside `[-1,9]` | 1600×3, 1500, 1400×2, 1200×2, 1100×2, 880×2, 5000, 130, 30, 20, 12                                                                                                                                                                                                                                                                                                                       |
| `zIndexPrimitives`                      | still ends at `celebration: 700` (no raised/sheet-nested/dialog-nested/hint/blocking)                                                                                                                                                                                                                                                                                                    |
| Bundle work                             | no `LazyMotion` (128 `motion.<tag>` call sites), no `sideEffects` flag, no shared subpath exports, `vendor-zod` branch still in `vite.config.ts`, both i18n catalogues still parsed eagerly, all 6 CSS barrels still exist                                                                                                                                                               |
| Runtime perf                            | `gamePage.constants.ts` unchanged (860 ms / 180 ms / 4 px / 120 px), `PlaylistTrackList` still `motion.div`, capture-phase `pointerdown` listener still in `HostPlaybackProvider.tsx:75`, own `resize` listeners in `usePageLayoutMode.ts:32` and `main.tsx:39`                                                                                                                          |
| Socket server                           | `createSocketServer.ts` sets only `cors` + `maxHttpBufferSize`; no `rateLimit.ts`; no SIGTERM/SIGINT handling; timers still `unref()`                                                                                                                                                                                                                                                    |
| Socket client                           | `io(url, { autoConnect: false })` only; `"Connecting"/"Disconnected"` English literals still in `useLobbyRoomConnection.ts:86` and `LobbyHeader.tsx:22-24`; no `ConnectionBanner`/`useConnectionState`                                                                                                                                                                                   |
| Acks                                    | `packages/shared/src/events/actionAck.ts`, `apps/web/src/services/socket/emitAction.ts`, `requestId` LRU in `RoomStore.ts:72-87`, `requestId?` on all mutating payloads                                                                                                                                                                                                                  |
| Session                                 | `resetPlayerSession()` still deletes the durable id and is still called from `useGameRoomConnection.ts:55` and `useLobbyRoomConnection.ts:100`                                                                                                                                                                                                                                           |
| Spotify                                 | `position_ms` sent (`SpotifyApiClient.ts:551`); `restart`/`needsUserGesture`/`hasEnded` in `useHostPlayback.ts`; tokens still keyed by room (`SpotifyTokenStore.ts:17`); no credential store; no `mediaSession`; 14 `console.*` calls in `useSpotifyPlaybackSdk.ts`                                                                                                                      |
| Identity                                | `features/profile/` present; `roomCodeGenerator.ts` present; no `override_revealed_track` event; 3 stale refs to `getRememberedPlayerDisplayName`/`DEFAULT_DISPLAY_NAME`/`applySetupChanges` remain                                                                                                                                                                                      |
| Hints                                   | 11 hint ids in `hintRegistry.ts` (`home-start` absent); storage key `tunetrack.hints.v1`; settings toggle/reset in `AppShellMenuPanels.tsx`; `HintBubble` renders via `createPortal`, no `IntersectionObserver`, no `HintProvider`/`HintAnchor`                                                                                                                                          |
| Design system                           | 10 primitives in `features/ui/primitives/`; `ActionButton`, `RoomPrimaryActionButton`, `RoomDangerActionButton`, `CloseIconButton`, `BottomSheet`, `TextInput`, `RangeField`, `SelectInput`, `ToggleSwitch`, `SettingField` all still in `features/ui/`; `Skeleton` used only by `JoinRoomPage` and `DesignSystemPage`; legacy `--radius-card/panel/input/button` still in `globals.css` |
| Routing                                 | `getRouteOrder` in `AppRoutes.tsx:6-14` still maps `/game/*`→2, `/lobby/*`→1, else 0; no `onExitComplete`; exit variant has no `pointerEvents: "none"`                                                                                                                                                                                                                                   |
| Repo hygiene                            | no `.github/`, no coverage config, no root `verify` script, no ESLint `no-restricted-imports`; `develop` branch exists but `origin/HEAD` → `main` and work is on `fix/*`                                                                                                                                                                                                                 |
| `.claude/`                              | only `settings.local.json` (8 Bash allow rules). No skills, agents, commands, hooks, project `settings.json`, or `CLAUDE.local.md`                                                                                                                                                                                                                                                       |

---

## 1. Per-document findings

Legend for verdicts: **KEEP** / **TRIM** / **MERGE INTO x** / **ARCHIVE** / **DELETE**. Word counts are `wc -w`.

### 1.1 `C:\Coding\TuneTrack-beats\CLAUDE.md` — 1 567 words, 225 lines

**Purpose/audience.** The one file Claude Code auto-loads: product vision, game rules, look-and-feel, tech stack, architecture principles, layer ownership, coding principles, workflow, testing. Normative.

**Status vs code.**

- Frontend layer table lists `components/` (does not exist) and `utils/` (empty directory). `hooks/` holds two files. Real cross-page layer is `features/` (12 modules) — the table under-describes it.
- Backend layer table omits `spotify/` (10 files, the largest server module) and `decks/PlaylistImportService.ts`.
- Monorepo structure omits `apps/e2e`.
- Tech stack omits Express, Pino, react-router-dom, `@tanstack/react-virtual`, Playwright, the `.properties` i18n catalogues. "Zustand (app-wide UI prefs only)" is slightly loose — `features/profile/playerProfile.ts` is also a Zustand store; hints deliberately do not use Zustand.
- "Host disconnect → first remaining player inherits host role" omits the 30 s `HOST_TRANSFER_GRACE_MS`. "Last player leaves → room removed" is now nuanced by the 2026-09-30 decisions (explicit leave/kick/close only; all-offline rooms close after `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS`). Doc 04 §1.1 has to explain what CLAUDE.md "really means" — the normative file should say it itself.
- Touch target **44 × 44 px** contradicts `design_system.md` (**48 px**, `--size-touch-target`).
- File-size rule "Above 500 lines = must split" contradicts AGENT.md (700+), backend rules (700+ is debt), frontend rules (600+). `RoomService.ts` at 718 violates every one of them.
- `docs/README.md` pointer and the "do not read archive" rule are correct.

**Overlap.** ~55-60 % is restated elsewhere: Look & Feel (≈45 lines) ≈ `design_system.md` §1/§5/§7; Architecture Principles + layer tables ≈ backend rules §3-5 and frontend rules §4; Coding Principles ≈ AGENT.md §2-3 and frontend rules §3/§7.4/§15/§16; Workflow/Review ≈ backend §22-23, frontend §19-20; Testing ≈ backend §18, frontend §17; Game Rules ≈ decision_log "Equal release-year placement", "Target timeline size", "Starting cards", "Reveal confirmation", "Wrong placement penalty".

**Verdict: KEEP as the single normative file, TRIM and correct.** Fix both layer tables (add `spotify/`, `features/` list, drop `components/`/`utils/`, add `apps/e2e`), unify the size limit (one number), unify the touch target (one number), state the disconnect/host-transfer/all-offline rule in two sentences, shorten Look & Feel to a pointer plus the three motion rules, and absorb AGENT.md's unique behavioural rules (see 1.2). Target ≈ 170 lines.

### 1.2 `C:\Coding\TuneTrack-beats\AGENT.md` — 1 018 words, 167 lines

**Purpose/audience.** Generic agent behaviour rules written for a different tool (Codex-style). Claude Code does **not** auto-load this file; it is only reached because `docs/README.md` step 2 tells the agent to read it.

**Tool-specific / contradicting Claude Code.**

- §10: "Prefer `rg` and `rg --files` for search" and "Prefer `apply_patch` for manual edits" — Codex CLI tooling. Claude Code uses Grep/Glob/Read/Edit and the harness itself asks not to shell out for these.
- §4: "Avoid 700+ line files" contradicts CLAUDE.md's 500.
- §11 "Final Response Requirements" is fine but generic.

**Overlap.** §2 Simplicity, §3 Clean Code, §6 Performance, §8 Testing ≈ CLAUDE.md Coding Principles/Testing (≈40 % of the file). Unique and valuable: §1 think-before-coding, §5 surgical changes, §7 goal-driven execution, §10 git/workspace safety (minus tool names), §11 reporting shape.

**Verdict: MERGE INTO CLAUDE.md** as a compact "Working agreement" section (≈25 lines: assumptions explicit, surgical changes, verify before claiming, git safety, report shape), then **DELETE**. Also remove step 2 from `docs/README.md`. Rationale: an always-loaded file wins over a sometimes-read one, and a second rules file is a second place for drift.

### 1.3 `C:\Coding\TuneTrack-beats\README.md` — 425 words

**Purpose/audience.** Human onboarding (install, run, structure).

**Status vs code.** Structure omits `apps/e2e`; commands omit `npm run e2e`; "Realtime Event Contract" lists 6 of 38 client events and 3 of 17 server events — a misleading subset (no `create_room`, `room_closed`, `room_list`). Tech stack is correct but incomplete (no react-router, dnd-kit, Playwright). Prerequisite "Node 20+" is consistent with `@types/node ^20`.

**Overlap.** Development Principles ≈ CLAUDE.md core rules (≈25 %).

**Verdict: TRIM.** Delete the event-contract section (point to `packages/shared/src/events/`), add `apps/e2e` and `npm run e2e`, delete Development Principles (link CLAUDE.md). Not on the agent reading path.

### 1.4 `C:\Coding\TuneTrack-beats\docs\README.md` — 512 words

**Purpose/audience.** Documentation index and agent entry point.

**Status.** Accurate structure. Archive count (15) matches `ls`. Problems: step 2 points at AGENT.md (see 1.2); the two "archived headers that matter" paragraphs and the "Deleted in the same pass" paragraph (≈18 lines) are history already recorded in `decision_log.md` (2026-09-08 and 2026-09-30 entries); gamepage-refactors row will go stale under the proposal in 1.24.

**Verdict: KEEP, TRIM** the archive narrative to one line and update the tables to the target structure in §4.

### 1.5 `C:\Coding\TuneTrack-beats\docs\decision_log.md` — 2 312 words, 416 lines

**Purpose/audience.** ADR-lite record of concrete decisions and open questions. Append-only by its own rule.

**Status vs code.**

- **Wrong:** "Navigation: push vs. replace (2026-09-08)" states the route order "was extended to `/`→0, `/join`→1, `/play`→1, `/lobby`→2, `/game`→3". `AppRoutes.tsx:6-14` still implements 0/1/2 with `/play` and `/join` at 0. B17 (2026-09-08) records that unverified hardening was reverted; the entry was never corrected.
- **Superseded:** "Coordinator test strategy without a DOM-heavy runner" — jsdom + RTL exist and 19 component tests run.
- **Duplicated inside the file:** "Host disconnect behavior" and "Reconnect/session identity strategy" overlap the two dated 2026-09-30 entries; three of their bullets are now stale wording ("current foundation iteration").
- **Duplicated with CLAUDE.md:** Equal release-year placement, Target timeline size, Starting cards, Reveal confirmation, Wrong placement penalty, TT spending (≈60 lines).
- **Duplicated with frontend rules §10.2.1-10.2.2:** five GamePage/motion architecture entries (preview-card transition, transition-event layer, pure detectors, motion split, coordinator test strategy) ≈ 120 lines ≈ 30 % of the file.
- Most entries are undated; "MVP test deck format" path `apps/server/src/decks/test-decks/` is correct.
- Decisions the plans say to record here but that are absent: keep react-router (Doc 02 §7.1), no offline action queue (Doc 05 §5.3), room-directory visibility (present), overlay history mechanism (Doc 06 §4.2 — effectively decided by E13 "same-path router state"; the "Settings back-button history" entry covers it).

**Verdict: TRIM ≈40 %** (one correction, one deletion of the superseded entry, merge the two disconnect entries, delete game-rule duplicates since CLAUDE.md is normative, collapse the five GamePage entries into one 10-line "backend-driven transition pattern" entry or move it to the frontend rules). Add dates to the undated entries from `git log -S`. The "append, do not rewrite" rule should be relaxed once to allow this.

### 1.6 `C:\Coding\TuneTrack-beats\docs\rules\backend_engineering_rules.md` — 2 155 words, 560 lines

**Purpose/audience.** Backend coding standard for `apps/server`.

**Status vs code.**

- §1 links are absolute Windows paths to a different checkout (`/c:/DevOps/Personal%20Projects/TuneTrack-beats/docs/tunetrack_full_architecture.md` etc.) — broken; the targets moved to `docs/architecture/`.
- §4-5 layer list omits `spotify/`.
- §6 "RoomRegistry is already large" — stale; `RoomRegistry.ts` is 319 lines of pass-throughs, `RoomService.ts` (718) is the problem (Doc 04 §4, F-17).
- §19.1 target split **DONE** under different names: `RoomConnectionService` (≈RoomMembershipService), `RoomGameplayService` (≈RoomGameOrchestrator), `RoomTimerCoordinator` ✓, `roomStateMappers.ts` (≈RoomStateMapper), `createSocketHandler.ts` (≈SocketEventRegistrar). §25 "Immediate next step" items 1-4 all shipped.
- §24 "Rule For Future Codex Iterations" — tool-specific.
- Missing rules that the code now relies on: acknowledged actions and `requestId` replay protection (`createSocketHandler.ts`, `RoomStore` ack LRU), validated env boundary (`env.ts`), audit logging constraints (no display names in audit payloads — stated only in Doc 04 §6), room-directory broadcast rule.

**Overlap.** §3, §4-5, §18, §22-23 ≈ CLAUDE.md (≈45 % of the file). §15 logging ≈ CLAUDE.md logging rule verbatim.

**Verdict: TRIM to ≈200 lines.** Keep §7 (handler shape), §9 (mutation), §11 (error codes), §12 (mapping), §13 (timers), §14 (persistence), §17 (duplication), §21 (security); add acks/idempotency/audit rules; delete §19, §24, §25 and everything restating CLAUDE.md; fix links.

### 1.7 `C:\Coding\TuneTrack-beats\docs\rules\frontend_engineering_rules.md` — 3 285 words, 651 lines

**Purpose/audience.** Frontend coding standard for `apps/web`.

**Status vs code.**

- §1 links broken (same `/c:/DevOps/...` paths).
- §4.1 layers list `components/` and `utils/` (do not exist / empty).
- §6 example tree references `GamePage.module.css` (deleted — split into `gamePageChrome/Menu/Playback/Status.module.css`) and `hooks/useTimelineCelebration.ts` (actual `useTimelinePanelCelebrationState.ts`); omits the real `mobile/` and `desktop/` assembly folders.
- §17 "if the repo does not yet have the right DOM test runtime" — superseded (jsdom wired, `renderWithProviders`, `fakeSocket`, `fakeSpotifyPlayer`).
- §18.1 target split **DONE** (names differ: `useGameRoomConnection` ✓, `useGamePageActions`, `useGamePageTimelineState`, `useGamePageChallengeCelebrationState`, `TimelinePanel`/`PreviewCard`/`TimelineCelebration` ✓). §22 items 1-3 shipped; item 4 (CSS) open because the 6 barrels remain.
- §21 "Rule For Future Codex Iterations" — tool-specific.
- Missing rules the code follows: mobile/desktop assemblies via `usePageLayoutMode` (only in design_system §7), same-path history entries for overlays (E13/E14 pattern), `emitAction` ack lifecycle for every mutation, i18n key parity, `features/rooms` ownership of room navigation, test harness conventions (`src/test/`).

**Overlap.** §3, §4, §5, §7.4, §10.1, §10.4, §15, §16, §17, §19-20 ≈ CLAUDE.md and `design_system.md` §5 (≈50 %). §10.2.1-10.2.2 (backend-driven transitions, ≈70 lines) is unique and valuable but also restated across five decision-log entries.

**Verdict: TRIM to ≈250 lines.** Keep §4.2-4.3, §6 (corrected tree), §7.2-7.3, §8, §9, §10.2-10.3, §11, §12, §13, §14; add the missing rules; delete §18, §21, §22 and the duplicates; fix links.

### 1.8 `C:\Coding\TuneTrack-beats\docs\rules\design_system.md` — 1 755 words, 255 lines

**Purpose/audience.** Normative token and component contract.

**Status vs code.** The most accurate rules file. All seven token file paths exist. Primitive list (10) matches `features/ui/primitives/`. "(target)" markers mostly right: brand-spotify tokens absent ✓, mix tokens absent ✓, extended z scale absent ✓, `zIndexScale.test.ts` absent ✓. Two markers are stale: `noHardcodedColors.test.ts` and `noCssBarrels.test.ts` **exist** (with allowlists) — the doc says target. §6 "Overlay components never set their own z-index. The overlay host assigns it" describes a host that does not exist — should carry (target). 48 px touch target contradicts CLAUDE.md 44 px. Legacy radii note is still true.

**Overlap.** §1 and §5 restate CLAUDE.md Look & Feel (≈20 %) — acceptable if CLAUDE.md is trimmed instead.

**Verdict: KEEP, minor fixes** (two guard markers, overlay-host sentence, one touch-target number agreed with CLAUDE.md).

### 1.9 `C:\Coding\TuneTrack-beats\docs\architecture\tunetrack_full_architecture.md` — 641 words

**Purpose/audience.** Original vision/design sketch (pre-implementation).

**Status vs code.** §7 frontend structure lists `components/`, `types/` and feature folders `lobby, game, timeline, tokens, challenge, host-controls` — none exist. §12 events `confirm`, `challenge`, `skip`, `award_token`, `turn_start`, `reveal`, `challenge_start`, `game_end` do not exist in `packages/shared/src/events/` (the server sends full `state_update`). §13 state model superseded by `PublicRoomState`. §19 non-goals partly false now (Spotify playback is real, not "manual"). §21 "Monthly cycles" is process fluff. Everything still true is already in CLAUDE.md Vision/Game Rules/Architecture (≈90 % overlap).

**Verdict: ARCHIVE.** Header: "Vision document from project start. Vision, principles and stack shipped and now live in CLAUDE.md. The event list (§12), state model (§13) and frontend folder layout (§7) were superseded by `packages/shared/src/events`, `packages/shared/src/game/roomState.ts` and the actual `apps/web/src` tree."

### 1.10 `C:\Coding\TuneTrack-beats\docs\architecture\tunetrack_technical_implementation_plan.md` — 1 733 words

**Purpose/audience.** Original scaffolding/implementation plan.

**Status vs code.** §2 root layout puts the two architecture docs at repo root (they are in `docs/architecture/`). §3 lists `@tanstack/react-query` (never adopted; `react-virtual` is used), `playwright` in `apps/web` devDeps (actual: `apps/e2e`), `husky`/`lint-staged` (absent). §4 root scripts differ from `package.json` (`predev`, `e2e`, `--workspaces --if-present`). §5.2 server tree (`game/GameApplicationService.ts`, `playback/`, `repositories/`, `ClientSessionRegistry.ts`) and §5.4 engine tree (`TurnService`, `PlacementService`, `TokenWallet`) do not exist; actual engine is `services/{ChallengeFlow,GameFlow,TtAction,TurnFlow}Service.ts`. §6 event list wrong (see 1.9). §8 delivery order 1-8 all shipped. §9 "Work from `develop`" — `develop` exists but `origin/HEAD` is `main` and current work is `fix/*`. §10 "decisions to lock" all decided and in the decision log. ≈70 % overlap with CLAUDE.md + README.

**Verdict: ARCHIVE.** Header: "Scaffolding and MVP delivery plan. Steps 1-8 shipped. Dependency map superseded by the workspace `package.json` files; folder trees superseded by the real tree; event list superseded by `packages/shared/src/events`; §10 decisions recorded in `docs/decision_log.md`."

### 1.11 `docs\plans\2026-09-stability-performance\00-index.md` — 1 374 words

**Purpose/audience.** Programme index, baseline, waves, exit criteria. The agent's "what to work on" entry.

**Status vs code.**

- Status line ("E1-E15 complete in Chromium") ✓.
- §2 baseline is a 2026-09-08 snapshot presented as "measured baseline" — fine as history, but the index gives no _current_ numbers. Now: 400 unit tests / 84 files (was 240/47), 19 component tests (was 0), 16 E2E (was 0), hex literals 94 (unchanged), bundle numbers unknown (no build re-measured; no `bundle-baseline.md`/`runtime-baseline.md`/`network-baseline.md` were ever created although Docs 02/03/05 require them).
- §4 wave table is stale as a sequence: W0 done except coverage gates; W1 done/partial; **W2 not done** (no overlay host, button systems intact) yet W6 work (Docs 08-10) that "depends on all of the above" shipped anyway; W3 only phase 6; W4 Doc 04 ph. 1 + 3.3 and Doc 05 ph. 3-4 done; W5 untouched; W7 done.
- §5 exit criteria checkbox audit:
  - [ ] ≤200 kB gzip / framer-motion off eager path — **open** (no LazyMotion).
  - [ ] `vendor-zod` absent — **open** (branch still in `vite.config.ts`, no `sideEffects`).
  - [ ] no raw z-index — **open** (see literal list).
  - [ ] one button/icon-button/dialog — **open**.
  - [ ] back closes topmost overlay — **partial** (settings, Music Setup, playlist/track editors via same-path history, E13/E14; `SongInfoModal`, kick confirm, `RoomResetModal`, `BottomSheet` do not).
  - [ ] host reconnect verified by automated integration test — **E8 (E2E) proves it; server integration test absent**. Should read "[x] E2E / [ ] server integration".
  - [x] in-game disconnect retained — ✓ (`disconnectLifecycle.test.ts`, E10).
  - [x] all-offline expiry — ✓ (E11, `ALL_PLAYERS_OFFLINE_ROOM_TTL_MS`).
  - [ ] Spotify auth survives restart — **open, gated**.
  - [ ] playback start/pause/resume/restart anywhere — **shipped** (`restart`, `hasEnded`, `needsUserGesture`; B7/B9 resolved 09-09) but unchecked → **WRONG**.
  - [ ] display name outside room flow, persists — **shipped** (Doc 09 Phase 1 all [x], B12 resolved 09-16) but unchecked → **WRONG**.
  - [x] first-run hints — ✓.
  - [ ] skeleton on every page — **open**.
  - [ ] test suite — **partial** (component tests for primitives: only `primitives.contract.test.ts`; overlays: partial; integration for disconnect/reconnect/transfer/close ✓ server + E2E; E2E create/join/place/challenge/reveal/win ✓).
- §6-7 fine.

**Verdict: KEEP, rewrite §2 and §4** into one "status per document" table (done / open / next proof), fix the three mis-set checkboxes, add the current test numbers. Target ≈100 lines.

### 1.12 `01-audit-findings.md` — 4 570 words, 663 lines

**Purpose/audience.** Evidence register at commit `37ccf20`, with line numbers.

**Status vs code (per finding).**

- **Fixed:** F-12, F-13 (`b022d14`), F-15 (`translateRef`), F-20 (env), F-21 (acks), F-25 (B1), F-27b (B10 — dock unmount), F-27c (E12), F-29 (B5), F-32 (B6), F-37, F-38, F-39, F-40, F-41, F-42, F-44, F-45.
- **Partially fixed:** F-24 (lobby model flags `GAME_ALREADY_STARTED`; no recovery dialog variant), F-27 (same-path history for 4 overlays), F-46 (`disconnectLifecycle`, `roomCodeGenerator` added; auth/socket-server/shutdown tests absent).
- **Still open, unchanged:** F-01-F-11 (all performance), F-14 (`resetPlayerSession` still clears the durable id from both close handlers), F-16, F-17 (**worse**: `RoomService` 696→718, `RoomRegistry` 285→319), F-18, F-19, F-22, F-23, F-26 (exit variant unchanged, no `pointerEvents: none`), F-28, F-30, F-31, F-33 (94 hex), F-34, F-35 (still only `PointerSensor` at 4 px), F-36, F-43, F-47.
- All `lines NN-NN` citations are at `37ccf20` and are now unreliable; each remediation doc already restates its findings.

**Overlap.** ≈60 % of each finding's text is repeated in the owning Doc 02-10 section.

**Verdict: ARCHIVE** (it is the one document whose value is historical evidence), and put a 25-row "open findings" table (id, one line, owning doc) into `00-index.md`. Header: "Audit of 2026-09-08 at `37ccf20`. Line numbers are as of that commit. Fixed: F-12, F-13, F-15, F-20, F-21, F-25, F-27b, F-27c, F-29, F-32, F-37-F-42, F-44, F-45. Everything else is tracked in `00-index.md` and Docs 02-11."

### 1.13 `02-bundle-and-startup.md` — 2 493 words

**Status.** Phases 1-5 **open**, not started (verified: no `LazyMotion`, 128 `motion.*` sites, no `sideEffects`, no subpaths, zod branch present, eager i18n, 6 barrels, no `analyze` script, no `bundle-baseline.md`; the Phase 5 "keep react-router" decision was never written to the decision log). Phase 6 **done** (2026-09-17) with an 11-line implementation note and acceptance ticks.

**Verdict: KEEP (live), TRIM** Phase 6 to one line; re-measure the §1 table before any phase starts (numbers are a month old and the i18n catalogues grew 615→692 lines).

### 1.14 `03-runtime-and-motion-performance.md` — 2 395 words

**Status.** Every phase **open**, zero progress (constants, `motion.div` rows, listeners, capture listener, no viewport store, no `runtime-baseline.md`). The `HostPlaybackProvider.gesture.test.tsx` test exists and asserts the global `pointerdown` behaviour — Phase 5 will need to change that test.

**Verdict: KEEP AS-IS.** Nothing to trim; it is the cleanest remaining plan.

### 1.15 `04-backend-stability-and-sessions.md` — 2 510 words

**Status.** Phase 1 **done** (≈60 lines of done-narrative + 6 ticks). Phase 2 **open** (socket server unchanged; no `rateLimit.ts`). Phase 3.1 **open** (no signal handling), 3.2 **open** (`unref()` in both timer managers), 3.3 **done**. Phase 4 **open and growing** (`RoomService.ts` 718). Phase 5 **open**. Two references to `docs/axiom_logging_setup.md` should be `docs/operations/axiom_logging_setup.md`.

**Verdict: KEEP, TRIM** Phase 1 to a five-line "shipped" note (its content now lives in `decision_log.md` 2026-09-30 and `disconnectLifecycle.test.ts`); fix paths.

### 1.16 `05-network-protocol-and-resilience.md` — 3 544 words

**Status.** Phase 1 **partial** (client first-connect/reconnect split and server idempotent `create_room` shipped — `b022d14`, E8; `GAME_ALREADY_STARTED` recovery dialog and `instanceId` open). Phase 2 **open** — the doc's central instruction ("remove `resetPlayerSession()` from both `handleClosedRoomReset`") is **not done**; both hooks still call it and it still deletes the durable id. Phase 3 **done**. Phase 4 **done** — 22 ticked acceptance lines (≈55 lines) form a changelog. Phase 5 **open** (socket client config, English literals, no banner, no `ConnectionState`). Phase 6 **open** (no `revision`, no narrow events). The "no offline action queue" decision (5.3) is not in the decision log.

**Verdict: KEEP, TRIM** Phases 3 and 4 to short "shipped" notes (≈80 lines saved). Phase 2 should be promoted in B8's "next proof" since it is a one-line fix with an existing test file.

### 1.17 `06-navigation-and-overlays.md` — 3 204 words

**Status.** Phase 1 **open** (scale, literals, guard). Phase 2: 3.1 **open** (no `onExitComplete`, no `pointerEvents: none`; `AppRoutes.exitingPage.test.tsx` exists), 3.2 **done** (decision log entry), 3.3 **not done** — and the decision log wrongly says it is. Phase 3 overlay host **open**; back-button integration **partially done via same-path router state** (E13/E14, `playlistEditorHistory.ts`) — this de facto answers the §4.2 "decide by experiment" question (router state, not raw `pushState`); write that down. Phase 4 **done** (B1). Phase 5 **done** (B5) although `MotionPresence` default is still `initial = false`, so the fix differed from the plan. Phase 6 contract not written; refers to `docs/frontend_engineering_rules.md` (wrong path). §1 inventory still accurate except Playlist editor/track sheet now participate in history.

**Verdict: KEEP, TRIM** Phases 4 and 5 and §3.2 to "shipped" lines (≈90 lines), record the router-state decision, fix path.

### 1.18 `07-design-system-consolidation.md` — 2 701 words

**Status.** Phases 1-5 **open** (all legacy components present; 94 hex; `Skeleton` on one page; recovery dialog has one message). Phase 6 **partial** (`/dev/ui` exists; the component rules were written into `design_system.md`, not `frontend_engineering_rules.md` as the doc says — update the pointer). The hex and barrel guards it asks for exist with allowlists.

**Verdict: KEEP AS-IS**, two pointer fixes.

### 1.19 `08-spotify-session-and-playback.md` — 3 084 words

**Status.** Phase 1 **done** (`position_ms`). Phase 2 **done** for 3.1-3.4 (B7/B9); 3.5 free-tier parity unverified; 3.6 Media Session **open**. Phase 3 **open, compliance-gated** (tokens still per room). Phase 4 **open** (14 console calls). §6 compliance checklist is the right content for this organisation and must stay. Stale path `docs/axiom_logging_setup.md` ×2.

**Verdict: KEEP, TRIM** Phases 1-2 (≈150 lines) to a 15-line "shipped + remaining 3.5/3.6" note; fix paths.

### 1.20 `09-room-and-player-identity-flow.md` — 3 350 words

**Status.** Phase 1 **done**, Phase 2 **done** (incl. §3.4 directory push), Phase 3 **mostly done** (two layout acceptance items open), Phase 4 **open** (no event, no engine function — the only remaining engine change in the programme), Phase 5 **partial** (3 refs remain). The 20-line top blockquote plus four per-phase "Implementation state" notes make ≈45 % of the document a changelog.

**Verdict: TRIM to ≈120 lines**: keep Phase 4 in full, the two open Phase 3 items, the Phase 5 checklist and the risk rows that still apply; delete §1 (the problem no longer exists) and the done narratives. Move the one-paragraph history to the decision log if wanted.

### 1.21 `10-onboarding-hint-system.md` — 2 439 words

**Status.** Shipped as the top note says: 11 hints (`home-start` absent, consistent with "Home start hint open"), settings section, en/hu copy, E15. Design deviations from the plan: state is a plain localStorage module with a `tunetrack:hints-changed` event rather than Zustand; rendering is `createPortal` in `HintBubble`, not an overlay host; no `IntersectionObserver`/`HintAnchor`/`HintProvider` (`useFirstRunHint` + `hintCoordinator` instead). Open: history-back dismissal, anchor visibility, replay/count UI, component tests for bubble/anchor, 6 kB budget check.

**Verdict: TRIM to ≈60 lines** — the catalogue rules (§3 "rules for the catalogue"), the open items, the acceptance checklist. Or ARCHIVE and move the open items to the index; prefer trim because the catalogue rules are normative for future hints.

### 1.22 `11-testing-strategy.md` — 3 934 words

**Status.** §1 numbers stale (240/47 → 400/84 + 16 E2E; "no component tests" false). Phase 1 **done** (config, setup, all four utilities present). Phase 2: 3 of 4 guards **done**, `zIndexScale` and ESLint `no-restricted-imports` **open**. Phase 3 **done for Chromium** (E1-E15 = 16 tests), **WebKit open**, drag testing (§5.4) open, runtime budget unverified; one 848-line spec file contradicts the project's own file-size rules and should be split per scenario. Phase 4: 2 of 11 files exist. Phase 5 **open** (no coverage, no CI, no root `verify`). §8 manual device checklist and §9 test-quality rules are genuinely normative and not written anywhere else.

**Verdict: KEEP, TRIM**: delete §1, cut Phases 1 and 3's done narrative (≈60 lines), keep §4 (with status), §5.4, §6 table (mark the two done), §7, §8, §9. Consider moving §8-§9 into the frontend/backend rules so the plan can eventually close.

### 1.23 `12-bug-register.md` — 1 209 words

**Status.** Accurate against code: B2 partial (same-path history for 4 overlays), B8 partial (exactly the Doc 05 Phase 2/5 gaps), B4 open (`PointerSensor` only), B3 open, B11 partial (`GameMenuPlayerItem` still uses `menuKickPlayerButton` + `CloseIconButton`). Resolved ledger matches commits. Minor: B4 "Plans: Docs 03 and 12" is a self-reference.

**Verdict: KEEP AS-IS.** This is the model the other plan docs should converge to.

### 1.24 `docs\plans\gamepage-remaining-refactors.md` — 777 words

**Status.** "Done" table is history. R1 duplicates Doc 04 §4 (and the numbers grew). R2's "blocked until the jsdom harness lands" is stale; `TimelinePanel.test.tsx`, `ActionDock.test.tsx`, `useGamePageActions.test.tsx` now exist; hook tests for `useGamePageStatusState/TimelineState/CapabilityState` and component tests for `ChallengeActionPanel`, `TurnActionDock`, `FinishedStatePanel` still missing. R3's trigger (**>250 lines**) has fired: `GamePageHeader.tsx` is **260 lines**. R4 closure recommended. R5 fully owned elsewhere.

**Verdict: MERGE INTO `12-bug-register.md`** (or a short "tech debt" section of `00-index.md`) as three lines — R1 pointer, R2 missing tests, R3 triggered — then **DELETE** the file (history is in `docs/archive/gamepage_refactor_handoff.md`).

### 1.25 `docs\operations\axiom_logging_setup.md` — 1 042 words

**Status.** All five "Related Code" paths exist; env names match `env.ts`; fallback endpoints match `axiomLogSink.ts` size (not verified line by line). Missing: a one-line note that Axiom is a third-party log processor requiring compliance review before any client-facing deployment (organisation rule), and that `EVENT_AUDIT_INCLUDE_PAYLOADS` can carry display names (it says so — good).

**Verdict: KEEP AS-IS** (+ compliance line). Not on the agent reading path.

### 1.26 `docs\operations\deploy-railway-frontend.md` — 2 703 words

**Status.** Technically accurate (env table matches `env.ts` incl. the five lifecycle variables; `apps/web/public/_redirects` and the `start` script exist). Two defects:

- **Line 358** contains pasted chat text inside the Render link: `[render.com](Ok, lets do this, I want this to be automated as possible, and consistent of course.` followed by a stray `)` on the next line. Corrupts the Prerequisites list.
- **Lines 532 and 567** contain a concrete production Railway hostname. Per the organisation's confidentiality/mock-data rule this should be the `YOUR-RAILWAY-DOMAIN` placeholder used everywhere else in the file.

**Verdict: KEEP, fix the two lines.** Not on the agent reading path.

### 1.27 `docs\operations\deploy-self-hosted.md` — 3 037 words

**Status.** Consistent with code (`resolveServerUrl` same-origin fallback exists; ports; PM2 commands). The longest document in the repo and purely operational.

**Verdict: KEEP AS-IS**, label clearly as operations so agents skip it.

### 1.28 `apps/*/README*`, `packages/*/README*`

None exist. No action; do not add.

### 1.29 `.claude/`

Only `settings.local.json` (allow: `npm run *`, `npm test *`, `xargs grep *`, `npm install *`, `npm list *`, `xargs basename *`, `npx tsc *`, `npx vitest *`). No `settings.json`, no `skills/`, `agents/`, `commands/`, no hooks, no `CLAUDE.local.md`. AGENT.md is therefore never loaded automatically.

---

## 2. Cross-document contradictions (ranked by harm to an agent)

1. **Route-order claim vs code.** `decision_log.md` "Navigation: push vs. replace (2026-09-08)" says the route ladder was extended; `apps/web/src/app/AppRoutes.tsx:6-14` still has `/game`→2, `/lobby`→1, else 0 (reverted under B17). An agent trusting the log would skip a fix the plan still needs (Doc 06 §3.3).
2. **Exit criteria mis-set.** `00-index.md` §5 leaves "playback start/pause/resume/restart" and "display name outside room flow" unchecked although both shipped (Doc 08 §2-3, Doc 09 Phase 1, B7/B9/B12 resolved). An agent would re-implement shipped work.
3. **Touch target 44 px (CLAUDE.md, Doc 10) vs 48 px (`design_system.md`, Doc 07 §2.2, `--size-touch-target`).**
4. **"Must split" file size: 500 (CLAUDE.md) / 600 (frontend rules) / 700 (backend rules, AGENT.md).** `RoomService.ts` is 718.
5. **Layer tables name folders that do not exist** (`components/`, `utils/`, `types/`) and omit ones that do (`spotify/`, `features/*`, `apps/e2e`) — CLAUDE.md, both rules files, both architecture files.
6. **Event contracts in both architecture docs and the root README** do not match `packages/shared/src/events/` (no `confirm`, `turn_start`, `reveal`, `game_end`; 38/17 real events).
7. **Test shape claims** ("no jsdom", "0 component tests", "240 tests") in Doc 11 §1, frontend rules §17, decision log — superseded by `vitest.config.ts`, 19 `*.test.tsx`, 400 tests.
8. **Doc 05 Phase 2 vs code:** `resetPlayerSession()` is still called from both room-closed handlers and still deletes the durable session id (F-14 open), while B8 "Completed" implies session handling is done.
9. **Broken links**: `/c:/DevOps/Personal%20Projects/...` in `backend_engineering_rules.md:17-19` and `frontend_engineering_rules.md:17-18`; stale `docs/axiom_logging_setup.md` (Docs 04 ×2, 08 ×2) and `docs/frontend_engineering_rules.md` (Docs 06, 07) — all moved on 2026-09-08.
10. **Tool-specific text**: AGENT.md §10 (`rg`, `apply_patch`); "Rule For Future Codex Iterations" in both rules files.
11. **design_system.md** marks `noHardcodedColors.test.ts`/`noCssBarrels.test.ts` as (target); both exist. It also states the overlay host assigns z-index; no host exists.
12. **CLAUDE.md game rules vs decisions**: "Last player leaves → room removed" / "host disconnect → first remaining player inherits" omit the 30 s grace and the 1 h all-offline rule that Doc 04 and the decision log define; Doc 04 §1.1 has to reinterpret CLAUDE.md.
13. **Doc 10 vs code**: plan says Zustand store, overlay host, `IntersectionObserver`; implementation is a localStorage module, `createPortal`, and a coordinator. Not wrong, but the architecture section no longer describes the code.
14. **Doc 06 §7 / Doc 07 §7** instruct writing component/overlay rules into `frontend_engineering_rules.md`; they were written into `design_system.md`.
15. **`deploy-railway-frontend.md`** line 358 pasted chat text; lines 532/567 real hostname (confidentiality rule).
16. **Doc 02 §7.1 and Doc 05 §5.3** say "record in decision_log.md"; neither decision is there.

---

## 3. Token-cost summary

| Document                                                |       Words | Dup./stale share         | Verdict                                                                                                 |
| ------------------------------------------------------- | ----------: | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| CLAUDE.md                                               |       1 567 | ~55 %                    | KEEP, TRIM + correct                                                                                    |
| AGENT.md                                                |       1 018 | ~40 % dup, tool-specific | MERGE INTO CLAUDE.md, DELETE                                                                            |
| README.md                                               |         425 | ~25 %                    | TRIM (events section, principles)                                                                       |
| docs/README.md                                          |         512 | ~30 %                    | KEEP, TRIM archive narrative                                                                            |
| decision_log.md                                         |       2 312 | ~40 %                    | TRIM, correct one entry, date entries                                                                   |
| rules/backend_engineering_rules.md                      |       2 155 | ~45 %                    | TRIM to ≈200 lines, fix links                                                                           |
| rules/frontend_engineering_rules.md                     |       3 285 | ~50 %                    | TRIM to ≈250 lines, fix links                                                                           |
| rules/design_system.md                                  |       1 755 | ~20 %                    | KEEP, minor fixes                                                                                       |
| architecture/tunetrack_full_architecture.md             |         641 | ~90 %                    | ARCHIVE                                                                                                 |
| architecture/tunetrack_technical_implementation_plan.md |       1 733 | ~70 %                    | ARCHIVE                                                                                                 |
| plans/…/00-index.md                                     |       1 374 | baseline/waves stale     | KEEP, rewrite §2/§4/§5                                                                                  |
| plans/…/01-audit-findings.md                            |       4 570 | ~60 % + stale lines      | ARCHIVE (+ open-findings table in 00)                                                                   |
| plans/…/02-bundle-and-startup.md                        |       2 493 | ~5 %                     | KEEP, trim Phase 6                                                                                      |
| plans/…/03-runtime-and-motion-performance.md            |       2 395 | 0 %                      | KEEP AS-IS                                                                                              |
| plans/…/04-backend-stability-and-sessions.md            |       2 510 | ~25 % done               | KEEP, trim Phase 1, fix paths                                                                           |
| plans/…/05-network-protocol-and-resilience.md           |       3 544 | ~30 % done               | KEEP, trim Phases 3-4                                                                                   |
| plans/…/06-navigation-and-overlays.md                   |       3 204 | ~30 % done               | KEEP, trim Phases 4-5, §3.2                                                                             |
| plans/…/07-design-system-consolidation.md               |       2 701 | ~5 %                     | KEEP AS-IS, 2 pointer fixes                                                                             |
| plans/…/08-spotify-session-and-playback.md              |       3 084 | ~45 % done               | KEEP, trim Phases 1-2                                                                                   |
| plans/…/09-room-and-player-identity-flow.md             |       3 350 | ~65 % done               | TRIM to Phase 4 + leftovers                                                                             |
| plans/…/10-onboarding-hint-system.md                    |       2 439 | ~75 % done               | TRIM to rules + open items                                                                              |
| plans/…/11-testing-strategy.md                          |       3 934 | ~35 % done/stale         | KEEP, trim, update numbers                                                                              |
| plans/…/12-bug-register.md                              |       1 209 | 0 %                      | KEEP AS-IS                                                                                              |
| plans/gamepage-remaining-refactors.md                   |         777 | ~80 %                    | MERGE INTO 12/00, DELETE                                                                                |
| operations/axiom_logging_setup.md                       |       1 042 | 0 %                      | KEEP (+ compliance line)                                                                                |
| operations/deploy-railway-frontend.md                   |       2 703 | 0 %                      | KEEP, fix 2 defects                                                                                     |
| operations/deploy-self-hosted.md                        |       3 037 | 0 %                      | KEEP, label as ops                                                                                      |
| **Total**                                               | **≈60 100** |                          | **Agent reading path after cleanup ≈ 9-10 k words** (from ≈ 28 k today for CLAUDE+AGENT+index+rules+01) |

---

## 4. Proposed target structure

### 4.1 Files that remain

| File                                                       | Contains                                                                                                                                                                                                                                                                                                                                                           | Size target       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `CLAUDE.md`                                                | Vision (5 lines), game rules incl. disconnect/host/all-offline rule, track-metadata rules, tech stack + monorepo incl. `apps/e2e`, correct layer tables, core architecture rules, coding principles, one file-size rule, one touch-target rule, working agreement (from AGENT.md), workflow + review questions, testing expectations, pointer to `docs/README.md`. | ≈170 lines        |
| `docs/README.md`                                           | Index + 3-step agent reading order + "normative / live / ops / archive" tables.                                                                                                                                                                                                                                                                                    | ≈45 lines         |
| `docs/decision_log.md`                                     | Dated decisions only; game rules removed (CLAUDE.md owns them); one corrected navigation entry; one merged disconnect entry; one collapsed transition-pattern entry.                                                                                                                                                                                               | ≈220 lines        |
| `docs/rules/backend_engineering_rules.md`                  | Only server-specific rules: handler shape, acks + `requestId` replay, env boundary, mutation, error codes, mapping, timers, persistence-readiness, audit-log constraints, security.                                                                                                                                                                                | ≈200 lines        |
| `docs/rules/frontend_engineering_rules.md`                 | Only web-specific rules: layer responsibilities, page folder shape (mobile/desktop assemblies), controller/view-model flow, services, backend-driven transition contract, overlay history pattern, `emitAction` lifecycle, CSS module rules, i18n parity, test harness conventions.                                                                                | ≈250 lines        |
| `docs/rules/design_system.md`                              | Unchanged apart from four one-line fixes.                                                                                                                                                                                                                                                                                                                          | 255 lines         |
| `docs/plans/2026-09-stability-performance/00-index.md`     | Purpose, **current** numbers, status-per-document table, open-findings table (from 01), exit criteria (corrected), compliance notes.                                                                                                                                                                                                                               | ≈110 lines        |
| `02`, `03`, `04`, `05`, `06`, `07`, `08`, `09`, `10`, `11` | Open phases only; each shipped phase reduced to a 3-5 line "shipped" note with the proving test/commit.                                                                                                                                                                                                                                                            | ≈−900 lines total |
| `12-bug-register.md`                                       | As is, plus three tech-debt lines from the gamepage file (R1 pointer, R2 missing tests, R3 triggered at 260 lines).                                                                                                                                                                                                                                                | ≈190 lines        |
| `docs/operations/*.md`                                     | Unchanged except the two Railway-doc fixes and the Axiom compliance line.                                                                                                                                                                                                                                                                                          | —                 |
| `README.md`                                                | Human quick start only.                                                                                                                                                                                                                                                                                                                                            | ≈90 lines         |

### 4.2 Files that move to `docs/archive/` (with required header)

| File                                                       | Header (what shipped / what did not / superseded by)                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture/tunetrack_full_architecture.md`              | Shipped: vision, principles, stack, SOLID intent (now in CLAUDE.md). Did not ship as written: §7 folder layout, §12 event list, §13 state model, §21 monthly cycles. Superseded by `CLAUDE.md`, `packages/shared/src/events`, `packages/shared/src/game/roomState.ts`.                                                                 |
| `architecture/tunetrack_technical_implementation_plan.md`  | Shipped: workspace scaffolding, delivery steps 1-8, all §10 decisions (see `decision_log.md`). Did not ship as written: `react-query`, husky, server `game/`/`playback/`/`repositories/` folders, engine `TurnService`/`TokenWallet`, event list. Superseded by the workspace `package.json` files, the real source tree, `CLAUDE.md`. |
| `plans/2026-09-stability-performance/01-audit-findings.md` | Audit at `37ccf20` (2026-09-08); line numbers are as of that commit. Fixed: F-12, F-13, F-15, F-20, F-21, F-25, F-27b, F-27c, F-29, F-32, F-37-F-42, F-44, F-45. Partial: F-24, F-27, F-46. Open findings tracked in `00-index.md`.                                                                                                    |
| `plans/gamepage-remaining-refactors.md`                    | Shipped: 4.1.A/B/E/F, 4.2.A. Not shipped: R1 (now Doc 04 §4), R2 (Doc 11), R3 (triggered — `GamePageHeader.tsx` 260 lines), R4 closed without action, R5 answered. Superseded by `12-bug-register.md` tech-debt lines. Original handoff already archived.                                                                              |

### 4.3 Files to delete

- `AGENT.md` after its unique rules are merged into CLAUDE.md (git history keeps it).

### 4.4 Agent entry point — reading order (shortest possible)

1. `CLAUDE.md` (auto-loaded; ≈170 lines).
2. `docs/plans/2026-09-stability-performance/00-index.md` (≈110 lines) → tells you which numbered doc owns the task and which bug IDs are open.
3. The one numbered plan doc that owns the task, plus `12-bug-register.md` if the task is a defect.
4. Only when touching that layer: the relevant `docs/rules/*.md`. `decision_log.md` only when a rule's _why_ matters.

Everything under `docs/operations/` and `docs/archive/` is explicitly off the agent path. Total mandatory reading ≈ 280 lines (≈4 k words) instead of today's five-file ≈ 28 k words.

### 4.5 Recurring instructions better served as Claude Code skills (`.claude/skills/<name>/SKILL.md`)

These are procedures, not rules; loading them only when invoked keeps CLAUDE.md small.

| Skill                    | What it would hold                                                                                                                                                                                                                                                                                               | Currently in                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `verify`                 | The exact green-gate sequence: `npm run typecheck && npm run lint && npm test`, `npm run e2e` when realtime/overlay flows changed, how to read the per-workspace vitest output, that `apps/e2e` builds first and uses the fail-loud fake Spotify server, placeholder-data rule for fixtures.                     | 00-index §4, Doc 11 §5, AGENT.md §8                   |
| `plan-status`            | How to update a plan doc when a phase ships: replace narrative with a 3-5 line shipped note, tick acceptance with the proving test/commit, move resolved bugs to the ledger, re-check the index checkboxes, append a dated decision-log entry if a product rule changed.                                         | implicit; the cause of today's drift                  |
| `archive-doc`            | The archive header convention (what shipped / what did not / what superseded it), update `docs/README.md` tables and the decision log.                                                                                                                                                                           | docs/README.md, decision_log 2026-09-08               |
| `add-hint`               | Catalogue rules (not discoverable from UI; one per anchor; 1.5 s quiet; max 2 per visit; copy in both catalogues; register id in `hintRegistry.ts`; add E2E or component test).                                                                                                                                  | Doc 10 §3                                             |
| `add-socket-action`      | Checklist for a new client→server mutation: event name + payload (+ `requestId`) in `packages/shared`, Zod schema, `createSocketHandler` registration with ack, `requestId` replay guard, `emitAction` on the client with pending/retry states, i18n error key in both catalogues, server test + component test. | Doc 05 §4 (as a done-ledger), backend rules (missing) |
| `design-token-migration` | Per-file procedure for retiring hex/px/z-index literals: shrink the guard allowlists, map to semantic tokens, screenshot pair, both themes.                                                                                                                                                                      | Doc 07 §4, Doc 06 §2                                  |
| `device-checklist`       | Doc 11 §8 manual device checklist M1-M18 as a runnable checklist.                                                                                                                                                                                                                                                | Doc 11 §8                                             |
| `deploy`                 | Railway/Render redeploy steps and env-var table (ops; keeps CLAUDE.md free of deployment detail).                                                                                                                                                                                                                | operations/deploy-railway-frontend.md                 |

Also worth adding to `.claude/settings.json` (project-level, committed): the read-only allow rules currently only in `settings.local.json`, so every clone gets the same prompt-free `npm run typecheck/lint/test` loop.
