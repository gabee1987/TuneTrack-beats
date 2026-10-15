import type { ReactNode } from "react";
import { useI18n } from "../../../features/i18n";
import { useAppToast } from "../../../features/toast";
import { Skeleton } from "../../../features/ui/primitives";
import cardStyles from "./lobbyCard.module.css";
import styles from "./LobbyInviteCard.module.css";

interface LobbyInviteCardProps {
  /** One player in the room: "Waiting for friends to join…". */
  isWaitingForPlayers: boolean;
  /** Host only: the Edit action under the code. */
  onRename?: (() => void) | undefined;
  /** The players strip. */
  players: ReactNode;
  /** `null` while the room is being created: the code area shows its skeleton. */
  roomCode: string | null;
}

/** The code is the hero, one tap from Copy or Share (`22` §4.5). */
export function LobbyInviteCard({
  isWaitingForPlayers,
  onRename,
  players,
  roomCode,
}: LobbyInviteCardProps) {
  const { t } = useI18n();
  const { canShare, copy, share } = useInviteSharing(roomCode);
  const isDisabled = !roomCode;

  return (
    <section aria-label={t("lobby.invite.label")} className={styles.card}>
      <p aria-hidden="true" className={styles.label}>
        {t("lobby.invite.label")}
      </p>
      {roomCode ? (
        <p
          aria-label={t("lobby.invite.codeSpelled", { spelled: roomCode.split("").join(" ") })}
          className={styles.code}
        >
          {roomCode}
        </p>
      ) : (
        <span aria-label={t("lobby.start.reason.creating")} className={styles.code} role="status">
          <Skeleton height="1em" width="7ch" />
        </span>
      )}

      <div className={styles.actions}>
        <RoundAction
          caption={t("lobby.invite.copyShort")}
          disabled={isDisabled}
          icon={COPY_PATH}
          label={canShare ? t("lobby.invite.copy") : t("lobby.invite.copyLink")}
          onClick={() => void copy()}
        />
        {canShare ? (
          <RoundAction
            caption={t("lobby.invite.share")}
            disabled={isDisabled}
            icon={SHARE_PATH}
            isPrimary
            label={t("lobby.invite.share")}
            onClick={() => void share()}
          />
        ) : null}
        {onRename ? (
          <RoundAction
            caption={t("lobby.invite.editShort")}
            disabled={isDisabled}
            icon={EDIT_PATH}
            label={t("lobby.invite.rename")}
            onClick={onRename}
          />
        ) : null}
      </div>

      <div className={styles.players}>
        {players}
        {isWaitingForPlayers && roomCode ? (
          <p className={cardStyles.statusLine}>
            <span aria-hidden="true" className={cardStyles.pulse} />
            {t("lobby.invite.waiting")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

const COPY_PATH =
  "M9 9V5.5A1.5 1.5 0 0 1 10.5 4H18.5A1.5 1.5 0 0 1 20 5.5V13.5A1.5 1.5 0 0 1 18.5 15H15M5.5 9H13.5A1.5 1.5 0 0 1 15 10.5V18.5A1.5 1.5 0 0 1 13.5 20H5.5A1.5 1.5 0 0 1 4 18.5V10.5A1.5 1.5 0 0 1 5.5 9Z";
const SHARE_PATH =
  "M12 15V4M12 4L8 8M12 4L16 8M6 12V18.5A1.5 1.5 0 0 0 7.5 20H16.5A1.5 1.5 0 0 0 18 18.5V12";
const EDIT_PATH = "M4 20H8L18.5 9.5A2.12 2.12 0 0 0 15.5 6.5L5 17V20Z M14 8L17 11";

interface RoundActionProps {
  caption: string;
  disabled: boolean;
  icon: string;
  isPrimary?: boolean | undefined;
  label: string;
  onClick: () => void;
}

/** One of the code's actions: a round icon with its word under it, the whole column one target. */
function RoundAction({
  caption,
  disabled,
  icon,
  isPrimary = false,
  label,
  onClick,
}: RoundActionProps) {
  return (
    <button
      aria-label={label}
      className={styles.action}
      data-primary={isPrimary || undefined}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className={styles.actionIcon}>
        <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
          <path
            d={icon}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span aria-hidden="true" className={styles.actionCaption}>
        {caption}
      </span>
    </button>
  );
}

/** Web Share and the clipboard are browser-native; nothing leaves the device without the user. */
function useInviteSharing(roomCode: string | null) {
  const { t } = useI18n();
  const { showToast } = useAppToast();
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  function getInvite() {
    const code = roomCode ?? "";
    return {
      text: t("lobby.invite.shareText", { code }),
      url: `${window.location.origin}/join/${encodeURIComponent(code)}`,
    };
  }

  async function copy() {
    if (!roomCode) return;
    const invite = getInvite();
    try {
      await navigator.clipboard.writeText(canShare ? roomCode : `${invite.text}\n${invite.url}`);
      showToast({
        message: canShare ? t("lobby.invite.copied") : t("lobby.invite.linkCopied"),
        type: "success",
      });
    } catch {
      showToast({ message: t("lobby.invite.copyFailed"), type: "error" });
    }
  }

  async function share() {
    if (!roomCode) return;
    try {
      await navigator.share({ title: t("app.name"), ...getInvite() });
    } catch {
      // Closing the share sheet rejects too; there is nothing to report.
    }
  }

  return { canShare, copy, share };
}
