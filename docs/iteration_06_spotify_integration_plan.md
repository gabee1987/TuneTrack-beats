# TuneTrack — Iteration 06 Spotify Integration Plan

> This plan covers the full Spotify music integration for TuneTrack: playlist
> import, host authentication, and automatic host-side playback during gameplay.
>
> It must align with:
> - `docs/tunetrack_full_architecture.md`
> - `docs/backend_engineering_rules.md`
> - `docs/frontend_engineering_rules.md`
> - `docs/tunetrack_technical_implementation_plan.md`

---

## 1. Iteration Goal

Replace the mocked JSON test-deck system with real Spotify data. The host can
import any public Spotify playlist in the lobby, connect their Spotify account,
and have each song play automatically on their device when a card is drawn.

Two Spotify playback modes are supported from day one:

- **Connect mode** (Free and Premium): controls the Spotify app on the host's
  phone via the Spotify Web API. The host's active Spotify device plays the
  full track.
- **SDK mode** (Premium only): the browser tab itself becomes a Spotify
  playback device via the Web Playback SDK. The full track plays in-browser.

Mode is detected automatically from the host's account type after login.

---

## 2. What This Iteration Is Not

- Not a per-client playback system. Only the host device plays music.
- Not a YouTube integration. That is a future provider.
- Not a manual play/pause UI. Playback is automatic and host-controlled by
  game state transitions.
- Not full song info UI. A minimal status indicator is shown in MVP. The
  now-playing sheet and richer controls are designed as extensibility targets
  and scaffolded now, but not fully implemented.

---

## 3. Two Distinct Spotify Auth Flows

Understanding this separation is critical before any code is written.

### 3.1 Client Credentials Flow (server-only, automatic)

Used for: **playlist import only**.

- Never involves the host's Spotify account.
- Server uses `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` to obtain a
  machine-to-machine access token.
- Token is cached server-side and refreshed automatically.
- No user interaction required.
- Supports public Spotify playlists.

### 3.2 Authorization Code Flow (user OAuth, host only)

Used for: **playback control only**.

- The host logs into their own Spotify account.
- Server handles the full code exchange using the Client Secret.
- Client Secret never leaves the server.
- The resulting access token and refresh token are stored server-side,
  keyed by room ID.
- A short-lived access token is forwarded to the host's browser after login
  for use with the Web Playback SDK.
- Refresh tokens are stored server-side only and used transparently.

---

## 4. Security Model

### 4.1 Server credentials

```
# apps/server/.env  — gitignored, never committed
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/spotify/callback
```

`SPOTIFY_CLIENT_SECRET` is used only in server-to-Spotify API calls. It is
never included in any server-to-client socket or HTTP response.

`SPOTIFY_CLIENT_ID` appears only inside the OAuth redirect URL that the server
constructs. The client never reads it directly.

### 4.2 Token handling

| Token | Stored where | Sent to client? | Why |
|---|---|---|---|
| Client Credentials token | Server memory | Never | Used only for playlist import |
| Host access token | Server memory + sent to host | Yes (host only) | Required for SDK init and Connect API |
| Host refresh token | Server memory | Never | Used only for server-side refresh |

### 4.3 Env validation

`apps/server/src/app/env.ts` is extended with the three Spotify variables using
the existing zod pattern. Server startup fails fast if any are missing or
malformed.

---

## 5. Playback Architecture — Design For Extensibility

The playback layer is designed so that adding richer UI later (play/pause
controls, a slide-in now-playing sheet with album art) requires only new
UI components and wiring. No service or hook refactor will be needed.

### 5.1 Provider interface

```
ISpotifyPlaybackProvider
  play(trackUri: string): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
  getState(): PlaybackState
  onStateChange(listener: (state: PlaybackState) => void): () => void
  dispose(): void
```

Two implementations:

- `SpotifyConnectProvider` — uses `PUT /v1/me/player/play` on the user's
  active device. Works for Free and Premium.
- `SpotifyWebPlaybackProvider` — loads the Spotify Web Playback SDK, creates
  an in-browser device, plays tracks locally. Premium only.

Both implement `ISpotifyPlaybackProvider`. Consumer code never knows which
is active.

### 5.2 PlaybackState — rich from day one

```typescript
interface PlaybackState {
  phase: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
  trackUri: string | null;
  positionMs: number;
  durationMs: number;
  volume: number;
  error: PlaybackErrorCode | null;
}

type PlaybackErrorCode =
  | 'no_active_device'
  | 'premium_required'
  | 'token_expired'
  | 'track_unavailable'
  | 'sdk_init_failed'
  | 'unknown';
```

This state is computed and available even in MVP. The MVP simply does not
render all of it yet. Future play/pause controls and the progress bar read
from this state without any changes to the service.

### 5.3 Service facade

`SpotifyPlaybackService` wraps the active provider and exposes:

```
play(trackUri: string): Promise<void>
pause(): Promise<void>
resume(): Promise<void>
stop(): Promise<void>
readonly state: PlaybackState
onStateChange(listener): () => void
```

