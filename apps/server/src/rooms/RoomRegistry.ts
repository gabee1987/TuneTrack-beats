import { GameFlowService, type GameTrackCard } from "@tunetrack/game-engine";
import {
  type AwardTtPayloadParsed,
  type BuyTimelineCardWithTtPayloadParsed,
  type CloseRoomPayloadParsed,
  type ClaimChallengePayloadParsed,
  type ConfirmRevealPayloadParsed,
  type PlaceChallengePayloadParsed,
  type PlaceCardPayloadParsed,
  type PlaylistQueueUpdateMode,
  type PublicRoomSummary,
  type PublicRoomState,
  type RenameRoomPayloadParsed,
  type ResolveChallengeWindowPayloadParsed,
  type RoomId,
  type SkipTrackWithTtPayloadParsed,
  type SpotifyAccountType,
  type StartGamePayloadParsed,
  type TransferHostPayloadParsed,
  type UpdatePlaylistTrackPayloadParsed,
  type UpdatePlayerProfilePayloadParsed,
  type UpdatePlayerSettingsPayloadParsed,
  type UpdateRoomSettingsPayloadParsed,
} from "@tunetrack/shared";
import { RoomConnectionService } from "./RoomConnectionService.js";
import { RoomGameplayService } from "./RoomGameplayService.js";
import { RoomLobbyService } from "./RoomLobbyService.js";
import {
  type JoinRoomResult,
  type KickPlayerResult,
  RoomStore,
} from "./RoomStore.js";
import { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

export type { JoinRoomResult, KickPlayerResult } from "./RoomStore.js";

export class RoomRegistry {
  private static readonly DEFAULT_RECONNECT_GRACE_PERIOD_MS = 30_000;
  private static readonly DEFAULT_HOST_TRANSFER_GRACE_PERIOD_MS = 15_000;
  private static readonly DEFAULT_TURN_SKIP_GRACE_PERIOD_MS = 60_000;

  private readonly store: RoomStore;
  private readonly timers: RoomTimerCoordinator;
  private readonly lobby: RoomLobbyService;
  private readonly gameplay: RoomGameplayService;
  private readonly connection: RoomConnectionService;
  private roomStateChangedListener: ((roomState: PublicRoomState) => void) | null = null;

  public constructor(
    private readonly gameFlowService = new GameFlowService(),
    reconnectGracePeriodMs = RoomRegistry.DEFAULT_RECONNECT_GRACE_PERIOD_MS,
    hostTransferGracePeriodMs = RoomRegistry.DEFAULT_HOST_TRANSFER_GRACE_PERIOD_MS,
    turnSkipGracePeriodMs = RoomRegistry.DEFAULT_TURN_SKIP_GRACE_PERIOD_MS,
  ) {
    const emitRoomStateChanged = (roomState: PublicRoomState): void => {
      this.roomStateChangedListener?.(roomState);
    };

    this.store = new RoomStore();
    this.timers = new RoomTimerCoordinator(
      this.store,
      reconnectGracePeriodMs,
      hostTransferGracePeriodMs,
      turnSkipGracePeriodMs,
    );
    this.connection = new RoomConnectionService(
      this.store,
      this.timers,
      this.gameFlowService,
      emitRoomStateChanged,
    );
    this.lobby = new RoomLobbyService(
      this.store,
      this.timers,
      this.gameFlowService,
      this.connection,
      emitRoomStateChanged,
    );
    this.gameplay = new RoomGameplayService(
      this.store,
      this.timers,
      this.gameFlowService,
      emitRoomStateChanged,
    );
  }

  public setRoomStateChangedListener(listener: (roomState: PublicRoomState) => void): void {
    this.roomStateChangedListener = listener;
  }

  public listRoomSummaries(): PublicRoomSummary[] {
    return this.store.listLobbySummaries();
  }

  public getRoomSummary(roomId: RoomId): PublicRoomSummary | null {
    return this.store.getLobbySummary(roomId);
  }

  public createRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    return this.lobby.createRoom(roomId, displayName, socketId, sessionId);
  }

  public addPlayerToRoom(
    roomId: RoomId,
    displayName: string,
    socketId: string,
    sessionId: string,
  ): JoinRoomResult {
    return this.lobby.addPlayerToRoom(roomId, displayName, socketId, sessionId);
  }

  public removePlayerBySocketId(socketId: string): PublicRoomState | null {
    return this.connection.removePlayerBySocketId(socketId);
  }

  public updateRoomSettings(
    socketId: string,
    roomId: RoomId,
    payload: UpdateRoomSettingsPayloadParsed,
  ): PublicRoomState {
    return this.lobby.updateRoomSettings(socketId, roomId, payload);
  }

  public renameRoom(
    socketId: string,
    payload: RenameRoomPayloadParsed,
  ): { previousRoomId: RoomId; roomState: PublicRoomState } {
    return this.lobby.renameRoom(socketId, payload);
  }

  public updatePlayerSettings(
    socketId: string,
    payload: UpdatePlayerSettingsPayloadParsed,
  ): PublicRoomState {
    return this.lobby.updatePlayerSettings(socketId, payload);
  }

  public updatePlayerProfile(
    socketId: string,
    payload: UpdatePlayerProfilePayloadParsed,
  ): PublicRoomState {
    return this.lobby.updatePlayerProfile(socketId, payload);
  }

  public awardTt(socketId: string, payload: AwardTtPayloadParsed): PublicRoomState {
    return this.lobby.awardTt(socketId, payload);
  }

  public setImportedDeck(socketId: string, roomId: RoomId, deck: GameTrackCard[]): PublicRoomState {
    return this.lobby.setImportedDeck(socketId, roomId, deck);
  }

  public updateImportedDeck(
    socketId: string,
    roomId: RoomId,
    deck: GameTrackCard[],
    mode: PlaylistQueueUpdateMode,
  ): { roomState: PublicRoomState; deck: GameTrackCard[] } {
    return this.lobby.updateImportedDeck(socketId, roomId, deck, mode);
  }

  public setSpotifyAuthStatus(
    socketId: string,
    roomId: RoomId,
    status: "none" | "connected",
    accountType: SpotifyAccountType | null,
  ): PublicRoomState {
    return this.lobby.setSpotifyAuthStatus(socketId, roomId, status, accountType);
  }

  public getImportedDeck(roomId: RoomId): GameTrackCard[] | null {
    return this.store.getImportedDeck(roomId);
  }

  public removeTracksFromImportedDeck(
    socketId: string,
    roomId: RoomId,
    trackIds: string[],
  ): PublicRoomState {
    return this.lobby.removeTracksFromImportedDeck(socketId, roomId, trackIds);
  }

  public updateImportedDeckTrack(
    socketId: string,
    payload: UpdatePlaylistTrackPayloadParsed,
  ): PublicRoomState {
    return this.lobby.updateImportedDeckTrack(socketId, payload);
  }

  public transferHost(socketId: string, payload: TransferHostPayloadParsed): PublicRoomState {
    return this.connection.transferHost(socketId, payload);
  }

  public getRoomStateForMember(socketId: string, roomId: RoomId): PublicRoomState {
    return this.store.getRoomRecordForMember(socketId, roomId).roomState;
  }

  public startGame(
    socketId: string,
    payload: StartGamePayloadParsed,
    deckCards: GameTrackCard[],
  ): PublicRoomState {
    return this.gameplay.startGame(socketId, payload, deckCards);
  }

  public closeRoom(socketId: string, payload: CloseRoomPayloadParsed): RoomId {
    return this.lobby.closeRoom(socketId, payload);
  }

  public skipTurn(socketId: string, payload: { roomId: RoomId }): PublicRoomState {
    return this.gameplay.skipTurn(socketId, payload);
  }

  public skipTrackWithTt(socketId: string, payload: SkipTrackWithTtPayloadParsed): PublicRoomState {
    return this.gameplay.skipTrackWithTt(socketId, payload);
  }

  public buyTimelineCardWithTt(
    socketId: string,
    payload: BuyTimelineCardWithTtPayloadParsed,
  ): PublicRoomState {
    return this.gameplay.buyTimelineCardWithTt(socketId, payload);
  }

  public placeCard(socketId: string, payload: PlaceCardPayloadParsed): PublicRoomState {
    return this.gameplay.placeCard(socketId, payload);
  }

  public claimChallenge(socketId: string, payload: ClaimChallengePayloadParsed): PublicRoomState {
    return this.gameplay.claimChallenge(socketId, payload);
  }

  public placeChallenge(socketId: string, payload: PlaceChallengePayloadParsed): PublicRoomState {
    return this.gameplay.placeChallenge(socketId, payload);
  }

  public resolveChallengeWindow(
    socketId: string,
    payload: ResolveChallengeWindowPayloadParsed,
  ): PublicRoomState {
    return this.gameplay.resolveChallengeWindow(socketId, payload);
  }

  public confirmReveal(socketId: string, payload: ConfirmRevealPayloadParsed): PublicRoomState {
    return this.gameplay.confirmReveal(socketId, payload);
  }

  public kickPlayer(
    socketId: string,
    payload: { roomId: RoomId; playerId: string },
  ): KickPlayerResult {
    return this.connection.kickPlayer(socketId, payload);
  }

  public requireHost(socketId: string, roomId: RoomId): void {
    const membership = this.store.requireMembership(socketId);
    const roomRecord = this.store.getRoomRecordForMember(socketId, roomId);
    if (roomRecord.roomState.hostId !== membership.playerId) {
      throw new Error("ONLY_HOST_CAN_CONTROL_SPOTIFY_PLAYBACK");
    }
  }
}
