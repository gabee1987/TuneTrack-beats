import type { PlayerId } from "../game/player.js";
import type { PublicRoomState } from "../game/roomState.js";
import type { ImportPlaylistResultPayload } from "../spotify/playlistImport.js";
import type { SpotifyAuthResultPayload } from "../spotify/spotifyAuth.js";

export const ServerToClientEvent = {
  PlayerIdentity: "player_identity",
  PlaylistImportResult: "playlist_import_result",
  PlaylistTracks: "playlist_tracks",
  RoomClosed: "room_closed",
  SpotifyAuthResult: "spotify_auth_result",
  SpotifyAuthUrl: "spotify_auth_url",
  SpotifyTokenRefreshed: "spotify_token_refreshed",
  StateUpdate: "state_update",
  Error: "error",
} as const;

export type ServerToClientEventName =
  (typeof ServerToClientEvent)[keyof typeof ServerToClientEvent];

export interface PlayerIdentityPayload {
  playerId: PlayerId;
}

export interface StateUpdatePayload {
  roomState: PublicRoomState;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}

export interface RoomClosedPayload {
  roomId: string;
  reason?: "closed" | "kicked";
  roomName?: string;
  message: string;
}

export interface SpotifyAuthUrlPayload {
  authUrl: string;
}

export interface SpotifyTokenRefreshedPayload {
  accessToken: string;
  expiresInSeconds: number;
}

export type { ImportPlaylistResultPayload, SpotifyAuthResultPayload };
export type { PlaylistTracksPayload } from "../spotify/playlistTracks.js";