It also owns token refresh: when a `401` comes back from any Spotify API call
it calls the server refresh endpoint, updates the token, and retries once.

### 5.4 Host playback hook

`useHostPlaybackController` is the only hook that touches playback logic.
It watches `roomState.currentTrackCard` and the game phase.

It returns a `HostPlaybackViewModel`:

```typescript
interface HostPlaybackViewModel {
  playbackState: PlaybackState;
  currentTrack: TrackCardPublic | null;
  accountType: 'free' | 'premium' | null;
  isSpotifyConnected: boolean;
  onPlayPause: () => void;   // available for future controls
  onStop: () => void;        // available for future controls
  onVolumeChange: (v: number) => void; // available for future controls
}
```

In MVP the only field the game UI uses is `playbackState.phase` for the
status indicator. All other fields are ready for richer UI without any
hook changes.

### 5.5 UI component slots

Two components are scaffolded in MVP with minimal implementation:

**`HostPlaybackControls`** — visible to host in the game action area.
In MVP: shows a small status chip only (`Playing`, `Paused`, `No device`).
Future: add play/pause button and volume slider by just rendering more from
`HostPlaybackViewModel`.

**`NowPlayingSheet`** — a slide-in bottom sheet containing full track info.
In MVP: not shown. The component file exists and the sheet frame is built.
Future: trigger it from a tap on the status chip. Album art, title, artist,
album name, progress bar, and play/pause all live here.

Both components receive `HostPlaybackViewModel` as props. They are pure
presentational components. No service imports.

---

## 6. New Data Contracts

### 6.1 GameTrackCard extension (packages/game-engine)

```typescript
// packages/game-engine/src/domain/GameTrackCard.ts
export interface GameTrackCard {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;   // 30-second mp3 fallback
  spotifyTrackUri?: string; // e.g. "spotify:track:4uLU6hMCjMI75M1A2tKUQC"
}
```

### 6.2 TrackCardPublic extension (packages/shared)

```typescript
// packages/shared/src/game/track.ts
export interface TrackCardPublic {
  id: TrackId;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear?: number;     // hidden until reveal
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;      // 30-sec fallback; not a secret
  spotifyTrackUri?: string; // needed by host client for SDK/Connect playback
}
```

`spotifyTrackUri` is included in the public state because the host's browser
needs it to call the Spotify API. It does not expose any hidden game info.
`releaseYear` remains hidden until reveal as before.

### 6.3 PublicRoomSettings extension (packages/shared)

```typescript
// packages/shared/src/game/roomSettings.ts
export interface PublicRoomSettings {
  // ... existing fields ...
  playlistImported: boolean;
  importedTrackCount: number;
  spotifyAuthStatus: 'none' | 'connected';  // host auth state visible to all
}
```

The actual track data and tokens are never in the public room state.

### 6.4 Spotify Auth Result (packages/shared)

```typescript
// packages/shared/src/spotify/spotifyAuth.ts  (new file)
export type SpotifyAccountType = 'free' | 'premium';

export interface SpotifyAuthSuccessPayload {
  accessToken: string;
  accountType: SpotifyAccountType;
  expiresInSeconds: number;
}

export interface SpotifyAuthErrorPayload {
  code: 'auth_denied' | 'exchange_failed' | 'unknown';
  message: string;
}
```

### 6.5 Playlist Import Result (packages/shared)

```typescript
// packages/shared/src/spotify/playlistImport.ts  (new file)
export interface ImportPlaylistSuccessPayload {
  importedCount: number;
  filteredCount: number;   // tracks without spotifyTrackUri
  totalFetched: number;
}

export interface ImportPlaylistErrorPayload {
  code:
    | 'invalid_url'
    | 'playlist_not_found'
    | 'playlist_private'
    | 'too_few_tracks'
    | 'spotify_api_error';
  message: string;
}
```

---

## 7. New Socket Events

### 7.1 Client → Server

```typescript
// packages/shared/src/events/clientEvents.ts additions

ImportPlaylist = 'import_playlist'
// payload: { roomId: RoomId; playlistUrl: string }

RequestSpotifyAuthUrl = 'request_spotify_auth_url'
// payload: { roomId: RoomId }

RefreshSpotifyToken = 'refresh_spotify_token'
// payload: { roomId: RoomId }
```

### 7.2 Server → Client

```typescript
// packages/shared/src/events/serverEvents.ts additions

SpotifyAuthUrl = 'spotify_auth_url'
// payload: { authUrl: string }  — sent to host only

SpotifyAuthResult = 'spotify_auth_result'
// payload: SpotifyAuthSuccessPayload | SpotifyAuthErrorPayload

SpotifyTokenRefreshed = 'spotify_token_refreshed'
// payload: { accessToken: string; expiresInSeconds: number }

PlaylistImportResult = 'playlist_import_result'
// payload: ImportPlaylistSuccessPayload | ImportPlaylistErrorPayload
```

### 7.3 HTTP endpoints (not socket)

