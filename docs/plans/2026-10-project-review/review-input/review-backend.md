# TuneTrack-beats — Backend Review

Scope: `apps/server/src` (all), `packages/shared/src`, `packages/game-engine/src`, and their tests.
Read-only review against `CLAUDE.md`, `docs/rules/backend_engineering_rules.md`, and plan docs 04/05.
All file paths are relative to `C:\Coding\TuneTrack-beats`. All examples use placeholder data.

Priority key: **P0** data loss / security / crash · **P1** user-visible bug or clear architectural violation · **P2** maintainability / performance · **P3** nit.

Totals: **P0 2 · P1 10 · P2 22 · P3 11**

---

## 1. Top findings (prioritised)

### P0

**P0-1 — OAuth `state` is unsigned, unverified and issuable by anyone; a third party can bind their Spotify account to any room.**

- `apps/server/src/spotify/SpotifyAuthService.ts:34-49` `buildAuthUrl` encodes `{roomId, socketId, redirectUri}` as plain base64url JSON (`encodeOAuthState`, line 428). No HMAC, no nonce, no server-side pending-state registry, no expiry.
- `apps/server/src/rooms/RoomService.ts:413-418` `buildSpotifyAuthUrl` performs **no membership or host check** before issuing the URL, and `realtime/handlers/spotifyHandlers.ts:45-61` forwards it for any connected socket.
- `SpotifyAuthService.ts:51-143` `handleCallback` trusts whatever `state` decodes (`decodeOAuthState`, line 432) and calls `tokenStore.setHostTokens(state.roomId, …)` (line 113) unconditionally — overwriting the real host's tokens — and emits the resulting `accessToken` to `state.socketId` (`http/spotifyRoutes.ts:55-57`).
- Attack: any client that knows a room code (lobby codes are public via `list_rooms`) crafts `state = base64url('{"roomId":"TEST_ROOM_1","socketId":"<own socket>","redirectUri":"<registered uri>"}')`, completes OAuth with its own (free) account, and the victim room's host playback now runs on the attacker's tokens or breaks. `updateSpotifyAuthStatus` fails afterwards (socket is not host) but the token overwrite has already happened.
- Fix: (a) require `getRoomRecordForMember` + host check in `buildSpotifyAuthUrl`; (b) issue a random nonce, keep `{nonce → roomId, socketId, expiresAt}` server-side (single-use, ~10 min TTL) and look it up in `handleCallback`; (c) before `setHostTokens`, re-check that `socketId` is still a member and host of `roomId`. There is **no test** for `handleCallback` or `spotifyRoutes` at all.

**P0-2 — Kicking the active placer during an open Beat! window crashes the process (uncaught throw in a timer callback); kicking during reveal soft-locks the game.**

- `apps/server/src/rooms/RoomConnectionService.ts:97-108` only handles `phase === "turn"`; for `challenge`/`reveal` it calls the local `removePlayerFromGameState` (line 446) which strips the player and timeline but leaves `challengeState.originalPlayerId` / `turn.activePlayerId` dangling.
- Challenge phase: the auto-resolve timer (`RoomGameplayService.ts:306-329`) calls `resolveChallengeWindow` → `ChallengeFlowService.ts:180-184` `timelines[originalPlayerId]` is undefined → `throw new Error("PLAYER_TIMELINE_NOT_FOUND")` inside a `setTimeout` callback with no try/catch and no `uncaughtException` handler (`index.ts`) → **Node exits, every in-memory room is lost**. Without a timer (`challengeWindowDurationSeconds: null`) the host's manual resolve throws the same code and the room is stuck.
- Reveal phase: `confirmReveal` → `TurnFlowService.ts:178` `findNextActivePlayerId` → `gameFlowHelpers.ts:97-100` throws `ACTIVE_PLAYER_NOT_FOUND`; `skip_turn` is refused outside `turn` (`RoomGameplayService.ts:76`), so the game cannot advance.
- The engine already exposes `GameFlowService.removePlayer` (`TurnFlowService.ts:218-232`) but it has the same gap and `RoomConnectionService` does not even use it (duplicate rule logic in `rooms/`). Fix in the engine: `removePlayer` must resolve/cancel an open or claimed challenge the player owns, finish a pending reveal, and reassign `turn.activePlayerId` when the removed player is active; `rooms/` should call only that. Also wrap every timer callback (`RoomTimerCoordinator` schedule paths) in a guard that logs instead of letting the process die. Existing test `roomFlow.test.ts:1261` covers turn phase only.

### P1

**P1-1 — `close_room` clears the room's Spotify tokens and playback session before authorisation.**
`RoomService.ts:348-354`: `clearHostTokens(roomId)` and `spotifyPlaybackSessions.clearRoom(roomId)` run first; `roomRegistry.closeRoom` (which performs membership + host checks, `RoomLobbyService.ts:408-412`) runs after. Any connected socket — not even a room member — can send `{roomId:"TEST_ROOM_1"}` and wipe that room's host tokens; the caller gets `ONLY_HOST_CAN_CLOSE_ROOM` but the damage is done (host playback fails with `not_connected` until re-auth). Rule 9 ("never partially mutate before an operation is known valid").

