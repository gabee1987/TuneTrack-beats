import {
  ClientToServerEvent,
  ServerToClientEvent,
  SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  type PlaylistQueueUpdateMode,
  type PublicTrackInfo,
  type SpotifyCandidateSource,
  type SpotifyCandidatesAppliedPayload,
  type SpotifyCandidatesGeneratedPayload,
  type SpotifyQuickPickPresetId,
} from "@tunetrack/shared";
import { useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import { useI18n } from "../../../../features/i18n";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { CandidatePhase, CandidateTrackUpdatePatch } from "./lobbySpotify.types";

interface UseSpotifyCandidatesParams {
  currentPlaylistNameRef: MutableRefObject<string | undefined>;
  roomId: string | undefined;
  setGeneratedPlaylistMessage: (message: string | null) => void;
  setSavedPlaylistMessage: (message: string | null) => void;
  showGeneratedPlaylistMessage: (message: string) => void;
}

export function useSpotifyCandidates({
  currentPlaylistNameRef,
  roomId,
  setGeneratedPlaylistMessage,
  setSavedPlaylistMessage,
  showGeneratedPlaylistMessage,
}: UseSpotifyCandidatesParams) {
  const { t } = useI18n();
  const [selectedSpotifyPlaylistIds, setSelectedSpotifyPlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [candidatePhase, setCandidatePhase] = useState<CandidatePhase>("idle");
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [candidateSessionId, setCandidateSessionId] = useState<string | null>(null);
  const [candidateSourceSummary, setCandidateSourceSummary] = useState<string | null>(null);
  const [candidateTracks, setCandidateTracks] = useState<PublicTrackInfo[]>([]);

  function toggleSpotifyPlaylistSelection(playlistId: string) {
    setSelectedSpotifyPlaylistIds((current) => {
      const next = new Set(current);
      if (next.has(playlistId)) {
        next.delete(playlistId);
      } else {
        next.add(playlistId);
      }
      return next;
    });
  }

  function requestSpotifyCandidateGeneration(source: SpotifyCandidateSource) {
    if (!roomId) return;

    setCandidatePhase("generating");
    setCandidateError(null);
    setGeneratedPlaylistMessage(null);

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifyCandidatesGeneratedPayload) {
        socket.off(ServerToClientEvent.SpotifyCandidatesGenerated, handleResult);

        if (payload.success) {
          setCandidatePhase("ready");
          setCandidateError(null);
          setCandidateSessionId(payload.candidateSessionId);
          setCandidateSourceSummary(payload.sourceSummary);
          setCandidateTracks(payload.tracks);
        } else {
          setCandidatePhase("error");
          setCandidateError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyCandidatesGenerated, handleResult);
      socket.emit(ClientToServerEvent.GenerateSpotifyCandidates, {
        roomId,
        source,
      });
    });
  }

  function generateCandidatesFromSelectedPlaylists() {
    if (selectedSpotifyPlaylistIds.size === 0) return;

    requestSpotifyCandidateGeneration({
      type: "playlists",
      playlistIds: Array.from(selectedSpotifyPlaylistIds),
      targetCount: SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
    });
  }

  function generateCandidatesFromPreset(
    presetId: SpotifyQuickPickPresetId,
    targetCount = SPOTIFY_GENERATED_PLAYLIST_TRACK_LIMIT,
  ) {
    requestSpotifyCandidateGeneration({
      type: "preset",
      presetId,
      targetCount,
    });
  }

  function discardGeneratedCandidates() {
    setCandidatePhase("idle");
    setCandidateError(null);
    setCandidateSessionId(null);
    setCandidateSourceSummary(null);
    setCandidateTracks([]);
  }

  function removeCandidateTrack(trackId: string) {
    setCandidateTracks((tracks) => tracks.filter((track) => track.id !== trackId));
  }

  function updateCandidateTrack(trackId: string, patch: CandidateTrackUpdatePatch) {
    setCandidateTracks((tracks) =>
      tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              ...patch,
              sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
              metadataStatus: patch.metadataStatus ?? track.metadataStatus,
            }
          : track,
      ),
    );
  }

  function useGeneratedCandidates(mode: PlaylistQueueUpdateMode = "replace") {
    if (!roomId || !candidateSessionId || candidateTracks.length === 0) return;

    setCandidatePhase("applying");
    setCandidateError(null);

    void getSocketClient().then((socket) => {
      function handleApplied(payload: SpotifyCandidatesAppliedPayload) {
        socket.off(ServerToClientEvent.SpotifyCandidatesApplied, handleApplied);

        if (payload.success) {
          const appliedMessage =
            mode === "append"
              ? t("lobby.spotify.builder.playlistTracksAdded", { count: candidateTracks.length })
              : t("lobby.spotify.generatedPlaylistApplied", { count: payload.importedCount });
          setCandidatePhase("idle");
          setCandidateError(null);
          setCandidateSessionId(null);
          setCandidateSourceSummary(null);
          setCandidateTracks([]);
          currentPlaylistNameRef.current = candidateSourceSummary ?? undefined;
          setSavedPlaylistMessage(appliedMessage);
          showGeneratedPlaylistMessage(appliedMessage);
        } else {
          setCandidatePhase("error");
          setCandidateError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyCandidatesApplied, handleApplied);
      socket.emit(ClientToServerEvent.UseSpotifyCandidates, {
        roomId,
        candidateSessionId,
        trackIds: candidateTracks.map((track) => track.id),
        tracks: candidateTracks,
        mode,
      });
    });
  }

  const resetCandidates = useCallback(() => {
    setSelectedSpotifyPlaylistIds(new Set());
    setCandidatePhase("idle");
    setCandidateError(null);
    setCandidateSessionId(null);
    setCandidateSourceSummary(null);
    setCandidateTracks([]);
  }, []);

  return {
    candidateError,
    candidatePhase,
    candidateSessionId,
    candidateSourceSummary,
    candidateTracks,
    discardGeneratedCandidates,
    generateCandidatesFromPreset,
    generateCandidatesFromSelectedPlaylists,
    removeCandidateTrack,
    resetCandidates,
    selectedSpotifyPlaylistIds,
    setCandidateError,
    setSelectedSpotifyPlaylistIds,
    toggleSpotifyPlaylistSelection,
    updateCandidateTrack,
    useGeneratedCandidates,
  };
}
