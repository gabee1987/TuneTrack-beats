import type { GameTrackCard } from "@tunetrack/game-engine";
import type { ImportPlaylistResultPayload } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
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
  playlistName?: string;
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
      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_import_rejected",
        outcome: "failed",
        code: "invalid_url",
      });
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
      logAuditEvent({
        auditKind: "spotify_import",
        action: "client_credentials_failed",
        outcome: "failed",
        code: "spotify_api_error",
        meta: {
          playlistId,
        },
      });
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
      const [rawTracks, playlistName] = await Promise.all([
        this.apiClient.getAllPlaylistTracks(playlistId, accessToken),
        this.apiClient.getPlaylistName(playlistId, accessToken).catch(() => undefined),
      ]);

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
        logAuditEvent({
          auditKind: "spotify_import",
          action: "playlist_import_rejected",
          outcome: "failed",
          code: "too_few_tracks",
          meta: {
            playlistId,
            importedCount: cards.length,
            filteredCount,
            totalFetched: rawTracks.length,
          },
        });
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
      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_import_succeeded",
        outcome: "succeeded",
        meta: {
          playlistId,
          playlistName,
          importedCount: cards.length,
          filteredCount,
          totalFetched: rawTracks.length,
        },
      });

      return {
        success: true,
        cards,
        importedCount: cards.length,
        filteredCount,
        totalFetched: rawTracks.length,
        ...(playlistName ? { playlistName } : {}),
      };
    } catch (err) {
      if (err instanceof SpotifyApiError) {
        if (err.code === "not_found") {
          logAuditEvent({
            auditKind: "spotify_import",
            action: "playlist_import_failed",
            outcome: "failed",
            code: "playlist_not_found",
            meta: {
              playlistId,
              status: err.statusCode,
            },
          });
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
          logAuditEvent({
            auditKind: "spotify_import",
            action: "playlist_import_failed",
            outcome: "failed",
            code: "playlist_private",
            meta: {
              playlistId,
              status: err.statusCode,
            },
          });
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
      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_import_failed",
        outcome: "failed",
        code: err instanceof SpotifyApiError ? err.code : "spotify_api_error",
        meta: {
          playlistId,
          status: err instanceof SpotifyApiError ? err.statusCode : undefined,
        },
      });

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
