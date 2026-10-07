import { act, renderHook } from "@testing-library/react";
import { ClientToServerEvent, type PublicRoomState } from "@tunetrack/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPlayer,
  buildRoomSettings,
  buildTurnRoomState,
  TEST_HOST_ID,
} from "../../../test/roomStateFixtures";
import { useGamePageActions } from "./useGamePageActions";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

describe("useGamePageActions handler identity (05 §2.2)", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  function buildOptions(roomState: PublicRoomState, selectedSlotIndex: number) {
    return {
      canClaimChallenge: false,
      canConfirmReveal: false,
      canResolveChallengeWindow: false,
      canSelectChallengeSlot: false,
      currentPlayerId: TEST_HOST_ID,
      isCurrentPlayerTurn: true,
      roomState,
      selectedSlotIndex,
      setLocallyPlacedCard: vi.fn(),
    };
  }

  it("keeps every handler across a state update and a slot change, and submits the latest slot", async () => {
    const setLocallyPlacedCard = vi.fn();
    const initialState = buildTurnRoomState({
      settings: buildRoomSettings({ ttModeEnabled: true }),
    });
    const { result, rerender } = renderHook((props) => useGamePageActions(props), {
      initialProps: { ...buildOptions(initialState, 0), setLocallyPlacedCard },
    });
    const initialHandlers = Object.entries(result.current).filter(
      ([key, value]) => key.startsWith("handle") && typeof value === "function",
    );

    const nextState = {
      ...initialState,
      players: initialState.players.map((player) => buildPlayer({ ...player, ttTokenCount: 3 })),
    };
    rerender({ ...buildOptions(nextState, 2), setLocallyPlacedCard });

    expect(initialHandlers.length).toBeGreaterThanOrEqual(12);
    for (const [key, handler] of initialHandlers) {
      expect(result.current[key as keyof typeof result.current], key).toBe(handler);
    }

    emitActionMock.mockResolvedValue({ status: "ok" });
    await act(async () => {
      await result.current.handlePlaceCard();
    });
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.PlaceCard,
      { roomId: nextState.roomId, selectedSlotIndex: 2 },
      expect.anything(),
    );
  });
});