**P1-2 — Room rename leaves Spotify tokens, playback sessions and candidate sessions keyed by the old room id.**
`RoomLobbyService.renameRoom` (lines 192-227) retargets `RoomStore` memberships/redirects only. `SpotifyTokenStore.hostTokensByRoomId`, `SpotifyPlaybackSessionStore.sessions/playChains`, and `SpotifyDiscoveryService.sessionsById[*].roomId` are never retargeted (grep: no `retarget` outside `RoomStore`). After "connect Spotify → rename room → start game", `getValidHostAccessToken(newRoomId)` is `null` → `play_spotify_track` returns `not_connected` while `settings.spotifyAuthStatus` still says `connected`; the old-id tokens are never cleared (leak). `roomFlow.test.ts:281` tests rename without Spotify.

**P1-3 — Joining or creating a room removes the player from their current room _before_ the request is validated.**
`RoomLobbyService.addPlayerToRoom:148-163`: `removePlayerBySessionId` (and a broadcast) happens before `ROOM_NOT_FOUND` / `GAME_ALREADY_STARTED` checks. A player in lobby `TEST_ROOM_1` who mistypes a code is silently dropped from `TEST_ROOM_1` and then told the room does not exist. Same ordering in `createRoom:93-102` relative to `ROOM_LIMIT_REACHED`.

**P1-4 — No deck-exhaustion rule: the game soft-locks when the deck runs out.**
`TurnFlowService.confirmReveal:176` sets `currentTrackCard: drawNextCard(deck)` → `null`; the next `placeCard` throws `CURRENT_CARD_NOT_AVAILABLE` (`TurnFlowService.ts:72`), which is not in `realtime/errorMessages.ts` so players see the generic message. The default deck has **40 cards** (`decks/test-decks/default-test-deck.json`); 4 players × target 10 with ~50 % wrong placements needs ~80 draws. No engine test covers an empty deck. Decide a rule (finish with most cards / reshuffle discards) in the engine.

**P1-5 — `import_playlist` triggers outbound Spotify calls before any authorisation.**
`RoomService.importPlaylist:356-369` awaits `playlistImportService.importFromUrl` (client-credentials token, full pagination) and only then calls `setImportedDeck`, which does the host check. Any socket can make the server hammer Spotify with arbitrary playlist URLs. Combined with P1-6 this is a third-party-quota DoS surface.

**P1-6 — No rate limiting on any socket event or on `/api/spotify/callback`.**
`app/createSocketServer.ts` sets only `cors` and `maxHttpBufferSize: 5 MiB`. `search_spotify_music` fans out to 3 Spotify requests (`SpotifyMusicSearchService.ts:145-155`); `generate_spotify_candidates` fetches up to 8 playlists with unbounded pagination (`SpotifyApiClient.getAllPlaylistTracks:471-512`, no page cap) via `Promise.all`; each candidate session holds up to 500 cards for 30 min (`SpotifyDiscoveryService.ts:18, 202-212`). Plan 04 §2.4 is still open.

**P1-7 — `RoomService` (718 lines) and `RoomRegistry` (319 lines) are pure pass-through façades; `RoomRegistry` still accumulates authorisation predicates.**
`RoomRegistry.ts:121-301` is one-line delegation; `requireHost` (303-309) is dead code (never called) and throws a Spotify-specific code. `RoomService` mixes Spotify orchestration (413-634), playlist orchestration (356-411, 636-677) and logging. Plan 04 §4 is open and `CLAUDE.md` "above 500 lines = must split" is violated.

**P1-8 — Game-rule mutation lives in `rooms/`.**
`RoomConnectionService.ts:446-456` `removePlayerFromGameState` reimplements `TurnFlowService.removePlayer`; `RoomGameplayService.skipTurn:72-96` decides which engine transition applies (claimed-challenge cancel vs. skip) and `RoomGameplayService.assertChallengeWindowStillOpen/isChallengeDeadlineExpired:332-340` evaluates a gameplay deadline that the engine stores in `challengeState.challengeDeadlineEpochMs`. "Is the window still open?" is a rule; `rooms/` should pass `nowEpochMs` into the engine.

**P1-9 — `emitServerError` leaks arbitrary `Error.message` to clients as `code`.**
`realtime/createSocketHandler.ts:16` uses `error.message` for every `Error`, so a `TypeError` ("Cannot read properties of undefined …") becomes the wire-level `code`; it is logged at `warn` without a stack (line 17), so the real failure is hard to diagnose. Introduce a typed `RoomError`/`DomainError` with a `code` field; map anything else to the fallback code and log at `error` with the stack.

