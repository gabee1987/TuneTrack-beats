import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { I18nProvider } from "../../../features/i18n";
import { buildTurnRoomState, TEST_HOST_ID } from "../../../test/roomStateFixtures";
import { TurnActionDock } from "../components/TurnActionDock";
import { useGamePageActions } from "./useGamePageActions";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

function PlacementHarness({
  setLocallyPlacedCard,
}: {
  setLocallyPlacedCard: ReturnType<typeof vi.fn>;
}) {
  const roomState = buildTurnRoomState();
  const actions = useGamePageActions({
    canClaimChallenge: false,
    canConfirmReveal: false,
    canResolveChallengeWindow: false,
    canSelectChallengeSlot: false,
    currentPlayerId: TEST_HOST_ID,
    isCurrentPlayerTurn: true,
    roomState,
    selectedSlotIndex: 1,
    setLocallyPlacedCard,
  });

  return (
    <I18nProvider>
      <TurnActionDock
        canConfirmTurnPlacement
        canSkipOfflinePlayer={false}
        canUseBuyCard={false}
        canUseSkipTrack={false}
        handleBuyTimelineCardWithTt={actions.handleBuyTimelineCardWithTt}
        handlePlaceCard={actions.handlePlaceCard}
        handleSkipOfflinePlayer={actions.handleSkipTurn}
        handleSkipTrackWithTt={actions.handleSkipTrackWithTt}
        isPlaceCardPending={actions.isPlaceCardPending}
        roomState={roomState}
      />
    </I18nProvider>
  );
}

describe("useGamePageActions place_card", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("emits once, disables confirmation while pending, and rolls back a rejection", async () => {
    const deferred = createDeferredActionResult();
    const setLocallyPlacedCard = vi.fn();
    emitActionMock.mockReturnValue(deferred.promise);
    render(<PlacementHarness setLocallyPlacedCard={setLocallyPlacedCard} />);

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(ClientToServerEvent.PlaceCard, {
      roomId: "TEST_ROOM_1",
      selectedSlotIndex: 1,
    });
    expect(setLocallyPlacedCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: "track-current" }),
    );

    await act(async () => {
      deferred.resolve({ status: "rejected", code: "PLACEMENT_NOT_ALLOWED" });
      await deferred.promise;
    });

    await waitFor(() => expect(confirmButton).toBeEnabled());
    expect(setLocallyPlacedCard).toHaveBeenLastCalledWith(null);
  });

  it("keeps the optimistic card when the server accepts the placement", async () => {
    const setLocallyPlacedCard = vi.fn();
    emitActionMock.mockResolvedValue({ status: "ok" });
    render(<PlacementHarness setLocallyPlacedCard={setLocallyPlacedCard} />);

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(1));
    expect(setLocallyPlacedCard).toHaveBeenCalledTimes(1);
    expect(setLocallyPlacedCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: "track-current" }),
    );
  });
});
