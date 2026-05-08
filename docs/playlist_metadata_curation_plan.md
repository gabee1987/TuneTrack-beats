# Playlist Metadata Curation And Saved Decks Plan

## Problem

Spotify playlist import gives TuneTrack a useful track list, but Spotify album
metadata is not a reliable gameplay answer. Remasters, deluxe editions,
compilations, live albums, and re-releases can make old songs reveal with a new
album year. That breaks the core game promise: players are guessing the
original song release year, not the release year of whichever Spotify album
contains the track.

## Product Direction

Treat Spotify as an import source, not as the final game truth.

The game should use a curated `releaseYear` as the authoritative gameplay
answer. Spotify-derived data should remain available as source/provenance, so
the host can see what changed and future persistence can preserve both the
original import data and the curated game data.

## Goals

- Let the host edit imported playlist track metadata before starting.
- Make release year curation the primary workflow.
- Keep server authority for room state and gameplay decks.
- Save curated playlists locally for MVP reuse without requiring login.
- Shape the saved-playlist model so account-backed storage can replace local
  storage later.
- Add an in-game host correction path after the playlist editor is stable.

## Non-Goals For MVP

- No user accounts or cloud sync.
- No external music metadata enrichment API.
- No automatic canonical release year lookup.
- No full playlist collaboration between several hosts.

## Data Model

### Game Deck Card

`releaseYear` remains the authoritative year used by game rules.

Add optional source and curation fields:

```ts
sourceReleaseYear?: number;
metadataStatus?: "imported" | "edited" | "verified";
```

For Spotify imports:

- `sourceReleaseYear` is the album year from Spotify.
- `releaseYear` initially equals `sourceReleaseYear`.
- editing the year changes `releaseYear`, not `sourceReleaseYear`.
- marking a track verified changes only `metadataStatus`.

This avoids touching `packages/game-engine` placement rules. The engine still
receives normal `GameTrackCard` objects with a trusted `releaseYear`.

### Public Playlist Track

Extend `PublicTrackInfo` with:

```ts
sourceReleaseYear?: number;
metadataStatus: "imported" | "edited" | "verified";
```

The lobby editor can show both years when they differ.

### Saved Playlist

MVP saved playlists live in browser local storage:

```ts
interface SavedPlaylist {
  id: string;
  name: string;
  source: "spotify";
  sourcePlaylistUrl?: string;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
  tracks: SavedPlaylistTrack[];
}
```

This belongs in a frontend service module, not room state. Later, the same shape
can be sent to an account-backed API.

## Phase 1: Shared And Server Editing Contract

Purpose: make metadata curation possible server-side before changing the UI.

Changes:

- Add playlist metadata status and source-year fields to shared public types.
- Add `update_playlist_track` client event.
- Add Zod schema:
  - `roomId`
  - `trackId`
  - optional `title`
  - optional `artist`
  - optional `albumTitle`
  - optional `releaseYear`
  - optional `metadataStatus`
- Add `RoomRegistry.updateImportedDeckTrack`.
- Add `RoomService.updatePlaylistTrack`.
- Add Socket.IO handler that validates payload, enforces host-only edit through
  room orchestration, emits `playlist_tracks`, and broadcasts `state_update` if
  aggregate room settings changed.
- Add server tests for:
  - host can edit release year/title/artist/album/status.
  - non-host cannot edit.
  - source year is preserved when release year changes.

Verification:

```bash
npm run test -w apps/server
npm run build -w apps/server
```

## Phase 2: Playlist Editor Metadata UI

Purpose: give the host a practical curation flow in the existing lobby playlist
editor.

Changes:

- Split `PlaylistEditModal` into smaller components:
  - modal shell
  - sort controls
  - virtualized track list
  - track row
  - editable track details sheet
- Tapping a row opens details when not in select mode.
- Keep swipe-to-remove available.
- Details sheet fields:
  - title
  - artist
  - album
  - release year used in game
  - source year from Spotify, read-only
  - metadata status segmented control: imported, verified
- Save emits `update_playlist_track`.
- Show edited/verified/check badges in the list.
- Add suspicious metadata flags as pure frontend helpers:
  - remaster/remastered
  - deluxe
  - anniversary
  - greatest hits
  - best of
  - collection
  - live

Verification:

```bash
npm run test -w apps/web
npm run build -w apps/web
```

## Phase 3: Saved Playlist Library MVP

Purpose: avoid re-curating the same playlist every game without introducing
login.

Changes:

- Add `services/savedPlaylists` with versioned local-storage persistence.
- Add shared-ish frontend model names that can map cleanly to future account
  storage.
- Add lobby controls:
  - save current edited deck
  - open saved playlists
  - load saved playlist into current room
  - delete saved playlist
- Add server event for loading a client-provided curated deck into a room:
  - validate all card fields server-side through shared schema.
  - host-only.
  - minimum deck size applies.

Important boundary:

The browser may persist saved playlists, but the server still validates and
owns the room deck once loaded.

Verification:

```bash
npm run test -w apps/web
npm run test -w apps/server
npm run build -w apps/web
npm run build -w apps/server
```

## Phase 4: In-Game Host Correction

Purpose: provide a graceful escape hatch for bad metadata discovered during
play.

Preferred behavior:

- Host opens revealed card details.
- Host chooses `Correct year`.
- Server updates the current reveal card year and recalculates placement outcome
  if still in reveal/challenge resolution.
- The timeline and reveal UI show the corrected year, not the old Spotify year.

This phase touches game state and reveal correctness, so it should be done after
playlist curation is stable.

Verification:

- Add game-engine tests for correcting a placed card before reveal confirmation.
- Add server orchestration tests for host-only correction.
- Add frontend tests for the correction action visibility.

## Architecture Notes

- Keep gameplay rules in `packages/game-engine`.
- Keep imported deck mutation in `rooms/`, not Socket.IO handlers.
- Keep socket schemas in `packages/shared`.
- Keep local saved playlists in a frontend service until accounts exist.
- Do not grow `PlaylistEditModal` into a large mixed-responsibility file.
- Do not store saved playlists in room settings; settings should only summarize
  the active room state.
