# 17 — Room Creation Flow, Player Identity and In-Game Metadata Override

> **Status (2026-10-06):** Phases 1–2 shipped (device-level player profile, server-generated room codes, room-directory push; B12 resolved 2026-09-16) and Phase 3 shipped except two layout acceptance items. Open: Phase 4 (in-game host correction of a wrong release year — the only remaining engine change in the programme, needs a new shared event and an engine function) and the Phase 5 cleanup (three references to `getRememberedPlayerDisplayName` remain).
> **Folded from** `docs/plans/2026-09-stability-performance/09-room-and-player-identity-flow.md` on 2026-10-06; the original is archived under `docs/archive/2026-09-stability-performance/`.

> Owning layers: `apps/web/src/pages/{PlayPage,JoinRoomPage,LobbyPage}`, `apps/web/src/features/profile`,
> `apps/web/src/features/rooms`, `apps/web/src/services/session`, `apps/server/src/rooms`,
> `packages/game-engine`, `packages/shared`. Phase 4 is the "in-game metadata correction" that
> `00-index.md` §7 lists as an allowed rule change. Lobby layout is owned by Phase 4 of the review
> programme (U-04, F-16).

## 1. Shipped — Phases 1 and 2

- **Player profile belongs to the device.** `features/profile/playerProfile.ts` (persisted Zustand
  store, legacy `tunetrack.playerDisplayName` key migrated) and the inline `PlayerNameField` on
  Play, direct-invite Join and the lobby; lobby edits emit `UpdatePlayerProfile` without navigating
  or reconnecting; identity and intent left the URL. Commit `4102af3`; B12 resolved 2026-09-16.
- **Server-generated room codes.** `apps/server/src/rooms/roomCodeGenerator.ts` with bounded
  collision retry and a base32 fallback; `create_room` accepts an absent `roomId`. Proven by
  `apps/server/tests/rooms/roomCodeGenerator.test.ts`; commit `840f83a`.
- **Room directory push and module relocation.** Lobby summaries are pushed to sockets outside a
  room on directory-visible changes; `roomNavigation` and `useRoomDirectory` live in
  `features/rooms`; the dead Home join form and the client code suggestion were deleted. E2E E1
  covers host-and-join through the live directory and a direct invite.
- **Deviation:** the optional "use a custom code" affordance was not built; the server contract still
  accepts a client-supplied code, so it can be added without a protocol change.

## 2. Phase 3 — Lobby setup surface · open acceptance items

Shipped: `LobbyPageMobile` has no navigation calls other than the server-driven game-start redirect,
and room rename still redirects host and guests to the new code (existing tests pass).

- [ ] The mobile lobby fits its sections without a scroll on a 667 px-tall viewport for a
      two-player room.
- [ ] Desktop lobby not regressed.

Both items are now specified by Phase 4 of the review programme (`00-index.md` §4: primary host
actions reachable on a 667 px viewport without scrolling; exactly one Start control per lobby,
U-04). Do not implement them from this document.

## 3. Phase 4 — Host override for wrong track metadata · **S2**

The requested feature: "need a manual override after a placement for the host if the Spotify
metadata is wrong." Not started: no `override_revealed_track` event and no engine function exist.

### 3.1 Why this is not a small change

`RoomLobbyService.updateImportedDeckTrack` edits only `roomRecord.importedDeck` — the pool of cards
not yet drawn. At reveal time the relevant data lives in three other places:

- `roomRecord.trackCardsById` — the map the state mapper reads to build public cards;
- `roomRecord.gameState.timelines[playerId]` — the placed card, if the placement was correct;
- `roomRecord.gameState.revealState` — the correctness verdict and the valid slot set.

So correcting a year at reveal means correcting the data **and** re-deciding whether the placement
was right. That is a game-rule question, so it belongs in the engine.

### 3.2 Contract

New client event `OverrideRevealedTrack: "override_revealed_track"` in
`packages/shared/src/events/clientEvents.ts` and a Zod schema in `schemas.ts`. Payload: `roomId`,
`trackId`, `releaseYear` (integer, 1900 to current year + 1), optional `title`, `artist` and
`albumTitle`, and `requestId` for idempotency per `13-network-protocol-and-resilience.md` §4.2.

Authorisation and phase guards, enforced server-side:

- host only (`ONLY_HOST_CAN_OVERRIDE_TRACK`);
- only during `reveal` (`GAME_NOT_IN_REVEAL_PHASE`);
- only for the track currently being revealed (`TRACK_NOT_IN_REVEAL`);
- the year must be a plausible integer, validated by Zod at the boundary.

### 3.3 Engine support

New pure function in `packages/game-engine`, alongside the existing reveal rules:
`reevaluateRevealWithCorrectedYear(gameState, correctedReleaseYear): GameState`. Behaviour, all
decided in the engine with no transport or logging:

