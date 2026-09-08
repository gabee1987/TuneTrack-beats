import {
  ClientToServerEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback } from "react";
import { emitWhenConnected } from "../../../services/socket/socketClient";

interface UseGamePageActionsOptions {
  canClaimChallenge: boolean | null | undefined;
  canConfirmReveal: boolean | null | undefined;
  canResolveChallengeWindow: boolean | null | undefined;
  canSelectChallengeSlot: boolean | null | undefined;
  currentPlayerId: string | null;
  isCurrentPlayerTurn: boolean;
  roomState: PublicRoomState | null;
  selectedSlotIndex: number;
  onActionUndeliverable: () => void;
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
  onActionUndeliverable,
  onSkipTrackWithTtIntent,
  setLocallyPlacedCard,
}: UseGamePageActionsOptions) {
  const emitRoomEvent = useCallback(
    async <TPayload,>(
      event: (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent],
      payload: TPayload,
    ): Promise<boolean> => {
      const wasDelivered = await emitWhenConnected(event, payload);

      if (!wasDelivered) {
        onActionUndeliverable();
      }

      return wasDelivered;
    },
    [onActionUndeliverable],
  );

  const handlePlaceCard = useCallback(() => {
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) {
      return;
    }

    // The optimistic card is what locks the board until the reveal arrives, so it may
    // only be shown once the placement is actually on its way to the server.
    const placedCard = roomState.currentTrackCard ?? null;

    void emitRoomEvent(ClientToServerEvent.PlaceCard, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    }).then((wasDelivered) => {
      if (wasDelivered) {
        setLocallyPlacedCard(placedCard);
      }
    });
  }, [
    emitRoomEvent,
    isCurrentPlayerTurn,
    roomState,
    selectedSlotIndex,
    setLocallyPlacedCard,
  ]);

  const handleConfirmReveal = useCallback(() => {
    if (!roomState || !canConfirmReveal) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ConfirmReveal, {
      roomId: roomState.roomId,
    });
  }, [canConfirmReveal, emitRoomEvent, roomState]);

  const handleClaimChallenge = useCallback(() => {
    if (!roomState || !canClaimChallenge) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ClaimChallenge, {
      roomId: roomState.roomId,
    });
  }, [canClaimChallenge, emitRoomEvent, roomState]);

  const handlePlaceChallenge = useCallback(() => {
    if (!roomState || !canSelectChallengeSlot) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.PlaceChallenge, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }, [canSelectChallengeSlot, emitRoomEvent, roomState, selectedSlotIndex]);

  const handleResolveChallengeWindow = useCallback(() => {
    if (!roomState || !canResolveChallengeWindow) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ResolveChallengeWindow, {
      roomId: roomState.roomId,
    });
  }, [canResolveChallengeWindow, emitRoomEvent, roomState]);

  const handleCloseRoom = useCallback(() => {
    if (!roomState || roomState.hostId !== currentPlayerId) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
    });
  }, [currentPlayerId, emitRoomEvent, roomState]);

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
    [currentPlayerId, emitRoomEvent, roomState],
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
    [currentPlayerId, emitRoomEvent, roomState],
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
    [currentPlayerId, emitRoomEvent, roomState],
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
    [currentPlayerId, emitRoomEvent, roomState],
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
  }, [emitRoomEvent, isCurrentPlayerTurn, onSkipTrackWithTtIntent, roomState]);

  const handleBuyTimelineCardWithTt = useCallback(() => {
    if (
      !roomState ||
      !roomState.settings.ttModeEnabled ||
      roomState.status !== "turn" ||
      !isCurrentPlayerTurn
    ) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.BuyTimelineCardWithTt, {
      roomId: roomState.roomId,
    });
  }, [emitRoomEvent, isCurrentPlayerTurn, roomState]);

  const handleSkipTurn = useCallback(() => {
    if (!roomState || roomState.status !== "turn") {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.SkipTurn, {
      roomId: roomState.roomId,
    });
  }, [emitRoomEvent, roomState]);

  return {
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
  };
}