```
GET /api/spotify/callback?code=...&state=...
```

This is the OAuth callback from Spotify. The server handles it, stores the
tokens, emits `spotify_auth_result` on the host's socket, and serves a
minimal HTML page that closes the popup window.

---

## 8. Target File Structure

### 8.1 Server new files

```
apps/server/src/
  spotify/
    SpotifyAuthService.ts         — OAuth code exchange and token refresh
    SpotifyApiClient.ts           — Spotify Web API wrapper (both token types)
    SpotifyTrackMapper.ts         — pure: SpotifyTrack → GameTrackCard
    SpotifyTokenStore.ts          — in-memory: roomId → token record
    spotifyUrlParser.ts           — pure: extracts playlist ID from URL
  decks/
    PlaylistImportService.ts      — orchestrates import using Spotify client
    DeckService.ts                — existing, extended to accept imported deck
  http/
    healthRoutes.ts               — existing
    spotifyRoutes.ts              — new: GET /api/spotify/callback
```

### 8.2 Server modified files

```
apps/server/src/
  app/
    env.ts                        — add SPOTIFY_CLIENT_ID, SECRET, REDIRECT_URI
    createHttpServer.ts           — register spotifyRoutes
  realtime/
    registerSocketHandlers.ts     — handle import_playlist, request_spotify_auth_url,
                                    refresh_spotify_token
  rooms/
    RoomRegistry.ts               — add importedDeck and spotifyTokenRecord per room
    RoomService.ts                — extend startGame to use importedDeck if present
```

### 8.3 Frontend new files

```
apps/web/src/
  services/
    spotify/
      SpotifyPlaybackService.ts          — facade, owns provider lifecycle
      providers/
        ISpotifyPlaybackProvider.ts      — interface + PlaybackState type
        SpotifyConnectProvider.ts        — Free/any: REST API player control
        SpotifyWebPlaybackProvider.ts    — Premium: Web Playback SDK wrapper
      spotifyTokenManager.ts             — client-side token + refresh handling

  pages/
    LobbyPage/
      components/
        LobbySpotifySection.tsx          — Connect button + playlist import UI
        LobbyPlaylistTrackList.tsx       — compact scrollable track list
      hooks/
        useLobbySpotifyAuth.ts           — popup flow, listens for auth result
        useLobbyPlaylistImport.ts        — emit import, listen for result

    GamePage/
      hooks/
        useHostPlaybackController.ts     — auto-play logic, returns HostPlaybackViewModel
      components/
        HostPlaybackControls.tsx         — MVP: status chip. Future: play/pause
        NowPlayingSheet.tsx              — scaffolded, minimal now. Future: full info modal
```

### 8.4 Shared new files

```
packages/shared/src/
  spotify/
    spotifyAuth.ts                — SpotifyAuthSuccessPayload, SpotifyAuthErrorPayload
    playlistImport.ts             — ImportPlaylistSuccessPayload, ImportPlaylistErrorPayload
```

### 8.5 Package files modified

```
packages/game-engine/src/domain/GameTrackCard.ts  — add previewUrl, spotifyTrackUri
packages/shared/src/game/track.ts                  — add previewUrl, spotifyTrackUri
packages/shared/src/game/roomSettings.ts           — add playlist + auth status fields
packages/shared/src/events/clientEvents.ts         — add new events
packages/shared/src/events/serverEvents.ts         — add new events
packages/shared/src/events/schemas.ts              — add zod schemas for new events
packages/shared/src/index.ts                       — export new types
```

---

## 9. Detailed Phase Breakdown

---

## 9.1 Phase A — Server Credentials And Env Extension

### Objective

Add Spotify credentials to the server environment and validate them at startup.

### Files changed

**`apps/server/src/app/env.ts`**

Add three variables to the zod schema:

```typescript
SPOTIFY_CLIENT_ID: z.string().min(1),
SPOTIFY_CLIENT_SECRET: z.string().min(1),
SPOTIFY_REDIRECT_URI: z.string().url(),
```

Server will fail to start if any are missing. This is the only change needed
to make credentials available throughout the server without importing `.env`
directly anywhere else.

**`apps/server/.env`** (developer creates manually, never committed)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/spotify/callback
```

**`apps/server/.env.example`** (committed as a template with empty values)

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/spotify/callback
```

### Acceptance criteria

- Server starts with valid credentials.
- Server logs a clear startup error and exits if any credential is missing.
- `.env` is in `.gitignore`.

---

## 9.2 Phase B — Shared Package Contracts

### Objective

Define all new types, event names, and zod schemas that both server and
frontend depend on.

### Files changed

**`packages/shared/src/spotify/spotifyAuth.ts`** (new)

Define `SpotifyAccountType`, `SpotifyAuthSuccessPayload`,
`SpotifyAuthErrorPayload` as shown in section 6.4.

**`packages/shared/src/spotify/playlistImport.ts`** (new)

Define `ImportPlaylistSuccessPayload`, `ImportPlaylistErrorPayload` as shown
in section 6.5.

