import {
  ClientToServerEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback, useRef, useState } from "react";
import { emitAction } from "../../../services/socket/emitAction";
import { getSocketClient } from "../../../services/socket/socketClient";
import type {
  BuyTimelineCardActionStatus,
  ClaimChallengeActionStatus,
  CloseRoomActionStatus,
  ConfirmRevealActionStatus,
  PlaceCardActionStatus,
  PlaceChallengeActionStatus,
} from "../GamePage.types";

async function emitRoomEvent<TPayload>(
  event: (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent],
  payload: TPayload,
) {
  const socketClient = await getSocketClient();
  socketClient.emit(event, payload);
}

interface UseGamePageActionsOptions {
  canClaimChallenge: boolean | null | undefined;
  canConfirmReveal: boolean | null | undefined;
  canResolveChallengeWindow: boolean | null | undefined;
  canSelectChallengeSlot: boolean | null | undefined;
  currentPlayerId: string | null;
  isCurrentPlayerTurn: boolean;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  onSkipTrackWithTtIntent?: (cardId: string | null) => void;
  setLocallyPlacedCard: (card: PublicRoomState["currentTrackCard"] | null) => void;
}

export function useGamePageActions({
  canClaimChallenge,
  canConfirmReveal,
  canResolveChallengeWindow,
  canSelectChallengeSlot,
  currentPlayerId,
  isCurrentPlayerTurn,
  roomState,
  selectedSlotIndex,
  onSkipTrackWithTtIntent,
  setLocallyPlacedCard,
}: UseGamePageActionsOptions) {
  const roomStateRef = useRef(roomState);
  roomStateRef.current = roomState;
  const isCloseRoomPendingRef = useRef(false);
  const [closeRoomActionStatus, setCloseRoomActionStatus] =
    useState<CloseRoomActionStatus>("idle");
  const isBuyTimelineCardPendingRef = useRef(false);
  const [buyTimelineCardActionStatus, setBuyTimelineCardActionStatus] =
    useState<BuyTimelineCardActionStatus>("idle");
  const isClaimChallengePendingRef = useRef(false);
  const [claimChallengeActionStatus, setClaimChallengeActionStatus] =
    useState<ClaimChallengeActionStatus>("idle");
  const isConfirmRevealPendingRef = useRef(false);
  const [confirmRevealActionStatus, setConfirmRevealActionStatus] =
    useState<ConfirmRevealActionStatus>("idle");
  const isPlaceCardPendingRef = useRef(false);
  const [placeCardActionStatus, setPlaceCardActionStatus] =
    useState<PlaceCardActionStatus>("idle");
  const isPlaceChallengePendingRef = useRef(false);
  const [placeChallengeActionStatus, setPlaceChallengeActionStatus] =
    useState<PlaceChallengeActionStatus>("idle");
  const isPlaceCardPending =
    placeCardActionStatus === "pending" || placeCardActionStatus === "retrying";
  const isConfirmRevealPending =
    confirmRevealActionStatus === "pending" ||
    confirmRevealActionStatus === "retrying";
  const isClaimChallengePending =
    claimChallengeActionStatus === "pending" ||
    claimChallengeActionStatus === "retrying";
  const isPlaceChallengePending =
    placeChallengeActionStatus === "pending" ||
    placeChallengeActionStatus === "retrying";
  const isCloseRoomPending =
    closeRoomActionStatus === "pending" || closeRoomActionStatus === "retrying";
  const isBuyTimelineCardPending =
    buyTimelineCardActionStatus === "pending" ||
    buyTimelineCardActionStatus === "retrying";

  const handlePlaceCard = useCallback(async () => {
    if (
      !roomState ||
      roomState.status !== "turn" ||
      !isCurrentPlayerTurn ||
      isPlaceCardPendingRef.current
    ) {
      return;
    }

    isPlaceCardPendingRef.current = true;
    setPlaceCardActionStatus("pending");
    setLocallyPlacedCard(roomState.currentTrackCard ?? null);
    try {
      const result = await emitAction(
        ClientToServerEvent.PlaceCard,
        {
          roomId: roomState.roomId,
          selectedSlotIndex,
        },
        {
          onTimeoutRetry: () => setPlaceCardActionStatus("retrying"),
          retryOnTimeout: true,
        },
      );
      if (result.status !== "ok") {
        setLocallyPlacedCard(null);
      }
      setPlaceCardActionStatus(result.status === "timeout" ? "failed" : "idle");
    } catch {
      setLocallyPlacedCard(null);
      setPlaceCardActionStatus("failed");
    } finally {
      isPlaceCardPendingRef.current = false;
    }
  }, [isCurrentPlayerTurn, roomState, selectedSlotIndex, setLocallyPlacedCard]);

  const handleConfirmReveal = useCallback(async () => {
    if (!roomState || !canConfirmReveal || isConfirmRevealPendingRef.current) {
      return;
    }

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    function isSubmittedRevealCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.status === "reveal" &&
        currentRoomState.turn?.turnNumber === submittedTurnNumber &&
        currentRoomState.currentTrackCard?.id === submittedCardId
      );
    }

    isConfirmRevealPendingRef.current = true;
    setConfirmRevealActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.ConfirmReveal,
        { roomId: roomState.roomId },
        {
          onTimeoutRetry: () => {
            if (isSubmittedRevealCurrent()) {
              setConfirmRevealActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setConfirmRevealActionStatus(
        result.status === "timeout" && isSubmittedRevealCurrent() ? "failed" : "idle",
      );
    } catch {
      setConfirmRevealActionStatus(isSubmittedRevealCurrent() ? "failed" : "idle");
    } finally {
      isConfirmRevealPendingRef.current = false;
    }
  }, [canConfirmReveal, roomState]);

  const handleClaimChallenge = useCallback(async () => {
    if (!roomState || !canClaimChallenge || isClaimChallengePendingRef.current) {
      return;
    }

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    function isSubmittedChallengeWindowCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.status === "challenge" &&
        currentRoomState.challengeState?.phase === "open" &&
        currentRoomState.turn?.turnNumber === submittedTurnNumber &&
        currentRoomState.currentTrackCard?.id === submittedCardId
      );
    }

    isClaimChallengePendingRef.current = true;
    setClaimChallengeActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.ClaimChallenge,
        { roomId: roomState.roomId },
        {
          onTimeoutRetry: () => {
            if (isSubmittedChallengeWindowCurrent()) {
              setClaimChallengeActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setClaimChallengeActionStatus(
        result.status === "timeout" && isSubmittedChallengeWindowCurrent()
          ? "failed"
          : "idle",
      );
    } catch {
      setClaimChallengeActionStatus(
        isSubmittedChallengeWindowCurrent() ? "failed" : "idle",
      );
    } finally {
      isClaimChallengePendingRef.current = false;
    }
  }, [canClaimChallenge, roomState]);

  const handlePlaceChallenge = useCallback(async () => {
    if (!roomState || !canSelectChallengeSlot || isPlaceChallengePendingRef.current) {
      return;
    }

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    const submittedChallengerId = roomState.challengeState?.challengerPlayerId;
    function isSubmittedChallengeCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.status === "challenge" &&
        currentRoomState.challengeState?.phase === "claimed" &&
        currentRoomState.turn?.turnNumber === submittedTurnNumber &&
        currentRoomState.currentTrackCard?.id === submittedCardId &&
        currentRoomState.challengeState.challengerPlayerId === submittedChallengerId
      );
    }

    isPlaceChallengePendingRef.current = true;
    setPlaceChallengeActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.PlaceChallenge,
        {
          roomId: roomState.roomId,
          selectedSlotIndex,
        },
        {
          onTimeoutRetry: () => {
            if (isSubmittedChallengeCurrent()) {
              setPlaceChallengeActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setPlaceChallengeActionStatus(
        result.status === "timeout" && isSubmittedChallengeCurrent() ? "failed" : "idle",
      );
    } catch {
      setPlaceChallengeActionStatus(isSubmittedChallengeCurrent() ? "failed" : "idle");
    } finally {
      isPlaceChallengePendingRef.current = false;
    }
  }, [canSelectChallengeSlot, roomState, selectedSlotIndex]);

  const handleResolveChallengeWindow = useCallback(() => {
    if (!roomState || !canResolveChallengeWindow) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ResolveChallengeWindow, {
      roomId: roomState.roomId,
    });
  }, [canResolveChallengeWindow, roomState]);

  const handleCloseRoom = useCallback(async () => {
    if (
      !roomState ||
      roomState.hostId !== currentPlayerId ||
      isCloseRoomPendingRef.current
    ) {
      return;
    }

    const submittedRoomId = roomState.roomId;
    const submittedHostId = roomState.hostId;
    function isSubmittedRoomCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.roomId === submittedRoomId &&
        currentRoomState.hostId === submittedHostId
      );
    }

    isCloseRoomPendingRef.current = true;
    setCloseRoomActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.CloseRoom,
        { roomId: submittedRoomId },
        {
          onTimeoutRetry: () => {
            if (isSubmittedRoomCurrent()) {
              setCloseRoomActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setCloseRoomActionStatus(
        result.status === "timeout" && isSubmittedRoomCurrent() ? "failed" : "idle",
      );
    } catch {
      setCloseRoomActionStatus(isSubmittedRoomCurrent() ? "failed" : "idle");
    } finally {
      isCloseRoomPendingRef.current = false;
    }
  }, [currentPlayerId, roomState]);

  const handleAwardTt = useCallback(
    (playerId: string) => {
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        !roomState.settings.ttModeEnabled
      ) {
        return;
      }

      void emitRoomEvent(ClientToServerEvent.AwardTt, {
        roomId: roomState.roomId,
        playerId,
        amount: 1,
      });
    },
    [currentPlayerId, roomState],
  );

  const handleRemoveTt = useCallback(
    (playerId: string) => {
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        !roomState.settings.ttModeEnabled
      ) {
        return;
      }

      void emitRoomEvent(ClientToServerEvent.AwardTt, {
        roomId: roomState.roomId,
        playerId,
        amount: -1,
      });
    },
    [currentPlayerId, roomState],
  );

  const handleTransferHost = useCallback(
    (playerId: string) => {
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        playerId === currentPlayerId
      ) {
        return;
      }

      void emitRoomEvent(ClientToServerEvent.TransferHost, {
        roomId: roomState.roomId,
        playerId,
      });
    },
    [currentPlayerId, roomState],
  );

  const handleKickPlayer = useCallback(
    (playerId: string) => {
      if (
        !roomState ||
        roomState.hostId !== currentPlayerId ||
        playerId === currentPlayerId
      ) {
        return;
      }

      void emitRoomEvent(ClientToServerEvent.KickPlayer, {
        roomId: roomState.roomId,
        playerId,
      });
    },
    [currentPlayerId, roomState],
  );

  const handleSkipTrackWithTt = useCallback(() => {
    if (
      !roomState ||
      !roomState.settings.ttModeEnabled ||
      roomState.status !== "turn" ||
      !isCurrentPlayerTurn
    ) {
      return;
    }

    onSkipTrackWithTtIntent?.(roomState.currentTrackCard?.id ?? null);
    void emitRoomEvent(ClientToServerEvent.SkipTrackWithTt, {
      roomId: roomState.roomId,
    });
  }, [isCurrentPlayerTurn, onSkipTrackWithTtIntent, roomState]);

  const handleBuyTimelineCardWithTt = useCallback(async () => {
    if (
      !roomState ||
      !roomState.settings.ttModeEnabled ||
      roomState.status !== "turn" ||
      !isCurrentPlayerTurn ||
      isBuyTimelineCardPendingRef.current
    ) {
      return;
    }

    const submittedTurnNumber = roomState.turn?.turnNumber;
    const submittedCardId = roomState.currentTrackCard?.id;
    function isSubmittedTurnCurrent() {
      const currentRoomState = roomStateRef.current;
      return (
        currentRoomState?.status === "turn" &&
        currentRoomState.turn?.turnNumber === submittedTurnNumber &&
        currentRoomState.currentTrackCard?.id === submittedCardId
      );
    }

    isBuyTimelineCardPendingRef.current = true;
    setBuyTimelineCardActionStatus("pending");
    try {
      const result = await emitAction(
        ClientToServerEvent.BuyTimelineCardWithTt,
        { roomId: roomState.roomId },
        {
          onTimeoutRetry: () => {
            if (isSubmittedTurnCurrent()) {
              setBuyTimelineCardActionStatus("retrying");
            }
          },
          retryOnTimeout: true,
        },
      );
      setBuyTimelineCardActionStatus(
        result.status === "timeout" && isSubmittedTurnCurrent() ? "failed" : "idle",
      );
    } catch {
      setBuyTimelineCardActionStatus(isSubmittedTurnCurrent() ? "failed" : "idle");
    } finally {
      isBuyTimelineCardPendingRef.current = false;
    }
  }, [isCurrentPlayerTurn, roomState]);

  const handleSkipTurn = useCallback(() => {
    if (!roomState || roomState.status !== "turn") {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.SkipTurn, {
      roomId: roomState.roomId,
    });
  }, [roomState]);

  return {
    buyTimelineCardActionStatus,
    closeRoomActionStatus,
    handleAwardTt,
    handleRemoveTt,
    handleBuyTimelineCardWithTt,
    handleClaimChallenge,
    handleCloseRoom,
    handleConfirmReveal,
    handleKickPlayer,
    handlePlaceCard,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    handleSkipTrackWithTt,
    handleSkipTurn,
    handleTransferHost,
    isBuyTimelineCardPending,
    isClaimChallengePending,
    isCloseRoomPending,
    isConfirmRevealPending,
    isPlaceCardPending,
    isPlaceChallengePending,
    claimChallengeActionStatus,
    confirmRevealActionStatus,
    placeCardActionStatus,
    placeChallengeActionStatus,
  };
}