- Recompute the valid slot set for the placed card against the placing player's timeline **as it
  was before the placement**, using the existing `placementRules` logic so the same-year block rule
  is honoured automatically.
- Recompute `wasCorrect`. If the verdict flips: previously-correct becoming incorrect removes the
  card from the player's timeline; previously-incorrect becoming correct inserts it at the chosen
  slot.
- If a challenge was resolved on this reveal, recompute `challengeWasSuccessful` and reverse the TT
  token movement recorded in `challengerTtChange`. This is the subtle part and needs its own tests:
  the engine must not double-refund.
- Recompute `winnerPlayerId`, since a corrected placement can decide the game.
- Update the matching `history` entry rather than appending a new one — a correction is not a new
  event.

Do **not** advance the turn. The override happens while the reveal is on screen; the host then
confirms the reveal as normal, so the existing turn-progression path is untouched.

### 3.4 Server orchestration

In `RoomGameplayService` (not the lobby service — this is gameplay):

1. Guard host, phase and track identity.
2. Update `trackCardsById` with the corrected fields.
3. Call `reevaluateRevealWithCorrectedYear`.
4. Also apply the correction to `importedDeck` if the track is still in it, so a re-draw of the same
   track later in the game uses the corrected year. Reuse the existing `updateImportedDeckTrack`
   field-merge logic rather than duplicating it.
5. Map to public state and broadcast.
6. Log a notable lifecycle event and an audit record — a host changing a game outcome is exactly the
   kind of action that should be traceable. The audit payload carries ids and years, never display
   names.

Also set `metadataStatus: "edited"` and preserve `sourceReleaseYear`, matching the curation
semantics in `CLAUDE.md` (Track Metadata), so the correction is visible in the playlist editor
afterwards and can be saved to a local deck.

### 3.5 Client UX

In the reveal action dock, host only:

- a discreet "Wrong year?" affordance next to the revealed year;
- opening it presents the track's fields prefilled (reuse `PlaylistTrackDetailsSheet`, which already
  edits exactly these fields, presented with the same-path history pattern of
  `14-navigation-and-overlays.md` so back closes it);
- saving shows the corrected reveal, and if the verdict flipped, an unmissable but calm explanation
  of what changed ("Corrected to 1984 — placement is now correct");
- the correction is announced to all players. A silent change to a game outcome would be worse than
  the wrong year: everyone saw the original verdict, so everyone must see the correction;
- respect the `revealConfirmMode` setting: if `host_or_active_player`, the override still stays
  host-only. Overriding the answer is a different authority from confirming a reveal.

### Acceptance

- [ ] Engine tests: verdict unchanged; correct becoming incorrect; incorrect becoming correct;
      same-year block boundaries; correction that triggers a win; correction with a successful
      challenge; correction with a failed challenge; TT tokens balance in every case (assert the
      total token count across all players is conserved except for the intended change).
- [ ] Server tests (`tests/rooms/metadataOverride.test.ts`, see `19-testing-strategy.md` §6):
      host-only, reveal-phase-only, current-track-only; idempotent on repeated `requestId`;
      `importedDeck` also updated; broadcast contains the corrected card.
- [ ] Component test: the affordance appears only for the host during reveal.
- [ ] All players see the correction.
- [ ] `docs/decision_log.md` records that a host may alter a resolved placement, and why.

## 4. Phase 5 — Delete what the rework replaces · **S3**

Remaining items (everything else in the original list was deleted):

- [ ] `getRememberedPlayerDisplayName` / `rememberPlayerDisplayName` in
      `apps/web/src/services/session/playerSession.ts`, still read by
      `pages/GamePage/hooks/useGamePageController.ts` and covered by `playerSession.test.ts`. Replace
      the read with the profile store (keep the storage-key migration), then delete the exports.
      `DEFAULT_DISPLAY_NAME` and `applySetupChanges` no longer occur in code.
- [ ] Query-parameter parsing of `playerName` in `useLobbyPageController`, once the one-release
      migration window has passed.

### Acceptance

- [ ] No unused export remains in the touched modules.
- [ ] `npm run typecheck && npm run lint && npm test` green.

## 5. Risk register

| Risk                                                              | Mitigation                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Removing `?playerName=` breaks a lobby link a user has bookmarked | The query parameter is still accepted as a migration input that seeds the profile; remove the fallback only after one release (Phase 5).                                                              |
| The metadata override lets a host rewrite a game outcome unfairly | The correction is announced to every player, host-only, audit-logged, and confined to the track currently being revealed. A deliberate owner trade (`00-index.md` §7); record it in the decision log. |
| Re-evaluating a challenge outcome double-refunds TT tokens        | Engine-level token-conservation assertions in every override test.                                                                                                                                    |
| Lobby layout work regresses desktop                               | Desktop assembly is separate (`LobbyPageDesktop`); the review Phase 4 specification changes mobile first and ports deliberately, with screenshots.                                                    |
