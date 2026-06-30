import { randomUUID } from "node:crypto";
import type { GameTrackCard } from "@tunetrack/game-engine";
import type {
  PublicTrackInfo,
  SpotifyCandidateSource,
  SpotifyCandidatesAppliedPayload,
  SpotifyCandidatesGeneratedPayload,
  SpotifyPlaylistSearchResultPayload,
} from "@tunetrack/shared";
import { getSpotifyQuickPickPreset } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { SpotifyApiClient, SpotifyApiError } from "./SpotifyApiClient.js";
import { mapSpotifyTrackToGameCard } from "./SpotifyTrackMapper.js";
import { SpotifyTokenStore } from "./SpotifyTokenStore.js";
import { extractSpotifyPlaylistId } from "./spotifyUrlParser.js";

const CANDIDATE_SESSION_TTL_MS = 30 * 60 * 1000;
const MIN_CANDIDATE_TRACK_COUNT = 10;
const SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE = 50;
const SPOTIFY_PLAYLIST_SEARCH_MAX_PAGES = 4;
const SPOTIFY_QUICK_PICK_PLAYLISTS_PER_QUERY = 5;
const SPOTIFY_QUICK_PICK_MAX_PLAYLISTS = 12;
const SPOTIFY_PLAYLIST_ID_REGEX = /^[a-zA-Z0-9]{22}$/;

interface TrackYearRange {
  startYear: number;
  endYear: number;
}

interface GenerateFromPlaylistsOptions {
  sourceSummary?: string;
  yearRanges?: readonly TrackYearRange[];
  balanceByYear?: boolean;
}

interface CandidateSession {
  id: string;
  roomId: string;
  createdAtMs: number;
  sourceSummary: string;
  tracks: GameTrackCard[];
}

interface EditedCandidateTrack {
  id: string;
  title: string;
  artist: string;
  albumTitle: string;
  releaseYear: number;
  metadataStatus: PublicTrackInfo["metadataStatus"];
  sourceReleaseYear?: number | undefined;
  artworkUrl?: string | undefined;
  previewUrl?: string | undefined;
  spotifyTrackUri?: string | undefined;
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
      const directPlaylistId = extractPlaylistIdFromSearchQuery(trimmedQuery);
      const playlists = directPlaylistId
        ? [await this.apiClient.getPlaylistSearchItem(directPlaylistId, accessToken)]
        : await this.searchUsablePlaylists(trimmedQuery, accessToken, limit);

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
    options: GenerateFromPlaylistsOptions = {},
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
      const yearFilteredCards = filterCardsByYearRanges(dedupedCards, options.yearRanges);
      const yearFilteredCount = dedupedCards.length - yearFilteredCards.length;
      const selectedCards = options.balanceByYear
        ? selectBalancedByYear(yearFilteredCards, targetCount)
        : yearFilteredCards.slice(0, targetCount);

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
        sourceSummary:
          options.sourceSummary ??
          `${uniquePlaylistIds.length} Spotify playlist${uniquePlaylistIds.length === 1 ? "" : "s"}`,
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
          filteredCount: filteredCount + yearFilteredCount,
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
          filteredCount: filteredCount + yearFilteredCount,
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

  public async generateCandidates(
    roomId: string,
    source: SpotifyCandidateSource,
  ): Promise<GenerateFromPlaylistsResult> {
    if (source.type === "playlists") {
      return this.generateFromPlaylists(roomId, source.playlistIds, source.targetCount);
    }

    return this.generateFromPreset(roomId, source.presetId, source.targetCount);
  }

  private async generateFromPreset(
    roomId: string,
    presetId: string,
    targetCount: number,
  ): Promise<GenerateFromPlaylistsResult> {
    const preset = getSpotifyQuickPickPreset(presetId);
    if (!preset) {
      return {
        payload: {
          success: false,
          code: "invalid_source",
          message: "Choose a valid Quick Pick.",
        },
      };
    }

    try {
      const accessToken = await this.getOrRefreshClientCredentialsToken();
      const playlistIds: string[] = [];
      const seenPlaylistIds = new Set<string>();

      for (const query of preset.searchQueries) {
        const playlists = await this.searchUsablePlaylists(
          query,
          accessToken,
          SPOTIFY_QUICK_PICK_PLAYLISTS_PER_QUERY,
        );

        for (const playlist of playlists) {
          if (seenPlaylistIds.has(playlist.id)) continue;
          seenPlaylistIds.add(playlist.id);
          playlistIds.push(playlist.id);
          if (playlistIds.length >= SPOTIFY_QUICK_PICK_MAX_PLAYLISTS) break;
        }

        if (playlistIds.length >= SPOTIFY_QUICK_PICK_MAX_PLAYLISTS) break;
      }

      if (playlistIds.length === 0) {
        return {
          payload: {
            success: false,
            code: "too_few_tracks",
            message: "Spotify did not return enough playlists for that Quick Pick.",
          },
        };
      }

      return this.generateFromPlaylists(
        roomId,
        playlistIds,
        targetCount,
        {
          sourceSummary: `${preset.name} Quick Pick`,
          yearRanges: preset.yearRanges,
          balanceByYear: true,
        },
      );
    } catch (err) {
      logger.error({ err, roomId, presetId }, "Spotify quick pick generation failed");
      return {
        payload: {
          success: false,
          code: "spotify_api_error",
          message: "Could not generate tracks from that Quick Pick. Please try again.",
        },
      };
    }
  }

