export type LobbyConnectionBadgeVariant = "connected" | "mutedSurface";

export interface LobbyHeaderMenuTabSpec {
  id: "dev" | "host" | "players" | "settings" | "view";
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
      label: "Settings",
      message: "Theme and hidden-card preferences remain device-local.",
    },
    ...(isHost
      ? [
          {
            id: "host" as const,
            label: "Host",
            message: "Core host room setup now stays on the main lobby surface.",
          },
          {
            id: "dev" as const,
            label: "Dev",
            message: "Developer-only host tools continue to live behind the shared menu.",
          },
        ]
      : []),
  ];
}
