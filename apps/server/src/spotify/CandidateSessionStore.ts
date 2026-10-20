import { randomUUID } from "node:crypto";
import type { GameTrackCard } from "@tunetrack/game-engine";

const CANDIDATE_SESSION_TTL_MS = 30 * 60 * 1000;
/** `05` §2.4: bounds the cards held per room. */
const MAX_CANDIDATE_SESSIONS_PER_ROOM = 3;

export interface CandidateSession {
  id: string;
  roomId: string;
  createdAtMs: number;
  sourceSummary: string;
  tracks: GameTrackCard[];
}

/** Generated candidate lists waiting for the host to keep or drop tracks. */
export class CandidateSessionStore {
  private readonly sessionsById = new Map<string, CandidateSession>();

  public create(roomId: string, sourceSummary: string, tracks: GameTrackCard[]): CandidateSession {
    const session: CandidateSession = {
      id: randomUUID(),
      roomId,
      createdAtMs: Date.now(),
      sourceSummary,
      tracks,
    };
    this.pruneExpiredSessions();
    this.sessionsById.set(session.id, session);
    this.evictOldestRoomSessions(roomId);
    return session;
  }

  public findForRoom(roomId: string, sessionId: string): CandidateSession | null {
    this.pruneExpiredSessions();
    const session = this.sessionsById.get(sessionId);
    return session?.roomId === roomId ? session : null;
  }

  public delete(sessionId: string): void {
    this.sessionsById.delete(sessionId);
  }

  public retargetRoom(previousRoomId: string, nextRoomId: string): void {
    for (const [id, session] of this.sessionsById) {
      if (session.roomId === previousRoomId) {
        this.sessionsById.set(id, { ...session, roomId: nextRoomId });
      }
    }
  }

  private evictOldestRoomSessions(roomId: string): void {
    const roomSessionIds = [...this.sessionsById.values()]
      .filter((session) => session.roomId === roomId)
      .map((session) => session.id);
    const evictedCount = roomSessionIds.length - MAX_CANDIDATE_SESSIONS_PER_ROOM;
    for (const sessionId of roomSessionIds.slice(0, Math.max(0, evictedCount))) {
      this.sessionsById.delete(sessionId);
    }
  }

  private pruneExpiredSessions(): void {
    const cutoffMs = Date.now() - CANDIDATE_SESSION_TTL_MS;
    for (const [id, session] of this.sessionsById) {
      if (session.createdAtMs < cutoffMs) {
        this.sessionsById.delete(id);
      }
    }
  }
}
