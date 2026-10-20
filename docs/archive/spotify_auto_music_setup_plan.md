> **Archived 2026-09-08.** Historical record: implemented (its own sections are marked *implemented*).
> Delivered playlist search, candidate generation from genre/year/artist filters, quick-pick presets
> and the candidate review panel.
> Superseded for further Spotify work by
> `../plans/2026-09-stability-performance/08-spotify-session-and-playback.md`. Do not follow this plan.

---

# Spotify Automatic Music Setup Plan

## Problem

TuneTrack currently requires the host to manually create or find a Spotify
playlist before the game. That keeps the experience highly customizable, but it
adds friction when players just want to start a good game quickly.

The app needs a richer music setup flow that keeps manual playlist import, then
adds guided automatic sources:

- search public Spotify playlists from free-text prompts;
- generate tracks from genre, year, artist, and album filters;
- offer quick presets for common party/game moods;
- review and edit generated tracks before starting.

The goal is not fully random music. The goal is fast, controlled playlist
creation with enough review power that the host still trusts the deck.

## Spotify API Constraints

This feature should be built around current Spotify Web API capabilities, not
around assumptions from Spotify's consumer app UI.

Reliable building blocks:

- `GET /search` can search tracks, artists, albums, and playlists.
- Search supports filters such as `artist`, `album`, `year`, and `genre` for
  supported result types.
- Existing playlist import via public playlist ID remains useful.
- Existing track mapping and playlist metadata curation can be reused.

Avoid depending on:

- `GET /recommendations`, because Spotify marks it deprecated.
- Featured playlists and browse categories as core dependencies, because those
  browse endpoints are also deprecated.
- Spotify Home personalization. Spotify does not expose a stable "home feed"
  API for this use case.

Product implication: build "Quick Picks" and "Find Playlists" from search
queries and presets, not from Spotify Home.

## Product Direction

Move Spotify setup out of the crowded lobby settings section into a full-screen
music setup modal.

The lobby should show a compact summary:

- connection state;
- account type;
- selected/generated source;
- imported track count;
- actions: `Open music setup`, `Edit tracks`, `Start game`.

The modal owns the full workflow:

1. Choose a music source.
2. Configure or search.
3. Generate/import candidate tracks.
4. Review, remove, and optionally edit metadata.
5. Confirm `Use these songs`.
6. Return to lobby with a clear ready state.

## Non-Goals For First Release

- No AI-generated search prompts.
- No cloud persistence or user accounts.
- No creating Spotify playlists in the user's Spotify account.
- No promise of exact Spotify Home trending content.
- No reliance on deprecated Spotify recommendations as the primary source.
- No collaborative multi-host editing.

## UX Model

### Modal Shell

Use a full-screen modal or route-level overlay that works well on mobile and
desktop.

Required regions:

- Header: title, close button, connection badge.
- Source tabs or segmented control:
  - `Playlist URL`
  - `Find Playlists`
  - `Build From Filters`
  - `Quick Picks`
- Main configuration area.
- Candidate/review panel.
- Sticky footer with:
  - generated/imported count;
  - validation message;
  - `Use these songs`;
  - secondary `Back` or `Cancel`.

The modal should feel like a setup tool, not a marketing page. It should favor
dense, readable controls, predictable navigation, and fast iteration.

### Source 1: Playlist URL

This is the current manual flow moved into the modal.

Capabilities:

- paste Spotify playlist URL or URI;
- import;
- show imported count, filtered count, playlist name;
- open review list;
- use existing saved playlist actions where practical.

### Source 2: Find Playlists

This is the highest-value automatic mode for MVP.

User flow:

1. Host enters a prompt such as `Best 90s rock`, `Female metal`, `AOR classics`,
   or `2000s party hits`.
2. Server searches Spotify playlists.
3. UI shows playlist cards with name, owner/display info when available, image,
   and track count when available.
4. Host selects one or more playlists.
5. Server imports tracks from selected playlists, merges them, dedupes them,
   shuffles them, and returns candidates.
6. Host reviews and confirms.

This mode should also power "trending-ish" discovery through predefined search
queries rather than a deprecated featured-playlists dependency.

### Source 3: Build From Filters

Power-user generation mode.

Controls:

