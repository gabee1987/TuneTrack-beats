> **Archived 2026-09-08.** Historical record: implemented (its own sections are marked *implemented*),
> with one partial - playlist-result inspection is noted in the plan as implemented for playlist and
> track search and track append only.
> Superseded for further Spotify work by
> `../plans/2026-09-stability-performance/08-spotify-session-and-playback.md`. Do not follow this plan.

---

# Spotify Smart Playlist Builder Plan

## Problem

The current Spotify setup flow has grown from a simple playlist URL importer
into multiple music sources, but the `Playlist URL` tab still behaves like the
old manual importer. It does not support the most common real setup workflow:
building a deck incrementally from specific songs, playlists, albums, artists,
and targeted searches.

Hosts need a single, low-clutter place where they can:

- paste a Spotify playlist URL;
- search playlists by name or owner;
- search songs directly;
- search albums and artists;
- inspect a found playlist and pick individual songs from it;
- add results to the current queued playlist;
- replace the current queued playlist when they intentionally want a fresh deck.

The product goal is not a Spotify clone. The goal is a fast, game-focused deck
builder where every search result clearly answers: "Can I add this to my game?"

## UX Direction

Rename the current `Playlist URL` source into a broader builder source, likely:

- `Build playlist`
- `Music search`
- `Playlist builder`

Keep the current queue/editor in a dedicated `Playlist` tab and put discovery in
a dedicated `Search` tab. The search tab should use one smart search entry for
playlist URLs, playlist search, song search, album search, and artist search.

Keep the existing `Quick Picks` tab as a fast preset source, but when a Quick
Pick is applied and a current playlist already exists, show a confirmation:

- `Add to current playlist`
- `Replace current playlist`

The current queued playlist must become the main persistent object in the modal.
Every source either adds to it or replaces it.

## Modal Cleanup

Remove from the builder tab:

- connected chip;
- premium/free chip;
- playback helper text such as "Plays right here in your browser..."

Reason: connection/account state already appears in the lobby Spotify summary.
The builder tab should focus on the current queue and search.

Keep:

- queued track count chip;
- edit playlist action;
- save playlist action;
- clear indication of the current queue state.

## Target Builder Layout

Mobile-first layout:

1. Top source tabs remain in the modal header.
2. Builder tab body starts with a compact queue summary:
   - `250 tracks queued`
   - `Edit`
   - `Save`
   - optionally `Clear`
3. Search bar:
   - one input;
   - one submit button;
   - placeholder examples: `Song title + year`, `artist 1998`, `playlist URL`,
     `album name`, `owner:name`.
4. Lightweight result filters/chips after results are available:
   - `All`
   - `Songs`
   - `Playlists`
   - `Albums`
   - `Artists`
5. Results list uses the existing playlist editor row style:
   - compact artwork;
   - primary title;
   - secondary metadata;
   - cover-art/check selection behavior where selection is needed;
   - clear `Add` / `Open` action only where the row meaning is ambiguous.
6. Bottom floating action appears only when there is a pending selection:
   - `Add 12 songs`
   - `Replace with this playlist`
   - `Add playlist tracks`

Desktop can use a two-column layout later:

- left: search and results;
- right: current queue preview.

Mobile should remain the primary implementation target.

## Core User Flows

### Flow 1 - Paste Playlist URL

1. Host pastes a Spotify playlist URL into the smart search box.
2. Server detects the playlist ID.
3. UI shows a playlist result row, not an immediate destructive import.
4. Host can:
   - `Open` playlist and select individual songs;
   - `Add all` to current queue;
   - `Replace queue`.

This preserves URL import but removes the old assumption that importing a URL
always replaces the current deck.

### Flow 2 - Search Playlist By Name Or Owner

1. Host types `kawaii overdrive`, `metallica playlist`, or `owner:Spotify rock`.
2. Server searches playlists.
3. Playlist rows show:
   - cover;
   - name;
   - owner;
   - track count.