**P1-10 — Timer callbacks are unguarded, and a thrown mapping error kills the process.**
Besides P0-2: `roomStateMappers.ts:142` throws `TRACK_CARD_NOT_FOUND`; `advanceTurnToPlayer` throws `PLAYER_NOT_FOUND`/`ACTIVE_PLAYER_UNCHANGED`; `applyHostTransfer` throws three codes — all reachable from `setTimeout` callbacks in `RoomConnectionService.ts:50-59, 237-257, 282-298, 305-307` and `RoomGameplayService.ts:306-329`. No `process.on("uncaughtException"/"unhandledRejection")` exists (`index.ts`). Plan 04 §3.1 open.

### P2

**P2-1 — Engine mutates its input state.** `gameFlowHelpers.drawNextCard:75-77` uses `deck.shift()`, so `confirmReveal` (`TurnFlowService.ts:176`), `skipTurnToPlayer:265`, `cancelClaimedChallengeForOfflineChallenger` (`ChallengeFlowService.ts:255`) and `skipCurrentTrackWithTt` (`TtActionService.ts:50`) mutate the caller's `gameState.deck` before the new snapshot is stored. Violates "return new state snapshots" and makes a thrown error after the draw silently lose a card. `startGame` copies the deck (line 25) but later transitions do not.

**P2-2 — TT costs are hard-coded in the engine while `packages/shared/src/constants/gameplay.ts:14-16` defines `SKIP_TRACK_TT_COST`, `CHALLENGE_TT_COST`, `BUY_TIMELINE_CARD_TT_COST`.** Engine literals at `TtActionService.ts:44, 58, 87, 126`, `ChallengeFlowService.ts:34, 89`; `gameFlowHelpers.MAX_TT_TOKEN_COUNT = 5` duplicates `MAX_STARTING_TT_TOKEN_COUNT`; `errorMessages.ts:118` hard-codes "3 TT". The engine does not import shared at all, so the constants are decorative.

**P2-3 — Idempotency store is not scoped to the acting player.** `RoomStore.rememberProcessedActionAck:85-97` keys by `roomId + requestId`; `RoomRegistry.getProcessedActionAck:233-240` only checks the caller is a member. A member who learns another member's `requestId` can obtain a forged `{ok:true}` ack for an action they never performed. Key by `playerId` as well. Also `close_room`/`rename_room` keep per-socket closures (`lobbyHandlers.ts:49-56, 365`) — a different mechanism from the other 11 events.

**P2-4 — `connectionStateRecovery` plan assumption is wrong for this code.** Plan 04 §2.1 says a recovered socket keeps its membership "so no rejoin is needed". But `lobbyHandlers.registerDisconnectHandler:406-416` → `RoomConnectionService.removePlayerBySocketId:37-41` deletes the socket membership on every `disconnect`. Enabling recovery alone changes nothing; the disconnect handler must defer/skip membership removal for recoverable disconnects.

**P2-5 — Every mutation broadcasts the full `PublicRoomState` to the whole room** (`createSocketHandler.broadcastRoomState:30-34`, `registerSocketHandlers.ts:16-24`). With 6 players × 30 timeline cards (~300 B each incl. `artworkUrl`/`previewUrl`/`spotifyTrackUri`) plus 30 history entries this is ~60-70 KB per event per recipient; a TT award re-sends all of it. Plan 05 §6 open.

**P2-6 — Playlist editor emits the whole deck to the host after every single edit.** `RoomService.updatePlaylistTrack:668-677` and `removePlaylistTracks:646-666` map the full `importedDeck` (up to 1 000 tracks ≈ 300 KB) into `PlaylistTracks` per edit, and `RoomLobbyService.updateImportedDeckTrack:373-395` rebuilds the array per edit.

**P2-7 — `realtimeAuditLogger` pending-event-id map grows for the socket's lifetime.** `logAcceptedSocketEvent` (line 73) is exported but **never called** (grep), so `consumeEventId` runs only on rejections; every accepted event leaves its id in `pendingEventIdsBySocket` (line 29). With `ENABLE_EVENT_AUDIT=true` a long session accumulates one UUID per event per socket. The "accepted" correlation the header comment describes does not exist. `playerId` and `durationMs` in `AuditLogInput` are never populated.

**P2-8 — PII in operational logs.** `displayName` is logged at info in `lobbyHandlers.ts:122, 159` and again in `RoomService.ts:128, 147` (same event logged twice). With `EVENT_AUDIT_INCLUDE_PAYLOADS=true`, `copyPrimitiveFields` (`realtimeAuditLogger.ts:196-209`) copies `displayName` and search `query` strings into audit events that are shipped to Axiom (`axiomLogSink.ts`, default domain `us-east-1.aws.edge.axiom.co`); `SpotifyDiscoveryService.ts:97-106` also puts `query` in `meta`. Plan 04 §6 explicitly asks that audit payloads stay display-name-free. Axiom is a third-party US-hosted service and requires a compliance (GDPR Art. 44 transfer) review before use with real players.

