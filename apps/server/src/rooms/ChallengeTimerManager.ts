import type { RoomId } from "@tunetrack/shared";

export class ChallengeTimerManager {
  private readonly timers = new Map<RoomId, NodeJS.Timeout>();

  schedule(roomId: RoomId, delayMs: number, callback: () => void): void {
    this.clear(roomId);
    const handle = setTimeout(() => {
      this.timers.delete(roomId);
      callback();
    }, delayMs);
    handle.unref();
    this.timers.set(roomId, handle);
  }

  clear(roomId: RoomId): void {
    const handle = this.timers.get(roomId);
    if (!handle) return;
    clearTimeout(handle);
    this.timers.delete(roomId);
  }
}
