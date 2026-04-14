import { StatusBanner } from "../../features/ui/StatusBanner";
import { SurfaceCard } from "../../features/ui/SurfaceCard";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { LobbyHeader } from "./components/LobbyHeader";
import { LobbyHostSettingsPanel } from "./components/LobbyHostSettingsPanel";
import { LobbyPlayerList } from "./components/LobbyPlayerList";
import { LobbyRoomActions } from "./components/LobbyRoomActions";
import { LobbySectionHeader } from "./components/LobbySectionHeader";
import { LobbySummaryCard } from "./components/LobbySummaryCard";
import { useLobbyPageController } from "./hooks/useLobbyPageController";
import styles from "./LobbyPage.module.css";

export function LobbyPage() {
  const {
    connectionStatus,
    currentPlayerId,
    currentSettings,
    displayName,
    errorMessage,
    handleCloseRoom,
    handlePlayerStartingCardCountChange,
    handleRoomSettingsChange,
    handleStartGame,
    isHost,
    roomId,
    roomState,
    toggleTtMode,
  } = useLobbyPageController();

  const resolvedRoomId = roomState?.roomId ?? roomId ?? "lobby";
  const players = roomState?.players ?? [];

  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
        <LobbyHeader
          connectionStatus={connectionStatus}
          isHost={isHost}
          roomId={resolvedRoomId}
        />

        {errorMessage ? <StatusBanner>{errorMessage}</StatusBanner> : null}

        <div className={styles.layoutGrid}>
          <div className={styles.primaryColumn}>
            <LobbySummaryCard
              displayName={displayName}
              isHost={isHost}
              playerCount={players.length}
              roomId={resolvedRoomId}
            />

            {isHost ? (
              <LobbyHostSettingsPanel
                currentSettings={currentSettings}
                onRoomSettingsChange={handleRoomSettingsChange}
                onStartGame={handleStartGame}
                onToggleTtMode={toggleTtMode}
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
              currentPlayerId={currentPlayerId}
              isHost={isHost}
              onPlayerStartingCardCountChange={handlePlayerStartingCardCountChange}
              players={players}
              roomSettings={currentSettings}
            />

            {isHost ? <LobbyRoomActions onCloseRoom={handleCloseRoom} /> : null}
          </aside>
        </div>
    </AppPageShell>
  );
}