- target track count: 20, 30, 50, 80, 100;
- genres: multi-select chips;
- years: one or more ranges;
- artists: searchable chip input;
- albums: searchable chip input;
- selection style:
  - `Balanced`
  - `Popular`
  - `Deep cuts`
- availability option:
  - `Prefer tracks with preview clips` for Free-account hosts.

Search behavior:

- Resolve selected artists/albums through Spotify search.
- Build multiple track-search queries instead of one huge query.
- Merge candidates into one pool.
- Dedupe by Spotify track URI, then by normalized title/artist fallback.
- Filter by release year ranges after mapping.
- Balance across selected artists/genres/ranges so one source does not dominate.

### Source 4: Quick Picks

Fast path for groups that do not want configuration.

Initial presets:

- `80s Hits`
- `90s Rock`
- `2000s Pop`
- `Metal Classics`
- `Party Mix`
- `Movie Night`
- `Hungarian Favorites` if locale-specific presets are desired later.

Each preset maps to one or more playlist-search or track-search templates.
Presets also carry tuning rules such as allowed year ranges and balanced
year selection, so "classic" presets do not accidentally produce mostly modern
remasters or same-year tracks.

The UI should show that Quick Picks are editable: after generating, the host can
remove tracks and still review the deck before starting.

## Backend Design

### New Services

Add a Spotify discovery layer separate from existing playlist import:

```txt
apps/server/src/spotify/
  SpotifyDiscoveryService.ts
  SpotifySearchQueryBuilder.ts
  SpotifyTrackCandidateMapper.ts
  SpotifyCandidateDeduper.ts
```

Responsibilities:

- `SpotifyDiscoveryService`
  - orchestrates playlist search, filter generation, preset generation;
  - calls `SpotifyApiClient`;
  - returns candidate tracks and source metadata.
- `SpotifySearchQueryBuilder`
  - creates valid Spotify search query strings for genres, years, artists,
    albums, and presets.
- `SpotifyTrackCandidateMapper`
  - maps Spotify tracks into existing `GameTrackCard` plus candidate metadata.
- `SpotifyCandidateDeduper`
  - dedupes by URI and normalized title/artist.

Keep `PlaylistImportService` focused on importing known playlist URLs/IDs.
Discovery can reuse its mapping and minimum-track validation logic where
appropriate, but should not make that class a catch-all.

### SpotifyApiClient Extensions

Add thin API-client methods:

```ts
searchPlaylists(query, options): Promise<SpotifyPlaylistSearchResult[]>
searchTracks(query, options): Promise<SpotifyApiTrack[]>
searchArtists(query, options): Promise<SpotifyArtistSearchResult[]>
searchAlbums(query, options): Promise<SpotifyAlbumSearchResult[]>
getAlbumTracks(albumId, accessToken): Promise<SpotifyApiTrack[]>
getArtistTopTracks(artistId, market, accessToken): Promise<SpotifyApiTrack[]>
getSeveralTracks(trackIds, accessToken): Promise<SpotifyApiTrack[]>
```

Use the existing client-credentials token flow for discovery and import.
The host's user OAuth token is not required for automatic playlist creation.

### Server Socket Events

Add client-to-server events:

```ts
SearchSpotifyPlaylists = "search_spotify_playlists";
GenerateSpotifyCandidates = "generate_spotify_candidates";
UseSpotifyCandidates = "use_spotify_candidates";
```

Payload sketches:

```ts
interface SearchSpotifyPlaylistsPayload {
  roomId: RoomId;
  query: string;
  limit: number;
}

interface GenerateSpotifyCandidatesPayload {
  roomId: RoomId;
  source:
    | { type: "playlists"; playlistIds: string[]; targetCount: number }
    | { type: "filters"; filters: SpotifyTrackFilters; targetCount: number }
    | { type: "preset"; presetId: string; targetCount: number };
}

interface SpotifyTrackFilters {
  genres: string[];
  yearRanges: Array<{ startYear: number; endYear: number }>;
  artists: Array<{ id?: string; name: string }>;
  albums: Array<{ id?: string; name: string }>;
  style: "balanced" | "popular" | "deep_cuts";
  preferPreviewClips: boolean;
}

interface UseSpotifyCandidatesPayload {
  roomId: RoomId;
  candidateSessionId: string;
  trackIds: string[];
}
```

