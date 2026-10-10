import { fireEvent, render, screen } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ChallengeHarness,
  createDeferredActionResult,
  finishWithTimeout,
} from "../useGamePageActions.harnesses";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

describe("useChallengeActions", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("claims a Beat once and offers a retry after the final timeout", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<ChallengeHarness step="claim" />);

    const beatButton = screen.getByRole("button", { name: /^beat!/i });
    fireEvent.click(beatButton);
    fireEvent.click(beatButton);

    expect(screen.getByRole("button", { name: /calling beat/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.ClaimChallenge,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(await screen.findByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("places the Beat card on the selected slot once and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<ChallengeHarness step="place" />);

    const confirmBeatButton = screen.getByRole("button", { name: /confirm beat/i });
    fireEvent.click(confirmBeatButton);
    fireEvent.click(confirmBeatButton);

    expect(screen.getByRole("button", { name: /confirming beat/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.PlaceChallenge,
      { roomId: "TEST_ROOM_1", selectedSlotIndex: 1 },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(await screen.findByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("resolves the Beat window once and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<ChallengeHarness step="resolve" />);

    const resolveButton = screen.getByRole("button", { name: /resolve/i });
    fireEvent.click(resolveButton);
    fireEvent.click(resolveButton);

    expect(resolveButton).toBeDisabled();
    expect(resolveButton).toHaveTextContent(/^resolve$/i);
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.ResolveChallengeWindow,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(await screen.findByRole("button", { name: /try resolving again/i })).toBeEnabled();
  });
});