**P2-9 — Spotify scopes exceed need.** `SpotifyApiClient.buildAuthUrl:520-527` requests `user-read-email`; only `profile.product` is used (`SpotifyAuthService.ts:111`). Drop it (data minimisation). The access token is intentionally handed to the browser for the Web Playback SDK (`spotifyRoutes.ts:56`, `spotifyHandlers.ts:236`), so every scope on it is exposed client-side.

**P2-10 — Refresh-token rotation ignored.** `SpotifyAuthService.refreshHostToken:175-181` stores only `access_token`; if Spotify returns a new `refresh_token` it is discarded and the stored one may become invalid, producing a spurious `invalid_grant` → forced re-auth. Concurrent refreshes (client `refresh_spotify_token`, `pauseRoomPlayback`, `playTrackOnHostDevice`) are not coalesced.

**P2-11 — `applyCandidates` consumes the candidate session before the host check.** `RoomService.useSpotifyCandidates:472-492` calls `spotifyDiscoveryService.applyCandidates` (deletes the session, `SpotifyDiscoveryService.ts:386`) and only then `updateImportedDeck` (host check). If the host role changed in between, the host's retry gets `candidate_session_expired`.

**P2-12 — Five async handlers bypass `createSocketHandler`** (`spotifyHandlers.ts:63-305`, `playlistHandlers.ts:32-63`), each hand-rolling parse → emit → catch with slightly different shapes (`invalid_query`, `invalid_playlist`, `invalid_source`, `too_few_tracks` as the _schema-failure_ code at line 190). No ack support, no audit `rejected` record, no shared error path. `createSocketHandler` should accept an async `handle`.

**P2-13 — Identical 10-line `idempotency` blocks repeated 11×** across `gameplayHandlers.ts` and `lobbyHandlers.ts` (e.g. 65-75, 103-113, 134-144, …). Extract `roomActionIdempotency(socket, roomService)` or an `idempotent: true` flag on `createSocketHandler`.

**P2-14 — Four copies of the dedupe-by-uri-or-title/artist logic** (`RoomLobbyService.ts:422`, `PlaylistImportService.ts:230`, `SpotifyDiscoveryService.ts:473`, `SpotifyMusicSearchService.ts:298`), **two copies of `cardToPublicTrackInfo`** (`RoomService.ts:694`, `SpotifyDiscoveryService.ts:562`), **three copies of `getOrRefreshClientCredentialsToken`** (`PlaylistImportService.ts:218`, `SpotifyDiscoveryService.ts:396`, `SpotifyMusicSearchService.ts:210`) — the last with no in-flight de-duplication so parallel calls fetch parallel tokens.

**P2-15 — `packages/shared` has two sources of truth for every payload.** Hand-written interfaces in `events/clientEvents.ts:51-267` duplicate the Zod-derived `*PayloadParsed` types in `events/schemas.ts:322-428`; they already drift (`SearchSpotifyMusicPayload.limit: number` required vs schema default; `UseSpotifyCandidatesPayload.tracks?: PublicTrackInfo[]` vs `curatedPlaylistTrackSchema`; `SpotifySmartSearchPayload` in `spotify/spotifySmartSearch.ts:32-38` is a third copy of the same payload). Derive the client types from the schemas (`z.input`) and delete the interfaces.

**P2-16 — Four near-identical track shapes**: `GameTrackCard` (engine), `TrackCardInternal` (shared `game/track.ts:18`), `PublicTrackInfo` (`spotify/playlistTracks.ts:5`), `CuratedPlaylistTrackPayload` (`clientEvents.ts:171`), plus `EditedCandidateTrack` (`SpotifyDiscoveryService.ts:46`). `TrackCardInternal` is unused on the server.

**P2-17 — Client re-declares schema limits as literals.** `apps/web/src/pages/LobbyPage/components/PlaylistTrackDetailsSheet.tsx:172-173` hard-codes `1900` / `currentYear + 1` (mirrors `releaseYearSchema`, `schemas.ts:43-47`, which has no exported constant); `SpotifyQuickPicksPanel.tsx:54` hard-codes `min={10}` which also exists as `MIN_CANDIDATE_TRACK_COUNT` (`SpotifyDiscoveryService.ts:19`), `MIN_IMPORTABLE_TRACK_COUNT` (`PlaylistImportService.ts:10`) and schema literals (`schemas.ts:290, 299, 312, 316`).

