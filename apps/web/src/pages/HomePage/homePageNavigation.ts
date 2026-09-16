export const DEFAULT_ROOM_ID = "";

interface HomePageNavigationInput {
  roomId: string;
  intent?: "create" | "join";
}

export interface HomePageNavigationResult {
  path: string;
}

export function buildHomePageNavigationTarget({
  intent = "join",
  roomId,
}: HomePageNavigationInput): HomePageNavigationResult | null {
  const trimmedRoomId = roomId.trim();

  if (!trimmedRoomId) {
    return null;
  }

  return {
    path: `/lobby/${encodeURIComponent(trimmedRoomId)}${
      intent === "create" ? "?intent=create" : ""
    }`,
  };
}

export function buildInviteJoinPath(roomId: string): string | null {
  return buildHomePageNavigationTarget({ roomId, intent: "join" })?.path ?? null;
}
