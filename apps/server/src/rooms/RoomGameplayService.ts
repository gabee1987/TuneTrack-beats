import { GameFlowService, type GameState, type GameTrackCard } from "@tunetrack/game-engine";
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
} from "@tunetrack/shared";
import { selectNextConnectedTurnPlayer } from "./roomConnectionBuilders.js";
import { createTrackCardMap, mapGameStateToPublicRoomState } from "./roomStateMappers.js";
import type { RoomStore } from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type RoomStateChangedEmitter = (roomState: PublicRoomState) => void;

export class RoomGameplayService {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
  ) {}

  public startGame(
    socketId: string,
    payload: StartGamePayloadParsed,
    deckCards: GameTrackCard[],
  ): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_START_GAME");
    if (roomRecord.roomState.status !== "lobby") throw new Error("GAME_ALREADY_STARTED");

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
    return roomState;
  }

  public skipTurn(socketId: string, payload: { roomId: RoomId }): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (roomRecord.roomState.hostId !== membership.playerId)
      throw new Error("ONLY_HOST_CAN_SKIP_TURN");
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    const phase = roomRecord.gameState.phase;
    const isChallengeClaimedSkip =
      phase === "challenge" && roomRecord.gameState.challengeState?.phase === "claimed";

    if (phase !== "turn" && !isChallengeClaimedSkip) throw new Error("GAME_NOT_IN_TURN_PHASE");

    if (phase === "turn") {
      const activeSessionId = this.store.findSessionIdForPlayer(
        payload.roomId,
        roomRecord.gameState.turn?.activePlayerId ?? "",
      );
      if (activeSessionId) this.timers.clearTurnSkip(activeSessionId);
    }

    if (isChallengeClaimedSkip) {
      const challengerSessionId = this.store.findSessionIdForPlayer(
        payload.roomId,
        roomRecord.gameState.challengeState!.challengerPlayerId ?? "",
      );
      if (challengerSessionId) this.timers.clearTurnSkip(challengerSessionId);
    }

    const nextGameState = isChallengeClaimedSkip
      ? this.gameFlowService.cancelClaimedChallengeForOfflineChallenger(roomRecord.gameState)
      : this.skipToNextConnectedPlayer(roomRecord.roomState, roomRecord.gameState);
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
    if (!roomRecord.roomState.settings.ttModeEnabled) throw new Error("TT_MODE_DISABLED");
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

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
    if (!roomRecord.roomState.settings.ttModeEnabled) throw new Error("TT_MODE_DISABLED");
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

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
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

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
    return roomState;
  }

  public claimChallenge(socketId: string, payload: ClaimChallengePayloadParsed): PublicRoomState {
    const roomRecord = this.store.getRoomRecordForMember(socketId, payload.roomId);
    const membership = this.store.requireMembership(socketId);
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");
    this.assertChallengeWindowStillOpen(roomRecord.gameState);

    const gameState = this.gameFlowService.claimChallenge(
      roomRecord.gameState,
      membership.playerId,
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
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

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
    if (!roomRecord.gameState) throw new Error("GAME_NOT_STARTED");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    )
      throw new Error("ONLY_HOST_CAN_RESOLVE_CHALLENGE_WINDOW");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn?.activePlayerId !== membership.playerId
    )
      throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_RESOLVE_CHALLENGE_WINDOW");

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
    if (!roomRecord.gameState?.turn) throw new Error("GAME_NOT_STARTED");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_only" &&
      roomRecord.roomState.hostId !== membership.playerId
    )
      throw new Error("ONLY_HOST_CAN_CONFIRM_REVEAL");

    if (
      roomRecord.roomState.settings.revealConfirmMode === "host_or_active_player" &&
      roomRecord.roomState.hostId !== membership.playerId &&
      roomRecord.gameState.turn.activePlayerId !== membership.playerId
    )
      throw new Error("ONLY_HOST_OR_ACTIVE_PLAYER_CAN_CONFIRM_REVEAL");

    const gameState = this.gameFlowService.confirmReveal(roomRecord.gameState);
    const roomState = mapGameStateToPublicRoomState(
      roomRecord.roomState,
      gameState,
      roomRecord.trackCardsById,
    );
    this.store.setRoom(payload.roomId, { ...roomRecord, gameState, roomState });
    this.timers.clearChallenge(payload.roomId);
    return roomState;
  }

  private skipToNextConnectedPlayer(roomState: PublicRoomState, gameState: GameState): GameState {
    const nextConnectedPlayer = selectNextConnectedTurnPlayer(
      roomState,
      gameState.turn?.activePlayerId ?? "",
    );

    return nextConnectedPlayer
      ? this.gameFlowService.skipTurnToPlayer(gameState, nextConnectedPlayer.id)
      : this.gameFlowService.skipOfflinePlayerTurn(gameState);
  }

  private scheduleChallengeAutoResolve(roomId: RoomId, gameState: GameState): void {
    if (!gameState.challengeState?.challengeDeadlineEpochMs || gameState.phase !== "challenge") {
      this.timers.clearChallenge(roomId);
      return;
    }

    const delayMs = Math.max(0, gameState.challengeState.challengeDeadlineEpochMs - Date.now());
    this.timers.scheduleChallenge(roomId, delayMs, () => {
      const roomRecord = this.store.getRoom(roomId);
      if (!roomRecord?.gameState) return;
      if (
        roomRecord.gameState.phase !== "challenge" ||
        !roomRecord.gameState.challengeState ||
        roomRecord.gameState.challengeState.challengerPlayerId ||
        !this.isChallengeDeadlineExpired(roomRecord.gameState)
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

  private assertChallengeWindowStillOpen(gameState: GameState): void {
    if (this.isChallengeDeadlineExpired(gameState)) throw new Error("CHALLENGE_WINDOW_EXPIRED");
  }

  private isChallengeDeadlineExpired(gameState: GameState): boolean {
    if (!gameState.challengeState?.challengeDeadlineEpochMs || gameState.phase !== "challenge")
      return false;
    return Date.now() >= gameState.challengeState.challengeDeadlineEpochMs;
  }
}
