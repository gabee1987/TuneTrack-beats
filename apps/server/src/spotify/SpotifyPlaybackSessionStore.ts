import type { RoomId } from "@tunetrack/shared";

export type PlaybackSessionState = {
  deviceId: string | null;
  socketId: string | null;
  activeRequestId: string | null;
};

/**
 * Per-room Spotify Web Playback session bookkeeping.
 * Serializes play attempts and lets newer requests supersede slow device-not-found retries.
 * Host transfer calls beginHandoff so the previous device/request cannot win a race.
 */
export class SpotifyPlaybackSessionStore {
  private readonly sessions = new Map<RoomId, PlaybackSessionState>();
  private readonly playChains = new Map<RoomId, Promise<void>>();

  public registerDevice(roomId: RoomId, socketId: string, deviceId: string): void {
    this.sessions.set(roomId, {
      deviceId,
      socketId,
      activeRequestId: this.sessions.get(roomId)?.activeRequestId ?? null,
    });
  }

  public unregisterDevice(roomId: RoomId, socketId: string): void {
    const session = this.sessions.get(roomId);
    if (!session || session.socketId !== socketId) {
      return;
    }

    this.sessions.set(roomId, {
      deviceId: null,
      socketId: null,
      activeRequestId: session.activeRequestId,
    });
  }

  public unregisterBySocketId(socketId: string): void {
    for (const [roomId, session] of this.sessions) {
      if (session.socketId === socketId) {
        this.unregisterDevice(roomId, socketId);
      }
    }
  }

  /**
   * Invalidate the previous host device and any in-flight play before the new
   * host registers. In-flight tasks see isActivePlayRequest === false.
   */
  public beginHandoff(roomId: RoomId): void {
    this.sessions.set(roomId, {
      deviceId: null,
      socketId: null,
      activeRequestId: null,
    });
  }

  public clearRoom(roomId: RoomId): void {
    this.sessions.delete(roomId);
    this.playChains.delete(roomId);
  }

  public getRegisteredDevice(roomId: RoomId): { deviceId: string; socketId: string } | null {
    const session = this.sessions.get(roomId);
    if (!session?.deviceId || !session.socketId) {
      return null;
    }
    return { deviceId: session.deviceId, socketId: session.socketId };
  }

  public beginPlayRequest(roomId: RoomId, requestId: string): void {
    const existing = this.sessions.get(roomId);
    this.sessions.set(roomId, {
      deviceId: existing?.deviceId ?? null,
      socketId: existing?.socketId ?? null,
      activeRequestId: requestId,
    });
  }

  public isActivePlayRequest(roomId: RoomId, requestId: string): boolean {
    return this.sessions.get(roomId)?.activeRequestId === requestId;
  }

  public async runExclusive<T>(roomId: RoomId, task: () => Promise<T>): Promise<T> {
    const previous = this.playChains.get(roomId) ?? Promise.resolve();
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    this.playChains.set(
      roomId,
      previous.catch(() => undefined).then(() => gate),
    );

    await previous.catch(() => undefined);

    try {
      return await task();
    } finally {
      releaseGate();
    }
  }
}
