# 22 — Game Startup Flow: Experience Specification

> **Status (2026-10-15):** Specified; S0–S2 shipped 2026-10-14, S3–S4 shipped 2026-10-15; S5–S12 open (§15). Requested by the owner on
> 2026-10-14 ("easy to use, straightforward, engaging, nice and beautiful"); decisions 22–25 in
> `00-index.md` §5. This document **owns the whole startup flow** — Home, name, join, lobby (host
> and guest), rules, Music setup, playlist and song editing, Start and handover — and
> **supersedes** `04` work packages 3–10 and `21-music-setup-redesign.md` in full. `04` §1
> (glossary), §2 (cross-cutting rules), §4 (deck rules), §6 (duplicate names, codes) and §8
> (accessibility) stay normative and are referenced, not repeated. `04` WPs 1 and 2 shipped
> 2026-10-13 and are the base this plan builds on.
> **Owns findings:** U-01 (client half) … U-14, F-06 (host-flow overlays), F-16 (lobby part),
> F-24 (host-flow controls), F-26 (`06` W5 files it rewrites).
> **Authority:** subordinate to `CLAUDE.md`, `docs/rules/design_system.md`,
> `docs/rules/frontend_engineering_rules.md` and `docs/rules/backend_engineering_rules.md`.
> File names below existed on 2026-10-14.

## 0. Scope and what changes about the rules

Decision 5 ("streamline, do not restructure") is **superseded by decision 22**: the startup flow
may add, merge and remove screens and routes. Everything else stands: the server is the source of
truth, Spotify login stays per room (decision 10), the practice deck is an explicit choice
(decision 7), the deck-size indicator (decision 6), duplicate names are suffixed (decision 11),
hints are a first-game tutorial (decision 12), one overlay stack (decision 21), tokens only,
48 px targets, mobile first with separate assemblies.

In scope: `/`, `/join`, `/join/:roomId`, `/lobby/:roomId`, the Music setup and its editors, the
Rules sheet, Start and the handover into `/game/:roomId`. Out of scope: the game page beyond the
handover toast and the host playback chip (§4.11), persistent Spotify login (plan `16` §5),
leave-room semantics (plan `17` Phase 6), the room directory's four fields (decision log
2026-09-28).

## 1. Why (owner feedback 2026-10-14, verified against the code)

The flow works but asks the host to think about the app instead of the party:

- Home → Play → Lobby means three screens before the room code exists; Play gates every action
  on a saved name and shows nothing while the directory loads.
- The host lobby carries **three Start buttons** on desktop and two on mobile, under three
  different keys; the mobile primary button has four meanings (`LobbyPageMobile.tsx:107`), and
  Enter in the room-name field starts the game (`:64–72`).
- Start is enabled with no deck; the refusal arrives as a banner at the top of the page.
- Music lives below the fold behind "Choose songs", and hearing songs takes two more steps
  (open the sheet, then Connect). The Search and Quick picks tabs work without login; the
  Playlist tab does not.
- Inside Music setup one input changes its button between Import, Reload and Search; the saved
  deck is a dropdown whose selection **replaces the room deck immediately**; Delete and Clear
  have no confirmation; six controls are icon-only; the "Added" toggle removes; per-row delete
  is swipe-only; the "N songs queued" line appears twice; covers are missing where they matter.
- Players arriving are not animated; "Copy invite" gives no feedback; there is no loading
  skeleton, so desktop briefly shows the literal `lobby` as the code.

## 2. Design principles (binding for every screen in this document)

1. **One job per screen, one primary action per screen.** Secondary actions are text buttons or
   live in an overflow menu; destructive ones always confirm.
2. **Always a next step, never a dead end.** Every disabled primary action says why (`04` §2.1);
   every empty state offers the way out; a missing name is asked for in place, not by disabling
   the page.
3. **Show state, not settings.** The lobby shows what is ready (code, players, songs, rules) and
   how much is left; settings are one tap away, not on the main path.
4. **The code is the hero.** The host can share it within two seconds of hosting; guests can share
   it too.
5. **Music is browsing, not configuring.** Covers, names and counts first; Spotify login is a
   playback matter, never a gate on choosing songs.
6. **Motion explains.** A player arriving, a step completing, a deck landing and the game starting
   each have one named motion; nothing decorates (`CLAUDE.md` → Look & Feel).
7. **Words from the glossary** (`04` §1): room, code, song, deck, token, Beat!, release year, year
   checked, practice deck, who taps Next.
8. **Thumb first.** Primary actions sit in the bottom dock on phones; nothing important is only
   reachable by scrolling past the fold at 375 × 667.
9. **Skeletons mirror the content** (owner, 2026-10-14). A loading state has the exact layout of
   what replaces it: same rows, cover or avatar shape and size, line count and height. Rows use
   `ListSkeleton`; a screen-specific skeleton (the lobby code area, a Playlist header) is built
   from the same components in the package that builds the screen. A generic grey block is a defect.

## 3. Flow map

```
/                Home            Host a game ──────────────► /lobby/:code (room created on the way)
                                 Join a game ──► /join ──────► /lobby/:code
                                 Playing as <name> · Change ─► Name sheet (overlay)
/join            Join            code field + Join; open rooms list; invite preview on /join/:code
/lobby/:code     Lobby (host)    Invite card · Music card · Rules card · Start dock
                                   Music card ───► Music setup (sheet)
                                                     Your decks | Find ──► Playlist view ──► Song editor
                                   Rules card ───► Rules sheet (game · tokens · players · room)
                                   Code "Edit" ──► Rename dialog
                 Lobby (guest)   Invite card · Players · Music status · Rules summary · "Waiting for <host>"
/game/:code      Game            handover toast; host playback chip
```

Routes: `/play` is removed and redirects to `/join`; `/join/:roomId` keeps its invite preview;
room creation keeps the existing `/lobby` + `intent: "create"` mechanism and the server-generated
code (the URL is replaced once the code arrives, as today). Route order ladder (`14` §3.3):
`/` 0, `/join` 1, `/lobby` 2, `/game` 3; Home → Join and Join → Lobby animate forward, Back
animates backward; Lobby → Game is a `replace` (decision log "push vs. replace").

## 4. Screens

Reference viewport **375 × 667 CSS px**; "above the fold" means visible without scrolling. Each
screen lists purpose, layout, controls with i18n keys (`en` value; `hu` is written in the same
work package and reviewed by the owner), the five states (`04` §2.2), motion, hints, and
accessibility beyond `04` §8.

### 4.1 Home (`/`)

**Purpose:** choose to host or join; confirm who you are.

