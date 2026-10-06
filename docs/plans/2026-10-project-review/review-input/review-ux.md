# TuneTrack-beats — UX and product-flow review of the host creation flow

Reviewed read-only on 2026-10-06 against branch `fix/stability-hardening`. Every statement below is
reconstructed from the code under `apps/web/src`, `apps/server/src`, `packages/shared` and the
three plan documents (`docs/plans/2026-09-stability-performance/08`, `09`, `10`). Nothing under
`docs/archive/` was read. All example data is placeholder data.

Path references use `path:line`. Where a file was read without line numbers the reference names
the symbol instead.

---

## 0. What the plans promised and what shipped

| Plan item                                                                     | Doc     | Status in code                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Device-level player profile, inline name field with checkmark, no name in URL | 09 §2   | Shipped. `features/profile/playerProfile.ts`, `features/profile/PlayerNameField.tsx`; `useLobbyPageController.ts` still accepts legacy `?playerName=` (migration fallback).                                                                                                        |
| Server-generated room code, "Host a game" reaches a lobby in one tap          | 09 §3   | Shipped. `features/rooms/roomNavigation.ts`, `useLobbyRoomConnection.ts` (`CreateRoom` without `roomId`).                                                                                                                                                                          |
| Optional custom-code affordance                                               | 09 §3.1 | Not shipped as a creation option; instead the lobby exposes a full **rename** field on the first screen (`LobbyPageMobile.tsx`, `lobby.setup.roomName`).                                                                                                                           |
| Live room directory push                                                      | 09 §3.4 | Shipped server-side; the Play screen still shows a manual Refresh button (`PlayPage.tsx` `home.refreshRooms`).                                                                                                                                                                     |
| Lobby split into You / Room / Game settings, Start in a persistent dock       | 09 §4   | Partially shipped. Mobile lobby is two scroll-snap screens; Start is a form-submit button that doubles as "Apply setup" for a rename. `applySetupChanges` is gone, but `handleSetupSubmit` carries the same dual meaning. Acceptance "fits without scroll on 667 px" is unchecked. |
| Host override for wrong metadata at reveal                                    | 09 §5   | Not shipped.                                                                                                                                                                                                                                                                       |
| Delete `getRememberedPlayerDisplayName` / `rememberPlayerDisplayName`         | 09 §6   | Not done; `useLobbyRoomConnection.ts` still calls `rememberPlayerDisplayName`, `services/session/playerSession.ts` still owns both.                                                                                                                                                |
| Hint system, 12 planned hints                                                 | 10 §3   | 11 shipped (`features/hints/hintRegistry.ts`). `home-start` not shipped. No `IntersectionObserver`, no overlay-host rendering (portal to `document.body`), no back-button dismissal, no "n of m seen" count, no replay.                                                            |
| Hint dismiss on anchor interaction                                            | 10 §2.4 | Not shipped; only outside-tap, Escape, close button, 12 s auto-dismiss (`useFirstRunHint.ts:11`, `HintBubble.tsx:46-72`).                                                                                                                                                          |
| Deterministic playback start, `restart`, `needsUserGesture`                   | 08 §2-3 | Shipped in `useHostPlayback.ts` and `HostPlaybackProvider.tsx`. The "prominent Tap to play control in the turn dock" (08 §3.4) is **not** shipped: `needsUserGesture` is only rendered inside the game menu's Playback tab (`gameMenu/PlaybackTabContent.tsx:87`).                 |
| Persistent Spotify authorisation                                              | 08 §4   | Not shipped (gated on compliance review). Host re-authorises every room.                                                                                                                                                                                                           |
| Honest OAuth popup result page                                                | 08 §4.5 | Not shipped. `apps/server/src/http/spotifyRoutes.ts:72-78` always renders "You can close this window." and self-closes, success or failure.                                                                                                                                        |
| Playback diagnostics                                                          | 08 §5   | Not shipped.                                                                                                                                                                                                                                                                       |

---

## 1. The host flow today, tap by tap (mobile assembly)

Layout mode comes from `app/layout/pageLayoutMode.ts` (`<= 720 px` is mobile, coarse pointer up
to 960 px is mobile). The phone path is below; desktop differences are noted inline.

### Screen 1 — Home (`/`)

`pages/HomePage/mobile/HomePageMobile.tsx`