**`packages/shared/src/game/track.ts`**

Add `previewUrl?: string` and `spotifyTrackUri?: string` to `TrackCardPublic`.
`TrackCardInternal` inherits both.

**`packages/shared/src/game/roomSettings.ts`**

Add `playlistImported: boolean`, `importedTrackCount: number`, and
`spotifyAuthStatus: 'none' | 'connected'` to `PublicRoomSettings`.

**`packages/shared/src/events/clientEvents.ts`**

Add `ImportPlaylist`, `RequestSpotifyAuthUrl`, `RefreshSpotifyToken` event
name constants and their payload interfaces.

**`packages/shared/src/events/serverEvents.ts`**

Add `SpotifyAuthUrl`, `SpotifyAuthResult`, `SpotifyTokenRefreshed`,
`PlaylistImportResult` event name constants and payload interfaces.

**`packages/shared/src/events/schemas.ts`**

Add zod schemas for all new client-to-server payloads so the server can
validate them at the socket boundary.

**`packages/shared/src/index.ts`**

Export all new types.

**`packages/game-engine/src/domain/GameTrackCard.ts`**

Add `previewUrl?: string` and `spotifyTrackUri?: string`.

### Acceptance criteria

- `npm run build --workspace @tunetrack/shared` passes.
- `npm run build --workspace @tunetrack/game-engine` passes.
- All new types are exported from the shared index.

---

## 9.3 Phase C — Server Spotify Services

### Objective

Build the server-side Spotify infrastructure: token management, API client,
track mapping, URL parsing, and the OAuth callback route.

### Files changed

**`apps/server/src/spotify/spotifyUrlParser.ts`** (new)

Pure function, no dependencies beyond standard JS:

```typescript
export function extractPlaylistId(url: string): string | null
```

Handles both formats:
- `https://open.spotify.com/playlist/{id}?si=...`
- `spotify:playlist:{id}`

Returns `null` for any unrecognised format. Never throws.

**`apps/server/src/spotify/SpotifyTokenStore.ts`** (new)

In-memory store. One record per room:

```typescript
interface SpotifyTokenRecord {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
  accountType: SpotifyAccountType;
}
```

Methods:
```
setHostTokens(roomId, record): void
getHostTokens(roomId): SpotifyTokenRecord | null
clearHostTokens(roomId): void

setClientCredentialsToken(token: string, expiresAtMs: number): void
getClientCredentialsToken(): { token: string; expiresAtMs: number } | null
```

Client Credentials token is global (one per server process). Host tokens are
per room.

**`apps/server/src/spotify/SpotifyApiClient.ts`** (new)

Thin wrapper over the Spotify Web API. Does not manage token lifecycle —
receives the token to use on each call.

Methods:
```
getPlaylistTracks(playlistId: string, accessToken: string): Promise<SpotifyTrack[]>
getUserProfile(accessToken: string): Promise<SpotifyUserProfile>
exchangeCodeForTokens(code: string): Promise<SpotifyTokenResponse>
refreshAccessToken(refreshToken: string): Promise<SpotifyRefreshResponse>
getClientCredentialsToken(): Promise<{ token: string; expiresInSeconds: number }>
```

No business logic. Handles HTTP errors by throwing typed `SpotifyApiError`
values with a `code` field.

Pagination: `getPlaylistTracks` follows Spotify's cursor pagination until all
tracks are fetched.

**`apps/server/src/spotify/SpotifyAuthService.ts`** (new)

Orchestrates OAuth for the host. Depends on `SpotifyApiClient` and
`SpotifyTokenStore`.

```
buildAuthUrl(roomId: string, socketId: string): string
handleCallback(code: string, state: string): Promise<SpotifyAuthResult>
refreshHostToken(roomId: string): Promise<string>
getValidHostAccessToken(roomId: string): Promise<string | null>
```

`buildAuthUrl` encodes `roomId` and `socketId` in the OAuth `state` parameter
so the callback knows which room and socket to notify.

`handleCallback` extracts roomId/socketId from state, calls
`SpotifyApiClient.exchangeCodeForTokens`, fetches the user profile to detect
account type, stores tokens in `SpotifyTokenStore`, and returns the result.

`getValidHostAccessToken` checks expiry and refreshes transparently if needed.

**`apps/server/src/spotify/SpotifyTrackMapper.ts`** (new)

Pure mapping function. No side effects. No dependencies beyond types:

```typescript
export function mapSpotifyTrackToGameCard(track: SpotifyTrack): GameTrackCard | null
```

Returns `null` for tracks with missing required fields (id, title, artist,
release date). Caller decides what to do with nulls (skip them).

Extracts release year from `album.release_date` which is a string like
`"1975-01-01"` or `"1975"`.

**`apps/server/src/decks/PlaylistImportService.ts`** (new)

Orchestrates a playlist import request:

```
importFromSpotifyUrl(url: string): Promise<ImportPlaylistResult>
```

