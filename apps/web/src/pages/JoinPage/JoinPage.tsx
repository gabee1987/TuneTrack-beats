import { ROOM_CODE_MAX_LENGTH } from "@tunetrack/shared/client";
import { useId, type FormEvent } from "react";
import { useI18n } from "../../features/i18n";
import { AppPageShell } from "../../features/mobile-shell/AppPageShell";
import { IdentityChip } from "../../features/profile/IdentityChip";
import { NameSheet } from "../../features/profile/NameSheet";
import { ConnectionStatus } from "../../features/rooms/ConnectionStatus";
import { Button, IconButton, TextField } from "../../features/ui/primitives";
import { JoinOpenRooms } from "./components/JoinOpenRooms";
import { useJoinPageController } from "./hooks/useJoinPageController";
import styles from "./JoinPage.module.css";

/** Join a friend's room by code or from the open rooms (`22` §4.3); one layout for both sizes. */
export function JoinPage() {
  const { t } = useI18n();
  const controller = useJoinPageController();
  const reasonId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!controller.joinDisabledReason) controller.handleSubmit();
  }

  return (
    <AppPageShell panelClassName={styles.panel} screenClassName={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <IconButton aria-label={t("common.back")} onClick={controller.handleBack} variant="ghost">
            <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
              <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </IconButton>
          <h1 className={styles.title}>{t("join.title")}</h1>
          <ConnectionStatus />
        </div>
        {controller.identity ? (
          <IdentityChip
            className={styles.identity}
            displayName={controller.identity.displayName}
            onChange={controller.identity.onChange}
          />
        ) : null}
      </header>

      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <TextField
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          appearance="code"
          enterKeyHint="go"
          error={controller.notFoundMessage}
          label={t("join.codeLabel")}
          maxLength={ROOM_CODE_MAX_LENGTH}
          onChange={(event) => controller.handleCodeChange(event.target.value)}
          spellCheck={false}
          value={controller.code}
        />
        <Button
          aria-describedby={controller.joinDisabledReason ? reasonId : undefined}
          disabled={controller.joinDisabledReason !== null}
          fullWidth
          haptic
          isLoading={controller.isJoining}
          loadingLabel={t("join.joining")}
          onFocus={controller.preloadLobby}
          onTouchStart={controller.preloadLobby}
          size="lg"
          type="submit"
        >
          {t("join.action")}
        </Button>
        {controller.joinDisabledReason ? (
          <p className={styles.reason} id={reasonId}>
            {controller.joinDisabledReason}
          </p>
        ) : null}
      </form>

      <JoinOpenRooms controller={controller} />

      <NameSheet {...controller.nameSheetProps} />
    </AppPageShell>
  );
}
