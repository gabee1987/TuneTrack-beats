import { fireEvent, render, screen } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_GUEST_ID } from "../../../../test/roomStateFixtures";
import {
  AwardTtHarness,
  buildTtTurnRoomState,
  createDeferredActionResult,
  finishWithTimeout,
  TurnDockHarness,
} from "../useGamePageActions.harnesses";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

describe("useTtActions", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("buys the card once, starts the token animation once and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    const onTokenSpendAnimationStart = vi.fn();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(
      <TurnDockHarness
        canUseBuyCard
        onTokenSpendAnimationStart={onTokenSpendAnimationStart}
        roomState={buildTtTurnRoomState()}
      />,
    );

    const buyButton = screen.getByRole("button", { name: /buy/i });
    fireEvent.click(buyButton);
    fireEvent.click(buyButton);

    expect(screen.getByRole("button", { name: /buying card/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.BuyTimelineCardWithTt,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );
    expect(onTokenSpendAnimationStart).toHaveBeenCalledTimes(1);

    await finishWithTimeout(deferred);
    expect(await screen.findByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("skips the track once, announces the skipped card and withdraws it after a failure", async () => {
    const deferred = createDeferredActionResult();
    const onSkipTrackWithTtIntent = vi.fn();
    const onTokenSpendAnimationStart = vi.fn();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(
      <TurnDockHarness
        canUseSkipTrack
        onTokenSpendAnimationStart={onTokenSpendAnimationStart}
        options={{ onSkipTrackWithTtIntent }}
        roomState={buildTtTurnRoomState()}
      />,
    );

    const skipButton = screen.getByRole("button", { name: /skip/i });
    fireEvent.click(skipButton);
    fireEvent.click(skipButton);

    expect(screen.getByRole("button", { name: /skipping track/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.SkipTrackWithTt,
      { roomId: "TEST_ROOM_1" },
      expect.objectContaining({ retryOnTimeout: true }),
    );
    expect(onSkipTrackWithTtIntent).toHaveBeenCalledTimes(1);
    expect(onSkipTrackWithTtIntent).toHaveBeenCalledWith("track-current");
    expect(onTokenSpendAnimationStart).toHaveBeenCalledTimes(1);

    await finishWithTimeout(deferred);
    expect(await screen.findByRole("button", { name: /try again/i })).toBeEnabled();
    expect(onSkipTrackWithTtIntent).toHaveBeenLastCalledWith(null);
  });

  it("adjusts one player's tokens at a time and offers a retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<AwardTtHarness />);

    const addButton = screen.getByRole("button", { name: /add token/i });
    const removeButton = screen.getByRole("button", { name: /remove token/i });
    fireEvent.click(addButton);
    fireEvent.click(removeButton);
    fireEvent.click(addButton);

    expect(addButton).toBeDisabled();
    expect(removeButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.AwardTt,
      { roomId: "TEST_ROOM_1", playerId: TEST_GUEST_ID, amount: 1 },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    await finishWithTimeout(deferred);
    expect(screen.getByRole("button", { name: /try adding token again/i })).toBeEnabled();
  });
});