4. Opening a playlist shows its tracks in the same shared track-list UI.
5. Host can select individual tracks or add all usable tracks.

### Flow 3 - Search Song Directly

1. Host types `Toxic 2003`, `Ado Show 2022`, or `Bohemian Rhapsody`.
2. Server performs smart track search.
3. Song rows show:
   - cover;
   - title;
   - artist;
   - release year;
   - album.
4. Tapping the row opens metadata editor.
5. Tapping/selecting artwork marks the song for adding.
6. `Add selected songs` appends to the current queue.

If no current queue exists, adding songs creates one.

### Flow 4 - Search Artist And Year

1. Host types `Dream Theater 1992` or `BABYMETAL 2023`.
2. Server detects likely artist + year intent.
3. Server searches tracks with an artist/year query and filters mapped results
   by release year.
4. UI returns matching songs ready to add.

This is the first "smart search" behavior and should be implemented with simple
deterministic parsing, not AI.

### Flow 5 - Search Album

1. Host types an album name.
2. Server returns albums and/or tracks depending on confidence.
3. Opening an album fetches album tracks.
4. Host can add selected tracks or all tracks.

### Flow 6 - Search Artist

1. Host types an artist name.
2. Server returns artist results and likely tracks.
3. Opening an artist can show:
   - top tracks;
   - optionally albums later.
4. Host can add selected tracks.

### Flow 7 - Quick Pick With Existing Queue

1. Host generates a Quick Pick.
2. Host reviews/edit tracks as today.
3. When pressing `Use these songs`, if current queue is not empty:
   - show confirmation modal;
   - `Add to current playlist`;
   - `Replace current playlist`.
4. If queue is empty, apply directly.

## Backend Design

### New Service Responsibilities

Add a dedicated builder/search layer instead of overloading
`SpotifyDiscoveryService` further.

```txt
apps/server/src/spotify/
  SpotifyMusicSearchService.ts
  SpotifySmartSearchParser.ts
  SpotifySearchResultMapper.ts
  SpotifyQueueMergeService.ts
```

Responsibilities:

- `SpotifyMusicSearchService`
  - orchestrates smart search;
  - calls `SpotifyApiClient`;
  - returns grouped search results;
  - opens playlist/album/artist detail views.
- `SpotifySmartSearchParser`
  - detects Spotify URLs/URIs;
  - extracts likely year filters;
  - detects simple owner filters like `owner:spotify`;
  - builds Spotify-compatible query objects.
- `SpotifySearchResultMapper`
  - maps Spotify API playlist/track/album/artist objects into shared result
    DTOs.
- `SpotifyQueueMergeService`
  - appends/replaces current room queue through existing room registry paths;
  - dedupes by Spotify URI and normalized title/artist;
  - enforces minimum/maximum queue size.

Keep `PlaylistImportService` focused on legacy direct playlist import until it
can be retired or wrapped by the builder flow.

### SpotifyApiClient Extensions

Add thin methods:

```ts
searchTracks(query, accessToken, limit, offset): Promise<SpotifyApiTrack[]>
searchAlbums(query, accessToken, limit, offset): Promise<SpotifyApiAlbum[]>
searchArtists(query, accessToken, limit, offset): Promise<SpotifyApiArtist[]>
getAlbumTracks(albumId, accessToken): Promise<SpotifyApiTrack[]>
getArtistTopTracks(artistId, market, accessToken): Promise<SpotifyApiTrack[]>
getPlaylistSummary(playlistId, accessToken): Promise<SpotifyPlaylistSummary>
```

Existing methods can remain:

- `searchPlaylists`;
- `getAllPlaylistTracks`;
- `getPlaylistSearchItem`.

### Smart Search Parsing

Start deterministic and transparent.

Input examples:

- `https://open.spotify.com/playlist/...`
  - intent: `playlist_url`
- `spotify:playlist:...`
  - intent: `playlist_url`
- `toxic 2003`
  - intent: `track_search`
  - year: `2003`
