import type { PublicRoomState } from "@tunetrack/shared";
import type {
  ChallengeMarkerTone,
  GamePageCard,
  GamePagePlayerNameResolver,
} from "./GamePage.types";

interface GamePageChallengeStatusSelectorOptions {
  canSelectChallengeSlot: boolean;
  challengeOwnerId: string | null | undefined;
  challengeSuccessCelebrationCard: GamePageCard | null;
  currentPlayerId: string | null;
  getPlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  nowEpochMs: number;
  roomState: PublicRoomState | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

interface GamePageStatusCopySelectorOptions {
  activePlayerId: string | null | undefined;
  challengeOwnerId: string | null | undefined;
  currentPlayerId: string | null;
  canSelectChallengeSlot: boolean;
  getPlayerName: GamePagePlayerNameResolver;
  getPossessivePlayerName: GamePagePlayerNameResolver;
  isCurrentPlayerTurn: boolean;
  roomState: PublicRoomState | null;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export interface GamePageChallengeStatusSelectorResult {
  challengeActionBody: string | null;
  challengeActionTitle: string | null;
  challengeCountdownLabel: string | null;
  challengeMarkerTone: ChallengeMarkerTone;
  challengeSuccessMessage: string | null;
}

export interface GamePageStatusCopySelectorResult {
  activeTimelineHint: string;
  statusBadgeText: string;
  statusDetailText: string;
}

export function getGamePageChallengeStatusState({
  canSelectChallengeSlot,
  challengeOwnerId,
  challengeSuccessCelebrationCard,
  currentPlayerId,
  getPlayerName,
  isCurrentPlayerTurn,
  nowEpochMs,
  roomState,
  t,
}: GamePageChallengeStatusSelectorOptions): GamePageChallengeStatusSelectorResult {
  const deadlineEpochMs = roomState?.challengeState?.challengeDeadlineEpochMs;
  const isManualChallengeWindow =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    !deadlineEpochMs;
  const challengeCountdownLabel =
    !deadlineEpochMs ||
    roomState?.status !== "challenge" ||
    roomState.challengeState?.phase !== "open"
      ? null
      : t("game.status.countdownBeat", {
          seconds: Math.max(0, Math.ceil((deadlineEpochMs - nowEpochMs) / 1000)),
        });

  const challengeActionTitle =
    roomState?.status !== "challenge" || !roomState.challengeState
      ? null
      : roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? t("game.status.challengeWindowOpen")
          : isManualChallengeWindow
            ? t("game.status.beatAvailable")
            : t("game.status.beatAvailable")
        : challengeOwnerId === currentPlayerId
          ? t("game.status.placeYourBeat")
          : t("game.status.playerPlacingBeat", {
              playerName: getPlayerName(challengeOwnerId),
            });

  const challengeActionBody =
    roomState?.status !== "challenge" || !roomState.challengeState
      ? null
      : roomState.challengeState.phase === "open"
        ? isCurrentPlayerTurn
          ? isManualChallengeWindow
            ? t("game.status.currentTurnCanBeatManual")
            : t("game.status.currentTurnCanBeatTimed")
          : isManualChallengeWindow
            ? t("game.status.callBeatBeforeHost")
            : t("game.status.chosenSlot", {
                slot: roomState.challengeState.originalSelectedSlotIndex,
              })
        : canSelectChallengeSlot
          ? t("game.status.chooseChallengeSlot")
          : t("game.status.waitingChallengePlacement");

  const challengeMarkerTone: ChallengeMarkerTone =
    roomState?.status !== "reveal" || !roomState.revealState?.challengerPlayerId
      ? "pending"
      : roomState.revealState.challengeWasSuccessful
        ? "success"
        : "failure";

  return {
    challengeActionBody,
    challengeActionTitle,
    challengeCountdownLabel,
    challengeMarkerTone,
    challengeSuccessMessage: challengeSuccessCelebrationCard ? t("game.status.cleanBeat") : null,
  };
}

export function getGamePageStatusCopyState({
  activePlayerId,
  challengeOwnerId,
  currentPlayerId,
  canSelectChallengeSlot,
  getPlayerName,
  getPossessivePlayerName,
  isCurrentPlayerTurn,
  roomState,
  t,
}: GamePageStatusCopySelectorOptions): GamePageStatusCopySelectorResult {
  const isActivePlayerOffline =
    roomState?.status === "turn" &&
    roomState.players.find((p) => p.id === activePlayerId)?.connectionStatus === "disconnected";

  const activeTimelineHint =
    roomState?.status !== "challenge"
      ? isCurrentPlayerTurn
        ? ""
        : t("game.status.activeTimelineJudged")
      : canSelectChallengeSlot
        ? t("game.status.youCalledBeat", {
            playerName: getPossessivePlayerName(activePlayerId),
          })
        : isCurrentPlayerTurn
          ? roomState.challengeState?.challengeDeadlineEpochMs
            ? t("game.status.challengeWindowTimed")
            : t("game.status.challengeWindowManual")
          : roomState.challengeState?.phase === "claimed"
            ? t("game.status.playerClaimedBeatChoosing", {
                playerName: getPlayerName(challengeOwnerId),
              })
            : roomState.challengeState?.challengeDeadlineEpochMs
              ? t("game.status.playerChoseSlotTimed", {
                  playerName: getPlayerName(roomState.challengeState?.originalPlayerId),
                })
              : t("game.status.playerChoseSlotManual", {
                  playerName: getPlayerName(roomState.challengeState?.originalPlayerId),
                });

  const statusBadgeText = roomState?.winnerPlayerId
    ? t("game.status.gameFinished")
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? t("game.status.yourTurn")
        : isActivePlayerOffline
          ? t("game.status.playerOffline", { playerName: getPlayerName(activePlayerId) })
          : t("game.status.playerTurn", { playerName: getPlayerName(activePlayerId) })
      : roomState?.status === "challenge"
        ? roomState.challengeState?.originalPlayerId === currentPlayerId
          ? t("game.status.yourPlacementUnderBeat")
          : roomState.challengeState?.phase === "claimed"
            ? t("game.status.playerOwnsBeat", {
                playerName: getPlayerName(challengeOwnerId),
              })
            : t("game.status.beatWindowOpen")
        : roomState?.status === "reveal"
          ? t("game.status.reveal")
          : t("game.status.gameRoom");

  const statusDetailText = roomState?.winnerPlayerId
    ? t("game.status.winnerReachedTarget", {
        playerName: getPlayerName(roomState.winnerPlayerId),
      })
    : roomState?.status === "turn"
      ? isCurrentPlayerTurn
        ? ""
        : isActivePlayerOffline
          ? t("game.status.playerOfflineWaiting", {
              playerName: getPlayerName(activePlayerId),
            })
          : t("game.status.playerDeciding", {
              playerName: getPlayerName(activePlayerId),
            })
      : roomState?.status === "challenge"
        ? roomState.challengeState?.phase === "claimed"
          ? roomState.challengeState.challengerPlayerId === currentPlayerId
            ? t("game.status.youClaimedBeat")
            : t("game.status.playerClaimedBeatPlacing", {
                playerName: getPlayerName(challengeOwnerId),
              })
          : isCurrentPlayerTurn
            ? roomState.challengeState?.challengeDeadlineEpochMs
              ? t("game.status.yourPlacementLockedTimed")
              : t("game.status.yourPlacementLockedManual")
            : roomState.challengeState?.challengeDeadlineEpochMs
              ? t("game.status.beatOpenAgainst", {
                  playerName: getPossessivePlayerName(roomState.challengeState?.originalPlayerId),
                })
              : t("game.status.beatOpenAgainstManual", {
                  playerName: getPossessivePlayerName(roomState.challengeState?.originalPlayerId),
                })
        : roomState?.status === "reveal"
          ? t("game.status.checkResult")
          : t("game.status.roomReady");

  return {
    activeTimelineHint,
    statusBadgeText,
    statusDetailText,
  };
}
