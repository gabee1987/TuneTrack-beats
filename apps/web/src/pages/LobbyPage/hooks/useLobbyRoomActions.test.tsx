import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { renderWithProviders } from "../../../test/renderWithProviders";
import { buildLobbyRoomState } from "../../../test/roomStateFixtures";
import { LobbyHostStartPanel } from "../components/LobbyHostStartPanel";
import { LobbyRoomSettingsStatus } from "../components/LobbyRoomSettingsStatus";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { RulesGameSection } from "../components/rules/RulesGameSection";
import { RulesPlayersSection } from "../components/rules/RulesPlayersSection";
import { useLobbyRoomActions } from "./useLobbyRoomActions";

const { emitActionMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
}));

vi.mock("../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

function createDeferredActionResult() {
  let resolve!: (result: EmitActionResult) => void;
  const promise = new Promise<EmitActionResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function StartGameHarness() {
  const roomState = buildLobbyRoomState();
  const actions = useLobbyRoomActions({
    currentPlayerId: roomState.hostId,
    currentSettings: roomState.settings,
    isHost: true,
    roomState,
  });

  return (
    <I18nProvider>
      <LobbyHostStartPanel
        isStartGamePending={actions.isStartGamePending}
        onIntentToStart={() => undefined}
        onStartGame={actions.handleStartGame}
        startGameActionStatus={actions.startGameActionStatus}
      />
    </I18nProvider>
  );
}

function CloseRoomHarness() {
  const roomState = buildLobbyRoomState();
  const actions = useLobbyRoomActions({
    currentPlayerId: roomState.hostId,
    currentSettings: roomState.settings,
    isHost: true,
    roomState,
  });

  return (
    <I18nProvider>
      <LobbyRoomActions
        closeRoomActionStatus={actions.closeRoomActionStatus}
        isCloseRoomPending={actions.isCloseRoomPending}
        isStartGamePending={false}
        onCloseRoom={actions.handleCloseRoom}
        startGameActionStatus="idle"
      />
    </I18nProvider>
  );
}

function KickPlayerHarness() {
  const roomState = buildLobbyRoomState();
  const actions = useLobbyRoomActions({
    currentPlayerId: roomState.hostId,
    currentSettings: roomState.settings,
    isHost: true,
    roomState,
  });

  return (
    <I18nProvider>
      <RulesPlayersSection
        numberInput="ruler"
        players={{
          currentPlayerId: roomState.hostId,
          isHost: true,
          isKickPlayerPending: actions.isKickPlayerPending,
          isPlayerSettingsPending: actions.isPlayerSettingsPending,
          kickPlayerActionState: actions.kickPlayerActionState,
          onPlayerKick: actions.handlePlayerKick,
          onPlayerStartingCardCountChange: actions.handlePlayerStartingCardCountChange,
          onPlayerStartingTtTokenCountChange: actions.handlePlayerStartingTtTokenCountChange,
          playerSettingsActionState: actions.playerSettingsActionState,
          players: roomState.players,
          roomSettings: roomState.settings,
        }}
      />
    </I18nProvider>
  );
}

/** Opens Player Two's row in the Rules player list and returns queries scoped to it. */
function openGuestRow() {
  const row = screen
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText("Player Two") !== null);
  if (!row) throw new Error("The player list has no row for Player Two.");
  fireEvent.click(within(row).getByRole("button", { name: /^Player Two/ }));
  return within(row);
}

function RoomSettingsHarness() {
  const roomState = buildLobbyRoomState();
  const actions = useLobbyRoomActions({
    currentPlayerId: roomState.hostId,
    currentSettings: roomState.settings,
    isHost: true,
    roomState,
  });

  return (
    <I18nProvider>
      <RulesGameSection
        disabled={actions.isRoomSettingsPending}
        numberInput="ruler"
        onChange={actions.handleRoomSettingsChange}
        settings={roomState.settings}
      />
      <LobbyRoomSettingsStatus actionStatus={actions.roomSettingsActionStatus} />
    </I18nProvider>
  );
}

describe("useLobbyRoomActions start_game", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate starts, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    renderWithProviders(<StartGameHarness />);

    const startButton = screen.getByRole("button", { name: /start game/i });
    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(screen.getByRole("button", { name: /starting game/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.StartGame,
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

  it("says what is missing in a toast when the server refuses to start without a deck", async () => {
    emitActionMock.mockResolvedValueOnce({ status: "rejected", code: "DECK_REQUIRED" });
    renderWithProviders(<StartGameHarness />);

    fireEvent.click(screen.getByRole("button", { name: /start game/i }));

    expect(
      await screen.findByText("Add songs or choose the practice deck first."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start game/i })).toBeEnabled();
  });
});

describe("useLobbyRoomActions close_room", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate closes, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    renderWithProviders(<CloseRoomHarness />);

    const closeButton = screen.getByRole("button", { name: /close room/i });
    fireEvent.click(closeButton);
    fireEvent.click(closeButton);

    expect(screen.getByRole("button", { name: /closing room/i })).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.CloseRoom,
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

describe("useLobbyRoomActions kick_player", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate lobby removals, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    renderWithProviders(<KickPlayerHarness />);

    const guestRow = openGuestRow();
    const removeButton = guestRow.getByRole("button", { name: "Remove Player Two from the room" });
    fireEvent.click(removeButton);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(removeButton).toBeDisabled();
    fireEvent.click(removeButton);
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.KickPlayer,
      { roomId: "TEST_ROOM_1", playerId: "player-guest" },
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

    const retryButton = await guestRow.findByRole("button", { name: /try removing again/i });
    expect(retryButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(retryButton);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});

describe("useLobbyRoomActions update_player_settings", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate player-setting updates, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    renderWithProviders(<KickPlayerHarness />);

    const startingCardsButton = openGuestRow().getByRole("button", {
      name: "Starting songs: 2",
    });
    fireEvent.click(startingCardsButton);
    fireEvent.click(startingCardsButton);

    expect(startingCardsButton).toBeDisabled();
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.UpdatePlayerSettings,
      {
        playerId: "player-guest",
        roomId: "TEST_ROOM_1",
        startingTimelineCardCount: 2,
        startingTtTokenCount: 0,
      },
      expect.objectContaining({ retryOnTimeout: true }),
    );

    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };
    act(() => options.onTimeoutRetry?.());

    expect(screen.getByText(/no response.*retrying/i)).toBeInTheDocument();
    expect(startingCardsButton).toBeDisabled();

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    expect(screen.getByText(/choose the setting again to retry/i)).toBeInTheDocument();
    expect(startingCardsButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(startingCardsButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});

describe("useLobbyRoomActions update_room_settings", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries one timeout, blocks duplicate room-setting updates, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    renderWithProviders(<RoomSettingsHarness />);

    const targetCardButton = screen.getByRole("button", {
      name: "Songs to win: 11",
    });
    fireEvent.click(targetCardButton);
    fireEvent.click(targetCardButton);

    expect(targetCardButton).toBeDisabled();
    for (const option of within(
      screen.getByRole("radiogroup", { name: "Who taps Next" }),
    ).getAllByRole("radio")) {
      expect(option).toBeDisabled();
    }
    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.UpdateRoomSettings,
      expect.objectContaining({
        roomId: "TEST_ROOM_1",
        targetTimelineCardCount: 11,
      }),
      expect.objectContaining({ retryOnTimeout: true }),
    );

    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };
    act(() => options.onTimeoutRetry?.());

    expect(screen.getByText(/no response.*retrying/i)).toBeInTheDocument();
    expect(targetCardButton).toBeDisabled();

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      await deferred.promise;
    });

    expect(screen.getByText(/choose the setting again to retry/i)).toBeInTheDocument();
    expect(targetCardButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(targetCardButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});