- `dream theater 1992`
  - intent: `mixed_search`
  - year: `1992`
  - query without year: `dream theater`
- `owner:spotify rock`
  - intent: `playlist_search`
  - owner hint: `spotify`
  - query: `rock`
- `"exact song title" 1999`
  - intent: `track_search`
  - exact phrase hint

Parser output:

```ts
interface SpotifySmartSearchIntent {
  rawQuery: string;
  normalizedQuery: string;
  kind: "playlist_url" | "mixed_search";
  playlistId?: string;
  year?: number;
  ownerHint?: string;
  queryWithoutQualifiers: string;
}
```

For MVP, use `mixed_search` for non-URL queries and search multiple Spotify
types in parallel. Ranking and grouping can improve over time.

### Search Result Contract

Add shared types:

```ts
type SpotifySmartSearchResultType = "track" | "playlist" | "album" | "artist";

interface SpotifySmartSearchResult {
  id: string;
  type: SpotifySmartSearchResultType;
  title: string;
  subtitle: string;
  imageUrl?: string;
  trackCount?: number;
  releaseYear?: number;
  spotifyUri?: string;
  ownerName?: string;
}

interface SpotifySmartSearchPayload {
  roomId: RoomId;
  query: string;
  limit: number;
}

type SpotifySmartSearchResultPayload =
  | {
      success: true;
      query: string;
      parsed: SpotifySmartSearchIntent;
      results: SpotifySmartSearchResult[];
    }
  | {
      success: false;
      code: "invalid_query" | "spotify_api_error";
      message: string;
    };
```

Use grouped display on the client, but a flat result array is easier to extend.

### Detail Result Contracts

Opening a playlist, album, or artist should fetch tracks without applying them.

```ts
interface OpenSpotifySourcePayload {
  roomId: RoomId;
  source:
    | { type: "playlist"; playlistId: string }
    | { type: "album"; albumId: string }
    | { type: "artist"; artistId: string };
}

type SpotifySourceTracksPayload =
  | {
      success: true;
      sourceTitle: string;
      tracks: PublicTrackInfo[];
    }
  | {
      success: false;
      code: "source_not_found" | "spotify_api_error";
      message: string;
    };
```

### Queue Mutation Contracts

The active queued playlist remains server-owned room state. The client can send
edited track payloads because the existing generated candidate apply flow already
does this for reviewed metadata.

```ts
interface AddSpotifyTracksToQueuePayload {
  roomId: RoomId;
  tracks: CuratedPlaylistTrackPayload[];
  mode: "append" | "replace";
}
```

Server behavior:

- validate host membership;
- validate track payload schema;
- dedupe when appending;
- store via the existing imported deck path;
- emit `playlist_tracks`;
- emit `state_update`;
- emit an operation result toast payload.

## Frontend Design

### Proposed Components

```txt
apps/web/src/pages/LobbyPage/components/
  SpotifyBuilderPanel.tsx
  SpotifyBuilderSearchBar.tsx
  SpotifyBuilderQueueSummary.tsx
  SpotifyBuilderResultList.tsx
  SpotifyBuilderSourceTracksView.tsx
  SpotifyQueueApplyDialog.tsx
```

Use existing shared pieces:

- `PlaylistTrackList`;
- `PlaylistTrackDetailsSheet`;
- `SelectableArtwork`;
- `ActionButton`;
- `TextInput`;
- existing toast stack.

### Proposed Hook Split

The current `useLobbySpotify` is doing auth, import, saved playlists, search,
candidate generation, and playlist mutation. This feature will make it too large.

Extract:

```txt
apps/web/src/pages/LobbyPage/hooks/
  useLobbySpotifyAuth.ts
  useLobbySpotifyQueue.ts
  useSpotifySmartSearch.ts
  useSpotifyCandidateGeneration.ts
```

Initial implementation can keep existing public API stable and move internals
gradually.

### Builder State Model