Steps:
1. Parse playlist ID from URL (`spotifyUrlParser`).
2. Get or refresh Client Credentials token (`SpotifyApiClient`).
3. Fetch all tracks from Spotify.
4. Map each track (`SpotifyTrackMapper`), skip nulls.
5. Validate minimum track count (configurable constant, minimum 10).
6. Return result with counts.

`ImportPlaylistResult` is either success with `GameTrackCard[]` and counts, or
a typed error with a code from `ImportPlaylistErrorPayload`.

**`apps/server/src/http/spotifyRoutes.ts`** (new)

Single route handler:

```
GET /api/spotify/callback
```

1. Parse `code` and `state` from query params.
2. Call `SpotifyAuthService.handleCallback`.
3. Emit `spotify_auth_result` on the socket matching the ID encoded in `state`.
4. Serve minimal HTML: `<script>window.close();</script>` so the popup closes.
5. On error: emit error payload and serve the same close page.

**`apps/server/src/app/createHttpServer.ts`**

Register `spotifyRoutes` so the callback is reachable.

**`apps/server/src/decks/DeckService.ts`**

Add an overload or a new method alongside the existing one:

```typescript
public createShuffledDeckFromCards(cards: GameTrackCard[]): GameTrackCard[]
```

The existing `createShuffledDeck()` remains unchanged. `RoomService.startGame`
will choose which to call based on whether an imported deck is available.

**`apps/server/src/rooms/RoomRegistry.ts`**

Add per-room fields to `RoomRecord`:

```typescript
importedDeck: GameTrackCard[] | null;
```

Add methods:
```
setImportedDeck(roomId: string, deck: GameTrackCard[]): void
getImportedDeck(roomId: string): GameTrackCard[] | null
```

**`apps/server/src/rooms/RoomService.ts`**

Add:
```
importPlaylist(roomId: string, playlistUrl: string, socketId: string): Promise<void>
requestSpotifyAuthUrl(roomId: string, socketId: string): string
```

Extend `startGame` to:
1. Check for an imported deck in `RoomRegistry`.
2. If present, call `DeckService.createShuffledDeckFromCards(importedDeck)`.
3. If not, fall back to `DeckService.createShuffledDeck()` (existing test deck).

**`apps/server/src/realtime/registerSocketHandlers.ts`**

Add handlers for:
- `import_playlist` → call `RoomService.importPlaylist`, emit
  `playlist_import_result`
- `request_spotify_auth_url` → call `RoomService.requestSpotifyAuthUrl`,
  emit `spotify_auth_url` to requesting socket only
- `refresh_spotify_token` → call `SpotifyAuthService.refreshHostToken`, emit
  `spotify_token_refreshed` to requesting socket only

### Acceptance criteria

- Server starts and validates all Spotify env variables.
- `POST /api/spotify/callback` with a valid code updates the token store and
  emits the socket event.
- `import_playlist` with a valid public playlist URL results in a shuffled
  `GameTrackCard[]` stored in the registry.
- `startGame` uses the imported deck when available, test deck when not.
- Client Secret does not appear in any socket event or HTTP response body.

---

## 9.4 Phase D — Lobby Spotify UI

### Objective

Give the host a "Connect Spotify" flow and a playlist import flow in the lobby.
Both appear as a grouped section in the host settings panel.

### User flow

1. Host opens lobby. Sees "Spotify" section with "Connect Spotify" button.
2. Host taps "Connect Spotify". A popup opens.
3. Host completes Spotify login. Popup closes automatically.
4. Lobby section shows "Connected — [account type]" and reveals playlist input.
5. Host pastes a public Spotify playlist URL and taps "Import".
6. Lobby shows import status: loading, then "X tracks imported (Y filtered)".
7. Track list appears as a compact scrollable list.
8. Host can then proceed to start game.

### Files changed

**`apps/web/src/pages/LobbyPage/hooks/useLobbySpotifyAuth.ts`** (new)

Manages the OAuth popup and listens for the socket result:

```typescript
interface LobbySpotifyAuthState {
  status: 'idle' | 'pending' | 'connected' | 'error';
  accountType: SpotifyAccountType | null;
  accessToken: string | null;
  errorMessage: string | null;
}

interface LobbySpotifyAuthActions {
  onConnectSpotify: () => void;
}
```

`onConnectSpotify`:
1. Emits `request_spotify_auth_url` on the socket.
2. Listens once for `spotify_auth_url`.
3. Opens the URL in a popup: `window.open(url, 'spotify-auth', 'width=480,height=640')`.
4. Listens for `spotify_auth_result` on the socket.
5. On success: stores `accessToken` and `accountType` in component state
   (not in a persistent store — this is session-only data).
6. On error: sets error message.

**`apps/web/src/pages/LobbyPage/hooks/useLobbyPlaylistImport.ts`** (new)

Manages the playlist import flow:

