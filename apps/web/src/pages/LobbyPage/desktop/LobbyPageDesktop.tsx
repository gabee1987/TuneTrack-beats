import { useState } from "react";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { useI18n } from "../../../features/i18n";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import { LobbyHeader } from "../components/LobbyHeader";
import { LobbyHostSettingsPanel } from "../components/LobbyHostSettingsPanel";
import { Button } from "../../../features/ui/primitives";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { RoomRenameDialog } from "../components/RoomRenameDialog";
import { RulesPlayersSection } from "../components/rules/RulesPlayersSection";
import { LobbySectionHeader } from "../components/LobbySectionHeader";
import { LobbySummaryCard } from "../components/LobbySummaryCard";
import styles from "./LobbyPageDesktop.module.css";

export function LobbyPageDesktop({ model }: LobbyPageAssemblyProps) {
  const { t } = useI18n();
  const { shell, room, hostSettings, players, roomActions, identity } = model;
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      <LobbyHeader isHost={room.isHost} roomId={room.resolvedRoomId} />

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
            <>
              <SurfaceCard className={styles.waitingCard}>
                <Button onClick={() => setIsRenameOpen(true)} variant="secondary">
                  {t("lobby.invite.rename")}
                </Button>
              </SurfaceCard>
              <RoomRenameDialog
                actionState={identity.identityActionState}
                currentCode={identity.resolvedRoomId}
                isOpen={isRenameOpen}
                isPending={identity.isIdentityActionPending}
                onClose={() => setIsRenameOpen(false)}
                onRename={identity.onRoomRename}
              />
              <LobbyHostSettingsPanel
                currentSettings={hostSettings.currentSettings}
                isRoomSettingsPending={hostSettings.isRoomSettingsPending}
                isStartGamePending={hostSettings.isStartGamePending}
                onIntentToStartGame={hostSettings.onIntentToStartGame}
                onRoomSettingsChange={hostSettings.onRoomSettingsChange}
                onStartGame={hostSettings.onStartGame}
                onToggleTtMode={hostSettings.onToggleTtMode}
                roomSettingsActionStatus={hostSettings.roomSettingsActionStatus}
                startGameActionStatus={hostSettings.startGameActionStatus}
              />
            </>
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
          <SurfaceCard className={styles.waitingCard}>
            <RulesPlayersSection numberInput="stepper" players={players} />
          </SurfaceCard>

          {roomActions.isHost ? (
            <LobbyRoomActions
              closeRoomActionStatus={roomActions.closeRoomActionStatus}
              isCloseRoomPending={roomActions.isCloseRoomPending}
              isStartGamePending={roomActions.isStartGamePending}
              onCloseRoom={roomActions.onCloseRoom}
              onIntentToStartGame={roomActions.onIntentToStartGame}
              onStartGame={roomActions.onStartGame}
              startGameActionStatus={roomActions.startGameActionStatus}
            />
          ) : null}
        </aside>
      </div>
    </AppPageShell>
  );
}
