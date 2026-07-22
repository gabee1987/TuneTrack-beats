import type { RoomId } from "@tunetrack/shared";
import { ChallengeTimerManager } from "./ChallengeTimerManager.js";
import { DisconnectTimerManager } from "./DisconnectTimerManager.js";
import type { RoomStore } from "./RoomStore.js";

export class RoomTimerCoordinator {
  private readonly challengeTimers = new ChallengeTimerManager();
  private readonly disconnectTimers = new DisconnectTimerManager();
  private readonly hostTransferTimers = new DisconnectTimerManager();
  private readonly turnSkipTimers = new DisconnectTimerManager();

  public constructor(
    private readonly store: RoomStore,
    public readonly reconnectGracePeriodMs: number,
    public readonly hostTransferGracePeriodMs: number,
    public readonly turnSkipGracePeriodMs: number,
  ) {}

  public clearForRoom(roomId: RoomId): void {
    this.challengeTimers.clear(roomId);
    this.hostTransferTimers.clear(roomId);
    for (const sessionId of this.store.getSessionIdsInRoom(roomId)) {
      this.clearForSession(sessionId);
    }
  }

  public clearForSession(sessionId: string): void {
    this.disconnectTimers.clear(sessionId);
    this.turnSkipTimers.clear(sessionId);
  }

  public scheduleChallenge(roomId: RoomId, delayMs: number, callback: () => void): void {
    this.challengeTimers.schedule(roomId, delayMs, callback);
  }

  public clearChallenge(roomId: RoomId): void {
    this.challengeTimers.clear(roomId);
  }

  public scheduleReconnect(sessionId: string, delayMs: number, callback: () => void): void {
    this.disconnectTimers.schedule(sessionId, delayMs, callback);
  }

  public clearReconnect(sessionId: string): void {
    this.disconnectTimers.clear(sessionId);
  }

  public scheduleHostTransfer(roomId: RoomId, delayMs: number, callback: () => void): void {
    this.hostTransferTimers.schedule(roomId, delayMs, callback);
  }

  public clearHostTransfer(roomId: RoomId): void {
    this.hostTransferTimers.clear(roomId);
  }

  public hasHostTransfer(roomId: RoomId): boolean {
    return this.hostTransferTimers.has(roomId);
  }

  public scheduleTurnSkip(sessionId: string, delayMs: number, callback: () => void): void {
    this.turnSkipTimers.schedule(sessionId, delayMs, callback);
  }

  public clearTurnSkip(sessionId: string): void {
    this.turnSkipTimers.clear(sessionId);
  }
}
