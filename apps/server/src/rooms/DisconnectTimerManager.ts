import { runGuardedTimerCallback, type RoomTimerKind } from "./guardedTimerCallback.js";

export class DisconnectTimerManager {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  public constructor(private readonly timerKind: RoomTimerKind) {}

  schedule(sessionId: string, delayMs: number, callback: () => void): void {
    this.clear(sessionId);
    const handle = setTimeout(() => {
      this.timers.delete(sessionId);
      runGuardedTimerCallback(this.timerKind, sessionId, callback);
    }, delayMs);
    handle.unref();
    this.timers.set(sessionId, handle);
  }

  clear(sessionId: string): void {
    const handle = this.timers.get(sessionId);
    if (!handle) return;
    clearTimeout(handle);
    this.timers.delete(sessionId);
  }

  has(key: string): boolean {
    return this.timers.has(key);
  }
}
