import { ROOM_CODE_MAX_LENGTH, ROOM_CODE_MIN_LENGTH } from "@tunetrack/shared/client";

// Mirrors the server's room-code schema so an invalid code is flagged before it is sent.
const ROOM_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidRoomName(roomName: string): boolean {
  return ROOM_NAME_PATTERN.test(roomName);
}

/** Whether a typed code could name a room at all; the server ignores any other request. */
export function isPossibleRoomCode(code: string): boolean {
  return (
    code.length >= ROOM_CODE_MIN_LENGTH &&
    code.length <= ROOM_CODE_MAX_LENGTH &&
    isValidRoomName(code)
  );
}
