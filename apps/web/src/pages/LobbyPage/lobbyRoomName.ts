// Mirrors the server's room-code schema so an invalid code is flagged before it is sent.
const ROOM_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidRoomName(roomName: string): boolean {
  return ROOM_NAME_PATTERN.test(roomName);
}
