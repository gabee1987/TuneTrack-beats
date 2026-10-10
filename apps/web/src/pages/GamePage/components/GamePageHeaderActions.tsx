import type { PublicRoomState } from "@tunetrack/shared/client";
import { AppShellMenu } from "../../../features/app-shell/AppShellMenu";
import type {
  AppShellMenuFooterAction,
  AppShellMenuTab,
} from "../../../features/app-shell/AppShellMenu.types";
import { useI18n } from "../../../features/i18n";
import { IconButton } from "../../../features/ui/primitives";
import type {
  CloseRoomActionStatus,
  GamePageViewPreferenceUpdater,
  SkipTurnActionStatus,
} from "../GamePage.types";
import styles from "../gamePageChrome.module.css";

const CLOSE_ROOM_LABEL_KEY_BY_STATUS = {
  idle: "game.header.closeRoom",
  pending: "room.close.pending",
  retrying: "room.close.retrying",
  failed: "room.close.retry",
} as const;

const SKIP_TURN_LABEL_KEY_BY_STATUS = {
  idle: "game.controls.skipTurn",
  pending: "game.controls.skipTurn",
  retrying: "game.controls.skipTurnRetrying",
  failed: "game.controls.retrySkipTurn",
} as const;

interface GamePageHeaderActionsProps {
  closeRoomActionStatus: CloseRoomActionStatus;
  handleCloseRoom: () => void;
  handleSkipTurn: () => void;
  isCloseRoomPending: boolean;
  isHost: boolean;
  isSkipTurnPending: boolean;
  menuTabs: AppShellMenuTab[];
  menuTriggerRef: (element: HTMLElement | null) => void;
  roomId: string;
  showMiniStandings: boolean;
  skipTurnActionStatus: SkipTurnActionStatus;
  status: PublicRoomState["status"];
  updateViewPreferences: GamePageViewPreferenceUpdater;
}

/** The leaderboard toggle and the game menu; the host also gets skip turn and close room. */
export function GamePageHeaderActions({
  closeRoomActionStatus,
  handleCloseRoom,
  handleSkipTurn,
  isCloseRoomPending,
  isHost,
  isSkipTurnPending,
  menuTabs,
  menuTriggerRef,
  roomId,
  showMiniStandings,
  skipTurnActionStatus,
  status,
  updateViewPreferences,
}: GamePageHeaderActionsProps) {
  const { t } = useI18n();
  const leaderboardLabel = showMiniStandings
    ? t("game.header.hideLeaderboard")
    : t("game.header.showLeaderboard");
  const hostFooterActions: AppShellMenuFooterAction[] = [
    ...(status === "turn"
      ? [
          {
            disabled: isSkipTurnPending,
            label: t(SKIP_TURN_LABEL_KEY_BY_STATUS[skipTurnActionStatus]),
            onClick: handleSkipTurn,
            tone: "neutral" as const,
          },
        ]
      : []),
    {
      disabled: isCloseRoomPending,
      label: t(CLOSE_ROOM_LABEL_KEY_BY_STATUS[closeRoomActionStatus]),
      onClick: handleCloseRoom,
      tone: "danger" as const,
    },
  ];

  return (
    <>
      <IconButton
        aria-label={leaderboardLabel}
        onClick={() => updateViewPreferences({ showMiniStandings: !showMiniStandings })}
        title={leaderboardLabel}
      >
        <svg aria-hidden="true" className={styles.headerIcon} fill="none" viewBox="0 0 24 24">
          <path
            d="M5 20H9V11H5V20Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M10 20H14V4H10V20Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M15 20H19V8H15V20Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M4 20H20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </IconButton>
      <AppShellMenu
        subtitle={t("gameMenu.lobbyNameSubtitle")}
        tabs={menuTabs}
        title={roomId}
        triggerRef={menuTriggerRef}
        {...(isHost ? { footerActions: hostFooterActions } : {})}
      />
    </>
  );
}
