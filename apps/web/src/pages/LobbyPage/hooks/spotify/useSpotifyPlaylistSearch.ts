import {
  ClientToServerEvent,
  ServerToClientEvent,
  type SpotifyPlaylistSearchItem,
  type SpotifyPlaylistSearchResultPayload,
} from "@tunetrack/shared";
import { useCallback, useState } from "react";
import { getSocketClient } from "../../../../services/socket/socketClient";
import type { PlaylistSearchPhase } from "./lobbySpotify.types";

interface UseSpotifyPlaylistSearchParams {
  roomId: string | undefined;
  setCandidateError: (message: string | null) => void;
  setGeneratedPlaylistMessage: (message: string | null) => void;
  setSelectedSpotifyPlaylistIds: (playlistIds: Set<string>) => void;
}

export function useSpotifyPlaylistSearch({
  roomId,
  setCandidateError,
  setGeneratedPlaylistMessage,
  setSelectedSpotifyPlaylistIds,
}: UseSpotifyPlaylistSearchParams) {
  const [playlistSearchPhase, setPlaylistSearchPhase] = useState<PlaylistSearchPhase>("idle");
  const [playlistSearchError, setPlaylistSearchError] = useState<string | null>(null);
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState("");
  const [playlistSearchResults, setPlaylistSearchResults] = useState<SpotifyPlaylistSearchItem[]>(
    [],
  );

  function searchSpotifyPlaylists() {
    if (!roomId || playlistSearchQuery.trim().length < 2) return;

    setPlaylistSearchPhase("searching");
    setPlaylistSearchError(null);
    setGeneratedPlaylistMessage(null);

    void getSocketClient().then((socket) => {
      function handleResult(payload: SpotifyPlaylistSearchResultPayload) {
        socket.off(ServerToClientEvent.SpotifyPlaylistSearchResult, handleResult);

        if (payload.success) {
          setPlaylistSearchPhase("idle");
          setPlaylistSearchResults(payload.playlists);
          setSelectedSpotifyPlaylistIds(new Set());
          setCandidateError(null);
        } else {
          setPlaylistSearchPhase("error");
          setPlaylistSearchError(payload.message);
        }
      }

      socket.on(ServerToClientEvent.SpotifyPlaylistSearchResult, handleResult);
      socket.emit(ClientToServerEvent.SearchSpotifyPlaylists, {
        roomId,
        query: playlistSearchQuery.trim(),
        limit: 30,
      });
    });
  }

  function clearPlaylistSearch() {
    setPlaylistSearchResults([]);
    setPlaylistSearchQuery("");
  }

  const resetPlaylistSearch = useCallback(() => {
    setPlaylistSearchPhase("idle");
    setPlaylistSearchError(null);
    setPlaylistSearchResults([]);
  }, []);

  return {
    clearPlaylistSearch,
    playlistSearchError,
    playlistSearchPhase,
    playlistSearchQuery,
    playlistSearchResults,
    resetPlaylistSearch,
    searchSpotifyPlaylists,
    setPlaylistSearchQuery,
  };
}
