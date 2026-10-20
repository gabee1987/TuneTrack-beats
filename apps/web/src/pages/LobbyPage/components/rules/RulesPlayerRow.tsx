import {
  MAX_STARTING_TIMELINE_CARD_COUNT,
  MAX_STARTING_TT_TOKEN_COUNT,
  MIN_STARTING_TIMELINE_CARD_COUNT,
  MIN_STARTING_TT_TOKEN_COUNT,
  type PublicPlayerState,
} from "@tunetrack/shared/client";
import { useId } from "react";
import { useI18n } from "../../../../features/i18n";
import { MeasuredDisclosure } from "../../../../features/motion";
import { Avatar, Button, ListRow, ListRowButton } from "../../../../features/ui/primitives";
import type {
  LobbyKickPlayerActionStatus,
  LobbyPlayerSettingsActionStatus,
} from "../../LobbyPage.types";
import { RulesNumberSetting, type RulesNumberInput } from "./RulesNumberSetting";
import styles from "./rules.module.css";

interface RulesPlayerRowProps {
  /** Host only: the row opens the player's own starting songs and tokens. */
  canAdjust: boolean;
  canRemove: boolean;
  isBusy: boolean;
  isOpen: boolean;
  isSelf: boolean;
  isTokensOn: boolean;
  kickStatus: LobbyKickPlayerActionStatus | null;
  numberInput: RulesNumberInput;
  onRemove: () => void;
  onStartingSongsChange: (value: number) => void;
  onStartingTokensChange: (value: number) => void;
  onToggle: () => void;
  player: PublicPlayerState;
  settingsStatus: LobbyPlayerSettingsActionStatus | null;
}

/** One player: name, who they are as text, what they start with; the host can open it. */
export function RulesPlayerRow({
  canAdjust,
  canRemove,
  isBusy,
  isOpen,
  isSelf,
  isTokensOn,
  kickStatus,
  numberInput,
  onRemove,
  onStartingSongsChange,
  onStartingTokensChange,
  onToggle,
  player,
  settingsStatus,
}: RulesPlayerRowProps) {
  const { t } = useI18n();
  const panelId = useId();
  const subtitle = getPlayerSubtitle(player, isSelf, isTokensOn, t);
  const leading = <Avatar initials={player.displayName} size="sm" />;

  return (
    <li className={styles.player}>
      {canAdjust ? (
        <ListRowButton
          aria-controls={panelId}
          aria-expanded={isOpen}
          className={styles.playerRow}
          leading={leading}
          onClick={onToggle}
          subtitle={subtitle}
          title={player.displayName}
          trailing={<ChevronGlyph isOpen={isOpen} />}
        />
      ) : (
        <ListRow
          className={styles.playerRow}
          leading={leading}
          subtitle={subtitle}
          title={player.displayName}
        />
      )}
      {canAdjust ? (
        <MeasuredDisclosure className={styles.playerPanel} id={panelId} isOpen={isOpen}>
          <RulesNumberSetting
            density="compact"
            disabled={isBusy}
            max={MAX_STARTING_TIMELINE_CARD_COUNT}
            min={MIN_STARTING_TIMELINE_CARD_COUNT}
            numberInput={numberInput}
            onChange={onStartingSongsChange}
            title={t("lobby.players.startingSongs")}
            value={player.startingTimelineCardCount}
          />
          {isTokensOn ? (
            <RulesNumberSetting
              density="compact"
              disabled={isBusy}
              max={MAX_STARTING_TT_TOKEN_COUNT}
              min={MIN_STARTING_TT_TOKEN_COUNT}
              numberInput={numberInput}
              onChange={onStartingTokensChange}
              title={t("lobby.players.startingTokens")}
              value={player.ttTokenCount}
            />
          ) : null}
          {canRemove ? (
            <Button
              aria-label={getRemoveLabel(kickStatus, player.displayName, t)}
              disabled={isBusy}
              fullWidth
              onClick={onRemove}
              variant="danger"
            >
              {getRemoveText(kickStatus, t)}
            </Button>
          ) : null}
        </MeasuredDisclosure>
      ) : null}
      {settingsStatus === "retrying" || settingsStatus === "failed" ? (
        <p aria-live="polite" className={styles.rowStatus}>
          {settingsStatus === "retrying"
            ? t("lobby.players.settingsRetrying")
            : t("lobby.players.settingsFailed")}
        </p>
      ) : null}
    </li>
  );
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function getPlayerSubtitle(
  player: PublicPlayerState,
  isSelf: boolean,
  isTokensOn: boolean,
  t: Translate,
): string {
  const songs = player.startingTimelineCardCount;
  const parts = [
    player.isHost ? t("lobby.players.host") : null,
    isSelf ? t("common.you") : null,
    player.connectionStatus === "disconnected" ? t("lobby.players.offline") : null,
    songs === 1
      ? t("lobby.players.startingSongsCountOne")
      : t("lobby.players.startingSongsCount", { count: songs }),
    isTokensOn ? getTokenText(player.ttTokenCount, t) : null,
  ];

  return parts.filter((part) => part !== null).join(" · ");
}

function getTokenText(count: number, t: Translate): string {
  return count === 1 ? t("common.tokenCountOne") : t("common.tokenCount", { count });
}

function getRemoveText(status: LobbyKickPlayerActionStatus | null, t: Translate): string {
  switch (status) {
    case "retrying":
      return t("lobby.players.kickRetrying");
    case "failed":
      return t("lobby.players.retryKick");
    default:
      return t("lobby.players.remove");
  }
}

function getRemoveLabel(
  status: LobbyKickPlayerActionStatus | null,
  name: string,
  t: Translate,
): string {
  return status === "retrying" || status === "failed"
    ? getRemoveText(status, t)
    : t("lobby.players.removeLabel", { name });
}

function ChevronGlyph({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={styles.chevron}
      data-open={isOpen || undefined}
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
      />
    </svg>
  );
}
