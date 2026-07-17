# TuneTrack Refactor Plan — Performance, Traffic & Maintainability

> Status: **Phase 2 complete — awaiting your manual checks (Lobby Spotify + game feel), then go Phase 3**  
> Rules: follow [`AGENT.md`](../AGENT.md) and [`CLAUDE.md`](../CLAUDE.md)  
> Created: 2026-07-17

## Goals

| Goal | Success criteria |
|------|------------------|
| Best interaction performance | Challenge countdown and host playback no longer re-render the full GamePage tree; memos on header/timeline/actions actually hold |
| Optimized server ↔ client traffic | Smaller / fewer full-state broadcasts; no spoiler fields on hidden cards; measurable payload reduction on common actions |
| Maintainable, readable code | No production file > ~700 lines; modules split by responsibility (not arbitrary chops) |
| Industry-standard structure | Layer ownership in `CLAUDE.md` preserved; god-objects extracted into collaborators |
| Great UX | Snappier challenge window, lighter lobby Spotify setup, no fairness leaks |

## Non-goals (this plan)

- New gameplay features
- Redis / PostgreSQL persistence
- Delta/`state_patch` protocol as a first step (planned only after payload trimming is measurable)
- Visual redesign / new theme
- Rewriting working GamePage controller composition wholesale

## Current hotspots (measured)

| File | ~Lines | Problem |
|------|--------|---------|
| `apps/web/.../LobbySpotifySection.tsx` | ~1850 | God UI: entire Spotify setup product in one file |
| `apps/web/.../useLobbySpotify.ts` | ~1080 | God hook: auth, search, import, candidates, saved playlists |
| `apps/server/.../registerSocketHandlers.ts` | ~1070 | 35 copy-paste handlers in one file |
| `apps/server/.../RoomRegistry.ts` | ~1070 | Lifecycle + gameplay + timers + membership |
| `apps/web/.../gamePageMenuTabs.tsx` | ~730 | Menu factory + heavy presentational UI |
| `packages/game-engine/.../GameFlowService.ts` | ~680 | All rules in one service |
| `apps/server/.../RoomService.ts` | ~514 | Room facade + Spotify/playlist bus |

**Traffic finding:** every mutation emits full `PublicRoomState` via `state_update` (no deltas). History grows unbounded. `currentTrackCard.releaseYear` is on the wire before reveal (UI hides it; clients can still read it).

**Render finding:** challenge countdown ticks (~250ms) and host playback position updates flow through GamePage-wide derivation → menu tabs → header/actions, defeating existing `memo`s.

---

## Phase overview

| Phase | Focus | Risk | Est. scope | Gate |
|-------|--------|------|------------|------|
| **0** | Baseline + safety nets | None | Docs + tests only | You approve → Phase 1 |
| **1** | Split Lobby Spotify (files only) | Low | Web lobby | You validate |
| **2** | GamePage render isolation | Medium | Web game | You validate |
| **3** | Split socket handlers | Low–Med | Server realtime | You validate |
| **4** | Split RoomRegistry | Medium | Server rooms | You validate |
| **5** | Traffic: hide year + trim payloads | Medium | Shared + mappers + clients | You validate |
| **6** | Split GameFlowService | Medium | Engine | You validate |
| **7** | Game menu + Lobby assembly polish | Low | Web | You validate |
| **8** (optional) | Delta protocol / virtualization | Higher | Shared + both apps | Decide later |

**How we work:** after each phase I implement, run automated tests, and stop. You run the manual checklist below. Only then do we start the next phase.

---

## Phase 0 — Baseline & safety nets

### Why first

Refactor without a baseline is guesswork. Add mapper/payload tests that pin current (and soon-to-change) contracts before we move code.

### Work

1. Document baseline file sizes and test commands in this plan (done below).
2. Add focused unit tests:
   - `roomStateMappers` — public projection shape for `currentTrackCard`, timelines, history
   - Broadcast helper assert (optional): mutation → exactly one `state_update` for a known action
3. Run full workspace test suite; record pass/fail as baseline.

### Automated verification (agent)

```bash
npm run test
npm run typecheck
```

### Manual validation (you)

No product change — confirm tests pass locally if you want:

```bash
npm run test
```

### Exit criteria

- [x] Workspace tests green
- [x] New mapper test file(s) exist and pass
- [ ] You say “go Phase 1”

### Phase 0 results (2026-07-17)

