import { type ActionAck, DomainError } from "@tunetrack/shared";
import type { ActionAckScope, RoomStore, SocketRoomMembership } from "./RoomStore.js";

/** Replay store for acknowledged room actions, scoped to the caller's session and room. */
export class RoomActionAcks {
  public constructor(private readonly store: RoomStore) {}

  public find(scope: ActionAckScope, requestId: string): ActionAck | undefined {
    const membership = this.findAckMembership(scope);
    if (!membership) throw new DomainError("ROOM_MEMBERSHIP_NOT_FOUND");
    return this.store.getProcessedActionAck(
      membership.roomId,
      membership.sessionId,
      scope.event,
      requestId,
    );
  }

  public remember(scope: ActionAckScope, ack: ActionAck): void {
    const membership = this.findAckMembership(scope);
    if (!membership) return;
    this.store.rememberProcessedActionAck(
      membership.roomId,
      membership.sessionId,
      scope.event,
      ack,
    );
  }

  // A rename moves the caller to the new code; a retry still names the previous one.
  private findAckMembership({
    socketId,
    roomId,
  }: ActionAckScope): SocketRoomMembership | undefined {
    const membership = this.store.getSocketMembership(socketId);
    if (!membership || !this.store.hasRoom(membership.roomId)) return undefined;
    const isSameRoom =
      membership.roomId === roomId || this.store.getRedirect(roomId) === membership.roomId;
    return isSameRoom ? membership : undefined;
  }
}
