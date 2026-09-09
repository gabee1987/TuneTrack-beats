# 09 — Room Creation Flow, Player Identity and In-Game Metadata Override

> Addresses findings **F-40 – F-43**, plus the requested manual metadata override.
> Owning layers: `apps/web/src/pages/{HomePage,PlayPage,JoinRoomPage,LobbyPage}`,
> `apps/web/src/features/profile` (new), `apps/web/src/services/session`,
> `apps/server/src/rooms`, `packages/game-engine`, `packages/shared`.
> Depends on Doc 06 (overlay host) and Doc 07 phases 1-2 (button and field primitives).

## 1. What is wrong with the current flow

The reported problems are "the room creation flow is not optimal" and "player detail
settings must be separate from room managing — if I set a name it should be remembered".

The audit found a single structural cause: **player identity is modelled as a property of
a room-entry form, not as a property of the device.** Everything else follows from that.

    Home  ──Start──▶  Play  ──create/join form──▶  Lobby (?playerName=&intent=)  ──▶  Game
                       │                             │
                       │  name typed here            │  name editable here too, and
                       │  (seeded "Player 1")        │  editing it re-navigates and
                       └─ room code typed here       └─ re-joins the socket

Concrete defects:

| # | Defect | Evidence |
| --- | --- | --- |
| 1 | The remembered name is written but never read back into the forms | `usePlayPageController.ts` line 17 and `JoinRoomPage.tsx` line 17 both seed from `DEFAULT_DISPLAY_NAME` (`"Player 1"`), while `getRememberedPlayerDisplayName()` exists and is used only by Lobby and Game |
| 2 | Identity is carried in the URL | `homePageNavigation.ts` builds `/lobby/:id?playerName=...`; the name is in the query string, so it is in history, in shared links and in any log of the URL |
| 3 | Renaming yourself re-joins the room | `LobbyPageMobile.applySetupChanges` calls `onPlayerProfileChange` **and then** navigates with a new `?playerName=`, which changes a dependency of the socket effect (F-15) |
| 4 | Room code must be typed or accepted by the user | `createSuggestedRoomCode()` picks from six words plus a two-digit suffix — 540 combinations, with no server-side collision check, and `MAX_ACTIVE_ROOMS` is 5, so collisions are possible and surface as `ROOM_ALREADY_EXISTS` |
| 5 | Two screens do nearly the same job | `PlayPage` (create + join + room list) and `JoinRoomPage` (invite landing) duplicate the name field, the join action and the validation |
| 6 | Home has a vestigial second entry point | `JoinRoomForm.tsx` (149 lines) is dead code from the previous design |
| 7 | Identity modules live under `pages/HomePage/` but are used by `PlayPage` and `JoinRoomPage` | `homePageNavigation.ts`, `roomCode.ts`, `hooks/useRoomDirectory.ts` |

## 2. Phase 1 — A player profile that belongs to the device · **S2**

### 2.1 The model

New feature module, sibling to `features/preferences`:

    apps/web/src/features/profile/
      playerProfile.ts          // zustand store, persisted
      PlayerProfileSheet.tsx    // the edit surface (overlay-host entry)
      usePlayerProfile.ts       // read/update hook
      playerProfile.test.ts

    interface PlayerProfile {
      displayName: string;      // "" until the user sets one
      avatarSeed: string;       // deterministic seed for the existing Avatar primitive
      hasCompletedSetup: boolean;
    }

Rules:

- Persisted through the hardened `deviceStorage` helper from Doc 05 section 2 (try/catch on
  every access, schema-versioned keys), **not** through a second bespoke storage path.
- The existing `tunetrack.playerDisplayName` key is migrated on first read so nobody loses
  their name.
- `playerSessionId` stays where it is (`services/session/playerSession.ts`) — it is a
  transport identity, not a profile. The profile module reads it but does not own it.
- The store is the single source of truth. `getRememberedPlayerDisplayName()` becomes a
  thin adapter over it during migration and is then deleted.

### 2.2 Where the profile is edited

One surface, reachable from three places, always the same component:

- **Home screen**, as a visible identity row: avatar, name, and a tap to edit. This is the
  primary discovery point and it makes the name feel like a setting rather than a form field.
- **App shell menu**, as a "You" section at the top of the settings sheet.
- **Lobby**, for the in-room case — but here it edits the profile *and* emits
  `UpdatePlayerProfile`, with **no navigation**. Fixing defect 3.

`PlayerProfileSheet` is an overlay-host entry (Doc 06 section 4), so back closes it.

### 2.3 First-run naming