| Block          | Content                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar        | App menu (view, theme, language, hints) as today.                                                                                                                                                         |
| Hero           | Logo, `home.tagline` = "Place the song. Beat your friends." The ambient background stays (decision 15).                                                                                                   |
| Identity chip  | `home.playingAs` = "Playing as {{name}}" with a text button `common.change` = "Change" → Name sheet (§4.2). With no saved name the chip is absent; the first Host or Join tap opens the Name sheet first. |
| Primary action | `home.host` = "Host a game" (primary, 56 px tall). Tapping creates the room at once; the button shows `home.hosting` = "Setting up your room…" with the loading state until the lobby renders.            |
| Secondary      | `home.join` = "Join a game" (secondary) → `/join`.                                                                                                                                                        |
| Sub-label      | `home.hint` = "You play too. Songs play on the host's phone."                                                                                                                                             |

The three feature cards ("01 02 03") and the "Let's go!" button are removed; `home.primaryAction`,
`home.primaryActionHint`, `home.desktop.*` keys are deleted. Desktop renders the same blocks in the
existing centred panel.

States: loading (hosting) on the primary button; the room is created on the lobby route, so a
failed create shows there as the lobby's error, not on Home (S2: no `home.hostFailed` key);
offline → primary disabled with reason `room.connection.offline`; the kicked toast stays.
Motion: none beyond the ambient background and the shared page transition. Hints: none.

### 4.2 Name sheet (overlay, all pages)

**Purpose:** collect the only personal datum the app needs, once, in place.

`Dialog` primitive, title `profile.name.title` = "What should we call you?", body
`profile.name.body` = "Everyone in the room sees this name. You can change it any time.", one
`TextField` (label `profile.name.label` = "Your name", 1–24 characters, existing validation), primary
`profile.name.continue` = "Continue", text button `common.cancel`. Opened by: Host or Join on Home
with no saved name, "Change" on Home and Join, the own chip in the lobby (§4.5). Saving writes the
device profile (`features/profile`) and, inside a room, sends `update_player_profile`. The
server suffixes duplicates (decision 11; `04` §6.1) and the sheet closes without comment — the
suffixed name appears in the players strip.

Replaces `PlayerNameField` on Home, Join and Lobby; the `profile-name` hint is deleted (the sheet
explains itself). Focus moves to the field on open; Back and Escape cancel.

### 4.3 Join (`/join`)

**Purpose:** get into a friend's room with a code or from the list.

| Block       | Content                                                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header      | Back, title `join.title` = "Join a game", `ConnectionStatus` chip, identity chip with Change.                                                                                                                                                                                                                 |
| Code field  | `TextField` label `join.codeLabel` = "Room code", monospace display type, auto-uppercase display (lookup is case-insensitive, `04` §6.2), paste-friendly. Primary `join.action` = "Join".                                                                                                                     |
| Reason line | Disabled Join says `join.reason.codeRequired` = "Enter the code from your host." or `room.connection.reconnecting`.                                                                                                                                                                                           |
| Open rooms  | `join.openRooms` = "Open rooms" (every open room on the server, so not "near you"); rows: code, `join.roomHost` = "Hosted by {{name}}", `join.roomPlayers` = "{{count}} players"; tap joins. The server pushes every change to the list while the page is open, so there is no polling and no Refresh button. |

States: loading → three `Skeleton` rows; empty → `join.noRooms` = "No open rooms yet. Ask your
host for the code."; error (wrong code) inline under the field, `join.notFound` = "No room with
that code. Check it with your host."; offline → chip + `join.offline` = "Can't reach the game
server. Retrying…"; pending → Join shows `join.joining` = "Joining…". Invite preview `/join/:code`
keeps its skeleton, not-found banner and single Join. Motion: rows fade in with the list enter
motion (≤ 240 ms). Hints: none.

### 4.4 Lobby, host — layout and the setup checklist

**Purpose:** get the room ready in three visible steps and start.

One scrolling screen (the two scroll-snap screens are removed) with a sticky Start dock. Order and
height budget at 375 × 667:

| #   | Block              | Budget | Content                                                                                                                                                                                               |
| --- | ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Header             | 56 px  | Back (→ Close room confirm for the host, Leave for guests), eyebrow `lobby.eyebrow` = "Lobby", title `lobby.host.title` = "Get the room ready", app menu. `ConnectionStatus` chip when not connected. |
| 2   | Invite card (§4.5) | 176 px | Step 1. Code hero, Copy, Share, players strip.                                                                                                                                                        |
| 3   | Music card (§4.6)  | 104 px | Step 2. Deck status, cover mosaic, meter, one action.                                                                                                                                                 |
| 4   | Rules card (§4.7)  | 64 px  | Step 3. Summary line, "Edit rules".                                                                                                                                                                   |
| 5   | Start dock (§4.10) | 112 px | Readiness line, Start, reason line; sticky with the safe-area inset.                                                                                                                                  |

**No step badges** (owner review 2026-10-15): numbered badges and ticks read as unexplained
marks. Each card shows its state in its own status line instead; the Music card takes the
warning outline while there is no deck. Cards are one tap target each (icon, title, status,
centred chevron). The Start dock holds only the button, without a bar background; the readiness
and reason lines sit at the end of the scrolling content and stay linked to Start through
`aria-describedby`. Back in the header asks to close the room (host) or leave it (guest); Close
room is not in the Rules sheet.

While the room is being created the code area shows a `Skeleton`, the buttons are disabled, and
the Start reason reads `lobby.start.reason.creating` = "Creating your room…". The literal `lobby`
is never shown as a code (loading skeleton is mandatory: `15` Phase 5 item, owned here).

### 4.5 Invite card (host and guest)

| Element       | Spec                                                                                                                                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Label         | `lobby.invite.label` = "Room code"                                                                                                                                                                                                                                                                                            |
| Code          | `type-display`, letter-spaced, selectable text, never an input. Host only: a 48 px `IconButton` "Edit" (`lobby.invite.rename` = "Change code") → Rename dialog (`04` §3.3.1 rules; rejects a code that differs only by case).                                                                                                 |
| Copy          | `Button` secondary, `lobby.invite.copy` = "Copy code"; toast `lobby.invite.copied` = "Code copied". Without `navigator.share` it copies the invite text and link instead and reads `lobby.invite.copyLink` = "Copy invite".                                                                                                   |
| Share         | `Button` primary, `lobby.invite.share` = "Share"; Web Share API with title `app.name`, text `lobby.invite.shareText` = "Join my TuneTrack game: {{code}}" and the `/join/{{code}}` URL. Hidden when `navigator.share` is missing. Browser-native; no third-party service.                                                     |
| Players strip | `lobby.players.count` = "Players ({{count}})"; avatar chips (`Avatar` + name); host chip carries a crown icon and "Host" in the accessible name; own chip reads "You" and opens the Name sheet. More than four: first three + `lobby.players.more` = "+{{count}} more" → opens the Players section of the Rules sheet (§4.7). |
| Waiting line  | With one player: `lobby.invite.waiting` = "Waiting for friends to join…" with a two-dot status pulse (status indicator, 1.6 s loop, allowlisted in `motionBudget.test.ts` by decision 19; static under reduced motion). Disappears on the second join.                                                                        |

