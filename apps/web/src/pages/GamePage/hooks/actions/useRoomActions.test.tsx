import { fireEvent, render, screen, within } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_GUEST_ID } from "../../../../test/roomStateFixtures";
import {
  buildOfflineGuestTurnRoomState,
  CloseRoomHarness,
  createDeferredActionResult,
  finishWithTimeout,
  GameMenuPlayerHarness,
  TurnDockHarness,
} from "../useGamePageActions.harnesses";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

function openHostControls() {
  fireEvent.click(screen.getByRole("button", { name: /show host transfer controls/i }));
}

describe("useRoomActions", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("closes the room once and keeps a final retry state", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<CloseRoomHarness />);

    const closeButton = screen.getByRole("button", { name: "idle" });
    fireEvent.click(closeButton);
    fireEvent.click(closeButton);

    expect(screen.getByRole("button", { name: "pending" })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.CloseRoom,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(await screen.findByRole("button", { name: "failed" })).toBeEnabled();
  });

  it("skips an offline player's turn once and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(
      <TurnDockHarness
        canSkipOfflinePlayer
        options={{ isCurrentPlayerTurn: false }}
        roomState={buildOfflineGuestTurnRoomState()}
      />,
    );

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

    await finishWithTimeout(deferred);
    expect(screen.getByRole("button", { name: /try skipping turn again/i })).toBeEnabled();
  });

  it("transfers host to the chosen player once and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<GameMenuPlayerHarness />);

    openHostControls();
    fireEvent.click(screen.getByRole("button", { name: /^transfer host$/i }));
    const dialog = screen.getByRole("dialog", { name: /transfer host controls/i });
    const confirmButton = within(dialog).getByRole("button", { name: /^transfer host$/i });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.TransferHost,
      { roomId: "TEST_ROOM_1", playerId: TEST_GUEST_ID },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(within(dialog).getByRole("button", { name: /try transferring again/i })).toBeEnabled();
  });

  it("kicks the chosen player once and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<GameMenuPlayerHarness />);

    openHostControls();
    fireEvent.click(screen.getByRole("button", { name: /^kick player$/i }));
    const dialog = screen.getByRole("dialog", { name: /^kick player$/i });
    const confirmButton = within(dialog).getByRole("button", { name: /remove player/i });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(confirmButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.KickPlayer,
      { roomId: "TEST_ROOM_1", playerId: TEST_GUEST_ID },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(within(dialog).getByRole("button", { name: /try removing again/i })).toBeEnabled();
  });
});