Add server-to-client events:

```ts
SpotifyPlaylistSearchResult = "spotify_playlist_search_result";
SpotifyCandidatesGenerated = "spotify_candidates_generated";
SpotifyCandidatesApplied = "spotify_candidates_applied";
```

Candidate sessions should be stored server-side per room with a short TTL. The
client should send selected candidate IDs back, not the full track payload as
authority.

### Candidate Session Model

Store generated candidates separately from the active imported deck until the
host confirms.

```ts
interface SpotifyCandidateSession {
  id: string;
  roomId: RoomId;
  createdAtMs: number;
  source: "playlist_search" | "filters" | "preset";
  tracks: GameTrackCard[];
  sourceSummary: string;
}
```

When confirmed:

1. Validate host ownership.
2. Select requested tracks from the session.
3. Store as `importedDeck` through the existing room registry path.
4. Emit `playlist_tracks`.
5. Emit `state_update`.

## Frontend Design

### New/Changed Files

```txt
apps/web/src/pages/LobbyPage/
  components/
    SpotifySetupModal.tsx
    SpotifySetupLauncher.tsx
    SpotifySourceTabs.tsx
    SpotifyPlaylistUrlPanel.tsx
    SpotifyPlaylistSearchPanel.tsx
    SpotifyFilterBuilderPanel.tsx
    SpotifyQuickPicksPanel.tsx
    SpotifyCandidateReviewPanel.tsx
  hooks/
    useSpotifySetupModal.ts
    useSpotifyPlaylistSearch.ts
    useSpotifyCandidateGeneration.ts
```

Keep `LobbySpotifySection` as the compact launcher/summary or replace it with a
new `SpotifySetupLauncher`.

### UI States

Each source panel needs:

- idle;
- loading;
- success with candidates;
- empty result;
- recoverable error;
- stale candidate session.

The review panel needs:

- track count;
- source summary;
- duplicate/filtered count;
- missing preview count for Free hosts;
- remove-track affordance;
- edit-track affordance through existing metadata editor if possible;
- clear `Use these songs` action.

### Free vs Premium Copy Fix

Update existing copy that implies Free accounts can control an active Spotify
device. Full playback control requires Premium. The accurate copy should be:

- Premium: full-track playback in browser.
- Free: preview clips when Spotify provides them.

This copy fix should happen in Phase 1 so the setup flow does not overpromise.

## Generation Rules

### Minimum Quality Rules

- Dedupe every candidate pool.
- Reject pools below the configured minimum game track count.
- Prefer tracks with:
  - Spotify URI;
  - usable release year;
  - artwork;
  - preview URL when the host is Free.
- Track and report filtered counts.
- Avoid returning multiple versions of the same song when title and artist
  normalize to the same values.

### Year Handling

Spotify album release dates can be remasters or compilations. The initial
candidate year still comes from Spotify, but the review step must remain
available because release-year curation is already a known product need.

### Balancing

For multi-source generation:

- round-robin candidates from each selected playlist/artist/genre/range;
- cap a single artist unless the user explicitly selected only that artist;
- shuffle within groups after filtering;
- keep deterministic logs for debugging, but not deterministic user output
  unless a seed is later added.

## Phase Plan

### Phase 1 - Modal Shell And Copy Correction

Goal: move current Spotify setup into a better container without changing
backend behavior.

Tasks:

- Add full-screen Spotify setup modal.
- Move current playlist URL import UI into `Playlist URL` tab.
- Keep existing import, saved playlist, edit playlist, and connection behavior.
- Replace the lobby Spotify section with a compact launcher and summary.
- Correct Free vs Premium copy.
- Preserve mobile and desktop usability.

Acceptance criteria:

- Existing playlist URL import still works.
- Existing saved playlist actions still work or are intentionally relocated.
- Host can open/close modal without losing lobby state.
- Free/Premium messaging is accurate.
- Type checks and existing server/web tests pass.

### Phase 2 - Playlist Search Generation

Status: implemented.

Goal: let hosts find public Spotify playlists by search term and import from
selected playlists.

Tasks:

