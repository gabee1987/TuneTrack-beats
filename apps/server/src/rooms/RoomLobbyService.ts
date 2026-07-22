import { GameFlowService, type GameTrackCard } from "@tunetrack/game-engine";
import { randomUUID } from "node:crypto";
import {
  type AwardTtPayloadParsed,
  type CloseRoomPayloadParsed,
  type PlaylistQueueUpdateMode,
  type PublicRoomState,
  type RenameRoomPayloadParsed,
  type RoomId,
  type SpotifyAccountType,
  type UpdatePlaylistTrackPayloadParsed,
  type UpdatePlayerProfilePayloadParsed,
  type UpdatePlayerSettingsPayloadParsed,
  type UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import type { RoomConnectionService } from "./RoomConnectionService.js";
import {
  buildAwardedTtLobbyRoomState,
  buildImportedDeckRoomState,
  buildInitialRoomState,
  buildPlayerJoinedRoomState,
  buildRenamedRoomState,
  buildRemovedTracksRoomState,
  buildSpotifyAuthRoomState,
  buildUpdatedPlayerSettingsRoomState,
  buildUpdatedProfileRoomState,
  buildUpdatedSettingsRoomState,
} from "./roomLobbyBuilders.js";
import { mapGameStateToPublicRoomState } from "./roomStateMappers.js";
import type { JoinRoomResult, RoomStore } from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type RoomStateChangedEmitter = (roomState: PublicRoomState) => void;

export class RoomLobbyService {
  private static readonly MAX_ACTIVE_ROOM_COUNT = 5;

  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly connection: RoomConnectionService,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
  ) {}

  public createRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    if (this.store.hasRoom(roomId)) {
      throw new Error("ROOM_ALREADY_EXISTS");
    }

    const existingSessionMembership = this.store.getSessionMembership(sessionId);
    if (existingSessionMembership) {
      const previousRoomState = this.connection.removePlayerBySessionId(sessionId);
      if (previousRoomState) {
        this.emitRoomStateChanged(previousRoomState);
      }
    }

    if (this.store.roomCount >= RoomLobbyService.MAX_ACTIVE_ROOM_COUNT) {
      throw new Error("ROOM_LIMIT_REACHED");
    }

    const playerId = randomUUID();
    const roomState = buildInitialRoomState(roomId, playerId, displayName);
    this.store.setRoom(roomId, {
      gameState: null,
      roomState,
      trackCardsById: new Map<string, GameTrackCard>(),
      importedDeck: null,
    });
    this.store.setSocketMembership(socketId, { playerId, roomId, sessionId });
    this.store.setSessionMembership(sessionId, { playerId, roomId });
    return { playerId, roomState };
  }

  public addPlayerToRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    const existingRoomRecord = this.store.getRoom(roomId);
    const existingSessionMembership = this.store.getSessionMembership(sessionId);

    if (existingSessionMembership?.roomId === roomId) {
      return this.connection.restorePlayerSession(
        roomId,
        existingSessionMembership.playerId,
        socketId,
        sessionId,
      );
    }

    if (
      existingSessionMembership &&
      !existingRoomRecord &&
      this.store.getRedirect(roomId) === existingSessionMembership.roomId
    ) {
      const restoredExistingRoom = this.connection.tryRestoreExistingSessionRoom(
        existingSessionMembership,
        socketId,
        sessionId,
      );
      if (restoredExistingRoom) return restoredExistingRoom;
    }

    if (existingSessionMembership) {
      const previousRoomState = this.connection.removePlayerBySessionId(sessionId);
      if (previousRoomState) {
        this.emitRoomStateChanged(previousRoomState);
      }
    }

    const playerId = randomUUID();

    if (!existingRoomRecord) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (existingRoomRecord.roomState.status !== "lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }

    const nextRoomState = buildPlayerJoinedRoomState(
      existingRoomRecord.roomState,
      playerId,
      displayName,
    );
    this.store.setRoom(roomId, { ...existingRoomRecord, roomState: nextRoomState });
    this.store.setSocketMembership(socketId, { playerId, roomId, sessionId });
    this.store.setSessionMembership(sessionId, { playerId, roomId });
    return { playerId, roomState: nextRoomState };
  }

  public updateRoomSettings(
    socketId: string,
    roomId: RoomId,
    payload: UpdateRoomSettingsPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_ROOM_SETTINGS");
    }

    const nextRoomState = buildUpdatedSettingsRoomState(roomRecord.roomState, payload);
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public renameRoom(
    socketId: string,
    payload: RenameRoomPayloadParsed,
  ): { previousRoomId: RoomId; roomState: PublicRoomState } {
    if (payload.roomId === payload.nextRoomId) {
      return {
        previousRoomId: payload.roomId,
        roomState: this.store.getRoomRecordForMember(socketId, payload.roomId).roomState,
      };
    }

    if (this.store.hasRoom(payload.nextRoomId)) {
      throw new Error("ROOM_ALREADY_EXISTS");
    }

    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_RENAME_ROOM");
    }
    if (roomRecord.roomState.status !== "lobby") {
      throw new Error("GAME_ALREADY_STARTED");
    }

    const nextRoomState = buildRenamedRoomState(roomRecord.roomState, payload.nextRoomId);
    this.store.deleteRoom(payload.roomId);
    this.store.retargetRoomRedirects(payload.roomId, payload.nextRoomId);
    this.store.setRedirect(payload.roomId, payload.nextRoomId);
    this.store.setRoom(payload.nextRoomId, {
      ...roomRecord,
      roomState: nextRoomState,
    });
    this.store.retargetMembershipsToRoom(payload.roomId, payload.nextRoomId);

    return { previousRoomId: payload.roomId, roomState: nextRoomState };
  }

  public updatePlayerSettings(
    socketId: string,
    payload: UpdatePlayerSettingsPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_UPDATE_PLAYER_SETTINGS");
    }
    if (!roomRecord.roomState.players.some((p) => p.id === payload.playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const nextRoomState = buildUpdatedPlayerSettingsRoomState(roomRecord.roomState, payload);
    this.store.setRoom(payload.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public updatePlayerProfile(
    socketId: string,
    payload: UpdatePlayerProfilePayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.status !== "lobby") throw new Error("GAME_ALREADY_STARTED");

    const nextRoomState = buildUpdatedProfileRoomState(
      roomRecord.roomState,
      membership.playerId,
      payload.displayName,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public awardTt(socketId: string, payload: AwardTtPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_AWARD_TT");
    if (!roomRecord.roomState.players.some((p) => p.id === payload.playerId)) {
      throw new Error("PLAYER_NOT_FOUND");
    }

    const nextGameState = roomRecord.gameState
      ? this.gameFlowService.awardTtTokens(roomRecord.gameState, payload.playerId, payload.amount)
      : null;
    const nextRoomState = nextGameState
      ? mapGameStateToPublicRoomState(
          roomRecord.roomState,
          nextGameState,
          roomRecord.trackCardsById,
        )
      : buildAwardedTtLobbyRoomState(roomRecord.roomState, payload.playerId, payload.amount);

    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
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
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_IMPORT_PLAYLIST");

    const nextDeck = dedupeImportedDeck(
      mode === "append" ? [...(roomRecord.importedDeck ?? []), ...deck] : deck,
    );
    const nextRoomState = buildImportedDeckRoomState(roomRecord.roomState, nextDeck);
    this.store.setRoom(roomId, {
      ...roomRecord,
      roomState: nextRoomState,
      importedDeck: nextDeck,
    });
    return { roomState: nextRoomState, deck: nextDeck };
  }

  public setSpotifyAuthStatus(
    socketId: string,
    roomId: RoomId,
    status: "none" | "connected",
    accountType: SpotifyAccountType | null,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_SET_SPOTIFY_AUTH");

    const nextRoomState = buildSpotifyAuthRoomState(roomRecord.roomState, status, accountType);
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });
    return nextRoomState;
  }

  public removeTracksFromImportedDeck(
    socketId: string,
    roomId: RoomId,
    trackIds: string[],
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_EDIT_PLAYLIST");
    if (!roomRecord.importedDeck) throw new Error("NO_PLAYLIST_IMPORTED");

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
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_EDIT_PLAYLIST");
    if (!roomRecord.importedDeck) throw new Error("NO_PLAYLIST_IMPORTED");

    let didUpdateTrack = false;
    const nextDeck = roomRecord.importedDeck.map((card) => {
      if (card.id !== payload.trackId) return card;

      didUpdateTrack = true;
      const nextReleaseYear = payload.releaseYear ?? card.releaseYear;
      const didChangeMetadata =
        payload.title !== undefined ||
        payload.artist !== undefined ||
        payload.albumTitle !== undefined ||
        payload.releaseYear !== undefined;

      return {
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
    });

    if (!didUpdateTrack) throw new Error("PLAYLIST_TRACK_NOT_FOUND");

    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      importedDeck: nextDeck,
    });
    return roomRecord.roomState;
  }

  public closeRoom(socketId: string, payload: CloseRoomPayloadParsed): RoomId {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_CLOSE_ROOM");

    this.timers.clearForRoom(payload.roomId);
    this.store.clearMembershipsForRoom(payload.roomId);
    this.store.deleteRoom(payload.roomId);
    this.store.clearRoomRedirects(payload.roomId);
    return payload.roomId;
  }
}

function dedupeImportedDeck(deck: GameTrackCard[]): GameTrackCard[] {
  const seen = new Set<string>();
  const dedupedDeck: GameTrackCard[] = [];

  for (const card of deck) {
    const key = card.spotifyTrackUri ?? `${normalize(card.title)}:${normalize(card.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedDeck.push(card);
  }

  return dedupedDeck;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
