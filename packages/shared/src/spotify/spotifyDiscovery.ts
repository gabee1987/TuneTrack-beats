import type { PublicTrackInfo } from "./playlistTracks.js";
import type { SpotifyQuickPickPresetId } from "./spotifyQuickPicks.js";

export const SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT = 500;

export interface SpotifyPlaylistSearchItem {
  id: string;
  name: string;
  ownerName: string;
  trackCount: number;
  imageUrl?: string;
}

export type SpotifyPlaylistSearchResultPayload =
  | {
      success: true;
      query: string;
      playlists: SpotifyPlaylistSearchItem[];
    }
  | {
      success: false;
      code: "invalid_query" | "spotify_api_error";
      message: string;
    };

export type SpotifyCandidateSource =
  | {
      type: "playlists";
      playlistIds: string[];
      targetCount: number;
    }
  | {
      type: "preset";
      presetId: SpotifyQuickPickPresetId;
      targetCount: number;
    };

export interface SpotifyCandidatesGeneratedSuccessPayload {
  success: true;
  candidateSessionId: string;
  sourceSummary: string;
  tracks: PublicTrackInfo[];
  importedCount: number;
  filteredCount: number;
  duplicateCount: number;
  totalFetched: number;
}

export type SpotifyCandidatesGeneratedPayload =
  | SpotifyCandidatesGeneratedSuccessPayload
  | {
      success: false;
      code: "invalid_source" | "too_few_tracks" | "spotify_api_error";
      message: string;
    };

export type SpotifyCandidatesAppliedPayload =
  | {
      success: true;
      importedCount: number;
    }
  | {
      success: false;
      code: "candidate_session_expired" | "too_few_tracks" | "spotify_api_error";
      message: string;
    };
