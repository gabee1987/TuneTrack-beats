import {
  GameFlowService,
  type GameState,
  type GameTrackCard,
  isChallengeWindowExpired,
} from "@tunetrack/game-engine";
import {
  type BuyTimelineCardWithTtPayloadParsed,
  type ClaimChallengePayloadParsed,
  type ConfirmRevealPayloadParsed,
  type PlaceChallengePayloadParsed,
  type PlaceCardPayloadParsed,
  type PublicRoomState,
  type ResolveChallengeWindowPayloadParsed,
  type RoomId,
  type SkipTrackWithTtPayloadParsed,
  type StartGamePayloadParsed,
  DomainError,
} from "@tunetrack/shared";
import { selectNextConnectedTurnPlayer } from "./roomConnectionBuilders.js";
import { logGameStarted, logTurnProgress } from "./roomLifecycleLog.js";
import { createTrackCardMap, mapGameStateToPublicRoomState } from "./roomStateMappers.js";
import type { RoomStore } from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type RoomStateChangedEmitter = (roomState: PublicRoomState) => void;
/** The room's imported deck when the host loaded one, otherwise the practice deck. */
type StartingDeckFactory = (roomId: RoomId) => GameTrackCard[];

export class RoomGameplayService {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
    private readonly createStartingDeck: StartingDeckFactory = () => [],
  ) {}

  public startGame(
    socketId: string,
    payload: StartGamePayloadParsed,
    deckCards: GameTrackCard[] = this.createStartingDeck(payload.roomId),
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new DomainError("ONLY_HOST_CAN_START_GAME");
    if (roomRecord.roomState.status !== "lobby") throw new DomainError("GAME_ALREADY_STARTED");

    const gameState = this.gameFlowService.startGame({
      players: roomRecord.roomState.players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        startingTimelineCardCount: player.startingTimelineCardCount,
        startingTtTokenCount: player.ttTokenCount,
      })),
      deck: deckCards,
      targetTimelineCardCount: roomRecord.roomState.settings.targetTimelineCardCount,
    });
    const trackCardsById = createTrackCardMap(deckCards);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      trackCardsById,
    );
    this.store.setRoom(payload.roomId, {
      gameState,
      roomState,
      trackCardsById,
      importedDeck: roomRecord.importedDeck,
    });
    logGameStarted(roomState, deckCards.length, roomRecord.importedDeck !== null);
    return roomState;
  }

  public skipTurn(socketId: string, payload: { roomId: RoomId }): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new DomainError("ONLY_HOST_CAN_SKIP_TURN");
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    const { gameState } = roomRecord;
    const nextConnectedPlayer = selectNextConnectedTurnPlayer(
      roomRecord.roomState,
      gameState.turn?.activePlayerId ?? "",
    );
    const nextGameState = this.gameFlowService.skipTurn(gameState, nextConnectedPlayer?.id ?? null);
    // The engine only skips a turn or a claimed challenge, so this is the player being skipped.
    const skippedPlayerId =
      gameState.challengeState?.challengerPlayerId ?? gameState.turn?.activePlayerId ?? "";
    const skippedSessionId = this.store.findSessionIdForPlayer(payload.roomId, skippedPlayerId);
    if (skippedSessionId) this.timers.clearTurnSkip(skippedSessionId);
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public skipTrackWithTt(socketId: string, payload: SkipTrackWithTtPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.roomState.settings.ttModeEnabled) throw new DomainError("TT_MODE_DISABLED");
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    const nextGameState = this.gameFlowService.skipCurrentTrackWithTt(
      roomRecord.gameState,
      membership.playerId,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public buyTimelineCardWithTt(
    socketId: string,
    payload: BuyTimelineCardWithTtPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.roomState.settings.ttModeEnabled) throw new DomainError("TT_MODE_DISABLED");
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    const nextGameState = this.gameFlowService.buyTimelineCardWithTt(
      roomRecord.gameState,
      membership.playerId,
    );
    const nextRoomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      nextGameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, {
      ...roomRecord,
      gameState: nextGameState,
      roomState: nextRoomState,
    });
    return nextRoomState;
  }

  public placeCard(socketId: string, payload: PlaceCardPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    const gameState = this.gameFlowService.placeCard(
      roomRecord.gameState,
      membership.playerId,
      payload.selectedSlotIndex,
      {
        challengeEnabled: roomRecord.roomState.settings.ttModeEnabled,
        challengeDeadlineEpochMs:
          roomRecord.roomState.settings.ttModeEnabled &&
          roomRecord.roomState.settings.challengeWindowDurationSeconds !== null
            ? Date.now() + roomRecord.roomState.settings.challengeWindowDurationSeconds * 1000
            : null,
      },
    );
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState });
    this.scheduleChallengeAutoResolve(payload.roomId, gameState);
    logTurnProgress(roomState);
    return roomState;
  }

  public claimChallenge(socketId: string, payload: ClaimChallengePayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    const gameState = this.gameFlowService.claimChallenge(
      roomRecord.gameState,
      membership.playerId,
      Date.now(),
    );
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState });
    this.timers.clearChallenge(payload.roomId);
    return roomState;
  }

  public placeChallenge(socketId: string, payload: PlaceChallengePayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    const gameState = this.gameFlowService.placeChallengeCard(
      roomRecord.gameState,
      membership.playerId,
      payload.selectedSlotIndex,
    );
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState });
    this.timers.clearChallenge(payload.roomId);
    return roomState;
  }

  public resolveChallengeWindow(
    socketId: string,
    payload: ResolveChallengeWindowPayloadParsed,
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.gameState) throw new DomainError("GAME_NOT_STARTED");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    )
      throw new DomainError("ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn?.activePlayerId !== membership.playerId
    )
      throw new DomainError("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_RESOLVE_CHALLENGE_WINDOW");

    const gameState = this.gameFlowService.resolveChallengeWindow(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState });
    this.timers.clearChallenge(payload.roomId);
    return roomState;
  }

  public confirmReveal(socketId: string, payload: ConfirmRevealPayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.gameState?.turn) throw new DomainError("GAME_NOT_STARTED");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    )
      throw new DomainError("ONLY_HOST_CAN_CONFIRM_REVEAL");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn.activePlayerId !== membership.playerId
    )
      throw new DomainError("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_CONFIRM_REVEAL");

    const gameState = this.gameFlowService.confirmReveal(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState });
    this.timers.clearChallenge(payload.roomId);
    logTurnProgress(roomState);
    return roomState;
  }

  private scheduleChallengeAutoResolve(roomId: RoomId, gameState: GameState): void {
    if (!gameState.challengeState?.challengeDeadlineEpochMs || gameState.phase !== "challenge") {
      this.timers.clearChallenge(roomId);
      return;
    }

    const delayMs = Math.max(0, gameState.challengeState.challengeDeadlineEpochMs - Date.now());
    this.timers.scheduleChallenge(roomId, delayMs, () => {
      const roomRecord = this.store.getRoom(roomId);
      if (
        !roomRecord?.gameState ||
        roomRecord.gameState.challengeState?.challengerPlayerId ||
        !isChallengeWindowExpired(roomRecord.gameState, Date.now())
      )
        return;

      const nextGameState = this.gameFlowService.resolveChallengeWindow(roomRecord.gameState);
      const nextRoomState = mapGameStateToPublicRoomState(
        roomRecord.roomState,
        nextGameState,
        roomRecord.trackCardsById,
      );
      this.store.setRoom(roomId, {
        ...roomRecord,
        gameState: nextGameState,
        roomState: nextRoomState,
      });
      this.emitRoomStateChanged(nextRoomState);
    });
  }
}
