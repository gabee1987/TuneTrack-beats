import type { GameTrackCard } from "@tunetrack/game-engine";
import {
  DomainError,
  type PlaylistQueueUpdateMode,
  type PublicRoomState,
  type RoomId,
  type ServerErrorCode,
  type UpdatePlaylistTrackPayloadParsed,
} from "@tunetrack/shared";
import { dedupeTracks } from "../decks/trackDedupe.js";
import { requireHost } from "./roomAuthorization.js";
import { buildImportedDeckRoomState, buildRemovedTracksRoomState } from "./roomLobbyBuilders.js";
import type { RoomRecord, RoomStore } from "./RoomStore.js";

/** The room's imported deck as the host curates it in the lobby. */
export class RoomDeckService {
  public constructor(private readonly store: RoomStore) {}

  // The deck carries every release year, so reading or changing it is a host tool for the lobby
  // only; the host is also a player and must not see the answers once the game runs.
  public requireHostInLobby(
    socketId: string,
    roomId: RoomId,
    notHostCode: ServerErrorCode,
  ): RoomRecord {
    requireHost(this.store, socketId, roomId, notHostCode);
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    if (roomRecord.roomState.status !== "lobby") throw new DomainError("GAME_ALREADY_STARTED");
    return roomRecord;
  }

  public setImportedDeck(socketId: string, roomId: RoomId, deck: GameTrackCard[]): PublicRoomState {
    return this.updateImportedDeck(socketId, roomId, deck, "replace").roomState;
  }

  public updateImportedDeck(
    socketId: string,
    roomId: RoomId,
    deck: GameTrackCard[],
    mode: PlaylistQueueUpdateMode,
  ): { roomState: PublicRoomState; deck: GameTrackCard[] } {
    const roomRecord = this.requireHostInLobby(socketId, roomId, "ONLY_HOST_CAN_IMPORT_PLAYLIST");

    const nextDeck = dedupeTracks(
      mode === "append" ? [...(roomRecord.importedDeck ?? []), ...deck] : deck,
    ).tracks;
    const nextRoomState = buildImportedDeckRoomState(roomRecord.roomState, nextDeck);
    this.store.setRoom(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: nextDeck,
    });
    return { roomState: nextRoomState, deck: nextDeck };
  }

  public removeTracksFromImportedDeck(
    socketId: string,
    roomId: RoomId,
    trackIds: string[],
  ): PublicRoomState {
    const roomRecord = this.requireHostInLobby(socketId, roomId, "ONLY_HOST_CAN_EDIT_PLAYLIST");
    if (!roomRecord.importedDeck) throw new DomainError("NO_PLAYLIST_IMPORTED");

    const removeSet = new Set(trackIds);
    const nextDeck = roomRecord.importedDeck.filter((card) => !removeSet.has(card.id));
    const nextRoomState = buildRemovedTracksRoomState(roomRecord.roomState, nextDeck);
    this.store.setRoom(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: nextDeck.length > 0 ? nextDeck : null,
    });
    return nextRoomState;
  }

  public updateImportedDeckTrack(
    socketId: string,
    payload: UpdatePlaylistTrackPayloadParsed,
  ): { roomState: PublicRoomState; track: GameTrackCard } {
    const roomRecord = this.requireHostInLobby(
      socketId,
      payload.roomId,
      "ONLY_HOST_CAN_EDIT_PLAYLIST",
    );
    if (!roomRecord.importedDeck) throw new DomainError("NO_PLAYLIST_IMPORTED");

    let updatedTrack: GameTrackCard | null = null;
    const nextDeck = roomRecord.importedDeck.map((card) => {
      if (card.id !== payload.trackId) return card;

      const nextReleaseYear = payload.releaseYear ?? card.releaseYear;
      const didChangeMetadata =
        payload.title !== undefined ||
        payload.artist !== undefined ||
        payload.albumTitle !== undefined ||
        payload.releaseYear !== undefined;

      updatedTrack = {
        ...card,
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.artist !== undefined ? { artist: payload.artist } : {}),
        ...(payload.albumTitle !== undefined ? { albumTitle: payload.albumTitle } : {}),
        releaseYear: nextReleaseYear,
        sourceReleaseYear: card.sourceReleaseYear ?? card.releaseYear,
        metadataStatus:
          payload.metadataStatus ??
          (didChangeMetadata ? "edited" : (card.metadataStatus ?? "imported")),
      };
      return updatedTrack;
    });

    if (!updatedTrack) throw new DomainError("PLAYLIST_TRACK_NOT_FOUND");

    const nextRoomState = buildImportedDeckRoomState(roomRecord.roomState, nextDeck);
    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: nextDeck,
    });
    return { roomState: nextRoomState, track: updatedTrack };
  }
}
