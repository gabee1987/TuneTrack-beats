import { StatusBanner } from "../../../features/ui/StatusBanner";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyHostSettingsPanel } from "../components/LobbyHostSettingsPanel";
import { LobbyPlayerList } from "../components/LobbyPlayerList";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { LobbySectionHeader } from "../components/LobbySectionHeader";
import { LobbySummaryCard } from "../components/LobbySummaryCard";
import styles from "./LobbyPageDesktop.module.css";

export function LobbyPageDesktop({ controller }: LobbyPageAssemblyProps) {
  const resolvedRoomId = controller.roomState?.roomId ?? controller.roomId ?? "lobby";
  const players = controller.roomState?.players ?? [];

  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
      <LobbyHeader
        connectionStatus={controller.connectionStatus}
        isHost={controller.isHost}
        roomId={resolvedRoomId}
      />

      {controller.errorMessage ? (
        <StatusBanner>{controller.errorMessage}</StatusBanner>
      ) : null}

      <div className={styles.layoutGrid}>
        <div className={styles.primaryColumn}>
          <LobbySummaryCard
            displayName={controller.displayName}
            isHost={controller.isHost}
            playerCount={players.length}
            roomId={resolvedRoomId}
          />

          {controller.isHost ? (
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
                description="The host is setting the room up. You will move into the game automatically when it starts."
                title="Waiting for host"
              />
            </SurfaceCard>
          )}
        </div>

        <aside className={styles.secondaryColumn}>
          <LobbyPlayerList
            currentPlayerId={controller.currentPlayerId}
            isHost={controller.isHost}
            onPlayerStartingCardCountChange={
              controller.handlePlayerStartingCardCountChange
            }
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