**P2-18 — `RoomStore` scans whole maps in nine methods** (`RoomStore.ts:130-260`): `hasSocketMembershipForSession`, `clearOtherSocketMembershipsForSession`, `deleteSocketMembershipsForSession`, `findSessionIdForPlayer`, `getSessionIdsInRoom`, `retargetRoomRedirects`, `clearRoomRedirects`, `retargetMembershipsToRoom`, `clearMembershipsForRoom`, `collectAndClearSocketIdsForPlayer`. Fine at 5 rooms; plan 04 §5 correctly ranks it lowest.

**P2-19 — `broadcastRoomDirectory` iterates every connected socket** (`broadcastRoomDirectory.ts:8-12`) on each join/create/profile/transfer/kick/start and on every lobby `state_update` via the listener (`registerSocketHandlers.ts:21-23`), so a lobby join triggers it twice.

**P2-20 — Production timers are `unref()`'d** (`DisconnectTimerManager.ts:10`, `ChallengeTimerManager.ts:12`) and there is no `clearAll()`; no graceful shutdown (`index.ts` has no signal handling). Plan 04 §3 open. Note the `unref` concern is overstated while the HTTP listener keeps the loop alive, but `clearAll()` is still needed for shutdown/test teardown.

**P2-21 — `DeckService` reads deck JSON from disk synchronously on every `start_game`** (`DeckService.ts:32-49`, `readdirSync`/`readFileSync`) and resolves the path from `process.cwd()/src/decks/test-decks` (line 24), which does not exist in `dist/` — `npm start` from a different cwd or a build-only deploy fails at the first game start. Load once at boot and inject.

**P2-22 — Host `skip_turn` is not restricted to offline active players.** `RoomGameplayService.skipTurn:65-108` lets the host skip any connected player's turn at any time. Plan 04 §1 scopes the control to "if the offline player owns the active turn". Either enforce `connectionStatus === "disconnected"` or document the broader host power.

### P3

- **P3-1** `RoomConnectionService.kickPlayer:114-118` `ROOM_EMPTY_AFTER_KICK` is unreachable (host cannot kick self, `line 83`).
- **P3-2** `lobbyHandlers.ts:275` sends `roomName: data.roomId`; `RoomClosedPayload.reason: "closed"` (`serverEvents.ts:53`) is never emitted; `SpotifyPlaybackResultPayload.code "not_host"` (`serverEvents.ts:90`) is never produced; `ActionAck.result` is never used.
- **P3-3** `PublicRoomState.targetTimelineCardCount` duplicates `settings.targetTimelineCardCount` (`roomLobbyBuilders.ts:55, 102, 117`).
- **P3-4** `RoomRegistry.ts:35-39` default grace constants duplicate `env.ts:27-35` defaults.
- **P3-5** `renameRoom` checks `hasRoom(nextRoomId)` before membership (`RoomLobbyService.ts:203`), letting non-members probe in-game room ids (lobby ids are public anyway).
- **P3-6** `env.CLIENT_ORIGIN` is validated with `z.string().url()` (`env.ts:36`) but consumed as a comma-separated list (`clientOrigin.ts:15-20`); a two-origin value only passes because WHATWG URL tolerates a comma in the host.
- **P3-7** `createTrackCardMap` clones every card (`roomStateMappers.ts:75`) and `createShuffledDeckFromCards` copies twice (`DeckService.ts:29, 71`).
- **P3-8** Handler `log:` hooks log every gameplay action at `info` (`gameplayHandlers.ts:58-59, 90-98, …`) and `RoomService` logs the same join/create again — duplicate noise versus the "notable lifecycle events" rule.
- **P3-9** `spotifyRoutes.ts:16` fires `void handleSpotifyCallback(...)`; any unexpected throw leaves the HTTP request hanging and becomes an unhandled rejection.
- **P3-10** `packages/shared/src/events/schemas.test.ts` is co-located in `src/` while all other tests live under `tests/`.
- **P3-11** The all-offline room timer is only scheduled from the disconnect path (`RoomConnectionService.ts:301-308`); kicking the last online player leaves a room with only offline players and no expiry timer.

---

## 2. Architecture violations (summary table)

| Rule                      | Finding                                                                                                                                                                 | Evidence                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Game rules only in engine | Player removal rule reimplemented in rooms; challenge-deadline evaluation in rooms                                                                                      | P0-2, P1-8              |
| Validate before mutate    | close_room / join / create / import / useCandidates mutate or call out before auth                                                                                      | P1-1, P1-3, P1-5, P2-11 |
| Handlers thin & uniform   | 5 async handlers bypass `createSocketHandler`; 11 copied idempotency blocks                                                                                             | P2-12, P2-13            |
| Mapping pure              | OK — `roomStateMappers.ts` is pure; `mapRoomStateToSummary` lives in `RoomStore` (minor misplacement)                                                                   | —                       |
| RoomRegistry shrinking    | Still a 319-line façade with dead `requireHost`; `RoomService` 718 lines                                                                                                | P1-7                    |
| Engine purity             | Clean: no timers/IO/logging/`Date.now`; but input mutation via `deck.shift()`                                                                                           | P2-1                    |
| Server authority          | Preserved everywhere except idempotency-ack forgery and unsigned OAuth state                                                                                            | P2-3, P0-1              |
| Zod at boundary           | All socket events parse through shared schemas (list_rooms has no payload). HTTP callback query is hand-parsed (`spotifyRoutes.ts:27-29`) — acceptable but inconsistent | —                       |
| Timers centralised        | Yes (`RoomTimerCoordinator`), but no `clearAll`, no callback guards, `unref` in production                                                                              | P1-10, P2-20            |