Motion: a new player chip enters with `createPlayerArrivalMotion` (emphasised decelerate, 320 ms,
`transform`/`opacity`, 40 ms stagger when several arrive together); a leaving chip exits with
emphasised accelerate 200 ms. Hint `lobby-share-code` (§9) anchors on Share (or Copy).

### 4.6 Music card (host)

One row card (`ListRowButton` with a leading visual) whose whole surface opens Music setup. Right
side shows the single action label; a second text button appears only in the "no deck" state.

| Deck state                 | Leading visual                  | Title / status line                                                                    | Action                                                                |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `deckSource === "none"`    | Music note glyph, warning tone  | `lobby.music.title` = "Music" / `lobby.music.none` = "No songs yet"                    | `lobby.music.choose` = "Choose songs" + text `lobby.practiceDeck.use` |
| `"practice"`               | Practice glyph                  | "Music" / `lobby.practiceDeck.status` = "Practice deck · {{count}} songs · no audio"   | `lobby.music.change` = "Change"                                       |
| `"spotify"`, not connected | 2 × 2 cover mosaic (`CoverArt`) | "Music" / `lobby.music.spotifyUnconnected` = "{{count}} songs · Spotify not connected" | "Change"                                                              |
| `"spotify"`, Premium       | cover mosaic                    | "Music" / `lobby.music.spotifyPremium` = "{{count}} songs · Spotify Premium"           | "Change"                                                              |
| `"spotify"`, Free          | cover mosaic                    | "Music" / `lobby.music.spotifyFree` = "{{count}} songs · Spotify Free, previews"       | "Change"                                                              |

Below the status line, when a deck exists: the **deck meter** — a 4 px bar comparing
`importedTrackCount` with `getRequiredDeckSize(...)` (`packages/shared` `deckSize.ts`), green at or
above the required size with `lobby.deck.ok` = "Enough songs for {{players}} players", warning
tone below it with `lobby.deck.short` = "Short deck: {{count}} of {{required}} songs needed for
{{players}} players to reach {{target}}" (decision 6 warns, never blocks). Recomputed on every
join, leave and rules change. With flagged years: a chip `lobby.music.toCheck` = "{{count}} years
to check" (uses `tracksToCheckCount`, `04` §3.7) that opens Music setup on the current deck with
the Needs check filter on.

Guests see the same card read-only (no chevron): `lobby.music.guestReady` = "{{count}} songs ·
plays on {{host}}'s phone" or `lobby.music.guestChoosing` = "{{host}} is choosing songs".

### 4.7 Rules card and Rules sheet (host)

**Card:** `ListRowButton`, title `lobby.rules.title` = "Rules", summary built by a pure selector:
`lobby.rules.summary` = "{{target}} songs to win · {{starting}} to start · tokens off" or "… ·
tokens on, Beat! {{seconds}} s". Action `lobby.rules.edit` = "Edit rules" → Rules sheet.

**Rules sheet** (`Sheet` primitive, full height on phones, side sheet on desktop; header "Rules",
Done). Sections, each a `SettingRow` list:

| Section | Rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game    | `lobby.rules.target` = "Songs to win" (`NumberStepper` 3–30, default 10); `lobby.rules.starting` = "Songs to start with" (stepper 1–10); `lobby.rules.whoTapsNext` = "Who taps Next" (`SegmentedControl`: "Host" / "Host or player on turn"). Each row has a one-line description instead of an (i) button.                                                                                                                                                                  |
| Tokens  | `lobby.rules.tokens` = "Tokens" (`ToggleSwitch`, description `lobby.rules.tokensBody` = "Spend tokens to skip, buy or Beat! a song."); when on: `lobby.rules.startingTokens` = "Starting tokens" (stepper 0–5), `lobby.rules.beatWindow` = "Beat! window" (`SegmentedControl` 5 / 10 / 15 / 30 s; "No limit" is not offered — the existing `null` stays reachable only for rooms that already have it).                                                                      |
| Players | One `ListRow` per player: avatar, name, then the badges as text with what they start with ("Host · You · Starts with 1 song · 1 token", "Offline"). For the host the whole row opens a disclosure with the two per-player number settings (starting songs, starting tokens when on) and "Remove from room", which opens a confirm `Dialog` `lobby.players.kickConfirm` = "Remove {{name}} from the room?" (`common.remove`, `common.cancel`). Guests see the rows read-only. |
| Room    | **Moved to Back (owner, 2026-10-15)**; not in the sheet. Was: `lobby.room.close` = "Close room" (danger) with description `lobby.room.closeBody` = "Everyone goes back to the start screen." and a confirm dialog.                                                                                                                                                                                                                                                           |

Number settings (decision 26): phones keep the existing ruler slider (`RangeField`) with better
touch handling (S4); the desktop assembly uses `NumberStepper`. "Stepper" in this table means
that pair. Switches stay the existing green `ToggleSwitch`.

Settings apply on change through the existing `update_room_settings` / `update_player_settings`
actions; success is silent (the control shows the value), failure shows the existing retry copy
inline under the row. Opening the sheet from "+N more" scrolls to Players.

### 4.8 Music setup (host) — shell, Playback block, Your decks, Find

A `Sheet` (full height on phones; §4.12 for desktop) with the header `music.title` = "Music", a
close button, and three stacked regions.

**Playback block** (always visible, top):

| Spotify state | Text                                                                                                                                                        | Control                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| none          | `music.playback.unconnected` = "Songs play on this phone. Connect Spotify to hear them." + `music.playback.perRoom` = "You log in again for each new room." | `Button` variant `spotify` `music.playback.connect` = "Connect Spotify" |
| connecting    | `music.playback.connecting` = "Finishing Spotify login in the popup…"                                                                                       | `common.cancel`                                                         |
| error         | existing localised auth error                                                                                                                               | `music.playback.retry` = "Try again"                                    |
| premium       | `music.playback.premium` = "Spotify Premium · full songs"                                                                                                   | —                                                                       |
| free          | `music.playback.free` = "Spotify Free · 30-second previews; songs without one stay silent"                                                                  | —                                                                       |

No region below is gated on login: playlist links, search, quick picks and saved decks all use
the app credentials (`PlaylistImportService.getOrRefreshClientCredentialsToken`). Decision 10
copy (per-room login) is shown here and only here.

**Segmented control** `music.tab.decks` = "Your decks" | `music.tab.find` = "Find". Default: Your
decks when at least one saved deck exists, otherwise Find.

**Your decks:**