If `hasCompletedSetup` is false when the user first presses Start, prompt for a name once,
inline, before continuing. Prefill with a friendly default (`Player`) rather than
`"Player 1"`, which reads like a placeholder that was never filled in. After that, never
ask again — the name shows on Home where it can be changed at any time.

This replaces the current situation where the name field appears in every room form.

### Acceptance

- [ ] The display name is set once and survives an app restart, a room close and a
      device rotation.
- [ ] The name never appears in a URL.
- [ ] Editing the name in the lobby emits `UpdatePlayerProfile` and does **not** navigate or
      reconnect. Asserted by a component test counting socket emits and navigations.
- [ ] The existing `tunetrack.playerDisplayName` value is migrated, not discarded.
- [ ] Back closes the profile sheet.

## 3. Phase 2 — Rebuild the room entry flow · **S2**

### 3.1 Target flow

    Home  ──▶  Play  ──┬── Host a game  ──▶  Lobby(:roomCode)  ──▶  Game
     │                 └── Join a game   ──▶  Lobby(:roomCode)  ──▶  Game
     │
     └── identity row (name + avatar), editable in place

    Invite link  ──▶  Join(:roomCode)  ──▶  Lobby(:roomCode)   (name already known)

Key changes:

1. **The room code comes from the server, not the client.** Add a `create_room` variant
   that takes no `roomId` and returns a server-generated code, guaranteed unique against
   the live room map. Keep a "use a custom code" affordance for the host who wants a
   memorable one, validated server-side. This removes defect 4 entirely, and it removes a
   decision from the fast path — the host presses "Host a game" and is in a lobby.