Positive notes worth keeping: `RoomTimerCoordinator` ownership is clear and every timer callback re-reads state before mutating; `mapGameStateToPublicRoomState` correctly hides `releaseYear`/`sourceReleaseYear` in `turn`/`challenge` and is locked by tests (`roomStateMappers.test.ts:71, 91`); the ack/idempotency path in `createSocketHandler` is well-tested; `env.ts` is a good single validated boundary; CORS validator is strict outside development.

## 3. Stability & correctness checklist

| Area                                   | Status                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Disconnect → reconnect (lobby/in-game) | Correct; retained identity, no false expiry (`RoomConnectionService.ts:215-311`), tests present                                          |
| Host transfer (manual/auto)            | Correct; auto path guarded by `hasHostTransfer`; cannot throw with a connected candidate                                                 |
| Close room                             | Timers → memberships → room → redirects order is right (`RoomLobbyService.ts:414-417`); token wipe precedes auth (P1-1)                  |
| Kick                                   | Broken for `challenge`/`reveal` phases (P0-2); unreachable empty-room branch (P3-1)                                                      |
| Rename                                 | Store retargeted; Spotify stores not (P1-2); processed-ack LRU is dropped with the old id (`RoomStore.deleteRoom:65-68`)                 |
| Memory                                 | `SpotifyTokenStore` entries orphaned on rename (P1-2); audit id arrays grow (P2-7); candidate sessions bounded only by 30-min TTL (P1-6) |
| Idempotency                            | Works; LRU 32/room; not player-scoped (P2-3); error path correctly does not remember                                                     |
| Error mapping                          | Leaks raw messages as codes (P1-9); ~10 engine/store codes have no catalog entry and fall back to the generic message                    |
| Process safety                         | No signal, `uncaughtException` or `unhandledRejection` handlers (P1-10)                                                                  |

## 4. Security & privacy