- Pinned first when the room has a deck: a full-width `CoverArt` card `music.decks.current` = "In
  this game" with the mosaic, `music.decks.songs` = "{{count}} songs", the to-check chip, tap →
  Playlist view of the room deck.
- Grid (2 columns on phones) of saved decks: cover (stored `imageUrl`, styled fallback), name,
  "{{count}} songs", `music.decks.toCheck` = "{{count}} to check" badge when > 0. Tap → Playlist
  view. Long-press or the row overflow (48 px `IconButton` "More") → Rename / Delete (confirm).
- Empty: `EmptyState` `music.decks.empty` = "No saved decks yet." with `music.decks.find` = "Find
  songs" switching to Find.

**Find:**

- One `TextField` with placeholder `music.find.placeholder` = "Search songs, artists, albums — or
  paste a Spotify link". A pasted playlist or album link is detected and imported directly into
  a Playlist view (link detection stays in `getPlaylistImportAction`, moved beside the hook).
  Type chips Songs / Albums / Artists / Playlists (`ChipButton`, 48 px) under the field when a
  query is typed. Results are rows with `CoverArt`, title, subtitle and a trailing
  `ListRowAction` (Add / Added ✓ for songs; a chevron for albums, artists and playlists, which
  open a Playlist view). Selection mode (Select) shows one `SelectionActionBar` at the bottom:
  "{{count}} selected · Add to deck".
- **Quick picks** section: `music.quickPicks.title` = "Quick picks", grid of the ten preset cards
  (title, description, a styled decade/genre tile as cover). Under a `music.quickPicks.more` =
  "More options" disclosure: `music.quickPicks.max` = "Max songs" stepper defaulting to
  `getRecommendedDeckSize(...)`, range 10–500. Tap → generation (inline progress on the card,
  not the global loading overlay) → Playlist view in review mode (§4.9).
- **Practice deck** card at the end: `lobby.practiceDeck.title` = "Practice deck",
  `lobby.practiceDeck.description` = "Built-in songs with no audio, for trying the game.",
  action `lobby.practiceDeck.use`. With a deck present: confirm `music.replaceConfirm` = "Replace
  the {{count}} songs in your deck?".

States: search loading → three skeleton rows; no results → `music.find.noResults` = "Nothing
found for “{{query}}”."; errors inline under the field; offline → the whole sheet shows the chip
and disables actions. Import feedback after a link: toast `music.importSummary` = "{{added}} songs
added · {{skipped}} unavailable skipped". Motion: the sheet uses `createSideSheetMotion`;
switching Your decks ↔ Find cross-fades 200 ms; result rows use the list enter motion.

### 4.9 Playlist view and Song editor (one view for every list)

**Playlist view** — a `PanelView` inside the Music sheet, used for: a search result (album,
artist top tracks, playlist), a pasted link, a saved deck, a quick-pick result (review mode) and
the room deck. It replaces `SpotifyOpenedPlaylistPanel`, `SpotifyCandidateReviewPanel`,
`PlaylistEditModal` and the opened-playlist header.

| Part           | Spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header         | Collapsing cover: large `CoverArt` (mosaic for decks), title, source line (`music.view.source.spotify` = "Spotify playlist", `.saved` = "Saved deck", `.room` = "In this game", `.quickPick` = "Quick pick"), "{{count}} songs", to-check chip. On scroll the cover cross-fades into a 32 px cover in the sticky title bar (`createCollapsingHeaderMotion`, `transform`/`opacity` only, scroll-driven, reduced motion → instant swap). Back (48 px) and an overflow `IconButton` "More".                         |
| Filter chips   | `music.filter.all` = "All ({{count}})", `music.filter.needsCheck` = "Needs check ({{count}})". Default Needs check when K > 0 and the list is the room deck or a saved deck. A `music.view.review` = "Review flagged" button beside the chips when K > 0.                                                                                                                                                                                                                                                        |
| List           | Virtualised (`@tanstack/react-virtual`) `ListRow`s: cover, title, artist · year, a text badge `music.row.checkYear` = "Check year" when flagged, "Year checked" tick when verified. Trailing `ListRowAction`: Add / Added ✓ (search lists), or chevron (deck lists). Tap opens the Song editor. "Select" in the header enters selection mode with checkboxes and one `SelectionActionBar` ("{{count}} selected" + Add to deck / Remove from deck). Swipe-to-delete is removed (one way to remove, discoverable). |
| Primary action | Bottom dock, one button: search/link/quick-pick list → `music.view.use` = "Use in game" (with a deck present a choice `Dialog`: `music.view.replace` = "Replace deck" / `music.view.add` = "Add to deck" / cancel); saved deck → "Use in game"; room deck → the dock reads `music.view.inGame` = "In this game ✓" (disabled, informative) and the overflow holds the actions.                                                                                                                                    |
| Overflow       | `music.view.save` = "Save to Your decks" (name dialog; existing overwrite / save-as-new flow becomes two dialog buttons), `music.view.rename`, `music.view.removeAll` = "Remove all songs" (confirm; for the room deck this sets `deckSource` back to none), `music.view.delete` = "Delete saved deck" (confirm).                                                                                                                                                                                                |

**Song editor** — a nested `PanelView` (two deep is the maximum, `14` §7): fields Title, Artist,
Album (`TextField`), `music.song.year` = "Release year" with a `NumberStepper` ±1 beside the
field, helper `music.song.spotifyYear` = "Spotify album year: {{year}}" when it differs,
`music.song.yearChecked` = "Year checked" `ToggleSwitch` (on → `verified`; off and any field
changed → `edited`; otherwise unchanged; the Imported/Edited/Verified segmented control is
removed; server contract unchanged). Buttons: `music.song.save` = "Save song", `common.cancel`.
In review mode (opened from "Review flagged") the dock shows `music.song.looksRight` = "Looks
right" (sets year checked, advances), `music.song.next` = "Next" (advances) and "{{index}} of
{{count}}".

**Saved deck edits (decision 24):** a save in the Song editor on a saved deck, or a removal from
it, writes back to `services/savedPlaylists` at once and shows a toast `music.song.saved` =
"Saved to {{deck}}" with `common.undo`. Undo restores the previous track record. The room deck,
when it came from that saved deck, receives the same `update_playlist_track`. Saved decks gain
`imageUrl` and a schema version; `tunetrack.savedPlaylists.v1` entries migrate without loss
(`21` Phase 5 content, owned here).

### 4.10 Start dock (host)

Readiness line `lobby.start.readiness` = "{{players}} players · {{songs}} songs" (with no deck:
"{{players}} players · no songs yet"). Primary `lobby.start.action` = "Start game". Reason or
note line under it (`aria-describedby`), first match wins:

| Condition                           | Button   | Line                                                                                                 |
| ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| Socket not connected                | disabled | `room.connection.reconnecting`                                                                       |
| Room still being created            | disabled | `lobby.start.reason.creating`                                                                        |
| No deck                             | disabled | `lobby.start.reason.noDeck` = "Choose songs or use the practice deck first."                         |
| Start pending / retrying            | disabled | `lobby.startGame.pending` / `retrying` (existing)                                                    |
| Spotify deck, Spotify not connected | enabled  | warning: `lobby.start.note.noAudio` = "Songs will be silent. Connect Spotify in Music to hear them." |
| Deck below required size            | enabled  | warning: `lobby.deck.short` (§4.6)                                                                   |
| Only the host in the room           | enabled  | info: `lobby.start.note.solo` = "You're the only player — fine for a practice round."                |

When every blocking condition clears, the button plays `createReadyMotion` once (460 ms
expressive scale 0.96 → 1 with the accent glow token, no loop). Start sends `start_game`; the
server stays the authority (`DECK_REQUIRED`, `04` WP 2). On success the lobby exits with the
shared page transition into `/game/:code` (`replace`).

### 4.11 Guest lobby and handover

Guest screen, top to bottom: header (Back = Leave with confirm, title `lobby.guest.title` = "You're
in"), Invite card without Edit (§4.5), Music card read-only (§4.6), Rules card read-only (summary
only), status line `lobby.guest.waiting` = "The game starts when {{host}} taps Start." with the
same two-dot status pulse. Own chip opens the Name sheet.

Handover: every non-host player sees toast `game.handover.guest` = "Game on! Music plays on
{{host}}'s phone." for 4 s on the first game render; during another player's turn the status line
adds `game.status.youreNext` = "You're next." when applicable. Host playback chip: when the host
owns playback and it is connecting or needs a gesture, the game header shows "Connecting to
Spotify…" or the 48 px button `game.playback.tapToStart` = "Tap to start the song"; with a practice
deck it reads `game.playback.practice` = "Practice deck · no audio" once and hides (`04` §3.9
content, owned here).

### 4.12 Desktop assemblies

- **Home / Join:** the same blocks centred; Join uses two columns (code form left, open rooms
  right).
- **Lobby:** primary column = header with the code hero and `ConnectionStatus`, Invite card,
  Music card, Rules card; aside = players list (the §4.7 Players rows, read-only unless host) and
  the **only** Start dock. `LobbyHostStartPanel`, `LobbyHostSettingsPanel`, `LobbyRoomActions` and
  `LobbySummaryCard` are deleted; Close room sits behind Back in the header.
- **Music setup (decision 25):** a two-pane overlay 960 px wide: left pane = Playback block,
  segmented Your decks / Find and their lists; right pane = the Playlist view of the selected
  item (empty state `music.view.pickOne` = "Pick a deck or search to see songs here."). The Song
  editor opens as a `Dialog` over the right pane. Same components and hooks as mobile; only the
  assembly differs.

## 5. Deck rules

`04` §4 applies unchanged: `getRequiredDeckSize` / `getRecommendedDeckSize`
(`packages/shared/src/game/deckSize.ts`, shipped WP 2) drive the meter (§4.6), the Start warning
(§4.10) and the quick-picks default (§4.8). `deckSource`, `use_practice_deck` and `DECK_REQUIRED`
shipped with WP 2; `tracksToCheckCount` (`04` §3.7, §9) shipped in S1 with the year-flag rule
moved to `packages/shared/src/game/trackFlags.ts` so client and server agree.

## 6. Spotify login and compliance

- Login stays per room (decision 10); the Playback block says so (§4.8). No region is gated on
  login; playback is the only thing login enables.
- Starting a Spotify deck without login is allowed with a warning (§4.10). Rationale: a guest
  may be the one with Spotify after a host transfer, and a silent round is still a round; the
  warning is explicit, so the "silent game" finding (U-01) does not return.
- Spotify remains a processor needing compliance review before client-facing deployment; this
  plan adds no new Spotify API calls. Storing saved-deck cover URLs adds one more Spotify CDN URL
  to device storage (`21` §6); it belongs in the storage review (`06` §10).
- Web Share API and the clipboard are browser-native. A QR code for the invite is **not**
  planned: it needs a dependency and owner approval (decision 16).
- The display name is the only personal datum; it stays on the device and in the room; the
  Name sheet collects nothing else (data minimisation).

## 7. Contracts and code changes by layer