2. **The name is no longer a field on this screen.** It is shown as context ("Hosting as
   Player One") with a tap to change, reading from the Phase 1 store.
3. **Identity leaves the URL.** `/lobby/:roomId` takes no query parameters. The client
   sends `displayName` in the `join_room` / `create_room` payload, which it already does —
   the query parameter was only ever a way to pass state between screens, and the profile
   store replaces it.
4. **`intent` leaves the URL too.** Pass it via route state (`navigate(path, { state })`)
   or, better, derive it: the client emits `create_room` only from the explicit host action
   and `join_room` in every other case, including all reconnects (Doc 05 section 1.1). This
   removes the reconnect failure mode at its source rather than patching it.
5. **Merge `PlayPage` and `JoinRoomPage`'s shared parts.** `JoinRoomPage` keeps its distinct
   job — an invite landing page showing which room you were invited to — but reuses the
   same join action and the same profile row. The duplicated name field and validation go
   away.

### 3.2 Room code generation

Server-side, in a new `apps/server/src/rooms/roomCodeGenerator.ts`:

- Two random words from a curated list plus a two-digit number, matching the existing
  friendly style (`vinyl-42`), but drawn from a larger word list (aim for 60+ words, giving
  over 200 000 combinations).
- Reject on collision with a live room and retry, bounded to 5 attempts, then fall back to
  a 6-character base32 code.
- Exclude ambiguous characters and anything that could read as a word a family would rather
  not see — curate the list by hand.
- Keep the client-side `createSuggestedRoomCode` only if the custom-code affordance wants a
  suggestion; otherwise delete it (`pages/HomePage/roomCode.ts`).

### 3.3 Module relocation

Fixing defect 7. Move out of `pages/HomePage/`:

| From | To | Why |
| --- | --- | --- |
| `pages/HomePage/homePageNavigation.ts` | `features/rooms/roomNavigation.ts` | Used by `PlayPage` and `JoinRoomPage`; shrinks substantially once the query parameters go |
| `pages/HomePage/roomCode.ts` | delete, or `features/rooms/roomCodeSuggestion.ts` | Server-generated codes make it optional |
| `pages/HomePage/hooks/useRoomDirectory.ts` | `features/rooms/useRoomDirectory.ts` | Used only by `PlayPage` |
| `pages/HomePage/components/JoinRoomForm.tsx` | delete (dead — F-42) | |

`DEFAULT_DISPLAY_NAME` disappears with the profile store. `DEFAULT_ROOM_ID` (`""`)
disappears with server-generated codes.

### 3.4 Room directory improvements

`useRoomDirectory` requests `list_rooms` on connect and on manual refresh only. In practice
a player waiting on the Play screen watches a stale list. Since the server already
broadcasts room state changes, add a lightweight push: emit an updated room list to all
sockets **not currently in a room** whenever a room is created, closed, or changes status.
Cheap (`PublicRoomSummary` is four fields), and it removes the refresh button as a
requirement rather than as an option.

Note the data-minimisation angle: `PublicRoomSummary` exposes `hostName` to anyone
connected. That is intentional for a LAN party but should be a conscious decision — record
it in `docs/decision_log.md`, and consider whether the room list should be visible at all
once the app is exposed beyond a trusted network.

### Acceptance

- [ ] Pressing "Host a game" reaches a lobby with a server-generated code in at most one
      further interaction.
- [ ] No route in the app carries `playerName` or `intent` as a query parameter.
- [ ] Two clients hosting simultaneously never collide on a room code (test with a stubbed
      generator forced to collide, asserting retry then fallback).
- [ ] The room list updates without a manual refresh when another player creates a room.
- [ ] The invite-link flow still works: opening `/join/:roomId` shows the room, and joining
      needs one tap when a name is already set.
- [ ] E2E covers host-and-join in both directions (Doc 11 section 5).

## 4. Phase 3 — Lobby setup surface cleanup · **S3**

`LobbyPageMobile` currently mixes four concerns in one form: player name, room code
(rename), start-game, and a scroll-to-advanced-settings action. `applySetupChanges` returns
a boolean that means "you may now start the game", with four different early-return
branches that navigate. This is the most confusing control flow in the frontend.

Restructure into three clearly separated sections, each with a single responsibility:

1. **You** — avatar, name (via `PlayerProfileSheet`), your starting card and token counts
   if the host has allowed per-player overrides.
2. **Room** — code with a copy/share action, rename (host only), player list, close room
   (host only).
3. **Game settings** — target card count, TT mode, challenge window, reveal confirm mode,
   Spotify setup. Host only.

with the start-game action in a persistent dock rather than being an outcome of submitting
the setup form.

`applySetupChanges` disappears. Renaming the room emits `RenameRoom` and lets the server's
state update drive the redirect, which the server already supports via
`roomRedirectsById` and `getLobbyRoomStateUpdateDecision`.

Note that `getLobbyRoomStateUpdateDecision` is already exported and unit-tested in
`useLobbyRoomConnection.test.ts` — keep that test; it is the safety net for this change.

### Acceptance

- [ ] `LobbyPageMobile` has no navigation calls other than the game-start redirect driven
      by the server.
- [ ] Room rename still redirects both host and guests to the new code (existing tests pass).
- [ ] The mobile lobby fits the three sections without a scroll on a 667 px-tall viewport
      for a two-player room.
- [ ] Desktop lobby not regressed.

## 5. Phase 4 — Host override for wrong track metadata · **S2**

The requested feature: "need a manual override after a placement for the host if the
Spotify metadata is wrong."

### 5.1 Why this is not a small change

`apps/server/src/rooms/RoomLobbyService.updateImportedDeckTrack` (lines 326-370) edits only
`roomRecord.importedDeck` — the pool of cards not yet drawn. At reveal time the relevant
data lives in three other places:

- `roomRecord.trackCardsById` — the map the state mapper reads to build public cards;
- `roomRecord.gameState.timelines[playerId]` — the placed card, if the placement was correct;
- `roomRecord.gameState.revealState` — the correctness verdict and the valid slot set.

So correcting a year at reveal means correcting the data **and** re-deciding whether the
placement was right. That is a game-rule question, so it belongs in the engine.

### 5.2 Contract

New client event in `packages/shared/src/events/clientEvents.ts` and a schema in
`schemas.ts`:

    OverrideRevealedTrack: "override_revealed_track"

    {
      roomId: RoomId;
      trackId: TrackId;
      releaseYear: number;          // 1900 .. currentYear + 1
      title?: string;
      artist?: string;
      albumTitle?: string;
      requestId: string;            // idempotency, per Doc 05 section 4.2
    }

Authorisation and phase guards, enforced server-side:

- host only (`ONLY_HOST_CAN_OVERRIDE_TRACK`);
- only during `reveal` (`GAME_NOT_IN_REVEAL_PHASE`);
- only for the track currently being revealed (`TRACK_NOT_IN_REVEAL`);
- the year must be a plausible integer, validated by Zod at the boundary.

### 5.3 Engine support

New pure function in `packages/game-engine`, alongside the existing reveal rules:

    export function reevaluateRevealWithCorrectedYear(
      gameState: GameState,
      correctedReleaseYear: number,
    ): GameState;

Behaviour, all decided in the engine with no transport or logging:

- Recompute the valid slot set for the placed card against the placing player's timeline
  **as it was before the placement**, using the existing `placementRules` logic so the
  same-year block rule is honoured automatically.
- Recompute `wasCorrect`. If the verdict flips:
  - previously-correct becoming incorrect: remove the card from the player's timeline;
  - previously-incorrect becoming correct: insert it at the chosen slot.
- If a challenge was resolved on this reveal, recompute `challengeWasSuccessful` and reverse
  the TT token movement recorded in `challengerTtChange`. This is the subtle part and needs
  its own tests: the engine must not double-refund.
- Recompute `winnerPlayerId`, since a corrected placement can decide the game.
- Update the matching `history` entry rather than appending a new one — a correction is not
  a new event.

Do **not** advance the turn. The override happens while the reveal is on screen; the host
then confirms the reveal as normal, so the existing turn-progression path is untouched.

### 5.4 Server orchestration

In `RoomGameplayService` (not the lobby service — this is gameplay):

1. Guard host, phase and track identity.
2. Update `trackCardsById` with the corrected fields.
3. Call `reevaluateRevealWithCorrectedYear`.
4. Also apply the correction to `importedDeck` if the track is still in it, so a re-draw of
   the same track later in the game uses the corrected year. Reuse the existing
   `updateImportedDeckTrack` field-merge logic rather than duplicating it.
5. Map to public state and broadcast.
6. Log a notable lifecycle event and an audit record — a host changing a game outcome is
   exactly the kind of action that should be traceable.

Also set `metadataStatus: "edited"` and preserve `sourceReleaseYear`, matching the existing
curation semantics in `playlist_metadata_curation_plan.md`, so the correction is visible in
the playlist editor afterwards and can be saved to a local deck.

### 5.5 Client UX

In the reveal action dock, host only:

- a discreet "Wrong year?" affordance next to the revealed year;
- opening it presents the track's fields prefilled (reuse `PlaylistTrackDetailsSheet`,
  which already edits exactly these fields, presented through the overlay host);
