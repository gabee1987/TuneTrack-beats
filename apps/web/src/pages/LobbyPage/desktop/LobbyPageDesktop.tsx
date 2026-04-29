import { StatusBanner } from "../../../features/ui/StatusBanner";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { useI18n } from "../../../features/i18n";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyHostSettingsPanel } from "../components/LobbyHostSettingsPanel";
import { LobbyPlayerList } from "../components/LobbyPlayerList";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { LobbySectionHeader } from "../components/LobbySectionHeader";
import { LobbySummaryCard } from "../components/LobbySummaryCard";
import styles from "./LobbyPageDesktop.module.css";

export function LobbyPageDesktop({ controller }: LobbyPageAssemblyProps) {
  const { t } = useI18n();
  const resolvedRoomId = controller.roomState?.roomId ?? controller.roomId ?? "lobby";
  const players = controller.roomState?.players ?? [];
  const hasStartedJoinError = controller.errorCode === "GAME_ALREADY_STARTED";

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <LobbyHeader
        connectionStatus={controller.connectionStatus}
        isHost={controller.isHost}
        roomId={resolvedRoomId}
      />

      {controller.errorMessage ? <StatusBanner>{controller.errorMessage}</StatusBanner> : null}

      <div className={styles.layoutGrid}>
        <div className={styles.primaryColumn}>
          <LobbySummaryCard
            displayName={controller.displayName}
            isHost={controller.isHost}
            playerCount={players.length}
            roomId={resolvedRoomId}
          />

          {hasStartedJoinError ? (
            <SurfaceCard className={styles.waitingCard}>
              <LobbySectionHeader
                description={t("lobby.started.description")}
                title={t("lobby.started.title")}
              />
            </SurfaceCard>
          ) : controller.isHost ? (
            <LobbyHostSettingsPanel
              currentSettings={controller.currentSettings}
              onIntentToStartGame={controller.preloadGame}
              onRoomSettingsChange={controller.handleRoomSettingsChange}
              onStartGame={controller.handleStartGame}
              onToggleTtMode={controller.toggleTtMode}
            />
          ) : (
            <SurfaceCard className={styles.waitingCard}>
              <LobbySectionHeader
                description={t("lobby.waiting.description")}
                title={t("lobby.waiting.title")}
              />
            </SurfaceCard>
          )}
        </div>

        <aside className={styles.secondaryColumn}>
          <LobbyPlayerList
            currentPlayerId={controller.currentPlayerId}
            isHost={controller.isHost}
            onPlayerKick={controller.handlePlayerKick}
            onPlayerStartingCardCountChange={controller.handlePlayerStartingCardCountChange}
            onPlayerStartingTtTokenCountChange={controller.handlePlayerStartingTtTokenCountChange}
            players={players}
            roomSettings={controller.currentSettings}
          />

          {controller.isHost ? (
            <LobbyRoomActions
              onCloseRoom={controller.handleCloseRoom}
              onIntentToStartGame={controller.preloadGame}
              onStartGame={controller.handleStartGame}
            />
          ) : null}
        </aside>
      </div>
    </AppPageShell>
  );
}