- **Authorisation gaps**: `request_spotify_auth_url` (none), `close_room` side-effects (none), `import_playlist` call-out (none), `unregister_spotify_playback_device` (none, harmless), all Spotify search/discovery events (member but not host — any guest can spend the room's Spotify quota).
- **OAuth**: unsigned state (P0-1); state carries the internal socket id into the Spotify redirect URL.
- **Tokens**: in-memory only, keyed by room, cleared on close/expiry — appropriate for MVP. Access token deliberately exposed to the host browser for the Web Playback SDK; refresh token never leaves the server. `copyPrimitiveFields` redacts keys containing "token" in audit payloads.
- **Abuse surfaces**: no rate limiting (P1-6); 5 MiB socket buffer × unlimited rate; unbounded playlist pagination.
- **PII / GDPR**: display names and search queries in logs and in Axiom audit (P2-8); `user-read-email` scope requested without need (P2-9). Spotify profile response is not persisted (only `product` is read). Any production use of Axiom (and Spotify itself) needs a compliance review; Hungarian/EU deployments should confirm log retention and the US ingest endpoint.
- **CORS/env**: strict in production; dev allows private IPv4 ranges (`clientOrigin.ts:1-13`) — fine for LAN play, document it.

## 5. Performance

Full-state fan-out (P2-5), full playlist re-emission per edit (P2-6), `broadcastRoomDirectory` over all sockets (P2-19), sync disk reads per game start (P2-21), redundant clones (P3-7). No O(n²) hot path of consequence: `mapGameStateToPublicRoomState` does `players.find` inside `players.map` (`roomStateMappers.ts:29-30`) and `RoomStore` scans are O(members); both trivial at party scale. Spotify discovery is the only genuinely heavy path (8 playlists × unbounded pages, `Promise.all`).

## 6. Maintainability

### 6.1 File-size offenders (`apps/server/src` + shared; soft limits service ~300, handler 200-250, utility ~150, >500 must split)

| File                                    | Lines | Suggested split                                                                                                                                                              |
| --------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rooms/RoomService.ts`                  | 718   | Plan 04 §4: `spotify/SpotifyOrchestrator.ts` (lines 413-634), `decks/PlaylistOrchestrator.ts` (356-411, 636-677), then delete the façade                                     |
| `spotify/SpotifyApiClient.ts`           | 692   | `SpotifyAccountsClient` (134-222, 514-531), `SpotifyCatalogClient` (236-512), `SpotifyPlayerClient` (537-636), `spotifyApiTypes.ts` + `spotifyApiGuards.ts` (3-107, 639-692) |
| `spotify/SpotifyDiscoveryService.ts`    | 595   | `SpotifyPlaylistSearch` (76-139, 407-442), `SpotifyCandidateGenerator` (141-347), `CandidateSessionStore` (38-44, 349-394, 444-451), pure `candidateSelection.ts` (473-556)  |
| `spotify/SpotifyAuthService.ts`         | 464   | `SpotifyOAuthService` (34-237, 428-460) and `SpotifyPlaybackController` (243-412)                                                                                            |
| `rooms/RoomConnectionService.ts`        | 456   | `RoomDisconnectPolicy` (215-328 + timer callbacks), `RoomMembershipService` (139-213), host transfer (65-73, 414-443)                                                        |
| `rooms/RoomLobbyService.ts`             | 438   | Move deck/playlist mutation (292-406, 422-438) to a `RoomDeckService`                                                                                                        |
| `packages/shared/src/events/schemas.ts` | 428   | `lobbySchemas.ts`, `gameplaySchemas.ts`, `playlistSchemas.ts`, `spotifySchemas.ts`                                                                                           |
| `realtime/handlers/lobbyHandlers.ts`    | 416   | Extract shared idempotency helper (P2-13); split room-lifecycle vs settings handlers                                                                                         |
| `realtime/handlers/gameplayHandlers.ts` | 386   | Same helper removes ~110 lines                                                                                                                                               |
| `rooms/RoomGameplayService.ts`          | 341   | Move deadline logic into engine (P1-8)                                                                                                                                       |
| `realtime/handlers/spotifyHandlers.ts`  | 340   | Route through async `createSocketHandler` (P2-12)                                                                                                                            |
| `spotify/SpotifyMusicSearchService.ts`  | 322   | Extract result mappers (240-296)                                                                                                                                             |
| `rooms/RoomRegistry.ts`                 | 319   | Delete per plan 04 §4                                                                                                                                                        |
| `apps/server/tests/roomFlow.test.ts`    | 1 933 | Split by feature (lobby, gameplay, idempotency, playlist)                                                                                                                    |

### 6.2 Dead code / unclear naming

`RoomRegistry.requireHost` (unused); `realtimeAuditLogger.logAcceptedSocketEvent` (unused export), `AuditLogInput.playerId/durationMs` (never set); `TrackCardInternal` (unused on server); `"not_host"` and `reason: "closed"` contract values never produced; `SpotifyPlaybackResultPayload` duplicated inline in `SpotifyAuthService.playTrackOnHostDevice` return type (lines 271-279). `DisconnectTimerManager` is used for four unrelated timer kinds (keyed by session _or_ room id) — rename to `KeyedTimerManager`; `ChallengeTimerManager` is an identical class.

### 6.3 Missing tests for critical paths

| Path                                                                     | Missing test                                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `SpotifyAuthService.handleCallback` / `spotifyRoutes`                    | Any test; specifically forged/garbage `state`, non-host completing OAuth, missing refresh token |
| `kick_player` during `challenge` (open and claimed) and `reveal`         | Timer fires / host resolves after kick; game can still advance                                  |
| Deck exhaustion                                                          | Engine test for `confirmReveal` with empty deck; server test for resulting phase                |
| `close_room` by non-host                                                 | Spotify tokens still present afterwards                                                         |
| `rename_room` after Spotify connect                                      | `play_spotify_track` still succeeds under the new id                                            |
| `join_room` with bad code while in another lobby                         | Caller remains in the original room                                                             |
| `import_playlist` / `request_spotify_auth_url` by non-member or non-host | Rejected before any Spotify call (mock client asserts zero calls)                               |
| Idempotency cross-player                                                 | Replaying another player's `requestId` does not return `ok:true`                                |
| `createSocketServer` options, rate limiter, shutdown sequence            | Plan 04 §2/§3 acceptance tests, all absent                                                      |
| Error mapping                                                            | Non-domain `Error` must not surface its message as `code`                                       |

## 7. `packages/shared` contract review

- Types vs schemas: duplicated (P2-15); recommend `export type X = z.input<typeof xSchema>` and delete `clientEvents.ts` interfaces 51-267.
- Constants duplicated on client and server (P2-17) and ignored by the engine (P2-2). Add `MIN_RELEASE_YEAR`, `MIN_PLAYLIST_TRACK_COUNT` and use them in schemas, services and web.
- Event contracts: `ClientToServerEvent`/`ServerToClientEvent` maps are clear. `ServerErrorPayload.code: string` is untyped — a `ServerErrorCode` union derived from the error catalogs would let the web catalog (`localizedErrors.ts`) be type-checked.
- `ActionAck<TResult>` generic is unused; `RoomClosedPayload.reason` optional with an unused variant.
- `curatedPlaylistTrackSchema` validates `artworkUrl`/`previewUrl` as URLs but allows any scheme (`javascript:` is rejected by `.url()`? — Zod's `.url()` accepts any `new URL()`-parsable string including `javascript:alert(1)`); restrict to `https:` since these are rendered as `<img src>`/`<audio src>` on every player's device.

## 8. Plan docs 04 and 05 — status against code

| Item                                                                                                           | Status                             | Evidence                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 04 §1 Retain in-game identities, no eviction, null expiry, host transfer 30 s, turn skip 60 s, all-offline 1 h | **DONE**                           | `RoomConnectionService.ts:215-311`, `disconnectLifecycle.test.ts`, `hostTransfer.test.ts`                                                       |
| 04 §2.1 `connectionStateRecovery`                                                                              | **OPEN**                           | `createSocketServer.ts` has only `cors`, `maxHttpBufferSize`. **Plan assumption wrong**: disconnect handler drops membership immediately (P2-4) |
| 04 §2.2 Heartbeat tuning                                                                                       | **OPEN**                           | —                                                                                                                                               |
| 04 §2.4 Rate limiting + `RATE_LIMITED`                                                                         | **OPEN**                           | no `rateLimit.ts`, no code in `errorMessages.ts`                                                                                                |
| 04 §3.1 Graceful shutdown, `ServerShuttingDown`, fatal handlers                                                | **OPEN**                           | `index.ts` has none                                                                                                                             |
| 04 §3.2 `unref` option + `clearAll()`                                                                          | **OPEN**                           | `unref()` still unconditional; no `clearAll`                                                                                                    |
| 04 §3.3 Env-configured limits                                                                                  | **DONE**                           | `env.ts:27-35`, `index.ts:44-51`                                                                                                                |
| 04 §4 Collapse `RoomService`/`RoomRegistry`                                                                    | **OPEN**                           | sizes 718/319; acceptance "no file > 400 lines" fails for 8 files                                                                               |
| 04 §5 Index membership maps                                                                                    | **OPEN** (low priority, agree)     | `RoomStore.ts:130-260`                                                                                                                          |
| 05 §1.2 Idempotent `create_room` for owner                                                                     | **DONE**                           | `RoomLobbyService.ts:52-91`, `RoomLobbyService.test.ts:18-70`                                                                                   |
| 05 §1.4 `instanceId` in handshake                                                                              | **OPEN**                           | grep: none                                                                                                                                      |
| 05 §4.1 Acks via `createSocketHandler`                                                                         | **DONE**                           | `createSocketHandler.ts:57-96`, tests                                                                                                           |
| 05 §4.2 Per-room LRU of `requestId` (32)                                                                       | **DONE** (not player-scoped, P2-3) | `RoomStore.ts:38-97`                                                                                                                            |
| 05 §6 Narrow events + `revision`                                                                               | **OPEN**                           | no `revision` field anywhere                                                                                                                    |
| 05 §6.3 Lock-in test for hidden `releaseYear`                                                                  | **DONE**                           | `roomStateMappers.test.ts:71-128`                                                                                                               |

Plan items that now look wrong or unnecessary:

1. 04 §2.1's "recovered socket keeps membership, no rejoin needed" — false without changing `registerDisconnectHandler` (P2-4). Recommend: on `disconnect`, if `reason` is recoverable, mark the player disconnected but keep the socket membership for `maxDisconnectionDuration`; purge on the real timeout.
2. 04 §3.2's `keepProcessAlive` option — the listening HTTP server already keeps the loop alive; the `unref` only matters after `httpServer.close()`. Keep `clearAll()`, drop the option.
3. 04 §5 secondary indexes — unnecessary at `MAX_ACTIVE_ROOMS=5`; defer indefinitely.
4. 05 §4.2 should add "scope `requestId` to the acting player" (P2-3), which the plan omits.
5. Neither plan mentions the OAuth-state (P0-1), kick-phase (P0-2), close-room ordering (P1-1), rename/token (P1-2) or deck-exhaustion (P1-4) defects; these should be added to the programme ahead of 04 §2/§3.

## 9. Suggested order of work

1. P0-1 OAuth state + auth on `request_spotify_auth_url` (small, isolated, security).
2. P0-2 / P1-10 engine `removePlayer` for all phases + guarded timer callbacks + fatal handlers.
3. P1-1, P1-3, P1-5, P2-11 reorder "validate → mutate/call-out".
4. P1-2 retarget Spotify stores on rename (or forbid rename after Spotify connect).
5. P1-4 deck-exhaustion rule in the engine.
6. P1-6 rate limiting + pagination cap (plan 04 §2.4).
7. P1-9 typed domain errors.
8. Plan 04 §4 façade collapse, taking P2-13/P2-14 duplication with it.