  public applyCandidates(
    roomId: string,
    candidateSessionId: string,
    trackIds: string[],
    editedTracks?: EditedCandidateTrack[],
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
    const editedTracksById = new Map((editedTracks ?? []).map((track) => [track.id, track]));
    const selectedCards = session.tracks
      .filter((track) => selectedIds.has(track.id))
      .map((track) => applyCandidateTrackEdits(track, editedTracksById.get(track.id)));

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

  private async searchUsablePlaylists(
    query: string,
    accessToken: string,
    limit: number,
  ): Promise<Awaited<ReturnType<SpotifyApiClient["searchPlaylists"]>>> {
    const targetCount = Math.min(Math.max(limit, 1), SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE);
    const playlists: Awaited<ReturnType<SpotifyApiClient["searchPlaylists"]>> = [];
    const seenPlaylistIds = new Set<string>();
    const queries = buildPlaylistSearchQueries(query);

    for (const searchQuery of queries) {
      for (
        let pageIndex = 0;
        playlists.length < targetCount && pageIndex < SPOTIFY_PLAYLIST_SEARCH_MAX_PAGES;
        pageIndex++
      ) {
        const page = await this.apiClient.searchPlaylists(
          searchQuery,
          accessToken,
          SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE,
          pageIndex * SPOTIFY_PLAYLIST_SEARCH_PAGE_SIZE,
        );

        if (page.length === 0) continue;

        for (const playlist of page) {
          if (seenPlaylistIds.has(playlist.id)) continue;
          seenPlaylistIds.add(playlist.id);
          playlists.push(playlist);
          if (playlists.length >= targetCount) break;
        }
      }
    }

    return playlists;
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

function extractPlaylistIdFromSearchQuery(query: string): string | null {
  const playlistId = extractSpotifyPlaylistId(query);
  if (playlistId) return playlistId;

  const trimmedQuery = query.trim();
  return SPOTIFY_PLAYLIST_ID_REGEX.test(trimmedQuery) ? trimmedQuery : null;
}

function buildPlaylistSearchQueries(query: string): string[] {
  const trimmedQuery = query.trim();
  const queries = [trimmedQuery];

  if (/\s/.test(trimmedQuery) && !/^".*"$/.test(trimmedQuery)) {
    queries.push(`"${trimmedQuery}"`);
  }

  return queries;
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

function filterCardsByYearRanges(
  cards: GameTrackCard[],
  yearRanges?: readonly TrackYearRange[],
): GameTrackCard[] {
  if (!yearRanges || yearRanges.length === 0) return cards;

  return cards.filter((card) =>
    yearRanges.some(
      (range) => card.releaseYear >= range.startYear && card.releaseYear <= range.endYear,
    ),
  );
}

function selectBalancedByYear(cards: GameTrackCard[], targetCount: number): GameTrackCard[] {
  const cardsByYear = new Map<number, GameTrackCard[]>();
  for (const card of cards) {
    const yearCards = cardsByYear.get(card.releaseYear);
    if (yearCards) {
      yearCards.push(card);
    } else {
      cardsByYear.set(card.releaseYear, [card]);
    }
  }

  const years = [...cardsByYear.keys()].sort((left, right) => left - right);
  const selectedCards: GameTrackCard[] = [];
  let didSelectFromAnyYear = true;

  while (selectedCards.length < targetCount && didSelectFromAnyYear) {
    didSelectFromAnyYear = false;

    for (const year of years) {
      const yearCards = cardsByYear.get(year);
      const nextCard = yearCards?.shift();
      if (!nextCard) continue;

      selectedCards.push(nextCard);
      didSelectFromAnyYear = true;
      if (selectedCards.length >= targetCount) break;
    }
  }

  return selectedCards;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
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

function applyCandidateTrackEdits(
  card: GameTrackCard,
  editedTrack?: EditedCandidateTrack,
): GameTrackCard {
  if (!editedTrack) return card;

  return {
    ...card,
    title: editedTrack.title,
    artist: editedTrack.artist,
    albumTitle: editedTrack.albumTitle,
    releaseYear: editedTrack.releaseYear,
    sourceReleaseYear: editedTrack.sourceReleaseYear ?? card.sourceReleaseYear ?? card.releaseYear,
    metadataStatus: editedTrack.metadataStatus,
    ...(editedTrack.artworkUrl ? { artworkUrl: editedTrack.artworkUrl } : {}),
    ...(editedTrack.previewUrl ? { previewUrl: editedTrack.previewUrl } : {}),
    ...(editedTrack.spotifyTrackUri ? { spotifyTrackUri: editedTrack.spotifyTrackUri } : {}),
  };
}
