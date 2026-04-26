import type { GameTrackCard } from "@tunetrack/game-engine";
import type { ImportPlaylistResultPayload } from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import { SpotifyApiClient, SpotifyApiError } from "../spotify/SpotifyApiClient.js";
import { SpotifyTokenStore } from "../spotify/SpotifyTokenStore.js";
import { mapSpotifyTrackToGameCard } from "../spotify/SpotifyTrackMapper.js";
import { extractSpotifyPlaylistId } from "../spotify/spotifyUrlParser.js";

const MIN_IMPORTABLE_TRACK_COUNT = 10;

export interface PlaylistImportSuccess {
  success: true;
  cards: GameTrackCard[];
  importedCount: number;
  filteredCount: number;
  totalFetched: number;
}

export type PlaylistImportOutcome =
  | PlaylistImportSuccess
  | { success: false; payload: ImportPlaylistResultPayload & { success: false } };

export class PlaylistImportService {
  public constructor(
    private readonly apiClient: SpotifyApiClient,
    private readonly tokenStore: SpotifyTokenStore,
  ) {}

  public async importFromUrl(playlistUrl: string): Promise<PlaylistImportOutcome> {
    const playlistId = extractSpotifyPlaylistId(playlistUrl);

    if (!playlistId) {
      return {
        success: false,
        payload: {
          success: false,
          code: "invalid_url",
          message: "That doesn't look like a valid Spotify playlist URL.",
        },
      };
    }

    let accessToken: string;
    try {
      accessToken = await this.getOrRefreshClientCredentialsToken();
    } catch {
      return {
        success: false,
        payload: {
          success: false,
          code: "spotify_api_error",
          message: "Could not connect to Spotify. Please try again.",
        },
      };
    }

    try {
      const rawTracks = await this.apiClient.getAllPlaylistTracks(playlistId, accessToken);

      const cards: GameTrackCard[] = [];
      let filteredCount = 0;

      for (const track of rawTracks) {
        const card = mapSpotifyTrackToGameCard(track);
        if (card) {
          cards.push(card);
        } else {
          filteredCount++;
        }
      }

      if (cards.length < MIN_IMPORTABLE_TRACK_COUNT) {
        return {
          success: false,
          payload: {
            success: false,
            code: "too_few_tracks",
            message: `The playlist only has ${cards.length} usable track${cards.length === 1 ? "" : "s"}. At least ${MIN_IMPORTABLE_TRACK_COUNT} are needed.`,
          },
        };
      }

      logger.info(
        { playlistId, imported: cards.length, filtered: filteredCount },
        "Playlist imported successfully",
      );

      return {
        success: true,
        cards,
        importedCount: cards.length,
        filteredCount,
        totalFetched: rawTracks.length,
      };
    } catch (err) {
      if (err instanceof SpotifyApiError) {
        if (err.code === "not_found") {
          return {
            success: false,
            payload: {
              success: false,
              code: "playlist_not_found",
              message: "Playlist not found. Check the URL and try again.",
            },
          };
        }

        if (err.code === "forbidden") {
          return {
            success: false,
            payload: {
              success: false,
              code: "playlist_private",
              message: "This playlist is private. Make it public on Spotify first.",
            },
          };
        }
      }

      logger.error({ err, playlistId }, "Playlist import failed");

      return {
        success: false,
        payload: {
          success: false,
          code: "spotify_api_error",
          message: "Spotify returned an error. Please try again.",
        },
      };
    }
  }

  private async getOrRefreshClientCredentialsToken(): Promise<string> {
    if (!this.tokenStore.isClientCredentialsExpired()) {
      const record = this.tokenStore.getClientCredentials();
      if (record) return record.token;
    }

    const tokenResponse = await this.apiClient.getClientCredentialsToken();
    this.tokenStore.setClientCredentials(tokenResponse.access_token, tokenResponse.expires_in);
    return tokenResponse.access_token;
  }
}
