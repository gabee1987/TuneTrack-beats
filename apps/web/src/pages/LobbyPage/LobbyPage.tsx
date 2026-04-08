import { LobbyHeader } from "./components/LobbyHeader";
import { LobbyHostSettingsPanel } from "./components/LobbyHostSettingsPanel";
import { LobbyPlayerList } from "./components/LobbyPlayerList";
import { LobbyRoomActions } from "./components/LobbyRoomActions";
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
    <main className={styles.screen}>
      <section className={styles.panel}>
        <LobbyHeader
          connectionStatus={connectionStatus}
          isHost={isHost}
          roomId={resolvedRoomId}
        />

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

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
              <section className={styles.waitingCard}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2 className={styles.sectionTitle}>Waiting for host</h2>
                    <p className={styles.sectionDescription}>
                      The host is setting the room up. You will move into the game
                      automatically when it starts.
                    </p>
                  </div>
                </div>
              </section>
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
      </section>
    </main>
  );
}
