import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { buildTurnRoomState, TEST_GUEST_ID, TEST_HOST_ID } from "../../../test/roomStateFixtures";
import { TurnActionDock } from "../components/TurnActionDock";
import { useGamePageActions } from "./useGamePageActions";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

function createDeferredActionResult() {
  let resolve!: (result: EmitActionResult) => void;
  const promise = new Promise<EmitActionResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function SkipTurnHarness() {
  const roomState = buildTurnRoomState({
    players: [
      {
        ...buildTurnRoomState().players[0]!,
        connectionStatus: "connected",
      },
      {
        ...buildTurnRoomState().players[1]!,
        connectionStatus: "disconnected",
      },
    ],
    turn: {
      activePlayerId: TEST_GUEST_ID,
      turnNumber: 2,
      hasUsedSkipTrackWithTt: false,
      turnSkipDeadlineEpochMs: Date.now() + 10_000,
    },
  });
  const actions = useGamePageActions({
    canClaimChallenge: false,
    canConfirmReveal: false,
    canResolveChallengeWindow: false,
    canSelectChallengeSlot: false,
    currentPlayerId: TEST_HOST_ID,
    isCurrentPlayerTurn: false,
    roomState,
    selectedSlotIndex: 1,
    setLocallyPlacedCard: vi.fn(),
  });

  return (
    <I18nProvider>
      <TurnActionDock
        buyTimelineCardActionStatus={actions.buyTimelineCardActionStatus}
        canConfirmTurnPlacement={false}
        canSkipOfflinePlayer
        canUseBuyCard={false}
        canUseSkipTrack={false}
        handleBuyTimelineCardWithTt={actions.handleBuyTimelineCardWithTt}
        handlePlaceCard={actions.handlePlaceCard}
        handleSkipOfflinePlayer={actions.handleSkipTurn}
        handleSkipTrackWithTt={actions.handleSkipTrackWithTt}
        isBuyTimelineCardPending={actions.isBuyTimelineCardPending}
        isPlaceCardPending={actions.isPlaceCardPending}
        isSkipTrackPending={actions.isSkipTrackPending}
        isSkipTurnPending={actions.isSkipTurnPending}
        placeCardActionStatus={actions.placeCardActionStatus}
        skipTrackActionStatus={actions.skipTrackActionStatus}
        skipCandidateName={
          roomState.players.find((player) => player.id === roomState.turn?.activePlayerId)
            ?.displayName ?? null
        }
        skipTurnActionStatus={actions.skipTurnActionStatus}
        status={roomState.status}
        turnSkipDeadlineEpochMs={roomState.turn?.turnSkipDeadlineEpochMs ?? null}
      />
    </I18nProvider>
  );
}

describe("useGamePageActions skip_turn", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries safely, blocks duplicate skips, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<SkipTurnHarness />);

    const skipButton = screen.getByRole("button", { name: /skip turn/i });
    fireEvent.click(skipButton);
    fireEvent.click(skipButton);

    expect(skipButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.SkipTurn,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };
    act(() => options.onTimeoutRetry?.());

    expect(screen.getByRole("button", { name: /no response.*retrying/i })).toBeDisabled();

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    const retryButton = screen.getByRole("button", { name: /try skipping turn again/i });
    expect(retryButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(retryButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});
