import {
  ClientToServerEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { useCallback } from "react";
import { getSocketClient } from "../../../services/socket/socketClient";

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
  const handlePlaceCard = useCallback(() => {
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) {
      return;
    }

    setLocallyPlacedCard(roomState.currentTrackCard ?? null);
    void emitRoomEvent(ClientToServerEvent.PlaceCard, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }, [isCurrentPlayerTurn, roomState, selectedSlotIndex, setLocallyPlacedCard]);

  const handleConfirmReveal = useCallback(() => {
    if (!roomState || !canConfirmReveal) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ConfirmReveal, {
      roomId: roomState.roomId,
    });
  }, [canConfirmReveal, roomState]);

  const handleClaimChallenge = useCallback(() => {
    if (!roomState || !canClaimChallenge) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ClaimChallenge, {
      roomId: roomState.roomId,
    });
  }, [canClaimChallenge, roomState]);

  const handlePlaceChallenge = useCallback(() => {
    if (!roomState || !canSelectChallengeSlot) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.PlaceChallenge, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }, [canSelectChallengeSlot, roomState, selectedSlotIndex]);

  const handleResolveChallengeWindow = useCallback(() => {
    if (!roomState || !canResolveChallengeWindow) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ResolveChallengeWindow, {
      roomId: roomState.roomId,
    });
  }, [canResolveChallengeWindow, roomState]);

  const handleCloseRoom = useCallback(() => {
    if (!roomState || roomState.hostId !== currentPlayerId) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
    });
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
