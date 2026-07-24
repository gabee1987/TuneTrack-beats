import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppPageShell } from "../../../features/mobile-shell/AppPageShell";
import { useI18n } from "../../../features/i18n";
import { MotionDialogPortal } from "../../../features/motion";
import { rememberPlayerDisplayName } from "../../../services/session/playerSession";
import { StatusBanner } from "../../../features/ui/StatusBanner";
import { SurfaceCard } from "../../../features/ui/SurfaceCard";
import { TextInput } from "../../../features/ui/TextInput";
import { CloseIconButton } from "../../../features/ui/CloseIconButton";
import { Button } from "../../../features/ui/primitives";
import type { LobbyPageAssemblyProps } from "../LobbyPage.types";
import { LobbyHostCoreSettings } from "../components/LobbyHostCoreSettings";
import { LobbyHostTtSettings } from "../components/LobbyHostTtSettings";
import { LobbySpotifySection } from "../components/spotify/LobbySpotifySection";
import { LobbyPlayerList } from "../components/LobbyPlayerList";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { LobbySectionHeader } from "../components/LobbySectionHeader";
import styles from "./LobbyPageMobile.module.css";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

type InfoContent = {
  body: string;
  title: string;
};

export function LobbyPageMobile({ model }: LobbyPageAssemblyProps) {
  const { t } = useI18n();
  const { shell, room, hostSettings, players, roomActions, identity } = model;
  const resolvedRoomId = identity.resolvedRoomId;
  const hasStartedJoinError = identity.hasStartedJoinError;
  const currentPlayer = room.players.find((player) => player.id === room.currentPlayerId);
  const visibleDisplayName = currentPlayer?.displayName ?? identity.displayName;
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

    if (hasNameChange) {
      identity.onPlayerProfileChange(trimmedDisplayName);
    }

    if (hasRoomChange && identity.isHost) {
      identity.onRoomRename(trimmedRoomId);
      return false;
    }

    if (hasRoomChange) {
      navigate(
        `/lobby/${encodeURIComponent(trimmedRoomId)}?playerName=${encodeURIComponent(
          trimmedDisplayName,
        )}`,
      );
      return false;
    }

    if (hasNameChange) {
      navigate(
        `/lobby/${encodeURIComponent(resolvedRoomId)}?playerName=${encodeURIComponent(
          trimmedDisplayName,
        )}`,
        { replace: true },
      );
      return false;
    }

    return true;
  }

  function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const canContinue = applySetupChanges();

    if (canContinue && identity.isHost) {
      identity.onStartGame();
    }
  }

  function scrollToAdvancedSettings() {
    advancedSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const primaryActionLabel = hasSetupChanges
    ? t("lobby.setup.apply")
    : hasStartedJoinError
      ? t("lobby.setup.gameAlreadyStarted")
      : identity.isHost
        ? t("lobby.setup.startGame")
        : t("lobby.setup.waitingForHost");

  return (
    <AppPageShell panelClassName={styles.panelShell} screenClassName={styles.screenShell}>
      {shell.errorMessage ? <StatusBanner>{shell.errorMessage}</StatusBanner> : null}

      <section className={styles.setupScreen} aria-labelledby="lobby-setup-title">
        <form className={styles.setupCard} onSubmit={handleSetupSubmit}>
          <div className={styles.setupHeader}>
            <p className={styles.eyebrow}>{t("lobby.setup.eyebrow")}</p>
            <h1 className={styles.title} id="lobby-setup-title">
              {t("lobby.setup.title")}
            </h1>
            <p className={styles.subtitle}>{t("lobby.setup.subtitle")}</p>
          </div>

          <div className={styles.requiredFields}>
            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span>{t("lobby.setup.playerName")}</span>
                <InfoButton
                  label={t("lobby.setup.playerNameInfoLabel")}
                  onClick={() =>
                    setInfoContent({
                      title: t("lobby.setup.playerName"),
                      body: t("lobby.setup.playerNameInfoBody"),
                    })
                  }
                />
              </span>
              <TextInput
                autoComplete="nickname"
                maxLength={32}
                onChange={(event) => setDraftDisplayName(event.target.value)}
                placeholder={t("lobby.setup.playerNamePlaceholder")}
                value={draftDisplayName}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelRow}>
                <span>{t("lobby.setup.roomName")}</span>
                <InfoButton
                  label={t("lobby.setup.roomNameInfoLabel")}
                  onClick={() =>
                    setInfoContent({
                      title: t("lobby.setup.roomName"),
                      body: t("lobby.setup.roomNameInfoBody"),
                    })
                  }
                />
              </span>
              <TextInput
                autoCapitalize="none"
                autoComplete="off"
                inputMode="text"
                maxLength={24}
                onChange={(event) => setDraftRoomId(event.target.value)}
                placeholder={t("lobby.setup.roomNamePlaceholder")}
                value={draftRoomId}
              />
              {!isRoomIdValid && trimmedRoomId ? (
                <span className={styles.fieldError}>{t("lobby.setup.roomNameInvalid")}</span>
              ) : null}
            </label>
          </div>

          <div className={styles.setupFooter}>
            <Button
              disabled={!canApplySetup || (!identity.isHost && !hasSetupChanges)}
              fullWidth
              haptic
              onFocus={identity.preloadGame}
              onMouseEnter={identity.preloadGame}
              onTouchStart={identity.preloadGame}
              size="lg"
              type="submit"
            >
              {primaryActionLabel}
            </Button>

            <Button onClick={scrollToAdvancedSettings} type="button" variant="ghost">
              {t("lobby.setup.moreSettings")} ↓
            </Button>
          </div>
        </form>
      </section>

      <section
        aria-label={t("lobby.setup.advancedSettingsLabel")}
        className={styles.advancedSection}
        ref={advancedSectionRef}
      >
        {hasStartedJoinError ? (
          <SurfaceCard className={styles.waitingCard}>
            <LobbySectionHeader
              description={t("lobby.started.description")}
              title={t("lobby.started.title")}
            />
          </SurfaceCard>
        ) : identity.isHost ? (
          <div className={styles.advancedStack}>
            <LobbyHostCoreSettings
              currentSettings={hostSettings.currentSettings}
              onRoomSettingsChange={hostSettings.onRoomSettingsChange}
            />
            <LobbyHostTtSettings
              currentSettings={hostSettings.currentSettings}
              onRoomSettingsChange={hostSettings.onRoomSettingsChange}
              onToggleTtMode={hostSettings.onToggleTtMode}
            />
            <LobbySpotifySection currentSettings={hostSettings.currentSettings} />
          </div>
        ) : (
          <SurfaceCard className={styles.waitingCard}>
            <LobbySectionHeader
              description={t("lobby.waiting.description")}
              title={t("lobby.waiting.title")}
            />
          </SurfaceCard>
        )}

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
      </section>

      <MotionDialogPortal
        cardClassName={styles.infoCard}
        isOpen={Boolean(infoContent)}
        label={infoContent?.title ?? t("lobby.info.fallbackLabel")}
        onClose={() => setInfoContent(null)}
        overlayClassName={styles.infoOverlay}
      >
        {infoContent ? (
          <>
            <CloseIconButton
              ariaLabel={t("lobby.info.close")}
              className={styles.infoCloseButton}
              onClick={() => setInfoContent(null)}
              size="sm"
            />
            <div className={styles.infoScroll}>
              <p className={styles.infoEyebrow}>{t("lobby.info.title")}</p>
              <h2 className={styles.infoTitle}>{infoContent.title}</h2>
              <p className={styles.infoBody}>{infoContent.body}</p>
            </div>
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

function InfoGlyph() {
  return (
    <svg aria-hidden="true" className={styles.infoGlyph} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10.5V16.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <circle cx="12" cy="7.5" fill="currentColor" r="1.25" />
    </svg>
  );
}

function InfoButton({ label, onClick }: InfoButtonProps) {
  return (
    <button aria-label={label} className={styles.infoButton} onClick={onClick} type="button">
      <InfoGlyph />
    </button>
  );
}
