import { useId, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { NameSheet } from "../../../features/profile/NameSheet";
import { Button } from "../../../features/ui/primitives";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import cardStyles from "../components/lobbyCard.module.css";
import { LobbyAppMenu } from "../components/LobbyAppMenu";
import { LobbyExitButton } from "../components/LobbyExitButton";
import { LobbyExitDialog } from "../components/LobbyExitDialog";
import { LobbyHostMusic } from "../components/LobbyHostMusic";
import { LobbyInviteCard } from "../components/LobbyInviteCard";
import { LobbyMusicSummary } from "../components/LobbyMusicCard";
import { LobbyRulesCard } from "../components/LobbyRulesCard";
import { LobbyStartDock, LobbyStartSummary } from "../components/LobbyStartDock";
import { LobbyTopBar } from "../components/LobbyTopBar";
import { RoomRenameDialog } from "../components/RoomRenameDialog";
import { RulesSheet } from "../components/RulesSheet";
import { RulesPlayersSection } from "../components/rules/RulesPlayersSection";
import styles from "./LobbyPageDesktop.module.css";

/**
 * The phone lobby's cards in a column, with the players and the one Start beside them
 * (`22` §4.12). Same model and components as phones; only the assembly differs.
 */
export function LobbyPageDesktop({ model }: LobbyPageAssemblyProps) {
  const { t } = useI18n();
  const { hostSettings, identity, players, room, roomActions, setup, shell } = model;
  const isHost = room.isHost;
  const currentPlayer = room.players.find((player) => player.id === room.currentPlayerId);
  const visibleDisplayName = currentPlayer?.displayName ?? identity.displayName;
  const startLineId = useId();
  const [isNameSheetOpen, setIsNameSheetOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  function handlePlayerNameSave(displayName: string) {
    setIsNameSheetOpen(false);
    if (displayName !== visibleDisplayName) void identity.onPlayerProfileChange(displayName);
  }

  return (
    <AppPageShell panelClassName={styles.panel} screenClassName={styles.screen}>
      <LobbyTopBar
        isHost={isHost}
        onBack={() => setIsExitOpen(true)}
        trailing={<LobbyAppMenu isHost={isHost} />}
      />

      {shell.errorMessage ? <StatusBanner>{shell.errorMessage}</StatusBanner> : null}

      {room.hasStartedJoinError ? (
        <section className={cardStyles.card}>
          <h2 className={styles.noticeTitle}>{t("lobby.started.title")}</h2>
          <p className={cardStyles.statusLine}>{t("lobby.started.description")}</p>
        </section>
      ) : (
        <div className={styles.layout}>
          <div className={styles.primary}>
            <LobbyInviteCard
              isWaitingForPlayers={isHost && setup.start.playerCount === 1}
              onRename={isHost ? () => setIsRenameOpen(true) : undefined}
              roomCode={setup.roomCode}
            />
            {isHost ? (
              <LobbyHostMusic currentSettings={hostSettings.currentSettings} setup={setup} />
            ) : (
              <LobbyMusicSummary hostName={setup.hostName} music={setup.music} />
            )}
            <LobbyRulesCard
              onEdit={isHost ? () => setIsRulesOpen(true) : undefined}
              rules={setup.rules}
            />
          </div>

          <aside className={styles.aside}>
            <section className={cardStyles.card}>
              <RulesPlayersSection numberInput="stepper" players={players} />
              <Button onClick={() => setIsNameSheetOpen(true)} variant="tertiary">
                {t("lobby.players.changeName")}
              </Button>
            </section>
            <section className={cardStyles.card}>
              {isHost ? (
                <>
                  <LobbyStartDock
                    isHintEligible={setup.start.playerCount >= 2 && !setup.start.isBlocked}
                    onIntentToStart={identity.preloadGame}
                    onStart={identity.onStartGame}
                    start={setup.start}
                    startGameActionStatus={identity.startGameActionStatus}
                    summaryLineId={startLineId}
                  />
                  <LobbyStartSummary lineId={startLineId} start={setup.start} />
                </>
              ) : (
                <p className={cardStyles.statusLine}>
                  <span aria-hidden="true" className={cardStyles.pulse} />
                  {t("lobby.guest.waiting", { host: setup.hostName ?? t("lobby.players.host") })}
                </p>
              )}
            </section>
            <LobbyExitButton isHost={isHost} onClick={() => setIsExitOpen(true)} />
          </aside>
        </div>
      )}

      <NameSheet
        initialName={visibleDisplayName}
        isOpen={isNameSheetOpen}
        onClose={() => setIsNameSheetOpen(false)}
        onSave={handlePlayerNameSave}
      />
      <LobbyExitDialog
        closeRoomActionStatus={roomActions.closeRoomActionStatus}
        isHost={isHost}
        isOpen={isExitOpen}
        onClose={() => setIsExitOpen(false)}
        onCloseRoom={roomActions.onCloseRoom}
      />
      {isHost ? (
        <>
          <RoomRenameDialog
            actionState={identity.identityActionState}
            currentCode={setup.roomCode ?? ""}
            isOpen={isRenameOpen}
            isPending={identity.isIdentityActionPending}
            onClose={() => setIsRenameOpen(false)}
            onRename={identity.onRoomRename}
          />
          <RulesSheet
            hasPlayers={false}
            isAtPlayers={false}
            isOpen={isRulesOpen}
            model={model}
            numberInput="stepper"
            onClose={() => setIsRulesOpen(false)}
          />
        </>
      ) : null}
    </AppPageShell>
  );
}
