# 04 — Host Creation Flow: UX Specification

> **Status (2026-10-06):** specified, not implemented. Work packages in §12 are handed to
> implementation agents one at a time.
> **Owns findings:** U-01 … U-14, F-06 (host-flow overlays), F-16 (lobby part), F-24 (host-flow
> controls). **Binding decisions:** `00-index.md` §5 — 5 (streamline, do not restructure), 6 (deck
> size indicator and reshuffle), 7 (block Start without a deck, explicit practice deck), 10 (Spotify
> login stays per room and the UI says so).
> **Authority:** subordinate to `CLAUDE.md`, `docs/rules/design_system.md` and
> `docs/rules/frontend_engineering_rules.md`. Where this document names a file, the file existed on
> 2026-10-06.

## 0. Scope

The flow stays **Home → Play → Lobby → Music setup → Game**. No route, page or screen is added or
removed; the mobile lobby keeps its two scroll-snap screens. This document changes what each screen
shows, in which order, with which words, and how it reports state.

Out of scope: a one-tap host from Home, a wizard, a deck-first flow (decision 5); persistent Spotify
login (decision 10, plan 16 Phase 3); the deck-exhaustion engine change itself (B-06, Phase 5 —
this document only specifies the lobby indicator); game-page redesign beyond the host playback
status (§3.9) and the guest handover (§3.8).

## 1. Terminology and copy

### 1.1 Glossary (user-facing words; code identifiers do not change)

| Concept                       | Use                         | Never use in UI                               |
| ----------------------------- | --------------------------- | --------------------------------------------- |
| The shared game space         | **room**                    | lobby (except the eyebrow "Lobby"), room name |
| How others join               | **code** ("room code")      | room name, room ID                            |
| One track in the game         | **song**                    | track, card (outside the timeline), queue     |
| The set of songs for a game   | **deck**                    | queue, queued playlist, music source          |
| A Spotify playlist being read | **playlist** (Spotify only) | playlist for the deck                         |
| The game currency             | **token** (+ coin icon)     | TT, TuneTrack token                           |
| Disputing a placement         | **Beat!**                   | challenge (in UI copy)                        |
| The year the game asks for    | **release year**            | album release year, metadata                  |
| A year the host confirmed     | **year checked**            | verified, metadata status                     |
| The bundled no-audio deck     | **practice deck**           | test deck, default deck                       |
| Who confirms the reveal       | **who taps Next**           | reveal confirmation                           |

### 1.2 i18n key plan

Changed values (`en`; the `hu` value is written in the same change and reviewed by the owner):

| Key                                           | New `en` value                                                        |
| --------------------------------------------- | --------------------------------------------------------------------- |
| `home.primaryAction`                          | Let's go!                                                             |
| `home.openLobby`                              | Join                                                                  |
| `lobby.playlist.fieldReleaseYear`             | Release year                                                          |
| `lobby.playlist.fieldStatus`                  | _(key deleted; replaced by `lobby.playlist.yearChecked`)_             |
| `lobby.host.revealConfirmation`               | Who taps Next                                                         |
| `lobby.spotify.title`                         | Music                                                                 |
| `lobby.spotify.openSetup`                     | Choose songs                                                          |
| `lobby.spotify.openSetupReady`                | Change songs                                                          |
| `lobby.spotify.unconnectedHint`               | Songs play on this phone. Connect Spotify to hear them.               |
| `lobby.spotify.previewPlaybackHint`           | Spotify Free plays 30-second previews; songs without one stay silent. |
| `lobby.spotify.authTimedOut`                  | Spotify login did not finish. Try again.                              |
| `hints.gameTokens.title`                      | Tokens                                                                |
| `hints.gameChallenge.body`                    | Spend one token to Beat! a placement you think is wrong.              |
| `error.server.INSUFFICIENT_TT` (and other TT) | Replace "TT" with "tokens" in every value.                            |

Deleted keys: `lobby.actions.startGame`, `lobby.host.startGame`, `lobby.setup.apply`,
`lobby.setup.applyRetrying`, `lobby.setup.retryApply`, `lobby.setup.moreSettings`,
`lobby.spotify.source.filters` and every other key that no component renders after the change
(the i18n parity guard keeps both catalogues aligned; run it).

New keys are listed in the screen sections below in `code` form; each needs `en` and `hu`.
`HomePageDesktop.tsx` lines 26, 28 and 40 move to keys (`home.desktop.title`,
`home.desktop.description`, `home.desktop.start`). The hardcoded "TuneTrack" title in the desktop
`LobbyHeader` and the logo `alt` use `app.name`.

