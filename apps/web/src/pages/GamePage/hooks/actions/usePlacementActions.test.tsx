import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTurnRoomState } from "../../../../test/roomStateFixtures";
import {
  createDeferredActionResult,
  RevealHarness,
  TurnDockHarness,
} from "../useGamePageActions.harnesses";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

function renderPlacement(setLocallyPlacedCard = vi.fn()) {
  render(
    <TurnDockHarness
      canConfirmTurnPlacement
      options={{ setLocallyPlacedCard }}
      roomState={buildTurnRoomState()}
    />,
  );
  return setLocallyPlacedCard;
}

describe("usePlacementActions place_card", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("emits the selected slot once, shows the card optimistically and rolls a rejection back", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValue(deferred.promise);
    const setLocallyPlacedCard = renderPlacement();

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.PlaceCard,
      { roomId: "TEST_ROOM_1", selectedSlotIndex: 1 },
      expect.objectContaining({ retryOnTimeout: true }),
    );
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

  it("offers a retry and drops the optimistic card after the final timeout", async () => {
    emitActionMock.mockResolvedValueOnce({ status: "timeout" });
    const setLocallyPlacedCard = renderPlacement();

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByRole("button", { name: /try again/i })).toBeEnabled();
    expect(setLocallyPlacedCard).toHaveBeenLastCalledWith(null);
  });

  it("keeps the optimistic card when the server accepts the placement", async () => {
    emitActionMock.mockResolvedValue({ status: "ok" });
    const setLocallyPlacedCard = renderPlacement();

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /confirm/i })).toBeEnabled());
    expect(setLocallyPlacedCard).toHaveBeenCalledTimes(1);
  });
});

describe("usePlacementActions confirm_reveal", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("emits once, blocks a second confirmation and offers a retry after the final timeout", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<RevealHarness />);

    const nextSongButton = screen.getByRole("button", { name: /next song/i });
    fireEvent.click(nextSongButton);
    fireEvent.click(nextSongButton);

    expect(screen.getByRole("button", { name: /loading next song/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.ConfirmReveal,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    expect(await screen.findByRole("button", { name: /try again/i })).toBeEnabled();
  });
});