- saving shows the corrected reveal, and if the verdict flipped, an unmissable but calm
  explanation of what changed ("Corrected to 1984 — placement is now correct");
- the correction is announced to all players. A silent change to a game outcome would be
  worse than the wrong year: everyone saw the original verdict, so everyone must see the
  correction.
- respect the `revealConfirmMode` setting: if `host_or_active_player`, the override still
  stays host-only. Overriding the answer is a different authority from confirming a reveal.

### Acceptance

- [ ] Engine tests: verdict unchanged; correct becoming incorrect; incorrect becoming
      correct; same-year block boundaries; correction that triggers a win; correction with a
      successful challenge; correction with a failed challenge; TT tokens balance in every
      case (assert the total token count across all players is conserved except for the
      intended change).
- [ ] Server tests: host-only, reveal-phase-only, current-track-only; idempotent on repeated
      `requestId`; `importedDeck` also updated; broadcast contains the corrected card.
- [ ] Component test: the affordance appears only for the host during reveal.
- [ ] All players see the correction.
- [ ] `docs/decision_log.md` records that a host may alter a resolved placement, and why.

## 6. Phase 5 — Delete what the rework replaces · **S3**

Sequenced last, per `AGENT.md` section 5 — removal is confined to its own step.

- `pages/HomePage/components/JoinRoomForm.tsx`
- Dead classes in `pages/HomePage/HomePage.module.css`
- `pages/LobbyPage/hooks/useLobbySpotify.ts` (two-line re-export shim)
- `DEFAULT_DISPLAY_NAME`, `DEFAULT_ROOM_ID`
- `getRememberedPlayerDisplayName` / `rememberPlayerDisplayName` once the profile store owns
  the name (keep the storage key migration)
- `createSuggestedRoomCode` if the custom-code affordance does not need it
- Query-parameter parsing in `useLobbyPageController` once identity leaves the URL

### Acceptance

- [ ] No unused export remains in the touched modules.
- [ ] `npm run typecheck && npm run lint && npm test` green.

## 7. Risk register

| Risk | Mitigation |
| --- | --- |
| Users lose their existing remembered name | Explicit one-time migration from `tunetrack.playerDisplayName`, with a test. |
| Removing `?playerName=` breaks an in-flight lobby link a user has bookmarked | Accept the query parameter for one release as a migration input that seeds the profile, then strip it from the URL. Remove the fallback in the following release. |
| Server-generated room codes break the existing rename/redirect machinery | The rename path is unchanged and already tested; code generation only affects creation. |
| The metadata override lets a host rewrite a game outcome unfairly | The correction is announced to every player, host-only, audit-logged, and confined to the track currently being revealed. This is a deliberate trade the owner asked for; record it in the decision log. |
| Re-evaluating a challenge outcome double-refunds TT tokens | Engine-level token-conservation assertions in every override test. |
| Lobby restructure regresses desktop | Desktop assembly is separate (`LobbyPageDesktop`); change mobile first, then port deliberately, with screenshots. |
