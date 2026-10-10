import { type PublicRoomState } from "@tunetrack/shared/client";
import type { AppShellMenuTab } from "../../../features/app-shell/AppShellMenu";
import type { Translate } from "../../../features/i18n";
import type { GameHistoryEntry } from "../hooks/useGameHistory";
import type {
  AwardTtActionState,
  KickPlayerActionState,
  TransferHostActionState,
} from "../GamePage.types";
import chromeStyles from "../gamePageChrome.module.css";
import menuStyles from "../gamePageMenu.module.css";
import { GameMenuPlayerItem } from "./GameMenuPlayerItem";
import { HistoryTabContent } from "./HistoryTabContent";
import { PlaybackTabContent } from "./PlaybackTabContent";

export interface CreateGameMenuTabsOptions {
  awardTtActionState: AwardTtActionState | null;
  currentPlayerId: string | null;
  historyEntries: GameHistoryEntry[];
  roomState: PublicRoomState;
  isAwardTtPending: boolean;
  isKickPlayerPending: boolean;
  isTransferHostPending: boolean;
  kickPlayerActionState: KickPlayerActionState | null;
  onAwardTt: (playerId: string) => boolean;
  onKickPlayer: (playerId: string) => void;
  onRemoveTt: (playerId: string) => boolean;
  onTransferHost: (playerId: string) => void;
  t: Translate;
  transferHostActionState: TransferHostActionState | null;
}

export function createGameMenuTabs({
  awardTtActionState,
  currentPlayerId,
  historyEntries,
  isAwardTtPending,
  isKickPlayerPending,
  isTransferHostPending,
  kickPlayerActionState,
  roomState,
  onAwardTt,
  onKickPlayer,
  onRemoveTt,
  onTransferHost,
  t,
  transferHostActionState,
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
        <div className={chromeStyles.menuInfoSection}>
          <h3 className={chromeStyles.menuInfoTitle}>{t("gameMenu.playersSummary")}</h3>
          <ul className={menuStyles.menuPlayerList}>
            {roomState.players.map((player) => (
              <GameMenuPlayerItem
                awardTtActionState={awardTtActionState}
                cardCount={roomState.timelines[player.id]?.length ?? 0}
                isActiveTurnPlayer={player.id === roomState.turn?.activePlayerId}
                isCurrentPlayer={player.id === currentPlayerId}
                isViewerHost={isHost}
                key={player.id}
                isAwardTtPending={isAwardTtPending}
                isKickPlayerPending={isKickPlayerPending}
                isTransferHostPending={isTransferHostPending}
                kickPlayerActionState={kickPlayerActionState}
                onAwardTt={onAwardTt}
                onKickPlayer={onKickPlayer}
                onRemoveTt={onRemoveTt}
                onTransferHost={onTransferHost}
                player={player}
                t={t}
                transferHostActionState={transferHostActionState}
                ttModeEnabled={roomState.settings.ttModeEnabled}
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
            content: (
              <PlaybackTabContent
                currentTrackCard={roomState.currentTrackCard}
                status={roomState.status}
                t={t}
              />
            ),
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
      content: <p className={menuStyles.menuPlaceholder}>{t("gameMenu.viewPlaceholder")}</p>,
    },
    {
      id: "settings",
      label: t("gameMenu.tabs.theme"),
      content: <p className={menuStyles.menuPlaceholder}>{t("gameMenu.themePlaceholder")}</p>,
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
              <p className={menuStyles.menuPlaceholder}>{t("gameMenu.diagnosticsPlaceholder")}</p>
            ),
          },
        ]
      : []),
  ];
}