| Check | Result |
|-------|--------|
| New tests | `apps/server/tests/rooms/roomStateMappers.test.ts` — **9 passed** |
| `npm run test` | server 73, web 61, game-engine 29 — **all green** |
| `npm run typecheck` | all workspaces — **green** |

Baseline pinned (intentionally failing after Phase 5 until tests are updated):
- `currentTrackCard.releaseYear` is present during `turn` and `challenge`
- Challenge public state omits internal fields (`placedCard`, `originalWasCorrect`)
- History omits `validSlotIndexes` / `challengerTtChange`
- Mapper sets `turn.turnSkipDeadlineEpochMs` to `null`

---

## Phase 1 — Split Lobby Spotify (behavior-preserving)

### Why

Largest maintainability debt. Pure extract → smaller review surface for all later lobby work. No intentional behavior change.

### Work

**UI** — extract from `LobbySpotifySection.tsx` into:

```
pages/LobbyPage/components/spotify/
  LobbySpotifySection.tsx          # summary + open modal only
  SpotifySetupModal.tsx
  SpotifySetupContent.tsx
  SpotifyPlaylistSearchPanel.tsx
  SpotifySmartSearchResultRow.tsx
  SpotifyQuickPicksPanel.tsx
  SpotifyCandidateReviewPanel.tsx
  SpotifyOpenedPlaylistPanel.tsx
  SpotifyOpenedTrackRow.tsx
  spotifySetupIcons.tsx
```

**Hook** — extract from `useLobbySpotify.ts` into:

```
pages/LobbyPage/hooks/spotify/
  useSpotifyAuth.ts
  useSpotifyPlaylistImport.ts
  useSpotifyPlaylistSearch.ts
  useSpotifySmartSearch.ts
  useSpotifyOpenedPlaylist.ts
  useSpotifyCandidates.ts
  useSavedPlaylistsController.ts
  spotifyQueueTrackIds.ts          # pure helpers
  useLobbySpotify.ts               # thin composer (same public result type)
```

Keep CSS shared initially (`LobbySpotifySection.module.css`); split CSS only if a panel’s styles are clearly isolated.

### Tests to add/update

- Pure helpers extracted from the hook (e.g. queue track ID sets) → unit tests
- Existing `savedPlaylists.test.ts` / lobby selector tests must still pass
- No requirement for full modal RTL coverage in this phase

### Automated verification (agent)

```bash
npm run test -w apps/web
npm run typecheck -w apps/web
npm run lint -w apps/web
```

Confirm no file under `spotify/` exceeds ~700 lines.

### Manual validation (you) — Lobby Spotify checklist

1. Open app → create room as host → Lobby.
2. **Auth:** Connect Spotify (popup) → success state on summary card.
3. **Search playlists:** Search → open a playlist → apply/remove tracks → track count updates.
4. **Smart search:** Run smart search → swipe/select results → apply.
5. **Quick picks / candidates:** Generate candidates → review → apply.
6. **Import by URL:** Paste a Spotify playlist URL → import → deck count updates.
7. **Saved playlists:** Save current setup → reload page → load saved → overwrite/rename flows.
8. **Non-host:** Join as second player → no host Spotify controls; lobby still usable.
9. **Mobile + desktop:** Repeat critical paths (auth + apply playlist) on both layouts.

### Exit criteria

- [x] All Spotify UI/hook files ≤ ~700 lines
- [x] Automated tests green
- [x] Manual checklist OK (progressing — no regressions surfaced)
- [x] You say “go Phase 2”

### Phase 1 results (2026-07-17)

| Check | Result |
|-------|--------|
| UI split | `components/spotify/` — largest TSX `SpotifySetupContent.tsx` ~386 lines |
| Hook split | `hooks/spotify/` — composer ~232 lines; domain hooks 68–225 |
| CSS | Still shared `LobbySpotifySection.module.css` (~1321) — deferred per plan |
| New tests | `spotifyQueueTrackIds.test.ts` — **12 passed** |
| `npm run test -w apps/web` | **73 passed** |
| `npm run typecheck -w apps/web` | **green** |
| `npm run lint -w apps/web` | **green** |

---

## Phase 2 — GamePage render isolation (performance)

### Why

Biggest client interaction win without changing game rules. Countdown and playback ticks currently invalidate large subtrees.

### Work

