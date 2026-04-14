export const DEFAULT_ROOM_ID = "party-room";
export const DEFAULT_DISPLAY_NAME = "Player 1";

interface HomePageNavigationInput {
  displayName: string;
  roomId: string;
}

export interface HomePageNavigationResult {
  displayName: string;
  path: string;
}

export function buildHomePageNavigationTarget({
  displayName,
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
    )}`,
  };
}