## 2. Cross-cutting rules

### 2.1 Disabled primary actions always say why

A disabled primary button renders a **reason line** directly under it (`type-body-sm`,
`--color-text-secondary`), linked with `aria-describedby`. Exactly one reason is shown, chosen by
the first matching condition in the screen's reason table. A disabled button with no reason line is
a defect. Reasons are computed in a pure selector beside the controller, never in the assembly.

### 2.2 Five states per screen

Every screen defines **loading, success, error, empty, offline** (matrix in §5). Rules:

- **Loading** shows a structure-matching skeleton or an inline pending label, never a blank area or
  a placeholder word (the lobby must not show the literal `lobby` as a code).
- **Success** of a user action that changes nothing visible gets a toast (`features/toast`), e.g.
  "Code copied". Visible changes need no toast.
- **Error** is inline next to the control that failed, uses an i18n key, and offers the retry.
- **Offline** uses one shared connection indicator (§2.3).

### 2.3 Connection indicator

A compact `ConnectionStatus` chip (new, `features/rooms/ConnectionStatus.tsx`) renders only when the
socket is not connected: "Reconnecting…" (`room.connection.reconnecting`) or "Offline"
(`room.connection.offline`). It appears in the Play page header, the mobile lobby header (§3.3) and
replaces the desktop `LobbyHeader` badge, which today compares English literals
(`"Connecting"`/`"Connected"`) — compare status enums instead.

### 2.4 Overlays opened by this flow

Every overlay this flow opens (rename dialog, name dialog, kick confirm, info dialogs, adaptive
select sheets, practice-deck confirm) is an `Overlay` from `features/overlay` (`14` Phase 3,
shipped 2026-10-08), which gives it one same-path history entry so Back closes only the
topmost overlay; a step inside an open sheet is a `PanelView`.

## 3. Screens

Height budget: the reference viewport is **375 × 667 CSS px** (no browser chrome subtracted;
verify on a real iPhone SE-class device too). "Above the fold" means visible without scrolling at
that size.

### 3.1 Home (`/`, both assemblies)

- Keep one primary action. Label "Let's go!"; add a one-line sub-label under it:
  `home.primaryActionHint` = "Host a game or join friends on the next screen." This replaces the
  planned `home-start` hint (§7).
- Desktop uses the same keys (§1.2). No other change.

### 3.2 Play (`/play`, single assembly)

Order stays: name field, Host section, divider, Join section, open rooms.

- **Name gate without a dead end.** "Host a game", "Join" and room rows are enabled as soon as the
  name draft is non-empty and valid, saved or not; pressing them saves the draft first, then acts.
  With an empty or invalid draft they are disabled with the reason line `play.reason.nameRequired`
  = "Enter your name to host or join." The checkmark button stays for explicit saves.
- Join section heading `play.joinTitle` = "Join with a code"; input label "Room code"; button
  "Join". Today codes are case-sensitive; §6.2 specifies case-insensitive lookup.
- Host description `play.hostDescription` = "Create a room. You play too."
- Open rooms: distinguish **empty** ("No open rooms yet.") from **offline** (`ConnectionStatus`
  chip plus "Can't reach the game server. Retrying…", `play.rooms.offline`). The Refresh button
  stays.
- Pending: after "Host a game" the button shows "Creating room…" (`play.hostPending`) until the
  lobby route renders.

### 3.3 Lobby, mobile, screen 1 (host) — "Get the room ready"

Top to bottom; everything here must fit above the fold for a room with up to four players.