1. **Challenge countdown:** move interval into `ChallengeActionPanel` (or a tiny `useChallengeCountdown` used only there). Stop updating page-wide derived state every 250ms.
2. **Host playback:** keep position/scrubber state inside Playback tab / a narrow provider — not in capability state that rebuilds `menuTabs` for the whole header.
3. **Stabilize identities where cheap:** `useCallback` / refs for action handlers and `getPlayerName` so existing `memo`s on header/actions can hold across unrelated ticks.
4. Avoid rebuilding menu React element trees on every playback tick (tabs data vs elements).

### Tests to add/update

- Unit test for countdown helper (deadline → label; reduced-motion / expiry edge)
- Existing GamePage selector / assembly / transition tests must pass unchanged
- Optional: assert capability state does not include high-frequency playback position fields

### Automated verification (agent)

```bash
npm run test -w apps/web
npm run typecheck -w apps/web
```

### Manual validation (you) — Game feel checklist

1. Start a 2+ player game with a deck.
2. **Challenge window:** Trigger challenge → countdown should feel smooth; rest of UI (timeline scroll, other players) should not “shimmer”/re-layout every tick.
3. **Place / reveal:** Place card → confirm reveal → timeline updates correctly; celebrations still play.
4. **Host playback (if Spotify host):** Open menu → Playback tab → position advances without header/timeline flicker.
5. **TT actions:** Skip / buy still work; status copy still correct.
6. **Reconnect:** Refresh mid-game → rejoin → state restores.
7. Prefer mobile viewport or real phone for challenge + drag.

### Exit criteria

- [x] Challenge tick no longer flows through full GamePage derivation
- [x] Playback position scoped to playback UI
- [x] Automated OK
- [ ] Manual OK
- [ ] You say “go Phase 3”

### Phase 2 results (2026-07-17)

| Check | Result |
|-------|--------|
| Challenge countdown | `nowEpochMs` interval removed from `useGameRoomConnection`; countdown label no longer threaded through controller → derived → status selectors. `useChallengeCountdownLabel` owns its own 250ms interval and is called only inside `ChallengeActionPanel`, using `roomState.challengeState.challengeDeadlineEpochMs` directly. Pure math extracted to `formatChallengeCountdownLabel` (`gamePageChallengeCountdown.ts`). |
| Host playback | `useHostPlayback` moved out of `useGamePageCapabilityState` (no longer rebuilds `menuTabs` on every tick) and into `PlaybackTabContent` inside `gamePageMenuTabs.tsx`, which mounts the hook itself. `createGameMenuTabs` no longer receives a `playback` prop. |
| Identity stability | `getPlayerName` / `getPossessivePlayerName` wrapped in `useCallback` (`useGamePagePlayerState`); all `useGamePageActions` handlers wrapped in `useCallback` with `emitRoomEvent` hoisted out of the hook body; `onSkipTrackWithTtIntent` / `onBuyTimelineCardWithTtIntent` wrapped in `useCallback` in `useGamePageController` so `GamePageHeader` / `GamePageActionPanels` memos can hold across unrelated re-renders. |
| New tests | `gamePageChallengeCountdown.test.ts` — **4 passed** |
| `npm run test -w apps/web` | **82 passed** |
| `npm run typecheck -w apps/web` | **green** |

---

## Phase 3 — Split realtime socket handlers

### Why

Transport boilerplate is the #1 barrier to safe server changes (rate limits, logging, acks). Behavior-preserving extract.

### Work

```
apps/server/src/realtime/
  createSocketHandler.ts       # parse → try → error map → optional broadcast
  errorMessages.ts             # code → user message catalog
  handlers/lobbyHandlers.ts
  handlers/gameplayHandlers.ts
  handlers/playlistHandlers.ts
  handlers/spotifyHandlers.ts
  registerSocketHandlers.ts    # wire-only
```

No intentional protocol changes.

### Tests to add/update

- Unit tests for `createSocketHandler` / error catalog (invalid payload → expected error code)
- Existing integration tests (`roomFlow`, `challengeFlow`, `hostTransfer`, `ttActions`) must pass

### Automated verification (agent)

```bash
npm run test -w apps/server
npm run typecheck -w apps/server
```

### Manual validation (you)

1. Create / join / rename room.
2. Start game → place → challenge → reveal.
3. Host transfer: host disconnect → another player becomes host.
4. Spotify search/import still works from lobby.
5. Invalid action (e.g. non-host start) still shows a clear error toast/message.

### Exit criteria

- [ ] Handler files ≤ ~700 lines; `registerSocketHandlers` is thin wiring
- [ ] Server tests green
- [ ] Manual smoke OK
- [ ] You say “go Phase 4”

---

## Phase 4 — Split RoomRegistry

