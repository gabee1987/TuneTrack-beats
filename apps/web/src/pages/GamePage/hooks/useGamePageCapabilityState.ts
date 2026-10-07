import {
  BUY_TIMELINE_CARD_TT_COST,
  CHALLENGE_TT_COST,
  SKIP_TRACK_TT_COST,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useMemo } from "react";
import type { AppShellMenuTab } from "../../../features/app-shell/AppShellMenu";
import { useI18n } from "../../../features/i18n";
import type {
  AwardTtActionState,
  GamePageLeader,
  KickPlayerActionState,
  TransferHostActionState,
} from "../GamePage.types";
import { createGameMenuTabs } from "../gamePageMenuTabs";
import { useGameHistory } from "./useGameHistory";

interface UseGamePageCapabilityStateOptions {
  currentPlayerId: string | null;
  currentPlayerTtCount: number;
  handlers: {
    awardTtActionState: AwardTtActionState | null;
    handleAwardTt: (playerId: string) => boolean;
    handleRemoveTt: (playerId: string) => boolean;
    handleCloseRoom: () => void;
    handleKickPlayer: (playerId: string) => void;
    handleTransferHost: (playerId: string) => void;
    isAwardTtPending: boolean;
    isKickPlayerPending: boolean;
    isTransferHostPending: boolean;
    kickPlayerActionState: KickPlayerActionState | null;
    transferHostActionState: TransferHostActionState | null;
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
  leadingPlayers: GamePageLeader[];
  menuTabs: AppShellMenuTab[];
}

export function useGamePageCapabilityState({
  currentPlayerId,
  currentPlayerTtCount,
  handlers,
  roomState,
}: UseGamePageCapabilityStateOptions): UseGamePageCapabilityStateResult {
  const { t } = useI18n();
  const isCurrentPlayerTurn =
    Boolean(currentPlayerId) && roomState?.turn?.activePlayerId === currentPlayerId;
  const isChallengeOwner =
    Boolean(currentPlayerId) && roomState?.challengeState?.challengerPlayerId === currentPlayerId;
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
    roomState.challengeState.originalPlayerId !== currentPlayerId &&
    currentPlayerTtCount >= CHALLENGE_TT_COST;
  const canResolveChallengeWindow =
    roomState?.status === "challenge" &&
    roomState.challengeState?.phase === "open" &&
    (roomState.settings.revealConfirmMode === "host_or_active_player"
      ? isCurrentPlayerTurn || roomState.hostId === currentPlayerId
      : roomState.hostId === currentPlayerId);
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
    roomState?.status === "turn" && isCurrentPlayerTurn && Boolean(roomState.currentTrackCard);
  const canConfirmBeatPlacement = roomState?.status === "challenge" && canSelectChallengeSlot;

  // Stable identity while roomState is unchanged so GamePageHeader's memo can skip
  // re-renders during local-only interactions (slot selection, drag, menu open).
  const leadingPlayers = useMemo<GamePageLeader[]>(
    () =>
      roomState?.players
        .map((player) => ({
          cardCount: roomState.timelines[player.id]?.length ?? 0,
          displayName: player.displayName,
          id: player.id,
          ttTokenCount: player.ttTokenCount,
        }))
        .sort((leftPlayer, rightPlayer) => rightPlayer.cardCount - leftPlayer.cardCount)
        .slice(0, 3) ?? [],
    [roomState],
  );

  const historyEntries = useGameHistory(roomState);

  const {
    awardTtActionState,
    handleAwardTt,
    handleKickPlayer,
    handleRemoveTt,
    handleTransferHost,
    isAwardTtPending,
    isKickPlayerPending,
    isTransferHostPending,
    kickPlayerActionState,
    transferHostActionState,
  } = handlers;
  const menuTabs = useMemo<AppShellMenuTab[]>(
    () =>
      roomState
        ? createGameMenuTabs({
            currentPlayerId,
            historyEntries,
            awardTtActionState,
            isAwardTtPending,
            isKickPlayerPending,
            isTransferHostPending,
            kickPlayerActionState,
            onAwardTt: handleAwardTt,
            onKickPlayer: handleKickPlayer,
            onRemoveTt: handleRemoveTt,
            onTransferHost: handleTransferHost,
            roomState,
            t,
            transferHostActionState,
          })
        : [],
    [
      currentPlayerId,
      historyEntries,
      awardTtActionState,
      handleAwardTt,
      handleKickPlayer,
      handleRemoveTt,
      handleTransferHost,
      isAwardTtPending,
      isKickPlayerPending,
      isTransferHostPending,
      kickPlayerActionState,
      roomState,
      t,
      transferHostActionState,
    ],
  );

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
