export class DisconnectTimerManager {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  schedule(sessionId: string, delayMs: number, callback: () => void): void {
    this.clear(sessionId);
    const handle = setTimeout(() => {
      this.timers.delete(sessionId);
      callback();
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
