import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { I18nProvider } from "../../../features/i18n";
import {
  buildChallengeRoomState,
  buildRevealRoomState,
  buildTurnRoomState,
  TEST_GUEST_ID,
  TEST_HOST_ID,
} from "../../../test/roomStateFixtures";
import { ChallengeActionPanel } from "../components/ChallengeActionPanel";
import { RevealActionDock } from "../components/RevealActionDock";
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
        placeCardActionStatus={actions.placeCardActionStatus}
        roomState={roomState}
      />
    </I18nProvider>
  );
}

function RevealHarness() {
  const roomState = buildRevealRoomState();
  const actions = useGamePageActions({
    canClaimChallenge: false,
    canConfirmReveal: true,
    canResolveChallengeWindow: false,
    canSelectChallengeSlot: false,
    currentPlayerId: TEST_HOST_ID,
    isCurrentPlayerTurn: true,
    roomState,
    selectedSlotIndex: 1,
    setLocallyPlacedCard: vi.fn(),
  });

  return (
    <I18nProvider>
      <RevealActionDock
        canConfirmReveal
        confirmRevealActionStatus={actions.confirmRevealActionStatus}
        handleConfirmReveal={actions.handleConfirmReveal}
        isConfirmRevealPending={actions.isConfirmRevealPending}
        roomState={roomState}
      />
    </I18nProvider>
  );
}

function ChallengePlacementHarness() {
  const roomState = buildChallengeRoomState({
    challengeState: {
      phase: "claimed",
      originalPlayerId: TEST_HOST_ID,
      originalSelectedSlotIndex: 0,
      challengerPlayerId: TEST_GUEST_ID,
      challengeDeadlineEpochMs: null,
      challengerSelectedSlotIndex: null,
    },
  });
  const actions = useGamePageActions({
    canClaimChallenge: false,
    canConfirmReveal: false,
    canResolveChallengeWindow: false,
    canSelectChallengeSlot: true,
    currentPlayerId: TEST_GUEST_ID,
    isCurrentPlayerTurn: false,
    roomState,
    selectedSlotIndex: 1,
    setLocallyPlacedCard: vi.fn(),
  });

  return (
    <I18nProvider>
      <ChallengeActionPanel
        canClaimChallenge={false}
        canConfirmBeatPlacement
        canResolveChallengeWindow={false}
        challengeActionBody="Place the challenge card"
        challengeActionTitle="Beat claimed"
        currentPlayerTtCount={1}
        handleClaimChallenge={actions.handleClaimChallenge}
        handlePlaceChallenge={actions.handlePlaceChallenge}
        handleResolveChallengeWindow={actions.handleResolveChallengeWindow}
        isCurrentPlayerTurn={false}
        isPlaceChallengePending={actions.isPlaceChallengePending}
        placeChallengeActionStatus={actions.placeChallengeActionStatus}
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
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.PlaceCard,
      {
        roomId: "TEST_ROOM_1",
        selectedSlotIndex: 1,
      },
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

  it("shows timeout retry progress and a retry affordance after the final timeout", async () => {
    const deferred = createDeferredActionResult();
    const setLocallyPlacedCard = vi.fn();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<PlacementHarness setLocallyPlacedCard={setLocallyPlacedCard} />);

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(screen.getByRole("button", { name: /confirming/i })).toBeDisabled();
    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };

    act(() => options.onTimeoutRetry?.());

    expect(screen.getByRole("button", { name: /no response.*retrying/i })).toBeDisabled();

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    const retryButton = await screen.findByRole("button", { name: /try again/i });
    expect(retryButton).toBeEnabled();
    expect(setLocallyPlacedCard).toHaveBeenLastCalledWith(null);

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(retryButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
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

describe("useGamePageActions confirm_reveal", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate confirmation, and exposes a final retry", async () => {
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

    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };
    act(() => options.onTimeoutRetry?.());

    expect(screen.getByRole("button", { name: /no response.*retrying/i })).toBeDisabled();

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    const retryButton = await screen.findByRole("button", { name: /try again/i });
    expect(retryButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(retryButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});

describe("useGamePageActions place_challenge", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate placement, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<ChallengePlacementHarness />);

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

    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };
    act(() => options.onTimeoutRetry?.());

    expect(screen.getByRole("button", { name: /no response.*retrying/i })).toBeDisabled();

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    const retryButton = await screen.findByRole("button", { name: /try again/i });
    expect(retryButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(retryButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});