```ts
type BuilderView = "search" | "source_tracks" | "track_details" | "apply_confirm";

interface BuilderSelectionState {
  selectedResultIds: Set<string>;
  selectedTrackIds: Set<string>;
  openedSource: SpotifySmartSearchResult | null;
  sourceTracks: PublicTrackInfo[];
}
```

Keep pending search selections separate from the actual queued playlist.

## UI Details

### Current Queue Summary

Visible at the top of the builder tab:

- count chip;
- `Edit playlist`;
- `Save playlist`;
- optional `Clear` later.

No account badges here.

### Smart Search Result Rows

Track result:

- artwork;
- title;
- artist + year;
- select/add affordance.

Playlist result:

- artwork;
- name;
- owner + track count;
- `Open` affordance.

Album result:

- artwork;
- album title;
- artist + year;
- `Open` affordance.

Artist result:

- image;
- artist name;
- `Open` affordance.

### Playlist/Album/Artist Detail View

When opening a source:

- header with back button and source title;
- compact count;
- shared `PlaylistTrackList`;
- selection via artwork/check;
- row tap opens metadata editor;
- floating action: `Add selected`;
- secondary action: `Add all`.

For playlist details, include:

- `Add all to current`;
- `Replace current`;
- select individual tracks.

## Quick Picks Apply Confirmation

Current Quick Pick flow generates candidates and applies them through
`UseSpotifyCandidates`.

Change:

- if current queue is empty, `Use these songs` can apply directly;
- if current queue has tracks, show `SpotifyQueueApplyDialog`;
- dialog actions:
  - `Add to current playlist`;
  - `Replace current playlist`;
  - `Cancel`.

Backend needs either:

- extend `UseSpotifyCandidatesPayload` with `mode: "append" | "replace"`; or
- apply candidates into a client-reviewed track list and use the new generic
  queue mutation endpoint.

Preferred: extend `UseSpotifyCandidatesPayload` with `mode`. This preserves
server-side candidate session authority.

```ts
interface UseSpotifyCandidatesPayload {
  roomId: RoomId;
  candidateSessionId: string;
  trackIds: string[];
  tracks?: PublicTrackInfo[];
  mode: "append" | "replace";
}
```

Default mode for backwards compatibility: `replace`.

## Backend Phases

### Phase 1 - Builder Tab Cleanup

Status: implemented.

Goal: reduce clutter and make current queue visible.

Tasks:

- Rename `Playlist URL` tab to a builder name.
- Remove connected/premium chips from the builder tab.
- Remove playback helper copy from the builder tab.
- Keep queued count, edit, save, and existing URL import.
- Keep current behavior otherwise.

Acceptance criteria:

- Existing playlist URL import still works.
- Current queue count is obvious.
- No duplicated account status inside the modal tab.

### Phase 2 - Generic Queue Mutation

Status: implemented.

Goal: support append vs replace before adding new search types.

Tasks:

- Add server queue mutation method with `append` / `replace`.
- Reuse existing curated track validation.
- Dedupe on append.
- Emit playlist tracks and room state updates.
- Add frontend queue action helper.

Acceptance criteria:

- Adding tracks to an existing queue preserves existing tracks.
- Replacing queue behaves like current import/apply behavior.
- Duplicate songs are not added twice when appending.

### Phase 3 - Smart Search MVP

Status: implemented for playlist/track search and track append. Playlist result
opening continues in Phase 4.

Goal: one input can search URL, playlists, and tracks.

Tasks:

- Add shared smart search payload/result schemas.
- Add `SpotifySmartSearchParser`.
- Add Spotify API client `searchTracks`.
- Add `SpotifyMusicSearchService`.
- Search playlists and tracks in parallel for non-URL queries.
- Support year parsing for track results.
- Build builder-tab search UI.

Acceptance criteria:

- Playlist URL returns a playlist result row.
- `Kawaii Overdrive` can find playlists.
- `Toxic 2003` returns song candidates from that year when Spotify metadata
  supports it.