### Why

Required by `CLAUDE.md` (“do not add responsibilities to `RoomRegistry`”). Unlocks safer timer and gameplay changes.

### Work

Extract collaborators (names may adjust slightly during implementation):

| Module | Owns |
|--------|------|
| `RoomStore.ts` | Map of rooms, memberships, redirects, `RoomRecord` |
| `RoomLobbyService.ts` | Create/join/settings/profile/deck lobby edits/award TT in lobby |
| `RoomGameplayService.ts` | Start/place/challenge/reveal/TT in-game |
| `RoomConnectionService.ts` | Disconnect/reconnect, host transfer, offline skip |
| `RoomTimerCoordinator.ts` | Sole owner of challenge/reconnect/host/turn-skip schedules |

Keep existing mappers/builders. `RoomService` remains the outer facade (or becomes a thin delegator). Prefer **move methods + re-export** over rewrite.

### Tests to add/update

- Prefer keeping socket integration tests as the safety net
- Add unit tests for one extracted collaborator if easy (e.g. store get/create)
- Do **not** enlarge `roomFlow.test.ts` further without splitting it later

### Automated verification (agent)

```bash
npm run test -w apps/server
npm run typecheck -w apps/server
```

### Manual validation (you)

Same as Phase 3 smoke, plus:

1. Kick player → kicked client gets `room_closed` / kick reason.
2. Last player leaves → room gone from list.
3. Challenge timer auto-resolves if no confirm.
4. Offline active player → turn skip after grace (if configured).

### Exit criteria

- [ ] No rooms module production file > ~700 lines
- [ ] Timer ownership clear (one coordinator)
- [ ] Tests + manual OK
- [ ] You say “go Phase 5”

---

## Phase 5 — Traffic & data integrity

### Why

Full-state broadcasts are expensive; year-on-wire breaks “hidden until reveal.”

### Work (incremental — prefer measurable wins over a new protocol)

1. **P0 integrity:** omit `releaseYear` / spoiler fields from `currentTrackCard` until `reveal` / `finished` (mapper + shared type discipline). Timelines/history keep years (already revealed).
2. **Payload trim (without deltas):**
   - Cap or omit `history` on non-reveal updates (e.g. send full history only on reveal, or last N entries)
   - Prefer referencing track metadata by id where clients already hold cards (only if clients can adopt without UX regression)
3. Document payload size before/after for: settings tweak, place card, reveal, TT award.
4. **Defer** full `state_patch` delta protocol to Phase 8 unless trim is insufficient.

### Tests to add/update

- Mapper test: during `turn`/`challenge`, `currentTrackCard` has no `releaseYear`
- Mapper test: during `reveal`/`finished`, year is present
- Integration: place → wrong year still resolved server-side; client never needed year early
- Web: confirm UI still hides/shows details based on status (no reliance on pre-reveal year)

### Automated verification (agent)

```bash
npm run test
npm run typecheck
```

### Manual validation (you) — fairness & traffic

1. As non-host player: open DevTools → Network/WS → inspect `state_update` during an active turn → **confirm year is absent** on current card.
2. After reveal: year appears; timeline shows correct year.
3. Play a full correct + incorrect placement; winner still works.
4. Subjective: mid-game actions feel no worse; ideally snappier on mobile data.

### Exit criteria

- [ ] Year leakage fixed and tested
- [ ] Documented payload reduction for at least one high-frequency update type
- [ ] You say “go Phase 6”

---

## Phase 6 — Split GameFlowService

### Why

Engine soft-limit (~500) and reviewability. Pure extract; rules must not change.

### Work

| Module | Owns |
|--------|------|
| `TurnFlowService.ts` (or functions) | Start, place (no challenge), confirm reveal, advance turn |
| `ChallengeFlowService.ts` | Claim, challenge place, resolve, cancel offline |
| `TtActionService.ts` | Skip, buy, award |
| Thin `GameFlowService.ts` | Facade matching current public API for callers |

Keep `placementRules.ts`. Delete or wire unused `PlacementService` consistently (prefer delete unused wrapper if still dead).

### Tests to add/update

- Existing `gameFlow.test.ts` / `placementRules.test.ts` must pass unchanged in intent
- Optionally split mega `gameFlow.test.ts` by domain later (not required to finish this phase)

### Automated verification (agent)

```bash
npm run test -w @tunetrack/game-engine
npm run test -w apps/server
npm run typecheck
```

### Manual validation (you)