| #   | Block             | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Height budget |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 1   | Header            | Eyebrow "Lobby", title "Get the room ready", subtitle `lobby.setup.subtitle` = "Share the code, add songs, start when everyone is in." `ConnectionStatus` chip at the right when not connected.                                                                                                                                                                                                                                                                                                              | ≤ 88 px       |
| 2   | **Code card**     | Label "Room code"; the code read-only in `type-display` (selectable text, never an input); buttons **Copy** (`IconButton` + visible label, toast "Code copied") and **Share** (Web Share API with title, text "Join my TuneTrack game: CODE" and the `/join/<code>` URL; hidden when `navigator.share` is missing, Copy then copies the invite URL). A small edit `IconButton` (aria-label "Rename room") opens the rename dialog (§3.3.1). While creating: skeleton in place of the code, buttons disabled. | ≤ 104 px      |
| 3   | **Players strip** | "Players (N)" and one row of avatar chips with display names (host marked with a crown icon + "Host" in the accessible name, own chip marked "You"). More than four players: first three + "+N more" chip that scrolls to screen 2. Tapping **your own** chip opens the name dialog (§3.3.2). New arrivals animate in (enter motion from `features/motion`, ≤ 250 ms).                                                                                                                                       | ≤ 96 px       |
| 4   | **Music row**     | `ListRowButton`: icon, title "Music", status line, chevron; opens Music setup (§3.6). Status lines: no deck "No songs yet" (warning tone); Spotify deck "48 songs · Spotify Premium" / "· Spotify Free" / "· Spotify not connected"; with flagged years append " · 7 years to check"; practice deck "Practice deck · 40 songs · no audio"; short deck adds the warning line (§4.2).                                                                                                                          | ≤ 80 px       |
| 5   | **Rules row**     | `ListRowButton`: title "Rules", summary "10 cards to win · tokens off" (or "· tokens on, Beat! 10 s"); tap scrolls to screen 2 (replaces "More room settings ↓").                                                                                                                                                                                                                                                                                                                                            | ≤ 64 px       |
| 6   | **Start dock**    | Readiness line "3 players · 48 songs" above the single primary **Start game** button; reason line under it when disabled (table below). Sticky at the bottom of screen 1 with the safe-area inset.                                                                                                                                                                                                                                                                                                           | ≤ 128 px      |

Start reasons (first match wins; all keys under `lobby.start.reason.*`):

| Condition                         | Button   | Reason line                                        |
| --------------------------------- | -------- | -------------------------------------------------- |
| Socket not connected              | disabled | "Reconnecting to the game server…"                 |
| Room still being created          | disabled | "Creating your room…"                              |
| No deck (`deckSource === "none"`) | disabled | "Add songs or choose the practice deck."           |
| Start pending / retrying          | disabled | existing `lobby.startGame.pending` / `retrying`    |
| Only the host in the room         | enabled  | info, not a block: "You're the only player."       |
| Deck below required size (§4.1)   | enabled  | warning tone: "Short deck: 30 of 37 songs needed." |

Removed from screen 1: the room-name input, the `PlayerNameField`, the "Apply setup" mode of the
primary button, the "More room settings ↓" button.

#### 3.3.1 Rename dialog

`Dialog` with the existing rules (`/^[a-zA-Z0-9_-]+$/`, max 24, error `lobby.setup.roomNameInvalid`,
info text `lobby.setup.roomNameInfoBody` inline instead of behind an (i) button), its own **Save**
and **Cancel**, pending and retry states from the current `handleRoomRename`. Rename keeps
redirecting host and guests to the new code (existing behaviour and tests).

#### 3.3.2 Name dialog

`Dialog` containing the existing `PlayerNameField`; saving updates the profile and the room
(`useLobbyIdentityActions`). Same dialog for guests (§3.7).

### 3.4 Lobby, mobile, screen 2 (host) — "Room settings"

Order: `LobbyRoomSettingsStatus` → "Rules" (core settings) → "Tokens" (TT settings) → "Players" →
"Room" (Close room only).

