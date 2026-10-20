import { runGuardedTimerCallback, type RoomTimerKind } from "./guardedTimerCallback.js";

/** One pending timeout per key; scheduling again replaces it. Callbacks never throw. */
export class KeyedTimerManager {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  public constructor(private readonly timerKind: RoomTimerKind) {}

  public schedule(key: string, delayMs: number, callback: () => void): void {
    this.clear(key);
    const handle = setTimeout(() => {
      this.timers.delete(key);
      runGuardedTimerCallback(this.timerKind, key, callback);
    }, delayMs);
    handle.unref();
    this.timers.set(key, handle);
  }

  public clear(key: string): void {
    const handle = this.timers.get(key);
    if (!handle) return;
    clearTimeout(handle);
    this.timers.delete(key);
  }

  public has(key: string): boolean {
    return this.timers.has(key);
  }

  public clearAll(): void {
    for (const handle of this.timers.values()) clearTimeout(handle);
    this.timers.clear();
  }
}
