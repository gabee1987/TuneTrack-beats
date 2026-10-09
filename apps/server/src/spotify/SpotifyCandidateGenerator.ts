import type { GameTrackCard } from "@tunetrack/game-engine";
import type {
  SpotifyCandidateSource,
  SpotifyCandidatesAppliedPayload,
  SpotifyCandidatesGeneratedPayload,
} from "@tunetrack/shared";
import { getSpotifyQuickPickPreset } from "@tunetrack/shared";
import { logAuditEvent } from "../app/auditLogger.js";
import { logger } from "../app/logger.js";
import { dedupeTracks } from "../decks/trackDedupe.js";
import { cardToPublicTrackInfo } from "../rooms/publicTrackInfo.js";
import { CandidateSessionStore } from "./CandidateSessionStore.js";
import {
  applyCandidateTrackEdits,
  filterCardsByYearRanges,
  interleaveCardGroups,
  selectBalancedByYear,
  type EditedCandidateTrack,
  type TrackYearRange,
} from "./candidateSelection.js";
import { SpotifyApiError } from "./spotifyApiTypes.js";
import type { SpotifyCatalogClient } from "./SpotifyCatalogClient.js";
import type { SpotifyClientCredentials } from "./SpotifyClientCredentials.js";
import type { SpotifyPlaylistSearch } from "./SpotifyPlaylistSearch.js";
import { mapSpotifyTrackToGameCard } from "./SpotifyTrackMapper.js";
import { mapWithConcurrency } from "./mapWithConcurrency.js";

/** `05` §2.4: bounds the Spotify fan-out. */
const MAX_CONCURRENT_PLAYLIST_FETCHES = 3;
const MIN_CANDIDATE_TRACK_COUNT = 10;
const SPOTIFY_QUICK_PICK_PLAYLISTS_PER_QUERY = 5;
const SPOTIFY_QUICK_PICK_MAX_PLAYLISTS = 18;

interface GenerateFromPlaylistsOptions {
  sourceSummary?: string;
  yearRanges?: readonly TrackYearRange[];
  balanceByYear?: boolean;
  interleaveSources?: boolean;
}

export interface GenerateFromPlaylistsResult {
  payload: SpotifyCandidatesGeneratedPayload;
}

export interface ApplyCandidatesResult {
  payload: SpotifyCandidatesAppliedPayload;
  cards: GameTrackCard[] | null;
}

/** Builds candidate track lists from playlists or a Quick Pick, and applies the host's choice. */
export class SpotifyCandidateGenerator {
  public constructor(
    private readonly catalog: SpotifyCatalogClient,
    private readonly clientCredentials: SpotifyClientCredentials,
    private readonly playlistSearch: SpotifyPlaylistSearch,
    private readonly sessions = new CandidateSessionStore(),
  ) {}

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
      const accessToken = await this.clientCredentials.getAccessToken();
      const rawTrackResults = await mapWithConcurrency(
        uniquePlaylistIds,
        MAX_CONCURRENT_PLAYLIST_FETCHES,
        (playlistId) => this.catalog.getAllPlaylistTracks(playlistId, accessToken),
      );
      const cardGroups: GameTrackCard[][] = [];
      let filteredCount = 0;

      for (const rawTracks of rawTrackResults) {
        const cards: GameTrackCard[] = [];
        for (const track of rawTracks) {
          const card = mapSpotifyTrackToGameCard(track);
          if (card) {
            cards.push(card);
          } else {
            filteredCount++;
          }
        }
        cardGroups.push(cards);
      }

      const rawTracks = rawTrackResults.flat();
      const cards = options.interleaveSources
        ? interleaveCardGroups(cardGroups)
        : cardGroups.flat();
      const { tracks: dedupedCards, duplicateCount } = dedupeTracks(cards);
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

      const session = this.sessions.create(
        roomId,
        options.sourceSummary ??
          `${uniquePlaylistIds.length} Spotify playlist${uniquePlaylistIds.length === 1 ? "" : "s"}`,
        selectedCards,
      );

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
      const accessToken = await this.clientCredentials.getAccessToken();
      const playlistIds: string[] = [];
      const seenPlaylistIds = new Set<string>();

      for (const query of preset.searchQueries) {
        const playlists = await this.playlistSearch.searchUsablePlaylists(
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

      return this.generateFromPlaylists(roomId, playlistIds, targetCount, {
        sourceSummary: `${preset.name} Quick Pick`,
        yearRanges: preset.yearRanges,
        balanceByYear: true,
        interleaveSources: true,
      });
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
    const session = this.sessions.findForRoom(roomId, candidateSessionId);
    if (!session) {
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

    this.sessions.delete(candidateSessionId);
    return {
      cards: selectedCards,
      payload: {
        success: true,
        importedCount: selectedCards.length,
      },
    };
  }

  public retargetRoom(previousRoomId: string, nextRoomId: string): void {
    this.sessions.retargetRoom(previousRoomId, nextRoomId);
  }
}