- The Spotify section **moves out** of screen 2; music lives in the Music row and the setup sheet.
- **Players**: one `ListRow` per player (avatar, name, badges as text + icon, never colour only).
  The two per-player range sliders move behind a per-row "Adjust" disclosure (`lobby.players.adjust`)
  that expands one row at a time. "Kick" opens a confirm dialog ("Remove Player Two from the
  room?", `lobby.players.kickConfirm`) — today it acts immediately (`LobbyPlayerListItem.tsx:142`).
- **Room**: description "Closing the room sends everyone back to the start screen." and **Close
  room** (danger, with confirm). The second Start button is deleted (U-04).
- Settings success stays silent (the control reflects the value); failure keeps the existing
  retry copy.
- Screen 2 title `lobby.settings.title` = "Room settings"; a "Back to top" text button at the end
  scrolls to screen 1.

### 3.5 Lobby, desktop

Same model, existing two-column layout:

- Primary column: header with the code (h1) and `ConnectionStatus`; Code card actions (Copy with
  toast, Share, Rename) in `LobbySummaryCard`; Music row; Rules settings panel (core, tokens).
- Aside: players list (same rows as §3.4) and the **only** Start dock (readiness, button, reason).
  `LobbyHostStartPanel` and the Start in `LobbyRoomActions` are deleted; `LobbyRoomActions` keeps
  Close room.
- The `lobby-start` hint anchors to the Start dock.

### 3.6 Music setup sheet (`SpotifySetupModal`)

Structure stays: a sheet with three tabs and history-entry Back. Changes:

1. **Playback block** at the top of the sheet, above the tabs, always visible:
   - Not connected: "Songs play on this phone. Connect Spotify to hear them." + **Connect Spotify**
     - note `lobby.spotify.perRoomNote` = "You log in again for each new room." (decision 10).
   - Connecting: existing popup copy and Cancel.
   - Premium: "Spotify Premium · full songs" + **Disconnect** is not offered (no such server path).
   - Free: `lobby.spotify.previewPlaybackHint` (honest: previews only, some silent).
2. **No tab is gated on login.** The Playlist tab shows the import field, saved decks and the
   queued count without a Spotify account; import, search and quick picks use app credentials
   (`PlaylistImportService.getOrRefreshClientCredentialsToken`).
3. **Default tab**: Quick picks when the deck is empty, Playlist otherwise.
4. **Quick picks count**: the "Max songs" input defaults to the **recommended deck size** (§4.1)
   instead of 250 and moves under a "More options" disclosure; range stays 10–500.
5. **Practice deck**: a fourth option at the end of the Quick picks grid, "Practice deck — 40
   songs, no audio" (`lobby.practiceDeck.title` / `.description`). Choosing it when a deck exists
   asks "Replace the 48 songs in your deck?" (confirm dialog).
6. **Footer** (keys already exist: `lobby.spotify.setupFooterReady`, `setupFooterEmpty`,
   `doneSetup`; values change to "{{count}} songs ready" and "No songs yet"): "48 songs ready" or
   "No songs yet" + **Done** (closes the sheet).
7. **Import feedback**: after a URL import show "87 songs added · 33 unavailable skipped"
   (`lobby.spotify.importSummary`); the server already returns `filteredCount`.
8. **Saved decks**: label "Your saved decks"; the Save / Rename / Delete inline forms stay in this
   work but each action gets a success toast. Moving them to a list is not in scope.
9. **Icon-only buttons** in `SpotifyOpenedPlaylistPanel` ("Add all", "Replace deck") get visible
   text labels.
10. **Popup result page** (`apps/server/src/http/spotifyRoutes.ts` `buildClosePopupHtml`): renders
    "Spotify connected. You can close this window." or "Spotify login failed. Close this window and
    try again in TuneTrack." by result; the CSP for this route stays with plan 16 §3.5.

### 3.7 Playlist editor and curation aids (`PlaylistEditModal`, `PlaylistTrackDetailsSheet`)

- Header filter chips: **All (N)** and **Needs check (K)**, where K counts tracks flagged by
  `playlistMetadataFlags.ts` and not yet year-checked. Default chip: Needs check when K > 0.
- **Review flagged** button in the header when K > 0: opens the details sheet on the first flagged
  track; the sheet then shows **Looks right** (sets year checked, advances) and **Next** (advances
  without change), plus "3 of 7" progress. Back closes the sheet and keeps the filter.
- Details sheet fields: Title, Artist, Album, **Release year** (number stepper ±1 next to the
  input, 48 px buttons), helper text "Spotify album year: 2011" (`lobby.playlist.spotifyYearHint`)
  when it differs, and a **Year checked** switch (`lobby.playlist.yearChecked`) replacing the
  Imported/Edited/Verified control. Mapping: switch on → `verified`; switch off and any field
  changed → `edited`; otherwise unchanged. Server contract and `metadataStatus` values do not
  change.
- The "Check year" row icon gets a text badge "Check year" instead of a tooltip-only triangle.
- Server-side count for the Music row: `PublicRoomSettings.tracksToCheckCount` (§9), computed with
  the same flag rule moved to `packages/shared` so client and server agree.

### 3.8 Guest lobby and handover

Guest screen 1, top to bottom:

1. Header: eyebrow "Lobby", title `lobby.guest.title` = "You're in", subtitle
   `lobby.guest.subtitle` = "Waiting for Player One to start the game." (host display name).
2. Code card with Copy and Share (guests invite friends too), no Rename.
3. Players strip; own chip opens the name dialog.
4. Music row read-only (no chevron): "48 songs · plays on Player One's phone" or "Host is choosing
   songs".
5. Rules row read-only summary.
6. No Start dock; a status line "The game starts when Player One taps Start."

Guest screen 2: players list (no Adjust, no Kick) and the existing "Waiting for host" explanation
moves to screen 1 as the status line above, so screen 2 is only the list.

**Handover** (all players except the host): on the first `GamePage` render after start, a toast
`game.handover.guest` = "Game on! Music plays on Player One's phone." for 4 s. During another
player's turn the status line adds "You're next." when the local player is next in turn order
(`game.status.youreNext`).

### 3.9 Host playback status on the game surface

When the local player owns playback (`spotifyPlaybackOwnerPlayerId === self`) and playback is
connecting or `needsUserGesture` is true, the game header shows a status chip: "Connecting to
Spotify…" or **"Tap to start the song"** (a button, 48 px, triggers the existing restart). It
disappears once audio plays. The menu's Playback tab stays as is. With a practice deck the chip
reads "Practice deck · no audio" once per game and then hides.

## 4. Deck rules in the lobby (decisions 6 and 7)

### 4.1 Required and recommended size

Pure functions in `packages/shared/src/game/deckSize.ts`, unit-tested:

```
requiredDeckSize   = Σ over players of max(startingCards_p, target − 1) + 1
recommendedDeckSize = clamp(roundUpToTen(requiredDeckSize × 1.5), 40, 500)
```

Rationale: with discard reshuffle (decision 6) only cards held on timelines leave circulation; the
game can always finish if every player can hold `target − 1` cards and one more card exists.
Example: four players, target 10, one starting card → required 37, recommended 60.

### 4.2 Indicator and warning

- The Music row and the Start dock readiness line show the deck size; the Music setup footer shows
  "48 songs ready".
- Deck below `requiredDeckSize`: Music row warning line `lobby.deck.short` = "Short deck: 30 of 37
  songs needed for 4 players to reach 10 cards." Start stays enabled (decision 6 warns, it does not
  block). Recomputed on every player join/leave and rules change.

