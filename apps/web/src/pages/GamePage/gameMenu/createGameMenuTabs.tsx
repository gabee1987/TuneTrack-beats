import { type PublicRoomState } from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../../features/app-shell/AppShellMenu";
import type { Translate } from "../../../features/i18n";
import type { GameHistoryEntry } from "../hooks/useGameHistory";
import styles from "../gamePageStyles";
import { GameMenuPlayerItem } from "./GameMenuPlayerItem";
import { HistoryTabContent } from "./HistoryTabContent";
import { PlaybackTabContent } from "./PlaybackTabContent";

export interface CreateGameMenuTabsOptions {
  currentPlayerId: string | null;
  historyEntries: GameHistoryEntry[];
  roomState: PublicRoomState;
  onAwardTt: (playerId: string) => void;
  onKickPlayer: (playerId: string) => void;
  onRemoveTt: (playerId: string) => void;
  onTransferHost: (playerId: string) => void;
  t: Translate;
}

export function createGameMenuTabs({
  currentPlayerId,
  historyEntries,
  roomState,
  onAwardTt,
  onKickPlayer,
  onRemoveTt,
  onTransferHost,
  t,
}: CreateGameMenuTabsOptions): AppShellMenuTab[] {
  const isHost = roomState.hostId === currentPlayerId;
  const hasPlaybackTab =
    isHost &&
    roomState.settings.spotifyAuthStatus === "connected" &&
    roomState.settings.playlistImported;

  return [
    {
      id: "players",
      label: t("gameMenu.tabs.players"),
      content: (
        <div className={styles.menuInfoSection}>
          <h3 className={styles.menuInfoTitle}>{t("gameMenu.playersSummary")}</h3>
          <ul className={styles.menuPlayerList}>
            {roomState.players.map((player) => (
              <GameMenuPlayerItem
                currentPlayerId={currentPlayerId}
                key={player.id}
                onAwardTt={onAwardTt}
                onKickPlayer={onKickPlayer}
                onRemoveTt={onRemoveTt}
                onTransferHost={onTransferHost}
                player={player}
                roomState={roomState}
                t={t}
              />
            ))}
          </ul>
        </div>
      ),
    },
    ...(hasPlaybackTab
      ? [
          {
            id: "playback" as const,
            label: t("gameMenu.tabs.playback"),
            content: <PlaybackTabContent roomState={roomState} t={t} />,
          },
        ]
      : []),
    {
      id: "history" as const,
      label: t("gameMenu.tabs.history"),
      content: <HistoryTabContent entries={historyEntries} t={t} />,
    },
    {
      id: "view",
      label: t("gameMenu.tabs.view"),
      content: <p className={styles.menuPlaceholder}>{t("gameMenu.viewPlaceholder")}</p>,
    },
    {
      id: "settings",
      label: t("gameMenu.tabs.theme"),
      content: <p className={styles.menuPlaceholder}>{t("gameMenu.themePlaceholder")}</p>,
    },
    {
      id: "language",
      label: t("appShell.menu.languageTab"),
      content: null,
    },
    ...(isHost
      ? [
          {
            id: "dev" as const,
            label: t("gameMenu.tabs.diagnostics"),
            content: (
              <p className={styles.menuPlaceholder}>{t("gameMenu.diagnosticsPlaceholder")}</p>
            ),
          },
        ]
      : []),
  ];
}
