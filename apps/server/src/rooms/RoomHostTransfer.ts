import { DomainError, type PublicRoomState, type RoomId } from "@tunetrack/shared";
import {
  buildHostTransferredRoomState,
  didSpotifyPlaybackOwnerChange,
  selectAutomaticHostCandidate,
} from "./roomConnectionBuilders.js";
import type { RoomStore } from "./RoomStore.js";
import type { RoomTimerCoordinator } from "./RoomTimerCoordinator.js";

type SpotifyPlaybackHandoffEmitter = (roomId: RoomId) => void;

/** Moves the host role, by the host's choice or because the host stayed offline in a game. */
export class RoomHostTransfer {
  public constructor(
    private readonly store: RoomStore,
    private readonly timers: RoomTimerCoordinator,
    private readonly emitSpotifyPlaybackHandoff: SpotifyPlaybackHandoffEmitter,
  ) {}

  public apply(
    roomId: RoomId,
    targetPlayerId: string,
    options: { requireConnectedTarget: boolean },
  ): PublicRoomState {
    const roomRecord = this.store.getRoom(roomId);
    if (!roomRecord) throw new DomainError("ROOM_MEMBERSHIP_NOT_FOUND");

    const targetPlayer = roomRecord.roomState.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) throw new DomainError("HOST_TRANSFER_TARGET_NOT_FOUND");
    if (roomRecord.roomState.hostId === targetPlayerId)
      throw new DomainError("HOST_TRANSFER_TARGET_IS_ALREADY_HOST");
    if (options.requireConnectedTarget && targetPlayer.connectionStatus !== "connected") {
      throw new DomainError("HOST_TRANSFER_TARGET_DISCONNECTED");
    }

    const nextRoomState = buildHostTransferredRoomState(roomRecord.roomState, targetPlayerId);
    this.store.setRoom(roomId, { ...roomRecord, roomState: nextRoomState });

    if (didSpotifyPlaybackOwnerChange(roomRecord.roomState, nextRoomState)) {
      this.emitSpotifyPlaybackHandoff(roomId);
    }

    return nextRoomState;
  }

  /** The host's grace ran out: the first connected player takes over if the host is still away. */
  public promoteAfterHostGrace(roomId: RoomId, offlineHostId: string): PublicRoomState | null {
    const current = this.store.getRoom(roomId);
    if (!current) return null;
    const host = current.roomState.players.find((p) => p.id === offlineHostId);
    if (host?.connectionStatus !== "disconnected" || current.roomState.hostId !== offlineHostId) {
      return null;
    }

    const candidate = selectAutomaticHostCandidate(current.roomState);
    return candidate ? this.apply(roomId, candidate.id, { requireConnectedTarget: true }) : null;
  }

  /** A reconnect into a game whose host is offline with no grace pending restores a host. */
  public promoteIfHostOffline(roomId: RoomId, roomState: PublicRoomState): PublicRoomState {
    const currentHost = roomState.players.find((p) => p.id === roomState.hostId);
    if (currentHost?.connectionStatus !== "disconnected") return roomState;
    if (roomState.status === "lobby") return roomState;
    if (this.timers.hasHostTransfer(roomId)) return roomState;

    const candidate = selectAutomaticHostCandidate(roomState);
    if (!candidate) return roomState;
    return this.apply(roomId, candidate.id, { requireConnectedTarget: true });
  }
}
