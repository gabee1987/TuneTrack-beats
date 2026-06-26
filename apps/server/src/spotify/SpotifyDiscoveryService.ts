import { randomUUID } from "node:crypto";
import type { GameTrackCard } from "@tunetrack/game-engine";
import type {
  PublicTrackInfo,
  SpotifyCandidatesAppliedPayload,
  SpotifyCandidatesGeneratedPayload,
  SpotifyPlaylistSearchResultPayload,
} from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { SpotifyApiClient, SpotifyApiError } from "./SpotifyApiClient.js";
import { mapSpotifyTrackToGameCard } from "./SpotifyTrackMapper.js";
import { SpotifyTokenStore } from "./SpotifyTokenStore.js";

const CANDIDATE_SESSION_TTL_MS = 30 * 60 * 1000;
const MIN_CANDIDATE_TRACK_COUNT = 10;

interface CandidateSession {
  id: string;
  roomId: string;
  createdAtMs: number;
  sourceSummary: string;
  tracks: GameTrackCard[];
}

export interface GenerateFromPlaylistsResult {
  payload: SpotifyCandidatesGeneratedPayload;
}

export interface ApplyCandidatesResult {
  payload: SpotifyCandidatesAppliedPayload;
  cards: GameTrackCard[] | null;
}

export class SpotifyDiscoveryService {
  private readonly sessionsById = new Map<string, CandidateSession>();

  public constructor(
    private readonly apiClient: SpotifyApiClient,
    private readonly tokenStore: SpotifyTokenStore,
  ) {}

