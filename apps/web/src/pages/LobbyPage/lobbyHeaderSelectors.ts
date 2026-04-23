export type LobbyConnectionBadgeVariant = "connected" | "mutedSurface";

export interface LobbyHeaderMenuTabSpec {
  id: "dev" | "players" | "settings" | "view";
  label: string;
  message: string;
}

export function getLobbyConnectionBadgeVariant(
  connectionStatus: string,
): LobbyConnectionBadgeVariant {
  return connectionStatus === "Connected" ? "connected" : "mutedSurface";
}

export function getLobbyHeaderMenuTabSpecs(
  isHost: boolean,
): LobbyHeaderMenuTabSpec[] {
  return [
    {
      id: "players",
      label: "Players",
      message: "The player roster remains on the main screen for faster access on mobile.",
    },
    {
      id: "view",
      label: "View",
      message: "Local visibility toggles stay available without crowding the lobby.",
    },
    {
      id: "settings",
      label: "Theme",
      message: "Theme and hidden-card preferences remain device-local.",
    },
    ...(isHost
      ? [
          {
            id: "dev" as const,
            label: "Diagnostics",
            message: "Developer-only host tools continue to live behind the shared menu.",
          },
        ]
      : []),
  ];
}