### 4.3 Start gating and the practice deck

- Server: `RoomService.startGame` no longer falls back to `deckService.createShuffledDeck()`; with
  no deck it throws `DECK_REQUIRED` (`error.server.DECK_REQUIRED` = "Add songs or choose the
  practice deck first."). The client blocks earlier (§3.3) but the server is the authority.
- New action `use_practice_deck` (`{ roomId, requestId }`), host-only, lobby-only, idempotent by
  `requestId`; loads the bundled deck through `DeckService` into the room's imported deck and sets
  `deckSource = "practice"`. Clearing the deck sets `deckSource = "none"`; any Spotify import sets
  `"spotify"`. Build it with the `add-socket-action` skill.
- `HostPlaybackProvider` treats `deckSource === "practice"` as "no audio by design" (§3.9) rather
  than an error.

## 5. State and feedback matrix

| Screen          | Loading                                        | Success                                      | Error                                                 | Empty                                        | Offline                                         |
| --------------- | ---------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Home            | static                                         | —                                            | kick toast (existing)                                 | —                                            | — (no socket)                                   |
| Play            | rooms skeleton rows; "Creating room…"          | navigates to lobby                           | join errors inline under the code input               | "No open rooms yet."                         | chip + "Can't reach the game server. Retrying…" |
| Lobby screen 1  | code skeleton, Start "Creating your room…"     | new player animates in; "Code copied" toast  | rename/start errors inline with retry                 | "No songs yet"; players strip shows only you | chip + Start reason "Reconnecting…"             |
| Lobby screen 2  | controls disabled while a setting is in flight | value shown                                  | existing retry copy                                   | —                                            | controls disabled, chip visible                 |
| Music setup     | per-tab skeleton; import button "Importing…"   | import summary; footer count; toasts on save | inline per action (existing keys); login failure copy | "No songs yet" footer; Search prompt text    | chip in sheet header; actions disabled          |
| Playlist editor | list skeleton                                  | "Looks right" advances; count updates        | inline under field                                    | "No songs in the deck" + "Choose songs"      | Save disabled with reason                       |
| Guest lobby     | skeletons as host                              | handover toast on start                      | started-join card (existing)                          | "Host is choosing songs"                     | chip + "Reconnecting…"                          |

## 6. Duplicate display names (open question in `decision_log.md`)

### 6.1 Decision (owner decision 11, 2026-10-07)

**Allow the name, disambiguate the display.** When a player joins or renames to a name that
another player in the same room already uses (case-insensitive, trimmed), the server stores the
name with a numeric suffix for that room only ("Player One 2"); the device profile keeps the name
as typed. Reasons: joining must stay one tap from a room row or invite link (blocking adds a dead
end), identity is already by player id and session, and a visible suffix prevents "which Anna
won?" confusion on the leaderboard. Rejecting the join was considered and declined. Recorded in
`decision_log.md` (2026-10-07); implementation is a `rooms/` builder change plus one server test.

### 6.2 Room codes

Treat codes case-insensitively for lookup (store as created, compare lowercased) so a guest typing
`test_room_1` reaches `TEST_ROOM_1`. Rename rejects a code that differs from an existing one only by
case.

## 7. Hints catalogue changes (rules: `18-onboarding-hint-system.md` §2)

| Hint                   | Change                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home-start` (planned) | **Dropped.** The Home sub-label (§3.1) makes it discoverable; remove it from plan 18.                                                                                      |
| `lobby-share-code`     | **New**, priority 5, anchor: Share (or Copy) on the code card, eligible: host and only one player. Title "Invite your friends", body "Share the code so friends can join." |
| `lobby-spotify`        | Keep id. Anchor moves to the Music row. Body: "Pick songs for this game. Spotify login is only needed to hear them."                                                       |
| `lobby-start`          | Eligible only when Start is enabled and at least two players are in. Desktop anchor moves to the single Start dock.                                                        |
| `profile-name`         | Body: "This is the name everyone in the room will see. You can change it later in the lobby."                                                                              |
| All hints              | **Dismiss on anchor interaction** (pointerdown or click inside the anchor element) — `FirstRunHint` listens on its wrapper.                                                |
| All hints              | **Anchor visibility**: suppressed until the anchor is at least 50 % visible (`IntersectionObserver`); re-evaluated, never queued behind another overlay.                   |
| All hints              | **Accessibility**: bubble is `role="status"` (polite), not `role="dialog"`; no focus move; the 48 px dismiss button is labelled "Dismiss hint".                            |
| Settings               | App menu shows "Hints: 4 of 12 seen" and **Show hints again** (resets seen state; existing reset function).                                                                |

### 7.1 Tutorial sequence (owner decision 12, 2026-10-07)

First-run hints work as an **interactive tutorial**: during a device's first game every relevant
hint appears, one after another, each at the place and moment its control matters. The cap of two
hints per page visit is **removed**.

- **Moment.** A hint shows only while its eligibility predicate holds (the existing `isEligible`
  props: for example `game-challenge` only while a challenge can be claimed, `game-confirm` only
  during the player's own placement) and its anchor is at least 50 % visible. A hint whose moment
  passes before it is shown waits for the next occurrence; it is never shown out of context.
- **Order and pace.** Registry priority orders hints that are eligible at the same time. One hint
  is on screen at a time; the 1.5 s quiet period applies on arrival at a screen and again after
  each dismissal, so hints follow each other without stacking. No hint appears during an active
  drag.
- **Seen means acknowledged.** A hint is marked seen when the player dismisses it or uses its
  anchor, not when it appears. A hint cut off by navigation, a phase change or a reload returns at
  its next moment.
- **Re-enable at any time.** "Show hints again" in the app menu clears seen state and restarts the
  tutorial on the current screen immediately, with no reload, also in the middle of a game. The
  on/off toggle hides hints at once and keeps progress; switching it back on resumes where the
  player left off.
- **Robustness.** The coordinator holds no state that can outlive a reset or a toggle: both events
  clear the pending timer and the active hint and re-run selection. Storage stays
  `tunetrack.hints.v1`; blocked storage still degrades to "enabled, nothing remembered".

Code impact (WP 8): remove `MAX_HINTS_PER_VISIT` and the `maxHintsPerVisit` scheduler option; move
`markHintSeen` from display to acknowledgement; add the post-dismissal quiet period; suppress
during drag. Proof: coordinator unit tests with fake timers (three eligible candidates show in
order; an interrupted hint returns; reset re-shows a seen hint; toggle off hides immediately) and
an E2E extension of E15 (first game shows `game-drag-preview`, then `game-confirm`; after "Show
hints again" `game-drag-preview` returns).

## 8. Accessibility requirements (host flow)

- Touch targets ≥ 48 × 48 px for every interactive control in this flow: lobby and `SettingField`
  (i) buttons (today 32 and 28 px) — or remove them where §3 inlines the text; `ToggleSwitch`
  compact variant (40 px high) not used in the host flow; interactive `Chip` uses the `.button`
  variant (48 px). `IconButton.sm` (40 px) is not used on touch layouts. `.challengeChip` has no
  usage and is deleted (F-24).
- Tabs in `SpotifySetupModal`: `role="tab"`, `aria-selected`, `aria-controls`, roving arrow-key
  focus.
- Sheets and dialogs move focus to the first control on open, trap Tab, restore focus to the
  trigger on close, and close on Escape (blocking overlays excepted).
- No colour-only state: Spotify connection, deck warnings, "Check year", host and "You" markers
  all carry text.
- Accessible names avoid jargon: "3 tokens", not "3 TT tokens" (`TokenCountAmount.tsx`,
  `lobbyPlayerSelectors.ts`).
- Toasts used for success feedback are announced through the existing toast live region.
- Reduced motion: player-arrival and sheet motion fall back to fades via the shared helpers.

## 9. Contract and code changes by layer

| Layer                  | Change                                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared`      | `deckSize.ts` (§4.1); `PublicRoomSettings.deckSource: "none" \| "spotify" \| "practice"` and `tracksToCheckCount: number`; `use_practice_deck` event + schema; track year-flag rule moved from `playlistMetadataFlags.ts`. |
| `apps/server` `rooms/` | remove test-deck fallback, `DECK_REQUIRED`; `usePracticeDeck` in the lobby service; `deckSource` and `tracksToCheckCount` in the settings builder; duplicate-name suffix (§6); case-insensitive code lookup.               |
| `apps/server` `http/`  | honest popup page (§3.6 item 10).                                                                                                                                                                                          |
| `apps/web` LobbyPage   | new `useLobbySetupModel` (pure selectors: start reasons, readiness line, music status, rules summary, labels) shared by both assemblies — this resolves the lobby half of F-16; mobile and desktop become layout only.     |
| `apps/web` components  | `LobbyCodeCard`, `LobbyPlayersStrip`, `LobbyMusicRow`, `LobbyRulesRow`, `LobbyStartDock`, `RoomRenameDialog`, `PlayerNameDialog`, `ConnectionStatus`; each with a component test and, if a primitive changes, `/dev/ui`.   |
| `apps/web` deletions   | `LobbyHostStartPanel`, Start in `LobbyRoomActions`, the room-name form in `LobbyPageMobile.tsx`, dead i18n keys (§1.2).                                                                                                    |

The `TurnActionDock` duplication (the game half of F-16) is not host flow and stays with Phase 6.

## 10. Acceptance criteria

- [ ] At 375 × 667 the mobile host lobby shows header, code card, players strip, Music row, Rules
      row and Start dock without scrolling for a room of up to four players (Playwright screenshot
      assertion of element bounding boxes).
- [ ] Exactly one Start control per lobby on mobile and desktop; E2E no longer uses `.first()`.
- [ ] The room code is never rendered inside an editable input on screen 1; Copy shows a toast;
      Share calls `navigator.share` when available.
- [ ] Every disabled primary action in Play, Lobby and Music setup has a reason line linked by
      `aria-describedby` (component tests per reason).
- [ ] Start with no deck is impossible: client disabled with reason, server returns
      `DECK_REQUIRED` (server test); the practice deck is only used after an explicit choice.
- [ ] Deck-size indicator matches `requiredDeckSize` for 1–8 players and targets 3–30 (unit test);
      the short-deck warning appears and Start stays enabled.
- [ ] Music setup tabs work without Spotify login (component test with `spotifyAuthStatus:
"none"`); the per-room login note is visible; Free copy states previews and silence.
- [ ] `lobby.spotify.authTimedOut` contains no file path or developer instruction.
- [ ] Playlist editor: "Needs check (K)" filter, stepper with "Looks right", "Release year" label,
      no "Metadata status" control.
- [ ] Guest lobby shows guest copy, read-only music and rules, and the handover toast on start.
- [ ] Every screen in §5 renders all five states (component tests with fixtures from
      `roomStateFixtures.ts`).
- [ ] i18n parity guard passes; no deleted key is referenced; no "TT" in user-facing `en` values
      except the hidden-year glyph.
- [ ] Every overlay opened in this flow closes with Back and Escape and restores focus.
- [ ] No route, page or screen added or removed (diff of `app/router.tsx` is empty).

## 11. E2E scenarios (new files under `apps/e2e/tests/`, helpers in `tests/helpers/`)

| File                     | Scenario                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `host-lobby.spec.ts`     | Host creates a room; code card visible above the fold at 375 × 667; Copy shows toast; Start disabled with "Add songs…". |
| `host-lobby.spec.ts`     | Host chooses the practice deck; Music row shows "Practice deck · 40 songs"; Start enabled; game starts.                 |
| `host-lobby.spec.ts`     | Guest joins via `/join/<code>`; host sees the guest appear in the players strip without scrolling.                      |
| `music-setup.spec.ts`    | Without Spotify login, import `TESTPLAYLIST1234567890` from the Playlist tab; footer shows "10 songs ready".            |
| `music-setup.spec.ts`    | With a deck below required size, the short-deck warning shows and Start remains enabled.                                |
| `curation.spec.ts`       | Flagged track appears under "Needs check"; "Looks right" removes it from the filter and decrements the Music row count. |
| `guest-handover.spec.ts` | Guest sees "You're in", then the handover toast after the host starts.                                                  |

Existing scenarios that start a game must first choose the practice deck (one helper,
`choosePracticeDeck(page)`), because the silent fallback is removed. The fake Spotify server needs
no new route for these scenarios.

## 12. Rollout order (one work package = one agent session)

| WP  | Content                                                                                                          | Depends on | Skills                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------- |
| 1   | Copy and terminology (§1), Home sub-label and desktop keys (§3.1), auth-timeout text, popup page (§3.6.10)       | —          | `add-ui-component`, `verify`            |
| 2   | Deck contract (§4, §9 shared/server): `deckSize`, `deckSource`, `use_practice_deck`, `DECK_REQUIRED`, E2E helper | —          | `add-socket-action`, `e2e-scenario`     |
| 3   | `useLobbySetupModel` + mobile screen 1 and 2 (§3.3, §3.4), rename and name dialogs, kick confirm                 | 2          | `add-ui-component`, `write-tests`       |
| 4   | Desktop lobby parity (§3.5)                                                                                      | 3          | `add-ui-component`                      |
| 5   | Music setup (§3.6 items 1–9)                                                                                     | 2          | `add-ui-component`, `e2e-scenario`      |
| 6   | Curation aids and `tracksToCheckCount` (§3.7)                                                                    | 2          | `add-ui-component`, `add-socket-action` |
| 7   | Play page, guest lobby, handover, host playback chip (§3.2, §3.8, §3.9), `ConnectionStatus` (§2.3)               | 3          | `add-ui-component`, `e2e-scenario`      |
| 8   | Hints (§7) and the tutorial sequence (§7.1)                                                                      | 3, 5       | `add-hint`                              |
| 9   | Duplicate names and case-insensitive codes (§6)                                                                  | —          | `write-tests`                           |
| 10  | Accessibility sweep and acceptance run (§8, §10), `device-checklist`                                             | 1–8        | `verify`, `device-checklist`            |

Every package ends with `verify` and `plan-status`, and keeps desktop un-regressed.

## 13. Owner decisions (answered 2026-10-07)

1. Duplicate names: **suffix** (§6.1, decision 11).
2. Hint cap: **no cap; hints form a first-game tutorial** (§7.1, decision 12).
3. Practice deck wording: **"Practice deck (no audio, 40 songs)"** stays (decision 13).

## 14. Findings coverage

| Finding | Covered by                 | Finding | Covered by                          |
| ------- | -------------------------- | ------- | ----------------------------------- |
| U-01    | §4.3, WP 2                 | U-09    | §3.2, §3.3.2                        |
| U-02    | §3.6 items 1–2, 10; §1.2   | U-10    | §7                                  |
| U-03    | §3.3 block 2, §3.3.1       | U-11    | §3.8                                |
| U-04    | §3.3 block 6, §3.4, §3.5   | U-12    | §8, §7                              |
| U-05    | §3.3 blocks 3–4            | U-13    | §3.1, §1.2 (catalogues at parity)   |
| U-06    | §3.7, §3.6 item 4          | U-14    | §3.6 items 1, 8; result shapes kept |
| U-07    | §1                         | F-06    | §2.4, §8 (host-flow overlays)       |
| U-08    | §2.2, §2.3, §3.6, §3.9, §5 | F-16    | §9 (lobby half)                     |
| F-24    | §8                         |         |                                     |

U-13's catalogue gap is closed: both catalogues hold 681 keys on 2026-10-06. U-14's "one review
shape for every source" is deferred: it needs a component merge across three panels and is
restructuring under decision 5.