| Layer                         | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared`             | `PublicRoomSettings.tracksToCheckCount`; year-flag rule from `playlistMetadataFlags.ts` moved to `src/game/trackFlags.ts`; `SavedPlaylist` type gains `imageUrl?` and `version` (client-only module stays in `apps/web`, but the track shape is shared). No new socket events.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `apps/server` `rooms/`        | `tracksToCheckCount` in the settings builder; duplicate-name suffix (`04` §6.1); case-insensitive code lookup and rename (`04` §6.2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/web` `app/`             | `/play` removed (redirect to `/join`); route ladder `/` 0, `/join` 1, `/lobby` 2, `/game` 3; lazy routes unchanged otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `apps/web` `features/ui`      | New primitives (§8): `Sheet`, `TextField`, `NumberStepper`, `SettingRow`, `CoverArt`, `SelectionActionBar`, `ListRowAction`; `Button` gains `tertiary`, `spotify` and `loading`. Deleted after migration: `BottomSheet`, `ActionButton`, `CloseIconButton`, `SelectInput`, `RangeField`, `RoomResetModal` single message (`15` Phase 4 four reasons).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/web` `features/profile` | `NameSheet` component and `useNameSheet` (open/save/suffix-aware), replacing `PlayerNameField` usages.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `apps/web` `pages/HomePage`   | Rewritten per §4.1 (mobile and desktop); `useHomePageController` hosts directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `apps/web` `pages/JoinPage`   | New page per §4.3 (replaces `PlayPage`); `JoinRoomPage` (`/join/:roomId`) stays and shares the code form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `apps/web` `pages/LobbyPage`  | `hooks/useLobbySetupModel.ts` (pure selectors: checklist, start reasons and notes, readiness, music status, rules summary, deck meter, players strip) shared by both assemblies; components `LobbyInviteCard`, `LobbyPlayersStrip`, `LobbyMusicCard`, `LobbyRulesCard`, `LobbyStartDock`, `RulesSheet`, `RoomRenameDialog`, `LobbySkeleton`; deletions in §4.12 plus `LobbyHostCoreSettings`, `LobbyHostTtSettings`, `LobbyRoomRenameCard`, `AdaptiveSelect*`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `apps/web` Music setup        | `pages/LobbyPage/music/` (new folder): `MusicSheet`, `PlaybackBlock`, `YourDecks`, `FindSongs`, `QuickPicks`, `PlaylistView`, `CollapsingCoverHeader`, `SongEditor`, `UseInGameDialog`; hooks `useMusicSetup` (composition), `usePlaylistView`, `useSongEditor`, `useDeckWriteBack`. Deleted when unused: `components/spotify/*` (`SpotifySetupModal`, `SpotifySetupContent`, `SpotifyPlaylistSearchPanel`, `SpotifyOpenedPlaylistPanel`, `SpotifyQuickPicksPanel`, `SpotifyCandidateReviewPanel`, `LobbySpotifySection`, `LobbyPracticeDeckChoice`), `PlaylistEditModal`, `PlaylistTrackDetailsSheet`, `PlaylistTrackList`, `PlaylistTrackRow`, and the CSS modules `spotifySetupShell`, `spotifyDiscovery`, `spotifyPanels`, `spotifySetupImport`, `playlistEdit*`. Existing sub-hooks under `hooks/spotify` are kept where they are pure transport (`useSpotifyAuth`, `useSpotifyPlaylistImport`, `useSpotifySmartSearch`, `useSpotifyCandidates`) and re-composed. |
| `apps/web` `services`         | `savedPlaylists`: `imageUrl`, `version`, migration, `updateTrack`, `removeTracks` with undo tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/web` `features/hints`   | §9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/e2e`                    | §14; `choosePracticeDeck` keeps working (button text unchanged) and gains a Music-card path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Every mutation keeps going through `emitAction` with `requestId`; no component emits a raw
socket event; hidden information rules are unchanged (`get_playlist_tracks` is host-only and
lobby-only, B-30).

## 8. Design-system needs (build first, S0)

| Primitive            | Spec                                                                                                                                                                                                                         | Replaces                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Sheet`              | Overlay shell: full height on phones (header with title, close, optional Done; body scrolls; bottom dock slot with safe-area inset), side sheet on desktop; `createSideSheetMotion`; built on `Overlay`; hosts `PanelView`s. | `SpotifySetupModal`, `BottomSheet`, settings sheets                                           |
| `TextField`          | Label, input, helper, error, trailing slot; 48 px; `inputMode`, `autoCapitalize` props; error announced.                                                                                                                     | `TextInput` + ad-hoc labels                                                                   |
| `NumberStepper`      | − value +, 48 px buttons, min/max, long-press repeat, `aria-valuenow`; input editable on desktop.                                                                                                                            | desktop number settings, the quick-picks number input; phones keep `RangeField` (decision 26) |
| `SettingRow`         | Title, description, trailing control slot; one row per setting; 48 px.                                                                                                                                                       | `SettingField` + (i) buttons                                                                  |
| `CoverArt`           | Square image with token radius, lazy loading, styled fallback (initials or glyph on a hashed accent), `mosaic` prop for up to four images; sizes `sm` 40, `md` 56, `lg` 160, `hero` 200.                                     | ad-hoc `<img>`                                                                                |
| `SelectionActionBar` | Bottom bar: "{{count}} selected", primary, destructive; enters/exits with `transform`/`opacity`.                                                                                                                             | `spotifyBatchDeleteBtn`, `batchToolbar`, floating buttons                                     |
| `ListRowAction`      | Trailing 48 px action for `ListRow`: `add`, `added`, `remove`, `chevron`, `more`; visible text label on desktop, icon + `aria-label` on phones.                                                                              | +/✓ toggles, icon-only row buttons                                                            |
| `Button` additions   | `tertiary` (text), `spotify` (brand token), `loading` (spinner, keeps width).                                                                                                                                                | `ActionButton`                                                                                |
| `ListSkeleton`       | Loading list built on `ListRow`'s own layout: leading avatar or cover at its real size, title and subtitle lines at their line height, optional trailing action; one `role="status"`.                                        | grey 72 px blocks                                                                             |
| `SegmentedControl`   | Gains one thumb that slides under the options (`transform`, 240 ms emphasised).                                                                                                                                              | the jumping highlight                                                                         |

All on `/dev/ui` in every variant and both themes; tokens only; CSS ≤ 200 lines each (`design_system.md` §8).
Lobby-local pieces that are not primitives until a third use: card row, deck meter, status pulse.

## 9. Hints (rules: `18` §2; tutorial sequence: `04` §7.1, owned here)

| Hint id             | Change                                                                                                                                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile-name`      | **Deleted** (the Name sheet explains itself).                                                                                                                                                                                           |
| `lobby-share-code`  | **New**, priority 5, anchor Share (or Copy), eligible for the host while alone. "Invite your friends" / "Share the code so friends can join."                                                                                           |
| `lobby-music`       | Renamed from `lobby-spotify`; anchor the Music card; eligible with no deck. "Pick your songs" / "Choose songs for this game. Spotify login is only needed to hear them."                                                                |
| `lobby-start`       | Anchor the Start dock; eligible only when Start is enabled and at least two players are in.                                                                                                                                             |
| `music-needs-check` | **New**, priority 15, anchor the Needs check chip the first time K > 0. "Some years look off" / "Spotify reports album years. Tap to check them."                                                                                       |
| All                 | Dismiss on anchor interaction; suppressed until the anchor is 50 % visible; `role="status"`, no focus move, 48 px dismiss; no cap; quiet period 1.5 s; seen = acknowledged; "Show hints again" in the app menu (`04` §7.1 code impact). |

## 10. Motion catalogue (named contracts in `features/motion`)

| Name                           | Where                           | Spec                                                                                       |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------ |
| `createPlayerArrivalMotion`    | players strip, players rows     | enter emphasised decelerate 320 ms, `scale 0.8 → 1`, `opacity`, 40 ms stagger; exit 200 ms |
| `createStepDoneMotion`         | checklist badges                | cross-fade 240 ms standard; tick `scale 0.9 → 1`                                           |
| `createReadyMotion`            | Start button becoming enabled   | one-shot 460 ms expressive, `scale 0.96 → 1`                                               |
| status pulse                   | waiting lines                   | two dots, 1.6 s loop, allowlisted (decision 19); static under reduced motion               |
| `createCollapsingHeaderMotion` | Playlist view header            | scroll-driven `transform`/`opacity`; instant swap under reduced motion                     |
| `createSideSheetMotion`        | Sheet, Rules sheet, Music sheet | existing (320 in / 240 out, opaque panel, scrim fades)                                     |
| list enter motion              | rows in Join, Find, lists       | existing `features/motion` list helper, ≤ 240 ms                                           |
| page transition                | route changes                   | existing `PageTransition`; `14` §3.1 guard (exit `pointerEvents: none`, `onExitComplete`)  |

Nothing animates `width`, `height`, `margin` or `layout` on page containers on mobile; every
helper honours `prefersReducedMotion`.

## 11. i18n key plan

New keys are the `code` keys in §4 (prefixes `home.*`, `profile.name.*`, `join.*`, `lobby.invite.*`,
`lobby.players.*`, `lobby.music.*`, `lobby.deck.*`, `lobby.rules.*`, `lobby.room.*`,
`lobby.start.*`, `lobby.guest.*`, `music.*`, `game.handover.*`, `game.playback.*`, `hints.*`,
`common.change`, `common.undo`, `common.remove`). Kept: `lobby.practiceDeck.*`,
`lobby.startGame.*`, `room.connection.*`, `error.server.*`, `app.name`. Deleted when their
component goes: `home.primaryAction*`, `home.desktop.*`, `home.roomCode*`, `home.openLobby`,
`home.orJoinRoom`, `home.refreshRooms`, `home.noRoomsAvailable`, `play.*`, `lobby.setup.*`,
`lobby.host.*`, `lobby.actions.*`, `lobby.summary.*`, `lobby.rename.*`, `lobby.select.*`,
`lobby.waiting.*`, `lobby.spotify.*` (except values reused under `music.*`), `lobby.playlist.*`,
`hints.profileName.*`, `hints.lobbySpotify.*`. The parity guard runs in every package; each
package lists its deletions in its report.

## 12. Accessibility (adds to `04` §8)

- Every card that opens something is one `ListRowButton` (one tab stop), not a card plus a button.
- The code hero is a `<p>` with `aria-label` "Room code A B C 1 2 3" (spelled for screen readers).
- The deck meter is `role="meter"` with `aria-valuenow/min/max` and the text line.
- Status pulses are `aria-hidden`; the text line carries the meaning.
- Toasts with Undo keep the undo reachable for at least 6 s and are announced politely.
- Sheets trap focus, restore it to the trigger, and close on Back and Escape; two levels of
  `PanelView` at most (`14` §7).

## 13. Acceptance criteria

- [ ] Hosting from Home to a visible, shareable code takes one tap plus the Name sheet on a new
      device (E2E, mobile project); the code appears within the skeleton's place, never `lobby`.
- [ ] At 375 × 667 the host lobby shows header, Invite card with code and players, Music card,
      Rules card and Start dock without scrolling for up to four players (Playwright bounding
      boxes).
- [ ] Exactly one Start control per lobby on both assemblies; E2E uses no `.first()`.
- [ ] Start is disabled with a reason line when there is no deck; the server still answers
      `DECK_REQUIRED` (`deckContract.test.ts`); the practice deck is only used after a choice.
- [ ] The deck meter and short-deck warning match `getRequiredDeckSize` (unit test on the
      selector); Start stays enabled with a short deck.
- [ ] Music setup works end to end without Spotify login: link, search, quick picks, saved deck,
      practice deck (component tests with `spotifyAuthStatus: "none"`; E2E with the fake server).
- [ ] One Playlist view and one Song editor render every list (guard test: no second track-row
      or details component under `pages/LobbyPage`); swipe-to-delete is gone.
- [ ] A year correction in a saved deck persists across reload and can be undone (unit, component,
      E2E).
- [ ] Covers show in Find results, Your decks, the Playlist view header and the Music card.
- [ ] Every disabled primary action in Home, Join, Lobby and Music setup has a reason linked by
      `aria-describedby` (component tests per reason).
- [ ] Every screen renders its five states (component tests with `roomStateFixtures`).
- [ ] Every overlay closes with Back and Escape and restores focus; no overlay nests deeper than
      two `PanelView`s.
- [ ] Guest lobby shows guest copy, read-only music and rules, and the handover toast.
- [ ] No "TT", "track", "queue" or "challenge" in user-facing `en` values (parity guard check).
- [ ] No CSS module over 300 lines and no source file over 700 under `pages/LobbyPage`,
      `pages/HomePage`, `pages/JoinPage`; `noHardcodedColors` allowlist shrinks by the deleted
      modules.
- [ ] Eager path stays ≤ 110 kB gzip; the Music setup chunk loads lazily (`perf-check`).
- [x] `/play` redirects to `/join`; the route table has no other change. (2026-10-14, `navigation.spec.ts` "an old Play link lands on Join")

## 14. E2E scenarios (`apps/e2e/tests/`, helpers in `tests/support/`)

| File                     | Scenario                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `startup-home.spec.ts`   | New device: Host a game → Name sheet → lobby with code; `Playing as` chip on return to Home.                                            |
| `startup-join.spec.ts`   | Guest joins by code (lower-case typed), from the open-rooms list, and from `/join/<code>`; wrong code shows the inline error.           |
| `host-lobby.spec.ts`     | Code card above the fold at 375 × 667; Copy shows the toast; Start disabled with "Choose songs…"; practice deck → Start enabled → game. |
| `host-lobby.spec.ts`     | Second player joins: players strip updates without scrolling; step 1 badge becomes a tick.                                              |
| `rules.spec.ts`          | Edit rules: songs to win 5, tokens on; the Rules card summary updates; Remove player confirm.                                           |
| `music-setup.spec.ts`    | Without login: paste `spotify:playlist:TESTPLAYLIST1234567890` in Find → Playlist view → Use in game → Music card "10 songs".           |
| `music-setup.spec.ts`    | Short deck: warning on the Music card and Start dock; Start still enabled.                                                              |
| `music-setup.spec.ts`    | Save to Your decks; reopen from Your decks; Replace/Add dialog when a deck exists.                                                      |
| `curation.spec.ts`       | Needs check filter; Review flagged → Looks right → count decrements on the Music card.                                                  |
| `curation.spec.ts`       | Year edit in a saved deck → reload → persists; Undo restores.                                                                           |
| `guest-handover.spec.ts` | Guest sees "You're in", read-only cards, then the handover toast after Start.                                                           |
| `navigation.spec.ts`     | Back closes Song editor → Playlist view → Music sheet one level at a time; `/play` redirects.                                           |

The fake Spotify server needs no new route. Budget: keep the per-project total under the 4-minute
gate (`19` §9); merge scenarios where a shared fixture serves several assertions.

## 15. Rollout order (one work package = one agent session; proof named per package)

| WP  | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Depends on | Proof                                                                                                                                                                  | Skills                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| S0  | **Shipped 2026-10-14.** `Sheet`, `TextField`, `NumberStepper`, `SettingRow`, `CoverArt`, `SelectionActionBar`, `ListRowAction`, `Button` `tertiary`/`spotify`/`isLoading`, `ListSkeleton`, sliding `SegmentedControl` thumb, on `/dev/ui`; `MotionReveal` and the §10 helpers in `startupFlowMotionTokens.ts`; cover-fallback theme tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —          | one test file per primitive in `features/ui/primitives/`; `startupFlowMotionTokens.test.ts`; spinner allowlisted in `motionBudget.test.ts`                             | `add-ui-component`, `write-tests`                      |
| S1  | **Shipped 2026-10-14.** Duplicate names get the lowest free suffix; codes match in any case (join, preview, create, rename); `tracksToCheckCount` from `trackFlags.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | —          | `tests/rooms/lobbyNamesCodesAndChecks.test.ts`, `trackFlags.test.ts`                                                                                                   | `write-tests`                                          |
| S2  | **Shipped 2026-10-14.** Home (one-tap Host, identity chip), `NameSheet` + `useNameGate` (a missing name is asked for in place), `/join` with code check and live open rooms, invite page on the Name sheet, `/play` → `/join`, route ladder 0–3; `PlayPage` and `PlayerNameField` deleted; a leaving page is `aria-hidden` and takes no input.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | S0         | `HomePage.test.tsx`, `NameSheet.test.tsx`, `JoinPage.test.tsx`, `JoinRoomPage.test.tsx`, `PageTransition.test.tsx`; E2E `startup-home.spec.ts`, `startup-join.spec.ts` | `add-ui-component`, `e2e-scenario`                     |
| S3  | **Shipped 2026-10-15.** Phone lobby is one scrolling screen: Invite card (code hero, Copy/Share, Change code → `RoomRenameDialog`, players strip with arrival motion, waiting pulse), Music card (status, deck meter, years to check, practice deck), Rules card, Start dock (readiness, first-match reason or note, ready motion), code skeleton while creating; the guest variant (read-only cards, "starts when {{host}} taps Start"). `useLobbySetupModel` feeds both assemblies. Interim: the Rules sheet hosts the existing settings, players and Close room until S4; the Music card opens the existing setup until S7; desktop unchanged until S6. Keys `lobby.title.host`/`lobby.title.guest` replace `lobby.host.title`/`lobby.guest.title` (the old key is still used by desktop). Owner review 2026-10-15: no step badges; centred code with round Copy/Share/Edit; slim name pills; one-tap Music and Rules cards; slim Start dock with the readiness and reason lines at the end of the page; Back → Close room / Leave confirm; Rules sheet has Done only, an "applies right away" line and Reset to defaults; rounded page scrollbar. | S0, S1     | `lobbySetupModel.test.ts` (reasons, notes, meter 1–8 players × targets 3–30), `LobbyPageMobile.test.tsx`; E2E `host-lobby.spec.ts`                                     | `add-ui-component`, `write-tests`, `e2e-scenario`      |
| S4  | **Shipped 2026-10-15.** Rules sheet sections Game, Tokens and Players (`components/rules/`), shared with the desktop panel (steppers there, ruler on phones); Beat! window 5/10/15/30 s with a room's existing other value kept visible; player rows open to adjust starting songs and tokens or remove after a confirm; `RangeField` has a 48 px track, previews while moving and commits once when it comes to rest, and never takes a drag or a momentum stop for a tap; `MeasuredDisclosure` keeps the token slide (decision 19) and hides closed content from assistive technology; `LobbyHostCoreSettings`, `LobbyHostTtSettings`, `AdaptiveSelect*`, `LobbyRoomRenameCard`, `LobbyPlayerList*` deleted (desktop rename uses `RoomRenameDialog`); B25 and B27 resolved. Owner device check of the ruler still open.                                                                                                                                                                                                                                                                                                                             | S3         | `RangeField.test.tsx`, `rulesSections.test.tsx`, `beatWindowChoices.test.ts`, `MeasuredDisclosure.test.tsx`; E2E `rules.spec.ts`, `challenge.spec.ts` on `mobile`      | `add-ui-component`                                     |
| S5  | Handover toast, host playback chip (§4.11); guest "+N more" opens a read-only player list. The guest lobby screen shipped with S3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | S3         | component tests with guest fixtures; E2E `guest-handover.spec.ts`                                                                                                      | `add-ui-component`, `e2e-scenario`                     |
| S6  | Desktop lobby (§4.12); delete `LobbyHostStartPanel`, `LobbyHostSettingsPanel`, `LobbyRoomActions`, `LobbySummaryCard`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | S4, S5     | desktop component tests; E2E chromium project passes; one Start control guard                                                                                          | `add-ui-component`                                     |
| S7  | Music sheet shell, Playback block, Your decks / Find segmented, Find (search, link, quick picks with recommended default, practice card), import summary toast; `useMusicSetup` composition; `LobbyPracticeDeckChoice` removed (the card's text button replaces it).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | S0, S3     | component tests with `spotifyAuthStatus: "none"`; E2E `music-setup.spec.ts` (first two rows)                                                                           | `add-ui-component`, `e2e-scenario`                     |
| S8  | Playlist view with collapsing header, filters, selection, Use in game dialog, overflow; Song editor with stepper, Year checked, review mode; delete the four old panels and the two editors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | S7         | component tests (header collapse by scroll position, filter counts, editor mapping); guard test "one editor"; E2E `curation.spec.ts` row 1                             | `add-ui-component`, `perf-check`                       |
| S9  | Saved decks: `imageUrl`, version, migration, auto write-back with Undo; covers in Your decks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | S8         | `savedPlaylists` unit tests (migration, write-back, undo, 20-deck cap); E2E `curation.spec.ts` row 2                                                                   | `write-tests`, `e2e-scenario`                          |
| S10 | Desktop two-pane Music setup (§4.12).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | S8         | desktop component tests; E2E chromium `music-setup.spec.ts`                                                                                                            | `add-ui-component`                                     |
| S11 | Hints (§9) and the tutorial sequence rules (`04` §7.1 code impact).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | S3, S8     | coordinator tests with fake timers; E2E `hints.spec.ts` extension                                                                                                      | `add-hint`                                             |
| S12 | Clean-up and acceptance: delete every superseded component, CSS module and key; file-size and CSS limits; `noHardcodedColors` ratchet; accessibility sweep; §13 run; `perf-check`; `device-checklist` for the owner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | S1–S11     | `verify` green; `npm run e2e` green; §13 boxes ticked with proofs                                                                                                      | `verify`, `design-token-migration`, `device-checklist` |

S0 and S1 can run in parallel; S2 can start after S0; S7 after S3. Every package ends with
`verify` and `plan-status`; every package that changes a user-visible flow adds or updates its E2E
scenario in the same session. No package leaves two implementations of the same control alive at
its end (the old one is deleted in the package that replaces it).

## 16. Open questions for the owner (do not block S0–S2)

1. **Beat! window "No limit":** §4.7 drops the unlimited option from the control. Keep it as a
   fifth segment instead?
2. **Rename code:** kept behind the Edit icon (§4.5). Drop it entirely to simplify?
3. **Open rooms list:** keep it on Join (today's directory) or show only invite-based joining?
   This plan keeps it.
4. **Silent Spotify deck at Start:** warning (§4.10) rather than a block. Confirm.
