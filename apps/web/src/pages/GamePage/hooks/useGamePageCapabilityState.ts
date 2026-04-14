import {
  BUY_TIMELINE_CARD_TT_COST,
  SKIP_TRACK_TT_COST,
  type PublicRoomState,
} from "@tunetrack/shared";
import type { AppShellMenuTab } from "../../../features/app-shell/AppShellMenu";
import { createGameMenuTabs } from "../gamePageMenuTabs";

interface UseGamePageCapabilityStateOptions {
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  handlers: {
    handleAwardTt: (playerId: string) => void;
    handleCloseRoom: () => void;
  };
  roomState: PublicRoomState | null;
}

interface UseGamePageCapabilityStateResult {
  canClaimChallenge: boolean;
  canConfirmBeatPlacement: boolean;
  canConfirmReveal: boolean;
  canConfirmTurnPlacement: boolean;
  canResolveChallengeWindow: boolean;
  canSelectChallengeSlot: boolean;
  canSelectSlot: boolean;
  canSelectTurnSlot: boolean;
  canUseBuyCard: boolean;
  canUseSkipTrack: boolean;
  isChallengeOwner: boolean;
  isCurrentPlayerTurn: boolean;
  leadingPlayers: PublicRoomState["players"];
  menuTabs: AppShellMenuTab[];
}

export function useGamePageCapabilityState({
  currentPlayerId,
  currentPlayerTtCount,
  handlers,
  roomState,
}: UseGamePageCapabilityStateOptions): UseGamePageCapabilityStateResult {
  const isCurrentPlayerTurn =
    Boolean(currentPlayerId) &&
    roomState?.turn?.activePlayerId === currentPlayerId;
  const isChallengeOwner =
    Boolean(currentPlayerId) &&
    roomState?.challengeState?.challengerPlayerId === currentPlayerId;
  const canSelectTurnSlot = roomState?.status === "turn" && isCurrentPlayerTurn;
  const canSelectChallengeSlot =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "claimed" &&
    isChallengeOwner;
  const canSelectSlot = canSelectTurnSlot || canSelectChallengeSlot;
  const canClaimChallenge =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    !isCurrentPlayerTurn &&
    roomState.challengeState.originalPlayerId !== currentPlayerId;
  const canResolveChallengeWindow =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    roomState.hostId === currentPlayerId;
  const canConfirmReveal =
    roomState?.status === "reveal" &&
    (roomState.settings.revealConfirmMode === "host_or_active_player"
      ? isCurrentPlayerTurn || roomState.hostId === currentPlayerId
      : roomState.hostId === currentPlayerId);
  const canUseSkipTrack =
    roomState?.status === "turn" &&
    roomState.settings.ttModeEnabled &&
    isCurrentPlayerTurn &&
    !roomState.turn?.hasUsedSkipTrackWithTt &&
    currentPlayerTtCount >= SKIP_TRACK_TT_COST;
  const canUseBuyCard =
    roomState?.status === "turn" &&
    roomState.settings.ttModeEnabled &&
    isCurrentPlayerTurn &&
    currentPlayerTtCount >= BUY_TIMELINE_CARD_TT_COST;
  const canConfirmTurnPlacement =
    roomState?.status === "turn" &&
    isCurrentPlayerTurn &&
    Boolean(roomState.currentTrackCard);
  const canConfirmBeatPlacement =
    roomState?.status === "challenge" && canSelectChallengeSlot;

  const leadingPlayers =
    roomState?.players
      .slice()
      .sort((leftPlayer, rightPlayer) => {
        const rightScore = roomState.timelines[rightPlayer.id]?.length ?? 0;
        const leftScore = roomState.timelines[leftPlayer.id]?.length ?? 0;

        return rightScore - leftScore;
      })
      .slice(0, 3) ?? [];

  const menuTabs = roomState
    ? createGameMenuTabs({
        currentPlayerId,
        onAwardTt: handlers.handleAwardTt,
        onCloseRoom: handlers.handleCloseRoom,
        roomState,
      })
    : [];

  return {
    canClaimChallenge,
    canConfirmBeatPlacement,
    canConfirmReveal,
    canConfirmTurnPlacement,
    canResolveChallengeWindow,
    canSelectChallengeSlot,
    canSelectSlot,
    canSelectTurnSlot,
    canUseBuyCard,
    canUseSkipTrack,
    isChallengeOwner,
    isCurrentPlayerTurn,
    leadingPlayers,
    menuTabs,
  };
}