```typescript
interface LobbyPlaylistImportState {
  status: 'idle' | 'importing' | 'success' | 'error';
  importedCount: number;
  filteredCount: number;
  errorMessage: string | null;
  urlInputValue: string;
}

interface LobbyPlaylistImportActions {
  onUrlChange: (value: string) => void;
  onImport: () => void;
}
```

On import: emits `import_playlist` with `{ roomId, playlistUrl }`, listens
once for `playlist_import_result`.

**`apps/web/src/pages/LobbyPage/components/LobbyPlaylistTrackList.tsx`** (new)

Pure presentational component. Receives `tracks: TrackCardPublic[]` and
renders a compact scrollable list. Each row: artwork thumbnail, title, artist,
year (not hidden — the host sees the year when building the playlist).

This component is intentionally minimal. Future: add remove-individual-track
action.

**`apps/web/src/pages/LobbyPage/components/LobbySpotifySection.tsx`** (new)

Composes the two hooks above into a single settings section. Responsibilities:

- If not connected: show "Connect Spotify" button.
- If pending: show spinner.
- If connected: show account type badge and playlist import UI.
- If error: show clear error message with retry option.

Receives `currentSettings: PublicRoomSettings` as a prop so it can show
playlist status from the server state (useful after page refresh via
reconnect).

**`apps/web/src/pages/LobbyPage/components/LobbyHostSettingsPanel.tsx`**

Add `<LobbySpotifySection>` as a new settings group between the core settings
and the start panel. Pass `isHost`, `roomId`, `currentSettings`, and the
socket reference down.

**`apps/web/src/pages/LobbyPage/hooks/useLobbyPageController.ts`**

Pass the necessary props to `LobbyHostSettingsPanel` to support the new
section. No orchestration logic moves here — the Spotify hooks own their own
state.

### Acceptance criteria

- The popup opens, OAuth completes, popup closes, lobby shows "Connected".
- Pasting a valid public Spotify playlist URL and clicking Import shows
  the import result.
- The track list renders with title, artist, and release year.
- A private or invalid URL shows a clear, user-friendly error.
- All controls remain usable in portrait and landscape on mobile.

---

## 9.5 Phase E — Host Playback In Game

### Objective

When a new card is drawn during gameplay, the host's device automatically
plays the corresponding Spotify track. When the card is resolved, playback
stops. The UI shows only a minimal status indicator.

### Playback trigger logic

Playback is triggered by the combination:
- `roomState.status === 'turn'`
- `roomState.currentTrackCard` has changed (different `id` from last render)
- `roomState.turn.activePlayerId` has changed (new turn started)

Playback stops when:
- `roomState.status` transitions to `'reveal'`
- `roomState.status` transitions to `'challenge'` (optional: stop or continue)
- `roomState.status` transitions to `'finished'`

### Files changed

**`apps/web/src/services/spotify/providers/ISpotifyPlaybackProvider.ts`** (new)

```typescript
export interface PlaybackState {
  phase: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
  trackUri: string | null;
  positionMs: number;
  durationMs: number;
  volume: number;
  error: PlaybackErrorCode | null;
}

export type PlaybackErrorCode =
  | 'no_active_device'
  | 'premium_required'
  | 'token_expired'
  | 'track_unavailable'
  | 'sdk_init_failed'
  | 'unknown';

export interface ISpotifyPlaybackProvider {
  play(trackUri: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  getState(): PlaybackState;
  onStateChange(listener: (state: PlaybackState) => void): () => void;
  dispose(): void;
}
```

**`apps/web/src/services/spotify/providers/SpotifyConnectProvider.ts`** (new)

Implements `ISpotifyPlaybackProvider` using `PUT /v1/me/player/play`.

- `play(trackUri)`: sends `{ uris: [trackUri] }` to the Spotify API. If no
  active device is found (404 / NO_ACTIVE_DEVICE), sets error to
  `'no_active_device'`.
- `stop()`: calls `PUT /v1/me/player/pause`.
- State polling: calls `GET /v1/me/player` every 2 seconds while playing to
  update `positionMs` and detect track end.
- Stops polling on `dispose()`.

**`apps/web/src/services/spotify/providers/SpotifyWebPlaybackProvider.ts`** (new)

Implements `ISpotifyPlaybackProvider` using the Spotify Web Playback SDK.

- Dynamically loads the SDK script on first instantiation if not already
  loaded (`https://sdk.scdn.co/spotify-player.js`).
- Creates a `Spotify.Player` instance with the host's access token.
- Registers the player device, calls `PUT /v1/me/player/play` with the
  `device_id` to target the in-browser player.
- Listens to SDK `player_state_changed` events to update `PlaybackState`
  synchronously (no polling needed).
- `dispose()` disconnects the player and removes the SDK instance.

Both providers catch network errors and map them to typed `PlaybackErrorCode`
values. They never throw unhandled rejections.

**`apps/web/src/services/spotify/spotifyTokenManager.ts`** (new)

Holds the current host access token in module-level state. Exposes:

```typescript
setToken(accessToken: string, expiresInSeconds: number): void
getToken(): string | null
isExpired(): boolean
```

