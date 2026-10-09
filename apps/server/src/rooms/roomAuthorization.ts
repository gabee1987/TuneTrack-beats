import { DomainError, type RoomId, type ServerErrorCode } from "@tunetrack/shared";
import type { RoomStore } from "./RoomStore.js";

/** Each caller names its own refusal code, so a guest learns which action was host-only. */
export function requireHost(
  store: RoomStore,
  socketId: string,
  roomId: RoomId,
  notHostCode: ServerErrorCode,
): void {
  const membership = store.requireMembership(socketId);
  const roomRecord = store.getRoomRecordForMember(socketId, roomId);
  if (roomRecord.roomState.hostId !== membership.playerId) throw new DomainError(notHostCode);
}

export function isHost(store: RoomStore, socketId: string, roomId: RoomId): boolean {
  try {
    requireHost(store, socketId, roomId, "ONLY_HOST_CAN_CONTROL_SPOTIFY_PLAYBACK");
    return true;
  } catch {
    return false;
  }
}

export function requireSpotifyPlaybackOwner(
  store: RoomStore,
  socketId: string,
  roomId: RoomId,
): void {
  const membership = store.requireMembership(socketId);
  const roomRecord = store.getRoomRecordForMember(socketId, roomId);
  const ownerPlayerId = roomRecord.roomState.settings.spotifyPlaybackOwnerPlayerId;
  if (!ownerPlayerId || ownerPlayerId !== membership.playerId) {
    throw new DomainError("ONLY_SPOTIFY_PLAYBACK_OWNER_CAN_CONTROL");
  }
}