- Done: add Spotify playlist search API client method.
- Done: add server socket events for playlist search, generation, and apply.
- Done: build playlist search panel with query input and playlist result cards.
- Done: add multi-select playlist import/generate flow.
- Done: merge selected playlist tracks, dedupe, and return candidate session.
- Done: add candidate review panel.
- Done: confirm candidates into active imported deck.

Acceptance criteria:

- Searching `Best 90s rock` returns playlist options.
- Selecting multiple playlists generates one deduped candidate list.
- Host can remove tracks before applying.
- Applying candidates updates lobby imported track count and track list.
- Invalid/empty searches show useful errors.

### Phase 3 - Quick Picks

Status: implemented.

Goal: provide one-tap starting points.

Tasks:

- Define preset catalog in shared/server code.
- Map presets to playlist-search and/or track-search templates.
- Add Quick Picks panel.
- Add max song count input for Quick Pick generation.
- Add preset year filtering and year-balanced selection.
- Generate candidates through the same session/review/apply path as Phase 2.

Acceptance criteria:

- Presets generate usable candidate pools.
- Host can review and edit before applying.
- Preset source summary is shown in lobby/review.
- No duplicated generation logic outside the discovery service.
- Classic presets avoid out-of-range modern releases where Spotify metadata
  makes that possible.

### Phase 4 - Filter Builder MVP

Goal: generate candidates from genre, year, artist, and album inputs.

Tasks:

- Add track search API client method.
- Add artist and album search/resolve methods.
- Add filter query builder.
- Add genre chip input with curated genre suggestions.
- Add multi-range year selector.
- Add artist and album searchable chip controls.
- Implement candidate generation from filters.
- Add target count and style controls.

Acceptance criteria:

- Host can select genres and multiple year ranges.
- Host can add multiple artists and albums.
- Mixed filters generate a deduped candidate list.
- Results are filtered to selected year ranges after mapping.
- Candidate pools below minimum size fail clearly.

### Phase 5 - Quality And Balancing

Goal: make automatic decks feel intentional, not random.

Tasks:

- Add balancing across selected artists/playlists/genres.
- Add popularity/deep-cut ranking if Spotify search result data supports it.
- Add duplicate-version detection by normalized title and artist.
- Add Free-account preview preference and missing-preview warning.
- Add candidate diagnostics to audit logs.

Acceptance criteria:

- A mixed artist request does not return mostly one artist.
- Duplicates and remaster spam are reduced.
- Free hosts see how many generated tracks have preview clips.
- Logs can explain filtered count and generation source.

### Phase 6 - Polish And Manual E2E

Goal: make the setup experience smooth enough for real game night use.

Tasks:

- Tighten responsive layout for mobile landscape/portrait.
- Add loading skeletons and stable empty states.
- Add keyboard-friendly chip entry and removal.
- Add persisted last-used source/settings in local storage.
- Add manual E2E checklist and update docs.

Acceptance criteria:

- A host can go from empty lobby to playable generated deck in under one minute.
- The modal remains usable on mobile.
- The host can recover from failed searches without leaving the modal.
- Existing manual playlist workflow remains intact.

## Testing Plan

Automated:

- Unit-test `SpotifySearchQueryBuilder`.
- Unit-test candidate dedupe.
- Unit-test candidate balancing.
- Unit-test filter payload schemas.
- Unit-test server services with mocked Spotify API responses.
- Component-test modal source switching and review state where practical.

Manual:

- Manual playlist import still works.
- Search `Best 90s rock`, select 2 playlists, apply deck.
- Search with nonsense query returns empty state.
- Generate `rock + metal`, years `1980-1995`, target `50`.
- Generate from artists `Dream Theater`, `BABYMETAL`, `Bon Jovi`,
  `Scorpions`.
- Generate from mixed artists and albums.
- Use Quick Pick, remove several tracks, apply.
- Test as Premium host.
- Test as Free host and verify preview warning/copy.
- Start game after every source type and verify playback behavior.

## Rollout Order

Recommended order:

1. Phase 1: modal shell and accurate copy.
2. Phase 2: playlist search generation.
3. Phase 3: Quick Picks.
4. Phase 4: filter builder.
5. Phase 5: balancing and quality.
6. Phase 6: polish.

This order gives immediate product value after Phase 2 while keeping the riskier
filter-generation work isolated behind the same candidate review/apply pipeline.
