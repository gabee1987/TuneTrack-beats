import { ClientToServerEvent } from "@tunetrack/shared";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
import { buildTurnRoomState, TEST_HOST_ID } from "../../../test/roomStateFixtures";
import { useGamePageActions } from "./useGamePageActions";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const socket = getSharedFakeSocket();

function renderActions(overrides: { onActionUndeliverable?: () => void } = {}) {
  const setLocallyPlacedCard = vi.fn();
  const onActionUndeliverable = overrides.onActionUndeliverable ?? vi.fn();
  const roomState = buildTurnRoomState();
  const rendered = renderHook(() =>
    useGamePageActions({
      canClaimChallenge: false,
      canConfirmReveal: false,
      canResolveChallengeWindow: false,
      canSelectChallengeSlot: false,
      currentPlayerId: TEST_HOST_ID,
      isCurrentPlayerTurn: true,
      roomState,
      selectedSlotIndex: 1,
      onActionUndeliverable,
      setLocallyPlacedCard,
    }),
  );

  return { onActionUndeliverable, rendered, roomState, setLocallyPlacedCard };
}

describe("useGamePageActions", () => {
  beforeEach(() => {
    resetSharedFakeSocket();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends the placement and shows the optimistic card once it is on its way", async () => {
    const { rendered, roomState, setLocallyPlacedCard } = renderActions();

    await act(async () => {
      rendered.result.current.handlePlaceCard();
    });

    expect(socket.emittedFor(ClientToServerEvent.PlaceCard)).toEqual([
      { roomId: roomState.roomId, selectedSlotIndex: 1 },
    ]);
    expect(setLocallyPlacedCard).toHaveBeenCalledWith(roomState.currentTrackCard);
  });

  /**
   * Only a reveal clears the optimistic card. Showing it for a placement the socket never
   * delivered locks the board with no way back — the reported "gameplay area cannot be
   * interacted with" freeze.
   */
  it("leaves the board untouched and reports when the placement cannot be delivered", async () => {
    socket.connected = false;
    const { onActionUndeliverable, rendered, setLocallyPlacedCard } = renderActions();

    await act(async () => {
      rendered.result.current.handlePlaceCard();
    });

    expect(socket.emittedFor(ClientToServerEvent.PlaceCard)).toEqual([]);
    expect(setLocallyPlacedCard).not.toHaveBeenCalled();
    expect(onActionUndeliverable).toHaveBeenCalledTimes(1);
  });

  it("reports an undeliverable reveal instead of dropping it silently", async () => {
    socket.connected = false;
    const onActionUndeliverable = vi.fn();
    const setLocallyPlacedCard = vi.fn();
    const roomState = buildTurnRoomState();
    const { result } = renderHook(() =>
      useGamePageActions({
        canClaimChallenge: false,
        canConfirmReveal: true,
        canResolveChallengeWindow: false,
        canSelectChallengeSlot: false,
        currentPlayerId: TEST_HOST_ID,
        isCurrentPlayerTurn: true,
        roomState,
        selectedSlotIndex: 0,
        onActionUndeliverable,
        setLocallyPlacedCard,
      }),
    );

    await act(async () => {
      result.current.handleConfirmReveal();
    });

    expect(socket.emittedFor(ClientToServerEvent.ConfirmReveal)).toEqual([]);
    expect(onActionUndeliverable).toHaveBeenCalledTimes(1);
  });
});