- Track results can be added to an empty queue and create it.
- Track results can be appended to an existing queue.

### Phase 4 - Open Playlist And Pick Songs

Status: implemented.

Goal: playlist search supports individual song selection.

Tasks:

- Add source-open socket event for playlist details.
- Fetch and map playlist tracks without applying them.
- Build source detail view using `PlaylistTrackList`.
- Add `Add selected`, `Add all`, and `Replace current`.

Acceptance criteria:

- Host can open a searched playlist.
- Host can add one song from it to current queue.
- Host can add all playlist songs to current queue.
- Host can replace current queue with playlist songs.

### Phase 5 - Album And Artist Search

Status: implemented.

Goal: expand smart search beyond tracks/playlists.

Tasks:

- Add API client `searchAlbums`, `searchArtists`, `getAlbumTracks`,
  `getArtistTopTracks`.
- Add result mappers for album/artist.
- Add album detail track view.
- Add artist top-tracks view.

Acceptance criteria:

- Searching an album returns openable albums.
- Opening an album lets the host add individual tracks.
- Searching an artist returns artist results and useful track results.
- Opening an artist lets the host add top tracks.

### Phase 6 - Quick Pick Append/Replace

Status: implemented.

Goal: Quick Picks cooperate with the current queue.

Tasks:

- Add apply mode to candidate apply flow.
- Show confirmation dialog when queue is non-empty.
- Append generated candidates with dedupe.
- Replace generated candidates as today.

Acceptance criteria:

- Quick Pick can append to an existing queue.
- Quick Pick can replace an existing queue.
- Host cannot accidentally overwrite a manually built queue.

### Phase 7 - Search Quality Tuning

Goal: make smart search feel intentional.

Tasks:

- Improve parser for quoted phrases and `artist:`, `album:`, `year:` hints.
- Rank exact title/artist/year matches above fuzzy results.
- Penalize karaoke, tribute, slowed, sped-up, and instrumental variants where
  metadata reveals them.
- Add diagnostics to server logs for parsed intent and result counts.

Acceptance criteria:

- Specific song + year searches place likely exact matches at the top.
- Artist + year searches return a useful set of tracks from that year.
- Debug logs explain what the parser detected.

## Testing Plan

Automated:

- Unit-test `SpotifySmartSearchParser`.
- Unit-test queue append/replace dedupe.
- Unit-test smart search schemas.
- Unit-test source track mapping with mocked Spotify API responses.
- Component-test builder result selection and detail navigation where practical.

Manual:

- Paste playlist URL, open playlist, add one song.
- Paste playlist URL, replace current queue.
- Search `Kawaii Overdrive`, open playlist, add selected songs.
- Search `Toxic 2003`, add the intended song.
- Search `Dream Theater 1992`, add multiple tracks.
- Search album name, open album, add selected songs.
- Search artist name, open artist, add top tracks.
- Generate Quick Pick with empty queue.
- Generate Quick Pick with non-empty queue and test append.
- Generate Quick Pick with non-empty queue and test replace.
- Edit metadata after adding songs from search.
- Save built playlist and reload it.

## Open Product Decisions

- Exact tab name: `Build playlist`, `Music search`, or `Playlist builder`.
- Whether `Find Playlists` tab should be removed immediately or kept until the
  builder fully replaces it.
- Whether smart search should default to `All` results or preserve the last
  selected result filter.
- Whether appending should show a toast with duplicate count.
- Whether queue clear should be included in the first cleanup phase.

## Recommended Rollout

1. Clean up current builder tab UI.
2. Add append/replace queue mutation.
3. Add smart search for URL, playlists, and tracks.
4. Add playlist detail selection.
5. Add album and artist detail flows.
6. Add Quick Pick append/replace confirmation.
7. Tune ranking and parser hints.

This order avoids building a broad search UI before the queue can safely support
append vs replace, and it lets us preserve the existing manual import behavior
throughout the migration.