The socket listener in `useHostPlaybackController` calls `setToken` when a
`spotify_token_refreshed` event arrives. Both providers read the token via
this manager. This is the only place in the frontend where the token lives.

**`apps/web/src/services/spotify/SpotifyPlaybackService.ts`** (new)

Facade. Created once by `useHostPlaybackController`. Constructor receives the
access token and account type:

- If `accountType === 'premium'`: creates `SpotifyWebPlaybackProvider`.
- Otherwise: creates `SpotifyConnectProvider`.
- Falls back to `SpotifyConnectProvider` if SDK init fails.

Exposes the same interface as `ISpotifyPlaybackProvider` plus:
```
readonly accountType: SpotifyAccountType
```

When the active provider emits a `'token_expired'` error:
1. Emits `refresh_spotify_token` socket event.
2. Waits for `spotify_token_refreshed` socket event.
3. Updates `spotifyTokenManager`.
4. Retries the last operation once.

**`apps/web/src/pages/GamePage/hooks/useHostPlaybackController.ts`** (new)

Only active when `isHost === true`. Returns `HostPlaybackViewModel`:

```typescript
interface HostPlaybackViewModel {
  playbackState: PlaybackState;
  currentTrack: TrackCardPublic | null;
  accountType: SpotifyAccountType | null;
  isSpotifyConnected: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  onVolumeChange: (volume: number) => void;
}
```

Logic:
- Creates `SpotifyPlaybackService` in a ref on mount (if `isSpotifyConnected`).
- Watches `roomState.currentTrackCard.id` and `roomState.turn.activePlayerId`.
  When either changes and `status === 'turn'`, calls `service.play(trackUri)`.
- Watches `roomState.status`. When it becomes `'reveal'` or `'finished'`,
  calls `service.stop()`.
- Listens on socket for `spotify_token_refreshed` to update
  `spotifyTokenManager`.
- Disposes the service on unmount.

In MVP, only `playbackState.phase` and `isSpotifyConnected` are consumed by
the UI. All other returned values are ready for future UI components without
any hook changes.

**`apps/web/src/pages/GamePage/components/HostPlaybackControls.tsx`** (new)

Pure presentational. Receives `HostPlaybackViewModel`. In MVP, renders only:

```
phase === 'playing'  → small green chip "Playing"
phase === 'error'    → small red chip "No device" or "Error"
phase === 'loading'  → small grey chip "Connecting..."
phase === 'idle'     → nothing
```

Designed as a slot: future play/pause button and volume slider are added here
by rendering more from the view model. No service imports.

**`apps/web/src/pages/GamePage/components/NowPlayingSheet.tsx`** (new)

A slide-in bottom sheet (using the existing `BottomSheet` component).
Receives `HostPlaybackViewModel` and `isOpen: boolean` and
`onClose: () => void`.

In MVP: the component file and its structure exist but it is not yet opened
from anywhere. It is imported in `HostPlaybackControls.tsx` and connected to
a `isSheetOpen` state so the future implementation is a one-line change (tap
the status chip → open sheet). Its internal layout is scaffolded with
placeholder content so the frame is already styled.

Internal sections (MVP: scaffold only; future: full implementation):
1. Album art image (full-width).
2. Track title and artist.
3. Album name and year (year hidden until reveal, same rule as the card).
4. Progress bar.
5. Play/pause and volume controls.

**`apps/web/src/pages/GamePage/mobile/GamePageMobile.tsx`**

Add `<HostPlaybackControls>` to the host action area. Only rendered when
`isHost === true`. Receives `HostPlaybackViewModel` from the page controller.

**`apps/web/src/pages/GamePage/desktop/GamePageDesktop.tsx`**

Same addition as above for desktop layout.

### Acceptance criteria

- When the game starts and a card is drawn, the Spotify track plays on the
  host's device automatically.
- When the card is resolved (reveal phase), playback stops.
- When the next turn begins with a new card, the previous track stops and
  the new one plays.
- The status chip shows the correct phase.
- No playback controls appear on non-host clients.
- `NowPlayingSheet` component file exists and can be opened by uncommenting
  one line in `HostPlaybackControls`.

---

## 9.6 Phase F — Error Handling And Edge Cases

### Objective

Make the feature robust for real party conditions: Spotify app not open,
token expiry, tracks without URIs, network blips.

### Required handling

**No active Spotify device (Connect mode)**

When `play()` returns `'no_active_device'` error:
- Status chip shows "Open Spotify on your phone".
- No crash, no unhandled rejection.
- When host opens Spotify app and taps play manually, the existing polling
  will detect the resumed state.

**Premium detection failed at SDK init**

- Fall back to `SpotifyConnectProvider` automatically.
- Log the SDK failure clearly for debugging.
- No visible error unless Connect mode also fails.

**Track has no `spotifyTrackUri`**

Can happen if track was imported with missing data. `useHostPlaybackController`
skips the play call. Status chip shows "No track URI". Game continues normally.

**Token expired mid-game**