  public async searchPlaylists(
    roomId: string,
    query: string,
    limit: number,
  ): Promise<SpotifyPlaylistSearchResultPayload> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      return {
        success: false,
        code: "invalid_query",
        message: "Enter at least 2 characters to search Spotify playlists.",
      };
    }

    try {
      const accessToken = await this.getOrRefreshClientCredentialsToken();
      const playlists = await this.apiClient.searchPlaylists(trimmedQuery, accessToken, limit);

      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_search_succeeded",
        outcome: "succeeded",
        roomId,
        meta: {
          query: trimmedQuery,
          resultCount: playlists.length,
        },
      });

      return {
        success: true,
        query: trimmedQuery,
        playlists: playlists.map((playlist) => ({
          id: playlist.id,
          name: playlist.name,
          ownerName: playlist.owner.display_name ?? "Spotify",
          trackCount: playlist.tracks.total,
          ...(playlist.images[0]?.url ? { imageUrl: playlist.images[0].url } : {}),
        })),
      };
    } catch (err) {
      logger.error({ err, roomId, query: trimmedQuery }, "Spotify playlist search failed");
      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_search_failed",
        outcome: "failed",
        roomId,
        code: err instanceof SpotifyApiError ? err.code : "spotify_api_error",
        meta: {
          query: trimmedQuery,
          status: err instanceof SpotifyApiError ? err.statusCode : undefined,
        },
      });

      return {
        success: false,
        code: "spotify_api_error",
        message: "Spotify playlist search failed. Please try again.",
      };
    }
  }

  public async generateFromPlaylists(
    roomId: string,
    playlistIds: string[],
    targetCount: number,
  ): Promise<GenerateFromPlaylistsResult> {
    const uniquePlaylistIds = Array.from(
      new Set(playlistIds.map((id) => id.trim()).filter(Boolean)),
    );
    if (uniquePlaylistIds.length === 0) {
      return {
        payload: {
          success: false,
          code: "invalid_source",
          message: "Choose at least one Spotify playlist.",
        },
      };
    }

    try {
      const accessToken = await this.getOrRefreshClientCredentialsToken();
      const rawTrackResults = await Promise.all(
        uniquePlaylistIds.map((playlistId) =>
          this.apiClient.getAllPlaylistTracks(playlistId, accessToken),
        ),
      );
      const rawTracks = rawTrackResults.flat();

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

      const { dedupedCards, duplicateCount } = dedupeCards(cards);
      const selectedCards = shuffle(dedupedCards).slice(0, targetCount);

      if (selectedCards.length < MIN_CANDIDATE_TRACK_COUNT) {
        return {
          payload: {
            success: false,
            code: "too_few_tracks",
            message: `Only ${selectedCards.length} usable tracks were found. Choose more playlists or try another search.`,
          },
        };
      }

      const session: CandidateSession = {
        id: randomUUID(),
        roomId,
        createdAtMs: Date.now(),
        sourceSummary: `${uniquePlaylistIds.length} Spotify playlist${uniquePlaylistIds.length === 1 ? "" : "s"}`,
        tracks: selectedCards,
      };
      this.pruneExpiredSessions();
      this.sessionsById.set(session.id, session);

      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_candidates_generated",
        outcome: "succeeded",
        roomId,
        meta: {
          playlistCount: uniquePlaylistIds.length,
          importedCount: selectedCards.length,
          filteredCount,
          duplicateCount,
          totalFetched: rawTracks.length,
        },
      });

      return {
        payload: {
          success: true,
          candidateSessionId: session.id,
          sourceSummary: session.sourceSummary,
          tracks: selectedCards.map(cardToPublicTrackInfo),
          importedCount: selectedCards.length,
          filteredCount,
          duplicateCount,
          totalFetched: rawTracks.length,
        },
      };
    } catch (err) {
      logger.error(
        { err, roomId, playlistCount: uniquePlaylistIds.length },
        "Spotify candidate generation failed",
      );
      logAuditEvent({
        auditKind: "spotify_import",
        action: "playlist_candidates_failed",
        outcome: "failed",
        roomId,
        code: err instanceof SpotifyApiError ? err.code : "spotify_api_error",
        meta: {
          playlistCount: uniquePlaylistIds.length,
          status: err instanceof SpotifyApiError ? err.statusCode : undefined,
        },
      });

      return {
        payload: {
          success: false,
          code: "spotify_api_error",
          message: "Could not generate tracks from those playlists. Please try again.",
        },
      };
    }
  }

  public applyCandidates(
    roomId: string,
    candidateSessionId: string,
    trackIds: string[],
  ): ApplyCandidatesResult {
    this.pruneExpiredSessions();

    const session = this.sessionsById.get(candidateSessionId);
    if (!session || session.roomId !== roomId) {
      return {
        cards: null,
        payload: {
          success: false,
          code: "candidate_session_expired",
          message: "This generated playlist expired. Generate it again.",
        },
      };
    }

    const selectedIds = new Set(trackIds);
    const selectedCards = session.tracks.filter((track) => selectedIds.has(track.id));

    if (selectedCards.length < MIN_CANDIDATE_TRACK_COUNT) {
      return {
        cards: null,
        payload: {
          success: false,
          code: "too_few_tracks",
          message: `Keep at least ${MIN_CANDIDATE_TRACK_COUNT} tracks before using this playlist.`,
        },
      };
    }

    this.sessionsById.delete(candidateSessionId);
    return {
      cards: selectedCards,
      payload: {
        success: true,
        importedCount: selectedCards.length,
      },
    };
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

  private pruneExpiredSessions(): void {
    const cutoffMs = Date.now() - CANDIDATE_SESSION_TTL_MS;
    for (const [id, session] of this.sessionsById) {
      if (session.createdAtMs < cutoffMs) {
        this.sessionsById.delete(id);
      }
    }
  }
}

function dedupeCards(cards: GameTrackCard[]): {
  dedupedCards: GameTrackCard[];
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const dedupedCards: GameTrackCard[] = [];

  for (const card of cards) {
    const key = card.spotifyTrackUri ?? `${normalize(card.title)}:${normalize(card.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedCards.push(card);
  }

  return {
    dedupedCards,
    duplicateCount: cards.length - dedupedCards.length,
  };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex] as T, shuffled[index] as T];
  }
  return shuffled;
}

function cardToPublicTrackInfo(card: GameTrackCard): PublicTrackInfo {
  return {
    id: card.id,
    title: card.title,
    artist: card.artist,
    albumTitle: card.albumTitle,
    releaseYear: card.releaseYear,
    sourceReleaseYear: card.sourceReleaseYear ?? card.releaseYear,
    metadataStatus: card.metadataStatus ?? "imported",
    ...(card.artworkUrl ? { artworkUrl: card.artworkUrl } : {}),
    ...(card.previewUrl ? { previewUrl: card.previewUrl } : {}),
    ...(card.spotifyTrackUri ? { spotifyTrackUri: card.spotifyTrackUri } : {}),
  };
}