What is on screen: animated background, gear-icon menu (`AppShellMenu`: View / Theme / Language),
logo, one tagline (`home.roomEntryDescription`: "Line up the hits: start a room, bring in the crew,
and build the winning music timeline."), three numbered feature cards (Guess / Place / Challenge),
one full-width primary button **"Lets go!"** (`home.primaryAction`, note the missing apostrophe).

Decision required: none. Taps: **1**. Nothing here distinguishes "I am hosting" from "I am
joining"; both go to `/play` (`useHomePageController.ts` `handleStart`).

Feedback: a kick toast if the user was removed from a room (`home.toast.kickedFromRoom`). No
connection status, no indication that a lobby is being preloaded.

Desktop (`HomePageDesktop.tsx`) hardcodes English strings "Play TuneTrack", "Create a room as host
or join an open room on the next screen." and "Start" instead of i18n keys.

### Screen 2 — Play / "Choose a room" (`/play`)

`pages/PlayPage/PlayPage.tsx`, `hooks/usePlayPageController.ts`

What is on screen, top to bottom:

1. Eyebrow "Play", title **"Choose a room"** (`play.title`), subtitle repeats the Home tagline.
2. Card containing:
   - `PlayerNameField` ("Player name", placeholder "Player", a checkmark save button that is
     disabled until the draft differs from the saved value and is non-empty).
   - A first-run hint bubble "Choose your player name / This is the name everyone in the room
     will see." when `hasCompletedSetup` is false (`FirstRunHint id="profile-name"`), after 1.5 s.
   - Section "Host a game" with description "Create a fresh lobby and become the host." and a
     primary button **"Host a game"**, disabled until a name is saved.
   - Divider "Or join".
   - Section titled **"Open Lobby"** (`home.openLobby`) with description "Pick an open room below,
     or enter the code manually.", a "Room code" text input (placeholder `party-room`) and a
     secondary button also labelled **"Open Lobby"**.
3. Section "Open rooms" with description "Tap a lobby to join without typing the room code.",
   a "Refresh" button, and a list of rooms (`<code> / Hosted by <hostName> / N players`) or the
   empty state "No open rooms yet.".

Decisions the host must make: (a) type a name (first run only) and press the checkmark; (b)
notice that "Host a game" is the right button among four actions.

Taps on first run: tap input (1), type, tap checkmark (1), tap "Host a game" (1) = **3 taps plus
typing**. Returning host: **1 tap**.

What can go wrong and how it surfaces:

- Pressing Enter inside the name field submits the name form (good), but the two room buttons stay
  disabled until the checkmark is pressed or Enter is used. There is no inline message explaining
  _why_ "Host a game" is disabled; the only cue is the hint bubble, which auto-dismisses after 12 s
  and never shows again (`useFirstRunHint.ts:11`, `hintState` seen count).
- The socket connects on mount to fetch the directory (`features/rooms/useRoomDirectory.ts`).
  Connection failures are silent; the list simply stays empty with "No open rooms yet.", which is
  indistinguishable from a healthy empty server.
- The room directory exposes other hosts' display names to anyone connected (plan 09 §3.4
  flagged this; still unrecorded in a decision log).

Hidden vs visible: the fact that the host plays too, that Spotify is optional, that the room code
is auto-generated, and that settings come later are all invisible here.

### Screen 3 — Lobby, first scroll-snap screen "Get the room ready" (`/lobby` then `/lobby/:code`)

`pages/LobbyPage/mobile/LobbyPageMobile.tsx`, `hooks/useLobbyRoomConnection.ts`

Transition: `/play` navigates to `/lobby` with `state.intent = "create"`; the lobby emits
`create_room`, receives the generated code and `navigate(..., { replace: true })`s to
`/lobby/<code>`. Until the first `state_update` arrives the screen renders with
`resolvedRoomId = "lobby"` (`buildLobbyAssemblyModel.ts` fallback), so the room-name field briefly
shows the literal word "lobby". No spinner, no "creating your room" message; `connectionStatus`
is tracked (`"Connecting"`/`"Connected"`/`"Disconnected"`, English literals compared by string in
`LobbyHeader.tsx`) but the mobile lobby does not render it at all.

What is on screen (full viewport, `min-height: var(--app-height)`, `LobbyPageMobile.module.css`):

1. Eyebrow "Lobby setup", title **"Get the room ready"**, subtitle "Name yourself, name the room,
   then start when everyone is in."
2. `PlayerNameField` again (the same name the host just saved on Play).
3. **"Room name"** text input, prefilled with the generated code (e.g. `vinyl-42`), with an (i)
   button opening a dialog: "Players join this exact room name. Use letters, numbers, dashes, or
   underscores." Validation error "Use letters, numbers, dashes, or underscores." inline.
4. Footer: one large primary button whose label is computed by a 4-way ternary
   (`primaryActionLabel` in `LobbyPageMobile.tsx`):
   - "Apply setup" if the room-name draft differs from the current code,
   - "Game already started" if joining a running game,
   - **"Start game"** for the host otherwise,
   - "Waiting for host" for guests.
     Plus a ghost button **"More room settings ↓"** that smooth-scrolls to screen 4.
5. First-run hint "Start when everyone is ready / The host starts the game after the players and
   music are ready." anchored to the footer when `isHost && players.length >= 2`.

Decisions forced here: whether to rename the room (a decision the plan explicitly wanted to remove
from the fast path, 09 §3.1 item 1). The field is editable and prefilled, so it _invites_ editing.
Typing anything flips the primary button from "Start game" to "Apply setup", a mode switch that
is easy to miss and that changes the URL for every guest when applied.

What is missing on this first screen for a host whose friends are on the couch:

- **No room code presentation.** The code is only visible as the _value of an editable input_.
  There is no large, copyable, shareable code; no QR; no "Copy invite link" (that exists only in
  the desktop `LobbySummaryCard.tsx`, with no success feedback after `navigator.clipboard.writeText`).
- **No player list.** Who has joined is on screen 4, below the fold. The host cannot see guests
  arrive without scrolling.
- **No music status.** Whether a playlist exists is on screen 4.
- The connection badge is desktop-only.

Taps to start a music-less game from here: **1** ("Start game"). Server accepts a single player
(`packages/game-engine/src/services/gameFlowHelpers.ts:29`, `players.length < 1`) and falls back
to a bundled 40-track **test deck with no audio** (`apps/server/src/rooms/RoomService.ts:250-254`,
`apps/server/src/decks/test-decks/default-test-deck.json`). The UI never says this. A host who
taps "Start game" straight away gets a silent game of hidden cards and will assume the app is
broken.

### Screen 4 — Lobby, second scroll-snap screen "Advanced lobby settings"

Reached by "More room settings ↓" or by scrolling. Stack order for the host
(`LobbyPageMobile.tsx` `advancedStack`):

1. `LobbyRoomSettingsStatus` (only visible on retry/failure: "No response — retrying..." /
   "No response — choose the setting again to retry.").
