import type { GameFlowService } from "@tunetrack/game-engine";
import type { PublicRoomState, RoomId } from "@tunetrack/shared";
import { selectNextConnectedTurnPlayer } from "./roomConnectionBuilders.js";
import type { RoomHostTransfer } from "./RoomHostTransfer.js";
import { mapGameStateToPublicRoomState } from "./roomStateMappers.js";
import type { RoomRecord, RoomStore, SocketRoomMembership } from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type RoomStateChangedEmitter = (roomState: PublicRoomState) => void;
type RoomExpiredEmitter = (roomId: RoomId) => void;

/**
 * The graces an in-game disconnect starts: host transfer, the turn or challenge safety skip,
 * and the all-offline expiry. Every callback re-reads the room before it acts.
 */
export class RoomDisconnectPolicy {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly gameFlowService: GameFlowService,
    private readonly hostTransfer: RoomHostTransfer,
    private readonly emitRoomStateChanged: RoomStateChangedEmitter,
    private readonly emitRoomExpired: RoomExpiredEmitter,
  ) {}

  /** Returns the room state with the safety-skip deadline when the player held the turn. */
  public startGraces(
    membership: SocketRoomMembership,
    roomRecord: RoomRecord,
    disconnectedRoomState: PublicRoomState,
    disconnectedAtEpochMs: number,
  ): PublicRoomState {
    const { roomId, playerId, sessionId } = membership;

    if (disconnectedRoomState.status !== "lobby" && disconnectedRoomState.hostId === playerId) {
      this.timers.scheduleHostTransfer(roomId, this.timers.hostTransferGracePeriodMs, () => {
        const nextState = this.hostTransfer.promoteAfterHostGrace(roomId, playerId);
        if (nextState) this.emitRoomStateChanged(nextState);
      });
    }

    const { gameState } = roomRecord;
    const isActiveTurnPlayer =
      gameState?.phase === "turn" && gameState.turn?.activePlayerId === playerId;
    const isChallengeClaimedChallenger =
      gameState?.phase === "challenge" &&
      gameState.challengeState?.phase === "claimed" &&
      gameState.challengeState.challengerPlayerId === playerId;

    let effectiveRoomState = disconnectedRoomState;
    if ((isActiveTurnPlayer || isChallengeClaimedChallenger) && disconnectedRoomState.turn) {
      const turnSkipDeadlineEpochMs = disconnectedAtEpochMs + this.timers.turnSkipGracePeriodMs;
      effectiveRoomState = {
        ...disconnectedRoomState,
        turn: { ...disconnectedRoomState.turn, turnSkipDeadlineEpochMs },
      };
      this.store.setRoom(roomId, { ...roomRecord, roomState: effectiveRoomState });
    }

    if (isActiveTurnPlayer) {
      this.timers.scheduleTurnSkip(sessionId, this.timers.turnSkipGracePeriodMs, () => {
        const nextState = this.advanceTurnIfDisconnectedActivePlayer(roomId, playerId);
        if (nextState) this.emitRoomStateChanged(nextState);
      });
    }

    if (isChallengeClaimedChallenger) {
      this.timers.scheduleTurnSkip(sessionId, this.timers.turnSkipGracePeriodMs, () => {
        const nextState = this.cancelChallengeIfDisconnectedChallenger(roomId, playerId);
        if (nextState) this.emitRoomStateChanged(nextState);
      });
    }

    this.scheduleExpiryIfEveryoneOffline(roomId, effectiveRoomState);
    return effectiveRoomState;
  }

  /** Also called when a player leaves or is removed, which can leave only offline players. */
  public scheduleExpiryIfEveryoneOffline(roomId: RoomId, roomState: PublicRoomState): void {
    if (
      roomState.status === "lobby" ||
      roomState.players.some((player) => player.connectionStatus === "connected")
    ) {
      return;
    }

    this.timers.scheduleAllPlayersOffline(roomId, () => {
      this.closeRoomIfEveryPlayerIsOffline(roomId);
    });
  }

  private closeRoomIfEveryPlayerIsOffline(roomId: RoomId): void {
    const roomRecord = this.store.getRoom(roomId);
    if (
      !roomRecord ||
      roomRecord.roomState.status === "lobby" ||
      roomRecord.roomState.players.some((player) => player.connectionStatus === "connected")
    ) {
      return;
    }

    this.timers.clearForRoom(roomId);
    this.store.clearMembershipsForRoom(roomId);
    this.store.deleteRoom(roomId);
    this.store.clearRoomRedirects(roomId);
    this.emitRoomExpired(roomId);
  }

  private advanceTurnIfDisconnectedActivePlayer(
    roomId: RoomId,
    disconnectedPlayerId: string,
  ): PublicRoomState | null {
    const roomRecord = this.store.getRoom(roomId);
    if (
      !roomRecord?.gameState ||
      roomRecord.gameState.phase !== "turn" ||
      roomRecord.gameState.turn?.activePlayerId !== disconnectedPlayerId
    )
      return null;

    const nextActivePlayer = selectNextConnectedTurnPlayer(
      roomRecord.roomState,
      disconnectedPlayerId,
    );
    if (!nextActivePlayer) return null;

    const nextGameState = this.gameFlowService.advanceTurnToPlayer(
      roomRecord.gameState,
      nextActivePlayer.id,
    );
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
    return nextRoomState;
  }

  private cancelChallengeIfDisconnectedChallenger(
    roomId: RoomId,
    disconnectedPlayerId: string,
  ): PublicRoomState | null {
    const roomRecord = this.store.getRoom(roomId);
    if (
      !roomRecord?.gameState ||
      roomRecord.gameState.phase !== "challenge" ||
      roomRecord.gameState.challengeState?.phase !== "claimed" ||
      roomRecord.gameState.challengeState.challengerPlayerId !== disconnectedPlayerId
    )
      return null;

    const challenger = roomRecord.roomState.players.find((p) => p.id === disconnectedPlayerId);
    if (challenger?.connectionStatus !== "disconnected") return null;

    const nextGameState = this.gameFlowService.cancelClaimedChallengeForOfflineChallenger(
      roomRecord.gameState,
    );
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
    return nextRoomState;
  }
}