`SpotifyPlaybackService` handles the refresh cycle transparently (emit socket
event, wait for response, retry). If refresh fails, the status chip shows an
error and the host can reconnect Spotify from a settings entry point (future).

**Playlist with fewer than minimum tracks**

Server rejects the import with `'too_few_tracks'` error code. Client shows
a clear message. The test deck remains active.

**Private playlist**

Server returns `'playlist_private'` error. Client shows: "This playlist is
private. Share it publicly on Spotify first."

### Acceptance criteria

- All error states show user-friendly messages.
- No unhandled Promise rejections in the browser console.
- No server crashes from Spotify API failures.
- Game continues functioning even if playback fails.

---

## 10. Extensibility Targets

These are not in scope for this iteration but are designed into the
architecture so they require no refactor to add.

### 10.1 Now-playing sheet (full implementation)

Steps needed:
1. In `HostPlaybackControls.tsx`: add `onPress` handler to the status chip
   that sets `isSheetOpen = true`.
2. In `NowPlayingSheet.tsx`: fill in the placeholder sections with real data
   from `HostPlaybackViewModel.currentTrack` and `playbackState`.

No hook changes. No service changes.

### 10.2 Play/pause controls in sheet

Steps needed:
1. In `NowPlayingSheet.tsx`: add play/pause button calling
   `viewModel.onPlayPause()`.
2. Add progress bar reading `playbackState.positionMs / playbackState.durationMs`.

No hook changes. No service changes.

### 10.3 YouTube provider

Steps needed:
1. Create `YouTubePlaybackProvider` implementing `ISpotifyPlaybackProvider`
   (or generalise interface to `IPlaybackProvider`).
2. Add `YouTubePlaylistImporter` implementing the import service interface.
3. `SpotifyPlaybackService` becomes `PlaybackService` with provider selection.

The game engine, socket events, and game page UI are not touched.

### 10.4 Per-client playback (future)

The `previewUrl` field is already in `TrackCardPublic`. Any client can use it
to play a 30-second preview. A future `useClientPlaybackController` hook can
activate this for all clients using a simple `<audio>` element.

---

## 11. Testing Plan

### 11.1 Automated

Must run after each phase:
- `npm run typecheck --workspace @tunetrack/shared`
- `npm run typecheck --workspace @tunetrack/game-engine`
- `npm run typecheck --workspace @tunetrack/server`
- `npm run typecheck --workspace @tunetrack/web`
- `npm run build --workspace @tunetrack/shared`

Unit tests:
- `spotifyUrlParser.ts` — valid and invalid URL forms
- `SpotifyTrackMapper.ts` — valid track, missing release date, missing artist
- `PlaylistImportService.ts` — minimum track count validation, filter counting

### 11.2 Manual E2E checklist

Lobby:
1. Open lobby as host.
2. Tap "Connect Spotify". Popup opens.
3. Log in. Popup closes. Section shows "Connected".
4. Paste a valid public playlist URL. Tap "Import".
5. Import result shows track count and filtered count.
6. Track list is visible and scrollable.
7. Paste an invalid URL. Verify error message.
8. Paste a private playlist URL. Verify "private playlist" message.

Game — Connect mode (Free):
1. Open Spotify app on host phone, start any song, pause it.
2. Start game.
3. When first card is drawn, Spotify app resumes the correct song.
4. Status chip shows "Playing".
5. Resolve the card. Playback stops.
6. Next card is drawn. New song plays.

Game — SDK mode (Premium):
1. Start game without opening Spotify app.
2. When first card is drawn, song plays in browser tab.
3. Status chip shows "Playing".
4. Resolve the card. Playback stops.

Error cases:
1. Start game in Connect mode without any active Spotify device.
2. Verify status chip shows the "No device" message.
3. Open Spotify app. Verify it resumes automatically.

---

## 12. Definition Of Done

This iteration is complete when:

- Spotify credentials are secured in `.env`, validated at startup.
- A public Spotify playlist can be imported in the lobby.
- The host can connect their Spotify account via OAuth popup without leaving
  the lobby.
- Free (Connect) and Premium (SDK) modes both work automatically.
- Playback starts automatically when a new card is drawn.
- Playback stops automatically on reveal.
- The status chip reflects the correct playback phase.
- `NowPlayingSheet` and `HostPlaybackControls` are scaffolded and ready
  to be extended.
- `HostPlaybackViewModel` returns full data even though MVP only uses part of it.
- All type checks pass.
- The test deck fallback still works when no playlist is imported.
- No sensitive credentials appear in any client-facing response.

---

## 13. Execution Order

```
Phase A  Server env + credentials         Day 1 (morning)
Phase B  Shared package contracts         Day 1 (afternoon)
Phase C  Server Spotify services          Day 1–2
Phase D  Lobby Spotify UI                 Day 2–3
Phase E  Host playback in game            Day 3–4
Phase F  Error handling + edge cases      Day 4
Manual E2E testing                        Day 5
```

---

# End Of Iteration 06 Spotify Integration Plan