Full core loop: start → place correct → place wrong → challenge success → challenge fail → TT skip → TT buy → win at target score.

### Exit criteria

- [ ] Engine service files ≤ ~700 lines
- [ ] Engine + server tests green
- [ ] Manual core loop OK
- [ ] You say “go Phase 7”

---

## Phase 7 — Game menu + Lobby assembly polish

### Why

Finishes frontend structure after Spotify split and render isolation.

### Work

1. Split `gamePageMenuTabs.tsx` into `gameMenu/` components (player item, token buttons, playback tab, history tab, thin factory).
2. Introduce Lobby assembly model (like GamePage) so mobile/desktop share host panels instead of divergent setup trees.
3. Lazy-mount Spotify setup modal content when closed (bundle + mount cost).
4. Virtualize smart-search / candidate lists if still janky on long results.
5. **Lobby Spotify composer API optimization (snappy UX):** replace the flat ~90-field `useLobbySpotify` return bag with grouped domain objects (`auth` / `import` / `smartSearch` / `openedPlaylist` / `candidates` / `savedPlaylists` / `queue`) OR migrate panels to consume the domain hooks / context selectors directly, so Lobby Spotify UI does not re-render the entire setup tree on unrelated state changes. Explicit goal: snappy playlist add/remove/search interactions.

### Tests

- Assembly model unit tests for Lobby (mirror GamePage pattern)
- Existing menu-related selectors unchanged

### Automated verification (agent)

```bash
npm run test -w apps/web
npm run typecheck -w apps/web
```

### Manual validation (you)

1. Game menu: players tab, award TT, playback, history — all tabs.
2. Lobby mobile vs desktop: settings, Spotify, start game — parity.
3. Long smart-search results scroll smoothly.

### Exit criteria

- [ ] `gamePageMenuTabs` gone or thin; files ≤ ~700
- [ ] Lobby assemblies share model
- [ ] You approve plan complete (or Phase 8)

---

## Phase 8 (optional) — Delta protocol & deeper traffic

Only if Phase 5 trim is not enough:

- Introduce `state_patch` (or field masks) in `packages/shared`
- Server emits patches for high-frequency / small mutations; full snapshot on join/resync
- Client merges patches immutably into room state
- Integration tests for join → patch → resync

Higher risk; treat as a separate project with its own checklist.

---

## Cross-cutting rules for every phase

Per `AGENT.md` / `CLAUDE.md`:

1. **Surgical within the phase** — do not “while we’re here” clean unrelated code.
2. **Server remains source of truth** — no moving correctness to the client.
3. **Game rules stay in `game-engine`** — no Socket.IO/timers/logging in the engine.
4. **Validate at boundaries** — keep Zod parse in realtime layer.
5. **File size** — split before ~700 lines; prefer responsibility boundaries.
6. **Verify before claiming done** — run the phase’s automated commands; report what ran.

---

## Baseline commands

| Check | Command |
|-------|---------|
| All tests | `npm run test` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Dev | `npm run dev` |

---

## Progress tracker

| Phase | Status | Notes |
|-------|--------|-------|
| 0 Baseline + safety nets | **Complete** | Mapper tests + full suite green |
| 1 Lobby Spotify split | **Complete** | Manual Lobby Spotify checklist progressing, no regressions |
| 2 GamePage render isolation | **Complete** | Countdown + playback isolated; awaiting your manual game feel check |
| 3 Socket handlers split | Not started | |
| 4 RoomRegistry split | Not started | |
| 5 Traffic & year integrity | Not started | |
| 6 GameFlowService split | Not started | |
| 7 Menu + Lobby polish | Not started | |
| 8 Delta protocol (optional) | Deferred | |

---

## Related docs

- [`AGENT.md`](../AGENT.md) — agent coding rules
- [`CLAUDE.md`](../CLAUDE.md) — product & architecture
- [`docs/frontend_engineering_rules.md`](./frontend_engineering_rules.md)
- [`docs/backend_engineering_rules.md`](./backend_engineering_rules.md)
- [`docs/gamepage_refactor_handoff.md`](./gamepage_refactor_handoff.md)
- [`docs/frontend_rework_sequence_plan.md`](./frontend_rework_sequence_plan.md)

---

## How to proceed

Reply with one of:

- **`go Phase 0`** — I’ll add baseline mapper tests, run the suite, and stop for your OK  
- **`go Phase 0+1`** — baseline then Spotify split in one sitting (still stops for your manual check before Phase 2)  
- Adjust priorities / drop a phase if you disagree with ordering
