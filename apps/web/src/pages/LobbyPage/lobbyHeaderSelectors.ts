export type LobbyConnectionBadgeVariant = "connected" | "mutedSurface";

export interface LobbyHeaderMenuTabSpec {
  id: "dev" | "language" | "players" | "settings" | "view";
  labelKey: string;
  messageKey?: string;
}

export function getLobbyConnectionBadgeVariant(
  connectionStatus: string,
): LobbyConnectionBadgeVariant {
  return connectionStatus === "Connected" ? "connected" : "mutedSurface";
}

export function getLobbyHeaderMenuTabSpecs(isHost: boolean): LobbyHeaderMenuTabSpec[] {
  return [
    {
      id: "players",
      labelKey: "lobby.menu.players",
      messageKey: "lobby.menu.playersMessage",
    },
    {
      id: "view",
      labelKey: "lobby.menu.view",
      messageKey: "lobby.menu.viewMessage",
    },
    {
      id: "settings",
      labelKey: "lobby.menu.theme",
      messageKey: "lobby.menu.themeMessage",
    },
    {
      id: "language",
      labelKey: "appShell.menu.languageTab",
    },
    ...(isHost
      ? [
          {
            id: "dev" as const,
            labelKey: "lobby.menu.diagnostics",
            messageKey: "lobby.menu.diagnosticsMessage",
          },
        ]
      : []),
  ];
}
