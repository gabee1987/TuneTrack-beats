import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { MotionDialogPortal } from "../../../features/motion";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import { LobbyHostCoreSettings } from "../components/LobbyHostCoreSettings";
import { LobbyHostTtSettings } from "../components/LobbyHostTtSettings";
import { LobbyPlayerList } from "../components/LobbyPlayerList";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { LobbySectionHeader } from "../components/LobbySectionHeader";
import styles from "./LobbyPageMobile.module.css";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

type InfoContent = {
  body: string;
  title: string;
};

export function LobbyPageMobile({ controller }: LobbyPageAssemblyProps) {
  const resolvedRoomId = controller.roomState?.roomId ?? controller.roomId ?? "lobby";
  const players = controller.roomState?.players ?? [];
  const currentPlayer = players.find(
    (player) => player.id === controller.currentPlayerId,
  );
  const visibleDisplayName = currentPlayer?.displayName ?? controller.displayName;
  const navigate = useNavigate();
  const advancedSectionRef = useRef<HTMLElement | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState(visibleDisplayName);
  const [draftRoomId, setDraftRoomId] = useState(resolvedRoomId);
  const [infoContent, setInfoContent] = useState<InfoContent | null>(null);

  useEffect(() => {
    setDraftDisplayName(visibleDisplayName);
  }, [visibleDisplayName]);

  useEffect(() => {
    setDraftRoomId(resolvedRoomId);
  }, [resolvedRoomId]);

  const trimmedDisplayName = draftDisplayName.trim();
  const trimmedRoomId = draftRoomId.trim();
  const isRoomIdValid = ROOM_ID_PATTERN.test(trimmedRoomId);
  const canApplySetup = Boolean(trimmedDisplayName && trimmedRoomId && isRoomIdValid);
  const hasNameChange = trimmedDisplayName !== visibleDisplayName;
  const hasRoomChange = trimmedRoomId !== resolvedRoomId;
  const hasSetupChanges = hasNameChange || hasRoomChange;

  function applySetupChanges() {
    if (!canApplySetup) {
      return false;
    }

    rememberPlayerDisplayName(trimmedDisplayName);

    if (hasRoomChange) {
      navigate(
        `/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(
          trimmedDisplayName,
        )}`,
      );
      return false;
    }

    if (hasNameChange) {
      controller.handlePlayerProfileChange(trimmedDisplayName);
      navigate(
        `/lobby/${encodeURIComponent(resolvedRoomId)}?playerName=${encodeURIComponent(
          trimmedDisplayName,
        )}`,
        { replace: true },
      );
    }

    return true;
  }

  function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const canContinue = applySetupChanges();

    if (canContinue && controller.isHost) {
      controller.handleStartGame();
    }
  }

  function scrollToAdvancedSettings() {
    advancedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <AppPageShell
      panelClassName={styles.panelShell}
      screenClassName={styles.screenShell}
    >
      <div className={styles.backgroundOrbs} aria-hidden="true" />

      {controller.errorMessage ? (
        <StatusBanner>{controller.errorMessage}</StatusBanner>
      ) : null}

      <section className={styles.setupScreen} aria-labelledby="lobby-setup-title">
        <form className={styles.setupCard} onSubmit={handleSetupSubmit}>
          <div className={styles.setupHeader}>
            <p className={styles.eyebrow}>Lobby setup</p>
            <h1 className={styles.title} id="lobby-setup-title">
              Get the room ready
            </h1>
            <p className={styles.subtitle}>
              Name yourself, name the room, then start when everyone is in.
            </p>
          </div>

          <div className={styles.requiredFields}>
            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span>Player name</span>
                <InfoButton
                  label="Player name info"
                  onClick={() =>
                    setInfoContent({
                      title: "Player name",
                      body: "This is the name other players see in the lobby and during the game.",
                    })
                  }
                />
              </span>
              <input
                autoComplete="nickname"
                className={styles.textInput}
                maxLength={32}
                onChange={(event) => setDraftDisplayName(event.target.value)}
                placeholder="Your name"
                value={draftDisplayName}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span>Room name</span>
                <InfoButton
                  label="Room name info"
                  onClick={() =>
                    setInfoContent({
                      title: "Room name",
                      body: "Players join this exact room name. Use letters, numbers, dashes, or underscores.",
                    })
                  }
                />
              </span>
              <input
                autoCapitalize="none"
                autoComplete="off"
                className={styles.textInput}
                inputMode="text"
                maxLength={24}
                onChange={(event) => setDraftRoomId(event.target.value)}
                placeholder="party-room"
                value={draftRoomId}
              />
              {!isRoomIdValid && trimmedRoomId ? (
                <span className={styles.fieldError}>
                  Use letters, numbers, dashes, or underscores.
                </span>
              ) : null}
            </label>
          </div>

          <div className={styles.setupFooter}>
            <button
              className={styles.primaryAction}
              disabled={!canApplySetup || (!controller.isHost && !hasSetupChanges)}
              onFocus={controller.preloadGame}
              onMouseEnter={controller.preloadGame}
              onTouchStart={controller.preloadGame}
              type="submit"
            >
              <span className={styles.primaryActionInner}>
                <span className={styles.primaryActionLabel}>
                  {hasSetupChanges
                    ? "Apply setup"
                    : controller.isHost
                      ? "Start game"
                      : "Waiting for host"}
                </span>
              </span>
            </button>

            <button
              className={styles.moreSettingsButton}
              onClick={scrollToAdvancedSettings}
              type="button"
            >
              <span>More room settings</span>
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        </form>
      </section>

      <section
        className={styles.advancedSection}
        ref={advancedSectionRef}
        aria-label="Advanced lobby settings"
      >
        {controller.isHost ? (
          <div className={styles.advancedStack}>
            <LobbyHostCoreSettings
              currentSettings={controller.currentSettings}
              onRoomSettingsChange={controller.handleRoomSettingsChange}
            />
            <LobbyHostTtSettings
              currentSettings={controller.currentSettings}
              onRoomSettingsChange={controller.handleRoomSettingsChange}
              onToggleTtMode={controller.toggleTtMode}
            />
          </div>
        ) : (
          <SurfaceCard className={styles.waitingCard}>
            <LobbySectionHeader
              description="The host is setting the room up. You will move into the game automatically when it starts."
              title="Waiting for host"
            />
          </SurfaceCard>
        )}

        <LobbyPlayerList
          currentPlayerId={controller.currentPlayerId}
          isHost={controller.isHost}
          onPlayerStartingCardCountChange={
            controller.handlePlayerStartingCardCountChange
          }
          onPlayerStartingTtTokenCountChange={
            controller.handlePlayerStartingTtTokenCountChange
          }
          players={players}
          roomSettings={controller.currentSettings}
        />

        {controller.isHost ? (
          <LobbyRoomActions
            buttonClassName={styles.dangerAction}
            onCloseRoom={controller.handleCloseRoom}
            onIntentToStartGame={controller.preloadGame}
            onStartGame={controller.handleStartGame}
          />
        ) : null}
      </section>

      <MotionDialogPortal
        cardClassName={styles.infoCard}
        isOpen={Boolean(infoContent)}
        label={infoContent?.title ?? "Lobby info"}
        onClose={() => setInfoContent(null)}
        overlayClassName={styles.infoOverlay}
      >
        {infoContent ? (
          <>
            <div className={styles.infoHeaderRow}>
              <p className={styles.infoEyebrow}>Info</p>
              <button
                aria-label="Close info"
                className={styles.infoCloseButton}
                onClick={() => setInfoContent(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <h2 className={styles.infoTitle}>{infoContent.title}</h2>
            <p className={styles.infoBody}>{infoContent.body}</p>
          </>
        ) : null}
      </MotionDialogPortal>
    </AppPageShell>
  );
}

interface InfoButtonProps {
  label: string;
  onClick: () => void;
}

function InfoButton({ label, onClick }: InfoButtonProps) {
  return (
    <button
      aria-label={label}
      className={styles.infoButton}
      onClick={onClick}
      type="button"
    >
      i
    </button>
  );
}
