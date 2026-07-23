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

export function LobbyPageDesktop({ model }: LobbyPageAssemblyProps) {
  const { t } = useI18n();
  const { shell, room, hostSettings, players, roomActions } = model;

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <LobbyHeader
        connectionStatus={room.connectionStatus}
        isHost={room.isHost}
        roomId={room.resolvedRoomId}
      />

      {shell.errorMessage ? <StatusBanner>{shell.errorMessage}</StatusBanner> : null}

      <div className={styles.layoutGrid}>
        <div className={styles.primaryColumn}>
          <LobbySummaryCard
            displayName={room.displayName}
            isHost={room.isHost}
            playerCount={room.players.length}
            roomId={room.resolvedRoomId}
          />

          {room.hasStartedJoinError ? (
            <SurfaceCard className={styles.waitingCard}>
              <LobbySectionHeader
                description={t("lobby.started.description")}
                title={t("lobby.started.title")}
              />
            </SurfaceCard>
          ) : room.isHost ? (
            <LobbyHostSettingsPanel
              currentSettings={hostSettings.currentSettings}
              onIntentToStartGame={hostSettings.onIntentToStartGame}
              onRoomSettingsChange={hostSettings.onRoomSettingsChange}
              onStartGame={hostSettings.onStartGame}
              onToggleTtMode={hostSettings.onToggleTtMode}
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
            currentPlayerId={players.currentPlayerId}
            isHost={players.isHost}
            onPlayerKick={players.onPlayerKick}
            onPlayerStartingCardCountChange={players.onPlayerStartingCardCountChange}
            onPlayerStartingTtTokenCountChange={players.onPlayerStartingTtTokenCountChange}
            players={players.players}
            roomSettings={players.roomSettings}
          />

          {roomActions.isHost ? (
            <LobbyRoomActions
              onCloseRoom={roomActions.onCloseRoom}
              onIntentToStartGame={roomActions.onIntentToStartGame}
              onStartGame={roomActions.onStartGame}
            />
          ) : null}
        </aside>
      </div>
    </AppPageShell>
  );
}
