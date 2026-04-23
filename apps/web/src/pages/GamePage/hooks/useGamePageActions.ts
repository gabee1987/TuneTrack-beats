import {
  ClientToServerEvent,
  type PublicRoomState,
} from "@tunetrack/shared";
import { getSocketClient } from "../../../services/socket/socketClient";

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
  async function emitRoomEvent<TPayload>(
    event: (typeof ClientToServerEvent)[keyof typeof ClientToServerEvent],
    payload: TPayload,
  ) {
    const socketClient = await getSocketClient();
    socketClient.emit(event, payload);
  }

  function handlePlaceCard() {
    if (!roomState || roomState.status !== "turn" || !isCurrentPlayerTurn) {
      return;
    }

    setLocallyPlacedCard(roomState.currentTrackCard ?? null);
    void emitRoomEvent(ClientToServerEvent.PlaceCard, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleConfirmReveal() {
    if (!roomState || !canConfirmReveal) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ConfirmReveal, {
      roomId: roomState.roomId,
    });
  }

  function handleClaimChallenge() {
    if (!roomState || !canClaimChallenge) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ClaimChallenge, {
      roomId: roomState.roomId,
    });
  }

  function handlePlaceChallenge() {
    if (!roomState || !canSelectChallengeSlot) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.PlaceChallenge, {
      roomId: roomState.roomId,
      selectedSlotIndex,
    });
  }

  function handleResolveChallengeWindow() {
    if (!roomState || !canResolveChallengeWindow) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.ResolveChallengeWindow, {
      roomId: roomState.roomId,
    });
  }

  function handleCloseRoom() {
    if (!roomState || roomState.hostId !== currentPlayerId) {
      return;
    }

    void emitRoomEvent(ClientToServerEvent.CloseRoom, {
      roomId: roomState.roomId,
    });
  }

  function handleAwardTt(playerId: string) {
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
  }

  function handleRemoveTt(playerId: string) {
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
  }

  function handleSkipTrackWithTt() {
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
  }

  function handleBuyTimelineCardWithTt() {
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
  }

  return {
    handleAwardTt,
    handleRemoveTt,
    handleBuyTimelineCardWithTt,
    handleClaimChallenge,
    handleCloseRoom,
    handleConfirmReveal,
    handlePlaceCard,
    handlePlaceChallenge,
    handleResolveChallengeWindow,
    handleSkipTrackWithTt,
  };
}
