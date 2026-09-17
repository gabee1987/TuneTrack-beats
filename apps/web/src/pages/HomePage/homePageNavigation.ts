interface HomePageNavigationInput {
  roomId?: string | undefined;
  intent?: "create" | "join";
}

export interface HomePageNavigationResult {
  path: string;
  state?: { intent: "create" };
}

export function buildHomePageNavigationTarget({
  intent = "join",
  roomId,
}: HomePageNavigationInput): HomePageNavigationResult | null {
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
  return buildHomePageNavigationTarget({ roomId, intent: "join" })?.path ?? null;
}
