import type { GameTrackCard } from "@tunetrack/game-engine";
import type {
  GetPlaylistTracksPayloadParsed,
  ImportPlaylistPayloadParsed,
  ImportPlaylistResultPayload,
  LoadCuratedPlaylistPayloadParsed,
  PublicRoomState,
  PublicTrackInfo,
  RemovePlaylistTracksPayloadParsed,
  UpdatePlaylistTrackPayloadParsed,
} from "@tunetrack/shared";
import { logger } from "../app/logger.js";
import { cardToPublicTrackInfo } from "../rooms/publicTrackInfo.js";
import type { RoomLobbyService } from "../rooms/RoomLobbyService.js";
import type { RoomStore } from "../rooms/RoomStore.js";
import type { PlaylistImportService } from "./PlaylistImportService.js";

export interface ImportPlaylistServiceResult {
  roomState: PublicRoomState;
  resultPayload: ImportPlaylistResultPayload;
}

const NOT_MUSIC_SETUP_HOST = "ONLY_HOST_CAN_IMPORT_PLAYLIST";

/** The room deck as the host curates it in the lobby: import, curated load, edit, remove. */
export class PlaylistOrchestrator {
  public constructor(
    private readonly store: RoomStore,
    private readonly lobby: RoomLobbyService,
    private readonly playlistImportService: PlaylistImportService,
  ) {}

  public importPlaylist(
    payload: ImportPlaylistPayloadParsed,
    socketId: string,
  ): Promise<ImportPlaylistServiceResult> {
    this.lobby.requireHostInLobby(socketId, payload.roomId, NOT_MUSIC_SETUP_HOST);
    return this.importAuthorizedPlaylist(payload, socketId);
  }

  private async importAuthorizedPlaylist(
    payload: ImportPlaylistPayloadParsed,
    socketId: string,
  ): Promise<ImportPlaylistServiceResult> {
    const outcome = await this.playlistImportService.importFromUrl(payload.playlistUrl);

    if (!outcome.success) {
      return {
        roomState: this.store.getRoomStateForMember(socketId, payload.roomId),
        resultPayload: outcome.payload,
      };
    }

    const roomState = this.lobby.setImportedDeck(socketId, payload.roomId, outcome.cards);

    return {
      roomState,
      resultPayload: {
        success: true,
        importedCount: outcome.importedCount,
        filteredCount: outcome.filteredCount,
        totalFetched: outcome.totalFetched,
        ...(outcome.playlistName ? { playlistName: outcome.playlistName } : {}),
      },
    };
  }

  public loadCuratedPlaylist(
    payload: LoadCuratedPlaylistPayloadParsed,
    socketId: string,
  ): { roomState: PublicRoomState; tracks: PublicTrackInfo[] } {
    const deck: GameTrackCard[] = payload.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      albumTitle: track.albumTitle,
      releaseYear: track.releaseYear,
      sourceReleaseYear: track.sourceReleaseYear ?? track.releaseYear,
      metadataStatus: track.metadataStatus,
      ...(track.artworkUrl ? { artworkUrl: track.artworkUrl } : {}),
      ...(track.previewUrl ? { previewUrl: track.previewUrl } : {}),
      ...(track.spotifyTrackUri ? { spotifyTrackUri: track.spotifyTrackUri } : {}),
    }));

    const { roomState, deck: nextDeck } = this.lobby.updateImportedDeck(
      socketId,
      payload.roomId,
      deck,
      payload.mode,
    );
    logger.info(
      { roomId: payload.roomId, mode: payload.mode, trackCount: nextDeck.length },
      "curated playlist loaded",
    );
    return { roomState, tracks: nextDeck.map(cardToPublicTrackInfo) };
  }

  public getPlaylistTracks(
    payload: GetPlaylistTracksPayloadParsed,
    socketId: string,
  ): PublicTrackInfo[] {
    this.lobby.requireHostInLobby(socketId, payload.roomId, "ONLY_HOST_CAN_EDIT_PLAYLIST");
    const deck = this.store.getImportedDeck(payload.roomId);
    if (!deck) return [];
    return deck.map(cardToPublicTrackInfo);
  }

  public removePlaylistTracks(
    payload: RemovePlaylistTracksPayloadParsed,
    socketId: string,
  ): { roomState: PublicRoomState; tracks: PublicTrackInfo[] } {
    const roomState = this.lobby.removeTracksFromImportedDeck(
      socketId,
      payload.roomId,
      payload.trackIds,
    );
    logger.info(
      {
        roomId: payload.roomId,
        removedCount: payload.trackIds.length,
        remainingCount: roomState.settings.importedTrackCount,
      },
      "playlist tracks removed",
    );
    const deck = this.store.getImportedDeck(payload.roomId);
    const tracks = (deck ?? []).map(cardToPublicTrackInfo);
    return { roomState, tracks };
  }

  public updatePlaylistTrack(
    payload: UpdatePlaylistTrackPayloadParsed,
    socketId: string,
  ): { roomState: PublicRoomState; track: PublicTrackInfo } {
    const { roomState, track } = this.lobby.updateImportedDeckTrack(socketId, payload);
    logger.info({ roomId: payload.roomId, trackId: payload.trackId }, "playlist track updated");
    return { roomState, track: cardToPublicTrackInfo(track) };
  }
}