2. **"Core rules"** card (`LobbyHostCoreSettings.tsx`): "Cards needed to win" range 3-30 default
   10; "Default starting cards" range 1-5 default 1; "Reveal confirmation" select with "Host
   only" / "Host or active player". Each with an (i) dialog.
3. **"TuneTrack token mode"** card (`LobbyHostTtSettings.tsx`): toggle "Enable token mode" with
   hint "Adds skips, instant claims, and Beat! stakes to each round.", inline hint "Turn this on to
   show token options." (fades when on), then "Starting tokens for every player" range 0-5 and
   "Challenge window" select ("Host manual" / 10 s / 3 s / 30 s). The (i) opens a five-paragraph
   rules dialog ("What is token mode?", "Earn tokens", "Spend on your turn", "Challenge with
   Beat!", "Beat! timing").
4. **"Spotify music"** card (`components/spotify/LobbySpotifySection.tsx`): description "Give it a
   playlist — the game spins a new track from it every round.", (i) dialog with six paragraphs,
   status line ("Link your account to unlock music playback." when not connected), and one
   button **"Open music setup"** (or "Manage music setup" once a playlist exists). First-run hint
   "Add music / Open Music Setup to connect Spotify or choose the songs for this game." when no
   playlist is imported.
5. **"Players"** card: list of players with badges (starting cards count, token count if TT on,
   "Host"), and for the host two range sliders per player ("Starting cards", "Starting tokens")
   plus a "Kick" button for others.
6. **"Room actions"** card (`LobbyRoomActions.tsx`): description "Closing the room sends everyone
   back to the main menu.", a second **"Start Game"** primary button and a red **"Close Room"**.

So the mobile lobby has **two Start buttons** with different capitalisation ("Start game" on
screen 3, "Start Game" on screen 6), which the E2E spec papers over with `.first()`
(`apps/e2e/tests/room-entry.spec.ts:50`). Desktop also has two (`LobbyHostStartPanel.tsx` inside
the settings panel, plus `LobbyRoomActions.tsx`).

Every settings change is emitted immediately (`useLobbyRoomSettingsAction.ts`) with a pending
state that disables all settings controls while one is in flight. There is no "saved" feedback;
success is silence.

### Screen 5 — Music setup sheet (host taps "Open music setup")

`components/spotify/SpotifySetupModal.tsx`, pushed as a history entry so Back closes it.

Header: three tabs **"Playlist" / "Search" / "Quick picks"** and a close (X). Footer copy keys
exist (`lobby.spotify.setupFooterReady`, `setupFooterEmpty`, `doneSetup`) but are not rendered by
the modal; there is no footer, no "Done" button, no running total of queued tracks visible across
tabs.

**Tab "Playlist"** (`SpotifySetupContent.tsx`, default):

- If not connected: hint "Link your account to unlock music playback." and a button
  **"Connect with Spotify"** (plus "Cancel" while connecting). Nothing else is shown; the import
  field is hidden behind the login (`SpotifySetupContent.tsx:466-517` vs `:519`).
- Tap "Connect with Spotify": `window.open("about:blank", ..., "popup")` immediately, then the
  server returns the auth URL and the popup is redirected (`useSpotifyAuth.ts:84-115`). A popup
  blocker produces "Popup was blocked. Please allow popups for this page and try again." The
  host signs in to Spotify in the popup. On return the popup renders "You can close this window."
  and self-closes **whether the login succeeded or failed** (`spotifyRoutes.ts:72-78`). The
  result reaches the lobby over the socket; if the socket dropped, the host sees "Connecting…"
  until the 120 s timeout fires with a developer-facing message that mentions
  `apps/server/.env` and the Spotify Developer Dashboard (`lobby.spotify.authTimedOut`,
  `en.properties:235`). That string must never reach an end user.
- Once connected: the lobby card shows "Connected" + a "Premium"/"Free" badge and
  "Plays right here in your browser — no app needed." or "Free accounts use available Spotify
  preview clips in the browser."
- The Playlist tab now shows: "No tracks queued yet" + three buttons "Edit playlist" / "Save
  playlist" / "Clear playlist" (all disabled until something is imported); a single text input
  "Paste playlist link or search playlist name" whose adjacent button changes between "Import",
  "Reload" and "Search" depending on whether the text looks like a Spotify URL/ID
  (`getPlaylistImportAction`, `SpotifySetupContent.tsx:786-793`); search results as tappable rows
  that import on tap; a "Saved playlists" select with Load/Rename/Delete once any exist.
- Import needs at least 10 usable tracks (`PlaylistImportService.ts:10`); tracks without a
  usable payload are filtered and reported as "N unavailable tracks skipped" only in the Search
  tab's opened-playlist view, not here.
- Import errors are inline red lines: invalid URL, not found, private ("Make it public on Spotify
  first."), Spotify API error, too few tracks.

**Tab "Search"** (`SpotifyPlaylistSearchPanel.tsx`): a search field with "Songs / Albums / Artists"
chips (minimum two characters), virtualised results with "Song/Album/Artist/Playlist" type labels;
tracks can be added one by one via a (+) button or swipe-right, removed via swipe-left; albums,
artists and playlists open into `SpotifyOpenedPlaylistPanel.tsx` with "Add all" and "Replace
queue" icon buttons (icons only, `title` attributes carry the labels) and per-track add/select.
Toasts confirm "Song added to the queued playlist." (1.1 s). **This tab works without Spotify
login** because the server uses client-credentials tokens
(`SpotifyMusicSearchService.ts:39`, `SpotifyDiscoveryService.ts:91,161,295`).

**Tab "Quick picks"** (`SpotifyQuickPicksPanel.tsx`): a numeric "Max songs" input defaulting to
**250** (range 10-500), and 14 preset cards ("80s Hits", "90s Rock", ..., "Global Party").
Tapping a preset shows a full-screen app loading overlay "Building your music deck / Finding
songs with a good mix of years and styles…", then `SpotifyCandidateReviewPanel.tsx`: "N tracks
ready", the full virtualised list with swipe-to-remove, multi-select via artwork tap, a floating
primary **"Use these songs"** (or "Use N selected"), and, if a queue already exists, an inline
"Add or replace?" choice. Also works without login.

So the real dependency graph is: **building a deck never requires the host's Spotify account;
only hearing it does.** The UI inverts this: the default tab blocks on login, the lobby card says
"Link your account to unlock music playback", and the hint says "connect Spotify or choose the
songs" as if they were alternatives of equal weight.

Taps for the shortest realistic music path (Quick pick, no login): "More room settings" (1) →
"Open music setup" (1) → "Quick picks" tab (1) → a preset (1) → wait → "Use these songs" (1) →
close sheet (1) → scroll up / "Start game" (1) = **7 taps**, and the result is a silent game
unless the host also logs in. With login via the Playlist tab: + "Playlist" tab (1) +
"Connect with Spotify" (1) + the Spotify popup (2-4 taps, possibly a password) ≈ **12 taps**.

### Screen 6 — Playlist editor (release-year curation)

`components/PlaylistEditModal.tsx`, opened from "Edit playlist" in the Playlist tab, pushed as
another history entry on top of the setup sheet (so the stack is Lobby → Music setup → Playlist →
Track details, three overlays deep, each with its own X).

Header "Playlist / N tracks", sort chips "Title / Artist / Year", virtualised rows: artwork
(tap = multi-select), title, "artist · year", badges (pencil = Edited, check = Verified, warning
triangle = "Check year"). Swipe-left removes a row. Selecting rows shows "Remove N".

Tapping a row opens `PlaylistTrackDetailsSheet.tsx` ("Deck curation / Track details"): album
title with the Spotify year, title, artist, warning "Check year" if the album name matches
`/remaster|deluxe|anniversary|greatest hits|best of|collection|live/i`
(`playlistMetadataFlags.ts:926-934`), then editable fields Title, Artist, Album,
**"Album Release Year"** (the label contradicts the game rule: the host is meant to enter the
_song's original_ year), and a "Metadata status" segmented control "Imported / Edited /
Verified". Buttons "Cancel" / "Save track". Any field change silently promotes status to
"edited" (`buildTrackUpdatePatch`).

What the editor does **not** offer: a filter for flagged tracks, a count of flagged tracks, a sort
by "needs check", a bulk "mark verified", a "next flagged" action, any external lookup. With a
250-track Quick pick the host would have to scroll 250 rows looking for triangles. The curation
workflow the project calls "primary" (`CLAUDE.md` Track Metadata) is therefore three overlays
deep, per-track, and unaided.

Note also that the curation editing in Quick picks' review panel and in opened playlists is
**client-side only** (`useSpotifyCandidates.ts` `updateCandidateTrack`,
`useSpotifyOpenedPlaylist.ts` `updateOpenedPlaylistTrack`), while in the Playlist editor it is
emitted to the server (`usePlaylistEditor.ts` `updateTrack`). Behaviour is consistent in effect
(the edited tracks are sent when applied) but the editing UI is the same component in three
places with three different owners.

### Screen 7 — Start → Game (`/game/:code`)

Host taps "Start game". Label becomes "Starting game..." then possibly "No response — retrying..."
/ "Try again" (`lobby.startGame.*`). On the server's `state_update` with `status !== "lobby"` the
lobby navigates to `/game/:code` carrying the state (`useLobbyRoomConnection.ts`
`handleStateUpdate`). Guests are moved by the same broadcast.

First game screen (`GamePage.tsx`, `mobile/GamePageMobile.tsx`): a header with optional chips
("Room vinyl-42", phase, turn), the leaders strip, a status badge ("Your turn" / "<name>'s turn"
plus card count), a menu trigger; the `TimelinePanel` showing the player's one starting card and
the draggable mystery card ("Hidden Until Reveal", year shown as "TT"); the `TurnActionDock` with
"Confirm" (and "Skip"/"Buy" if TT mode). The host plays the first turn
(`apps/e2e/tests/room-entry.spec.ts:85-86`).

Playback on the host device:

- `HostPlaybackProvider` enables playback only when `spotifyPlaybackOwnerPlayerId === self`,
  Spotify is connected **and** a playlist is imported (`HostPlaybackProvider.tsx:702-715`). With
  the fallback test deck nothing plays and nothing says so.
- Premium: the Web Playback SDK is loaded, the first track auto-plays via a `[0, 2500, 6000]` ms
  retry ladder (`useHostPlayback.ts:491`). If autoplay is blocked, `needsUserGesture` becomes true
  and any `pointerdown` restarts the track (`HostPlaybackProvider.tsx:747-755`). The only visible
  text, "Tap anywhere to start the song", is inside the menu's Playback tab
  (`PlaybackTabContent.tsx:87-89`), which the host must open to discover it.
- Free: a 30 s `<audio>` preview is played if the card has `previewUrl`. Cards without a preview
  are silent; nothing in the UI distinguishes "loading" from "no preview exists for this song".
- Transport controls (play/pause, restart, seek slider) live **only** in the game menu Playback
  tab. There is no play/pause on the main game surface for the host. The first-run hints do not
  mention playback at all.

First-run hints on the game screen: at most two per visit (`hintCoordinator.ts:12`), so of the
eight game hints a first-time host sees "Place the song" and "Lock in your answer", and the menu,
tokens, challenge, next-song, timeline-tap and switch hints are deferred to later visits (each
page visit resets `shownThisVisit` only when the candidate set empties).

---

## 2. The guest flow today

**Via directory**: Home "Lets go!" (1) → Play: name + checkmark on first run (2 + typing) → tap a
room row (1) → Lobby.

**Via code**: same, but type the code in "Room code" and tap "Open Lobby" (1 + typing). The field
is case-sensitive to whatever the host typed; the directory row is the only way to avoid typos.

**Via invite link** `/join/<code>` (`pages/JoinRoomPage/JoinRoomPage.tsx`): eyebrow "Room
invite", the code as the page title, skeleton then "<host> host / N players" (or "This room is not
available anymore."), the name field, and a **"Join room"** button disabled until a name is saved
and the room exists. Taps: 1 (+ naming on first run). This is the cleanest screen in the app,
but nothing in the lobby produces this link on mobile.

**Guest lobby** (`LobbyPageMobile.tsx`, non-host branch): same "Get the room ready" title and
"Name yourself, name the room, then start when everyone is in." subtitle — wrong for a guest, who
cannot name the room; the room-name input is rendered disabled; the primary button reads
"Waiting for host" and is disabled; the second screen shows a "Waiting for host / The host is
setting the room up. You will move into the game automatically when it starts." card and the
player list. No music status, no settings summary, no indication of what the host is doing. If
the guest arrives after start: "Game already started / New players cannot join after the first
song starts."

**Handover**: when the host presses Start the guest's lobby navigates to `/game/:code` with no
transition copy beyond the page slide. The guest sees "<host>'s turn", their one starting card, and
no mystery card (it is on the active player's timeline). The guest's first-run hints are gated to
their own turn (`game-drag-preview` requires `canConfirmTurnPlacement`-like eligibility), so on
the host's turn a guest sees no guidance at all about what they are waiting for, except the status
line "<host> is deciding where the current song belongs." Audio plays only on the host device,
which is by design, but the guest UI never states "listen on <host>'s phone".

---

## 3. Critical review

### 3.1 Steps that can be removed, merged, deferred or defaulted

| Step today                                                                | Verdict                                                       | Why                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home → Play as two screens with the same tagline                          | **Merge.**                                                    | Home adds one tap and no information. Hosting intent should be a Home action.                                                                                                                                                                    |
| Name required _before_ hosting (buttons disabled)                         | **Defer / default.**                                          | Default to a generated name ("Player 7") and let the host rename in the lobby; or keep the field but never disable the primary action for an empty name. The disabled button with no explanation is the first dead end a new host hits.          |
| Room-name rename on the lobby's first screen                              | **Remove from fast path.**                                    | Plan 09 wanted a server code and an _optional_ custom-code affordance. Prefilling an editable field makes renaming look mandatory and turns Start into Apply. Show the code read-only, large, with Copy / Share; put rename behind an edit icon. |
| "Apply setup" mode of the primary button                                  | **Remove.**                                                   | A primary button that changes meaning based on an unrelated field is a trap. Rename should have its own inline save.                                                                                                                             |
| Second "Start Game" in Room actions                                       | **Remove.**                                                   | One primary action per screen.                                                                                                                                                                                                                   |
| Core rules / token mode / reveal confirmation before players join         | **Defer.**                                                    | All have sensible defaults (10 cards, 1 starting card, host-only reveal, TT off). Collapse into a "Rules" row showing the summary ("10 cards to win · tokens off") with an edit affordance.                                                      |
| Per-player starting cards and tokens sliders in the player list           | **Hide behind a per-player tap.**                             | Two range sliders per player, rendered for every player, dominate the roster and are a rare override.                                                                                                                                            |
| "Connect with Spotify" as the gate of the Playlist tab                    | **Reorder.**                                                  | Deck building does not need login. Build the deck first; ask for login only when the host wants full audio, ideally at Start ("Log in to Spotify to hear full tracks, or continue with 30-second previews / no audio").                          |
| Music setup tabs "Playlist / Search / Quick picks"                        | **Default to Quick picks.**                                   | For a party, "pick a vibe" is the fast path; URL import is the power-user path.                                                                                                                                                                  |
| "Max songs" input default 250                                             | **Default and hide.**                                         | A party needs ~40-80 cards for 4 players × 10 target. 250 means a 250-row review list. Compute the suggested count from players × target and let the host raise it under "More".                                                                 |
| Saved playlists Save / Rename / Delete / Overwrite inside the setup sheet | **Move to a "Your decks" list** on the lobby card or on Home. | Four states of inline forms in one panel (`SpotifySetupContent.tsx:628-773`).                                                                                                                                                                    |
| Silent fallback to the test deck                                          | **Replace with an explicit choice.**                          | Either block Start until a deck exists, or label it "Practice deck (no audio)". Never start a party game silently.                                                                                                                               |

### 3.2 Terminology problems

- **Room / Lobby / Room name / Room code / Open Lobby.** Play says "Choose a room", "Room code",
  "Open Lobby" (twice, as a heading and a button), "Open rooms"; the lobby says "Lobby setup",
  "Room name"; the join page says "Room invite"; the game header says "Room vinyl-42"; the game
  menu says "Game lobby name". The server calls it `roomId`. Pick two words: **room** (the thing)
  and **code** (how you join it). Drop "lobby" from user copy except as a phase label.
- **Spotify music / Music setup / Music source / Playlist / queue / deck / tracks / songs.** The
  card is "Spotify music", the button "Open music setup", the sheet eyebrow "Music source", the
  first tab "Playlist", the editor "Playlist", toasts say "queued playlist" and "queue", the
  loading overlay says "music deck", the saved items are "Saved playlists", the counter says
  "tracks queued up", the review says "songs". Pick **songs** for the things and **deck** for the
  collection, keep "playlist" only when referring to a Spotify playlist.
- **TT token / TuneTrack token / token / Beat!.** The setting is "TuneTrack token mode", the hint
  says "TT tokens", the game status says "Your tokens", `INSUFFICIENT_TT` says "enough TT", the
  challenge is "Beat!" everywhere in-game but the lobby setting is "Challenge window" and the
  CLAUDE.md rule is "Challenge". "TT" as an abbreviation is internal jargon that leaks into
  `lobbyPlayerSelectors.ts` (`\`${player.ttTokenCount} TT\``) and `TokenCountAmount.tsx:19`.
  Choose "token" + the coin icon in UI; choose "Beat!" _or_ "Challenge", not both.
- **"Quick picks" / "Build from filters" / "Search" / "Find public playlists".** `spotifySetupTypes`
  still has a `filters` source and strings for "Build from filters" and "Find public playlists"
  that no tab renders. "Quick picks" is fine if subtitled ("ready-made decks").
- **"Metadata status: Imported / Edited / Verified" and "Album Release Year".** Metadata status is
  an engineering concept. The host question is "is this year right?". Rename the field to
  "Release year" with the Spotify album year shown as a hint ("Spotify album says 2011"), and
  collapse status into a single "Year checked" toggle (edited is implied by a change).
- **"Reveal confirmation: Host only / Host or active player"** reads as a security setting. In
  party terms it is "Who presses Next: host only / also the player whose turn it is".
- **"Lets go!"** needs an apostrophe. "Open Lobby" as a button to _join_ is misleading.
- Hungarian catalogue has 681 entries vs 692 English (`hu.properties`), so some keys fall back.

### 3.3 Missing feedback

- **Room creation**: no "Creating your room…" state; the room-name field shows "lobby" until the
  server answers (`buildLobbyAssemblyModel.ts` fallback).
- **Connection**: mobile lobby and Play never show connection state; errors from `useRoomDirectory`
  are swallowed; `StatusBanner` only shows server error payloads.
- **Settings saved**: no confirmation; failure only after a timeout ("No response — retrying...").
- **Copy invite**: no "Copied" toast (`LobbySummaryCard.tsx` `handleCopyInvite`), and the action is
  desktop-only.
- **Spotify login**: the popup never reports failure; the lobby relies on the socket. The timeout
  error exposes server configuration to the player (`en.properties:235`).
- **Spotify Free**: no explanation that many songs will have _no_ preview and will be silent; no
  per-card "no preview available" state in the game.
- **Import progress**: "Loading…" on the button only; for a 300-track playlist with pagination this
  can take several seconds with no progress.
- **Track filtering**: "N unavailable tracks skipped" is only shown in the opened-playlist view, not
  after a URL import, so the host sees "87 tracks queued up" after pasting a 120-track playlist and
  does not know why.
- **Deck sufficiency**: no warning when the deck is too small for players × target (the engine only
  requires `startingCards + 1`), and no warning that the game will run out of cards.
- **Start readiness**: nothing summarises "2 players · 48 songs · Spotify Premium" before Start.
  The start hint ("Start when everyone is ready") appears once and then never again.
- **Playback readiness**: "Connecting to Spotify…" and "Tap anywhere to start the song" live only in
  the menu's Playback tab (`PlaybackTabContent.tsx:84-89`). The main game surface has no playback
  indicator for the host.
- **Handover**: no "Game starting…" moment for guests; the page just slides.
- **Empty states**: "No open rooms yet." is fine; "No tracks in playlist" in the editor offers no
  action; the Search tab before searching is blank (no prompt text).

### 3.4 Mobile ergonomics

- **Primary action placement.** On Play the primary "Host a game" is mid-screen inside a card and
  the list below pushes it up on small screens; the room list has a sticky header
  (`PlayPage.module.css:226`) but the primary action does not stick. On the lobby's first screen
  the Start button is in the grid's last row (`setupCard` `grid-template-rows: auto 1fr auto`), so
  it does sit near the thumb — good — but it shares that zone with "More room settings ↓".
- **Scroll-snap lobby.** `scroll-snap-type: y proximity` on the panel with two full-height snap
  sections means a host who scrolls to the player list snaps away from the Start button; to start
  they scroll back up (or use the duplicate Start at the very bottom, which is why it exists).
- **Overlay depth.** Lobby → Music setup sheet → Playlist editor sheet → Track details sheet, plus
  (i) dialogs and the adaptive select sheets, each portalled to `document.body` with its own
  z-index. Back pops one level thanks to the history-state entries (`playlistEditorHistory.ts`),
  which is correct, but the visual stack has three different close affordances and no breadcrumb.
  The plan's "overlay host" (Doc 06) is not used by these sheets.
- **Hint bubble vs overlays.** `HintBubble` is portalled with its own z-index and positions from
  `getBoundingClientRect` on scroll/resize (`HintBubble.tsx:31-42`), with no
  `IntersectionObserver`; when the anchor scrolls off-screen the bubble follows it off-screen or
  overlaps a sheet.
- **Text inputs.** First run asks for a name on Play, then shows the same field again on the lobby
  first screen next to a prefilled room-name input: two text inputs above the fold on the most
  important host screen. Both open the keyboard on tap; the room-name one opens it for a value the
  host should not need to touch.
- **Icon-only controls**: "Add all" and "Replace queue" in the opened-playlist header are icon
  buttons with `title` tooltips (`SpotifyOpenedPlaylistPanel.tsx:932-951`); tooltips do not exist
  on touch. The playlist-editor row depends on swipe-left to delete with no visible affordance
  besides a row-level multi-select.
- **Touch targets**: the lobby (i) buttons are 32 × 32 px (`LobbyPageMobile.module.css`
  `.infoButton`), below the 44 px minimum in `CLAUDE.md`.
- **Quick picks**: 14 preset cards in a grid plus a numeric input; on a phone that is a long
  scroll before the first preset is even visible if the input is focused.

### 3.5 First-run comprehension

Without hints, a first-time host faces: a Play screen that does not say the host also plays; a
disabled primary button with no reason; a lobby whose title says "Get the room ready" but whose
only visible tasks are renaming yourself and renaming the room; a Start button that will happily
start a silent game; and music setup two screens and one sheet away.

What the hints cover (`hintRegistry.ts`, copy in `en.properties:569-591`): name, "add music", "start
when ready", drag the mystery card, confirm, challenge, next song, tap a placed card, switch
timelines, tokens, menu. What they miss:

- **Share the code** — the single most important host task in a party; no hint, no affordance.
- **Playback** — nothing says audio plays on the host's phone, nothing says "tap to start the
  song" outside the menu.
- **Spotify is optional / what Free means** — only in a six-paragraph (i) dialog.
- **Release-year curation** — no hint; the "Check year" triangle has no explanation except its
  `title`.
- **Home** — `home-start` is in the plan but not implemented; Home still has no cue that the next
  screen is where you host or join.
- The two-per-visit cap plus once-only semantics means most game hints are never seen if the
  first game is also the last on that device; there is no "n of m seen" or replay (plan 10 §4).
- Hints do not dismiss when the anchored control is used (plan 10 §2.4); a host who immediately
  taps "Start game" leaves the start hint on screen until the page unmounts.

### 3.6 The Spotify sub-flow specifically

- **Premium vs Free** is detected after login (`SpotifyAuthService.ts:463`) and shown as a badge
  with one sentence. The consequence for Free ("many songs will have no preview and will be
  silent") is not stated; preview availability has been shrinking on Spotify's side, so this will
  be the common failure a Free host hits mid-game.
- **Login timing**: forced at the top of the default tab, before the host knows whether they want
  full playback. Discovery, import and quick picks all work on app credentials. Login should be a
  step at Start, framed as "How should the music play? Spotify Premium (full songs) / Previews /
  No audio (I'll play songs myself)". The last option is legitimate for a couch party with a
  speaker and should be honest about the deck ("Practice deck", 40 songs).
- **Login re-entry**: tokens are keyed by room and dropped on close
  (`SpotifyTokenStore.ts`, plan 08 §4.1), so the host logs in for every room. Expected to
  persist until the compliance review; the UI should at least say "You'll need to log in again
  for each room" rather than surprise the host.
- **Playlist choice**: three ways in three tabs with three result shapes (import-on-tap rows,
  add-per-track rows with swipe, review-then-apply list). Choose one shape: _every_ source yields
  a review list with "Use N songs".
- **Release-year curation presentation**: the warning triangle is the right idea
  (`playlistMetadataFlags.ts`) but it is only a badge. For a 250-song Quick pick the host would
  need to visually scan 250 rows. The editor needs: a "Needs check (N)" filter chip, a "Review
  flagged" stepper that opens the details sheet for the next flagged track, a one-tap "Looks right"
  to mark verified, and the suggested year surfaced as a choice when the album is a compilation
  (e.g. show the earliest album year Spotify knows for that track if it is already fetched — no
  external API needed). Hide "Metadata status" behind the single "Year checked" action.
- **How many tracks does a host realistically review?** With defaults (10 cards to win, 1
  starting card, 4 players) a game consumes roughly 40-70 cards including wrong placements and
  skips. The default 250-song Quick pick triples the review burden for no gameplay gain. The
  patterns catch remasters, deluxe, live, compilations; they do not catch singles re-released on a
  later album, soundtracks, or "(Radio Edit)". Typical hit playlists ("All Out 80s"-style) put
  20-40 % of tracks on compilations, so a 250-song deck means 50-100 flagged rows.
- **Where curation happens**: `PlaylistTrackDetailsSheet` is used in three parents with three
  different save paths (`updateTrack` server emit vs two client-side state patches). If the host
  edits a year in the Quick-picks review and then also opens "Edit playlist", the edit is present
  (it was applied with the tracks) but the saved-playlist flow and the editor have no indication
  of what was curated versus imported other than the pencil badge.
- **Duplicate song handling**: appending from Search dedupes by Spotify id, but the same song on
  two albums (original + compilation) is two ids and will both enter the deck.

### 3.7 Guest flow friction and the handover

- Guests pay the same naming tax, see a lobby headline written for hosts, a disabled input they
  cannot use, and a page that reveals nothing about the game's state (songs ready? Spotify?).
- No mobile share path exists, so in practice guests will type the code; codes are
  case-sensitive strings the host may have renamed to anything matching `[a-zA-Z0-9_-]+`.
- Handover is silent. The guest should see a short "Game is starting — listen on <host>'s phone"
  moment, then their timeline with "<host> goes first".
- During the host's turn the guest's screen has nothing actionable; the status line is the only
  explanation, and if TT mode is off there is no "Beat!" either. A one-line "You'll place the next
  song" expectation would cut the "what do I do?" question on the couch.

### 3.8 Accessibility basics (obvious problems only)

- `HintBubble` has `role="dialog"` _and_ `aria-live="polite"` on the same element
  (`HintBubble.tsx:85-96`); a dialog that does not take focus but announces itself is a confusing
  mix. Plan 10 §7 wanted a separate live region.
- Overlay sheets (`SpotifySetupModal`, `PlaylistEditModal`, `PlaylistTrackDetailsSheet`) set
  `aria-modal="true"` but do not trap or move focus on open and do not restore focus on close.
  Escape works for the setup modal (`SpotifySetupModal.tsx:51-60`) but not for the editor.
- Tab bars use `role="tablist"` with buttons that have `aria-selected` but no `role="tab"` in
  `SpotifySetupModal.tsx` (`SpotifySourceTab`), and no `aria-controls`.
- Icon-only buttons with `title` only (opened-playlist header) are fine for SR but useless on touch.
- `TokenCountAmount` announces "N TT tokens" — jargon in the accessible name.
- 32 px info buttons under the 44 px target rule; the `PlayerNameField` save button is icon-only
  with an `aria-label` (good) but visually unlabelled and disabled most of the time, so its purpose
  is unclear to sighted users.
- Colour-only status: Connected dot, premium badge, verified/edited badges rely on colour plus a
  small glyph; the "Check year" warning is colour + triangle with a tooltip only.
- Desktop Home hardcodes English (`HomePageDesktop.tsx`), so language switching is incomplete.

---

## 4. Alternative target flows for host creation

Context: four friends on a couch, one phone each, the host wants music playing within a minute.

### Option A — "One-tap host, configure in the lobby"

Home shows two buttons: **Host a game** / **Join with code**. Host tap creates the room with a
generated name and code immediately; the lobby's first screen is: big code + Share/Copy + QR,
live player list, a **Music** row ("No songs yet — Pick a vibe" / "48 songs · Spotify Premium"),
a **Rules** row (summary + edit), and a persistent **Start** dock that is disabled with a reason
("Add songs first") until a deck exists. Name editing is a tap on your own player row.

- Pros: fastest to a shareable code (1 tap); everything the host needs is on one screen; no
  decisions before players arrive; settings become summaries with edit, not forms.
- Cons: the lobby screen must be designed carefully to fit on 667 px; music still needs a sheet;
  the Spotify login prompt must be designed as a Start-time interstitial.

### Option B — "Three-step wizard"

Host → Step 1 "Who are you" (name) → Step 2 "Pick music" (Quick picks grid, "or paste a
playlist") → Step 3 "Rules" (defaults, one screen) → Lobby with code and Start.

- Pros: linear, every step has one question; good for the very first run; curation can be a
  natural sub-step of step 2.
- Cons: three screens before friends can join (they are waiting); forces music and rules before
  the host knows who is playing; wizards age badly for returning hosts unless skippable; conflicts
  with the "frictionless" design goal in `CLAUDE.md`.

### Option C — "Deck-first, then room"

Home → "Pick a deck" (saved decks, Quick picks, import) → review/curate → "Host with this deck"
creates the room → lobby.

- Pros: puts curation up front, where `CLAUDE.md` says the primary host workflow is; decks become
  reusable first-class objects (already modelled in `services/savedPlaylists`); the room is
  never silent.
- Cons: slowest to a shareable code; a host who just wants to play "80s Hits" still goes through
  a review screen; poor fit for a party where the social moment is "everyone join now".

### Recommendation: **Option A**, with two borrowed pieces

Adopt the one-tap host and the single lobby screen, and borrow from C the idea that **the deck is
a saved object the lobby points at** ("Music: 80s Hits (48 songs) · Change"), so Quick picks
become one tap and curation is a secondary action on that row ("Check 7 flagged years"). Borrow
from B the **Start-time interstitial** for Spotify: when the host taps Start, if the deck has
Spotify URIs and the host is not logged in, show "How do you want to hear the songs? [Log in to
Spotify — full songs on Premium] [Use previews — no login] [No audio]". This keeps login out of
the fast path, makes Free vs Premium explicit at the moment it matters, and is the one place the
honest "this will be silent" message can live. Compute the Quick-pick size from players × target
(+ margin) by default, and gate Start on "deck exists" rather than silently falling back to the
test deck.

---

## 5. Concrete fix list for the spec (ordered by payoff)

1. Home: "Host a game" / "Join" as two actions; remove Play as a separate screen or make it the
   join screen only.
2. Default a player name; never disable the primary action for an empty name; edit name inside
   the lobby player row.
3. Lobby first screen: read-only code, Copy/Share/QR, player list, Music row, Rules summary row,
   single Start dock with disabled-reason text. Remove rename from the fast path and remove the
   second Start.
4. Replace the silent test-deck fallback with an explicit "Practice deck (no audio)" choice or a
   disabled Start.
5. Music setup: Quick picks as default tab; deck size suggested from players × target; one review
   shape for every source; a footer showing "N songs ready · Done".
6. Spotify login moved to the Start-time interstitial; honest Free-tier copy; fix the popup result
   page; remove developer text from `lobby.spotify.authTimedOut`.
7. Curation: "Needs check (N)" filter, stepper through flagged tracks, one-tap "Looks right",
   rename "Album Release Year" to "Release year", hide metadata status.
8. Terminology pass: room/code, songs/deck, token/Beat!, remove "Open Lobby", "TT".
9. Feedback pass: creating-room state, settings saved, copied, import progress, filtered count,
   deck too small, playback status on the main game surface for the host.
10. Hints: add share-code and playback hints; dismiss on anchor interaction; show "n of m" and
    replay; implement `home-start` or delete it from the plan.
11. Guest: guest-specific lobby copy, "Game starting — listen on <host>'s phone" handover, and
    an expectation line during others' turns.
12. Accessibility: 44 px targets for (i) buttons, focus management in sheets, separate live region
    for hints, `role="tab"` on tabs, labels on icon-only buttons.
