export const DEFAULT_ROOM_ID = "";
export const DEFAULT_DISPLAY_NAME = "Player 1";

interface HomePageNavigationInput {
  displayName: string;
  roomId: string;
  intent?: "create" | "join";
}

export interface HomePageNavigationResult {
  displayName: string;
  path: string;
}

export function buildHomePageNavigationTarget({
  displayName,
  intent = "join",
  roomId,
}: HomePageNavigationInput): HomePageNavigationResult | null {
  const trimmedRoomId = roomId.trim();
  const trimmedDisplayName = displayName.trim();

  if (!trimmedRoomId || !trimmedDisplayName) {
    return null;
  }

  return {
    displayName: trimmedDisplayName,
    path: `/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(
      trimmedDisplayName,
    )}${intent === "create" ? "&intent=create" : ""}`,
  };
}

export function buildInviteJoinPath(roomId: string, displayName: string): string | null {
  return buildHomePageNavigationTarget({ displayName, roomId, intent: "join" })?.path ?? null;
}
