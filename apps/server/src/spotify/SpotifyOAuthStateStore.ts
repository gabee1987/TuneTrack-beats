import { randomBytes } from "node:crypto";
import type { RoomId } from "@tunetrack/shared";

export interface PendingOAuthState {
  roomId: RoomId;
  socketId: string;
  redirectUri: string;
}

interface PendingOAuthStateRecord extends PendingOAuthState {
  expiresAt: number;
}

const DEFAULT_STATE_TTL_MS = 10 * 60 * 1_000;
const DEFAULT_MAX_PENDING_STATES = 500;

/**
 * The OAuth `state` is an opaque single-use nonce; the room and socket it was issued for stay
 * on the server, so a callback can only complete a login the server itself started.
 */
export class SpotifyOAuthStateStore {
  private readonly pendingStates = new Map<string, PendingOAuthStateRecord>();

  public constructor(
    private readonly stateTtlMs = DEFAULT_STATE_TTL_MS,
    private readonly maxPendingStates = DEFAULT_MAX_PENDING_STATES,
  ) {}

  public issue(pendingState: PendingOAuthState): string {
    this.removeExpired();
    if (this.pendingStates.size >= this.maxPendingStates) {
      const oldestNonce = this.pendingStates.keys().next().value;
      if (oldestNonce !== undefined) this.pendingStates.delete(oldestNonce);
    }

    const nonce = randomBytes(32).toString("base64url");
    this.pendingStates.set(nonce, { ...pendingState, expiresAt: Date.now() + this.stateTtlMs });
    return nonce;
  }

  public consume(nonce: string): PendingOAuthState | null {
    const record = this.pendingStates.get(nonce);
    if (!record) return null;

    this.pendingStates.delete(nonce);
    if (record.expiresAt <= Date.now()) return null;

    return { roomId: record.roomId, socketId: record.socketId, redirectUri: record.redirectUri };
  }

  public retargetRoom(previousRoomId: RoomId, nextRoomId: RoomId): void {
    for (const [nonce, record] of this.pendingStates) {
      if (record.roomId === previousRoomId) {
        this.pendingStates.set(nonce, { ...record, roomId: nextRoomId });
      }
    }
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [nonce, record] of this.pendingStates) {
      if (record.expiresAt <= now) this.pendingStates.delete(nonce);
    }
  }
}
