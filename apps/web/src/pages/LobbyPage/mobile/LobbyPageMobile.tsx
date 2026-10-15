import { useId, useState } from "react";
import { useI18n } from "../../../features/i18n";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { NameSheet } from "../../../features/profile/NameSheet";
import { ConnectionStatus } from "../../../features/rooms/ConnectionStatus";
import { IconButton } from "../../../features/ui/primitives";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import cardStyles from "../components/lobbyCard.module.css";
import { LobbyExitDialog } from "../components/LobbyExitDialog";
import { LobbyHostMusic } from "../components/LobbyHostMusic";
import { LobbyInviteCard } from "../components/LobbyInviteCard";
import { LobbyMusicSummary } from "../components/LobbyMusicCard";
import { LobbyPlayersSheet } from "../components/LobbyPlayersSheet";
import { LobbyPlayersStrip } from "../components/LobbyPlayersStrip";
import { LobbyRulesCard } from "../components/LobbyRulesCard";
import { LobbyStartDock, LobbyStartSummary } from "../components/LobbyStartDock";
import { RoomRenameDialog } from "../components/RoomRenameDialog";
import { RulesSheet } from "../components/RulesSheet";
import styles from "./LobbyPageMobile.module.css";

type RulesSheetState = "closed" | "players" | "rules";

/** One scrolling screen of the room, its music and rules over a slim Start dock (`22` §4.4). */
export function LobbyPageMobile({ model }: LobbyPageAssemblyProps) {
  const { t } = useI18n();
  const { hostSettings, identity, room, roomActions, setup, shell } = model;
  const isHost = room.isHost;
  const currentPlayer = room.players.find((player) => player.id === room.currentPlayerId);
  const visibleDisplayName = currentPlayer?.displayName ?? identity.displayName;
  const startLineId = useId();
  const [isNameSheetOpen, setIsNameSheetOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [isPlayersSheetOpen, setIsPlayersSheetOpen] = useState(false);
  const [rulesSheet, setRulesSheet] = useState<RulesSheetState>("closed");

  function handlePlayerNameSave(displayName: string) {
    setIsNameSheetOpen(false);
    if (displayName !== visibleDisplayName) void identity.onPlayerProfileChange(displayName);
  }

  return (
    <AppPageShell panelClassName={styles.panel} screenClassName={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <IconButton
            aria-label={isHost ? t("lobby.exit.closeLabel") : t("lobby.exit.leaveLabel")}
            onClick={() => setIsExitOpen(true)}
            variant="ghost"
          >
            <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
              <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
              />
            </svg>
          </IconButton>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>{t("lobby.eyebrow")}</p>
            <h1 className={styles.title}>{t(isHost ? "lobby.title.host" : "lobby.title.guest")}</h1>
          </div>
          <ConnectionStatus />
        </header>

        {shell.errorMessage ? <StatusBanner>{shell.errorMessage}</StatusBanner> : null}

        {room.hasStartedJoinError ? (
          <section className={cardStyles.card}>
            <h2 className={styles.noticeTitle}>{t("lobby.started.title")}</h2>
            <p className={cardStyles.statusLine}>{t("lobby.started.description")}</p>
          </section>
        ) : (
          <>
            <LobbyInviteCard
              isWaitingForPlayers={isHost && setup.start.playerCount === 1}
              onRename={isHost ? () => setIsRenameOpen(true) : undefined}
              players={
                <LobbyPlayersStrip
                  currentPlayerId={room.currentPlayerId}
                  onEditName={() => setIsNameSheetOpen(true)}
                  onShowAll={
                    isHost ? () => setRulesSheet("players") : () => setIsPlayersSheetOpen(true)
                  }
                  strip={setup.playersStrip}
                />
              }
              roomCode={setup.roomCode}
            />
            {isHost ? (
              <LobbyHostMusic currentSettings={hostSettings.currentSettings} setup={setup} />
            ) : (
              <LobbyMusicSummary hostName={setup.hostName} music={setup.music} />
            )}
            <LobbyRulesCard
              onEdit={isHost ? () => setRulesSheet("rules") : undefined}
              rules={setup.rules}
            />
            {isHost ? <LobbyStartSummary lineId={startLineId} start={setup.start} /> : null}
          </>
        )}
      </div>

      {room.hasStartedJoinError ? null : (
        <div className={styles.dock}>
          {isHost ? (
            <LobbyStartDock
              isHintEligible={setup.start.playerCount >= 2 && !setup.start.isBlocked}
              onIntentToStart={identity.preloadGame}
              onStart={identity.onStartGame}
              start={setup.start}
              startGameActionStatus={identity.startGameActionStatus}
              summaryLineId={startLineId}
            />
          ) : (
            <p className={styles.guestWaiting}>
              <span aria-hidden="true" className={cardStyles.pulse} />
              {t("lobby.guest.waiting", { host: setup.hostName ?? t("lobby.players.host") })}
            </p>
          )}
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
            isAtPlayers={rulesSheet === "players"}
            isOpen={rulesSheet !== "closed"}
            model={model}
            onClose={() => setRulesSheet("closed")}
          />
        </>
      ) : (
        <LobbyPlayersSheet
          isOpen={isPlayersSheetOpen}
          onClose={() => setIsPlayersSheetOpen(false)}
          players={model.players}
        />
      )}
    </AppPageShell>
  );
}
