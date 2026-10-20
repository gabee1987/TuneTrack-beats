interface RoomNavigationInput {
  roomId?: string | undefined;
  intent?: "create" | "join";
}

export interface RoomNavigationResult {
  path: string;
  state?: { intent: "create" };
}

export function buildRoomNavigationTarget({
  intent = "join",
  roomId,
}: RoomNavigationInput): RoomNavigationResult | null {
  const trimmedRoomId = roomId?.trim() ?? "";

  if (intent === "create") {
    return {
      path: trimmedRoomId ? `/lobby/${encodeURIComponent(trimmedRoomId)}` : "/lobby",
      state: { intent: "create" },
    };
  }

  if (!trimmedRoomId) {
    return null;
  }

  return {
    path: `/lobby/${encodeURIComponent(trimmedRoomId)}`,
  };
}

export function buildInviteJoinPath(roomId: string): string | null {
  return buildRoomNavigationTarget({ roomId, intent: "join" })?.path ?? null;
}
