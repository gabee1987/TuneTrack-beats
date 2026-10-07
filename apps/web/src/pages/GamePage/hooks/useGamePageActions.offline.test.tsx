import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { buildTurnRoomState, TEST_HOST_ID } from "../../../test/roomStateFixtures";
import { useGamePageActions } from "./useGamePageActions";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn<(...args: unknown[]) => Promise<EmitActionResult>>(),
}));

vi.mock("../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

function renderHostTurnActions(onActionOffline: () => void) {
  return renderHook(() =>
    useGamePageActions({
      canClaimChallenge: false,
      canConfirmReveal: false,
      canResolveChallengeWindow: false,
      canSelectChallengeSlot: false,
      currentPlayerId: TEST_HOST_ID,
      isCurrentPlayerTurn: true,
      onActionOffline,
      roomState: buildTurnRoomState(),
      selectedSlotIndex: 1,
      setLocallyPlacedCard: vi.fn(),
    }),
  );
}

describe("useGamePageActions while offline", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("refuses a placement out loud and returns to idle", async () => {
    emitActionMock.mockResolvedValue({ status: "offline" });
    const onActionOffline = vi.fn();
    const { result } = renderHostTurnActions(onActionOffline);

    await act(() => result.current.handlePlaceCard());

    expect(onActionOffline).toHaveBeenCalledTimes(1);
    expect(result.current.placeCardActionStatus).toBe("idle");
  });

  it("refuses a host action from a nested action hook the same way", async () => {
    emitActionMock.mockResolvedValue({ status: "offline" });
    const onActionOffline = vi.fn();
    const { result } = renderHostTurnActions(onActionOffline);

    await act(async () => {
      result.current.handleSkipTurn();
      await Promise.resolve();
    });

    expect(onActionOffline).toHaveBeenCalledTimes(1);
  });

  it("leaves rejections to the server error toast", async () => {
    emitActionMock.mockResolvedValue({ status: "rejected", code: "GAME_NOT_IN_TURN_PHASE" });
    const onActionOffline = vi.fn();
    const { result } = renderHostTurnActions(onActionOffline);

    await act(() => result.current.handlePlaceCard());

    expect(onActionOffline).not.toHaveBeenCalled();
  });
});
