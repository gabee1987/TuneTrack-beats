import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../features/i18n";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { buildLobbyRoomState } from "../../../test/roomStateFixtures";
import { LobbyHostStartPanel } from "../components/LobbyHostStartPanel";
import { LobbyPlayerListItem } from "../components/LobbyPlayerListItem";
import { LobbyRoomActions } from "../components/LobbyRoomActions";
import { useLobbyRoomActions } from "./useLobbyRoomActions";

const { emitActionMock, getSocketClientMock } = vi.hoisted(() => ({
  emitActionMock: vi.fn(),
  getSocketClientMock: vi.fn(),
}));

vi.mock("../../../services/socket/emitAction", () => ({
  emitAction: emitActionMock,
}));

vi.mock("../../../services/socket/socketClient", () => ({
  getSocketClient: getSocketClientMock,
}));

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
    currentSettings: roomState.settings,
    isHost: true,
    roomState,
  });

  return (
    <I18nProvider>
      <ul>
        <LobbyPlayerListItem
          currentPlayerId={roomState.hostId}
          isHost
          isKickPlayerPending={actions.isKickPlayerPending}
          isPlayerSettingsPending={actions.isPlayerSettingsPending}
          kickPlayerActionState={actions.kickPlayerActionState}
          playerSettingsActionState={actions.playerSettingsActionState}
          onPlayerKick={actions.handlePlayerKick}
          onPlayerStartingCardCountChange={actions.handlePlayerStartingCardCountChange}
          onPlayerStartingTtTokenCountChange={actions.handlePlayerStartingTtTokenCountChange}
          player={roomState.players[1]!}
          roomSettings={roomState.settings}
        />
      </ul>
    </I18nProvider>
  );
}

describe("useLobbyRoomActions start_game", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
    getSocketClientMock.mockReset();
    getSocketClientMock.mockResolvedValue({ emit: vi.fn() });
  });

  it("retries one timeout, blocks duplicate starts, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<StartGameHarness />);

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
});

describe("useLobbyRoomActions close_room", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
    getSocketClientMock.mockReset();
    getSocketClientMock.mockResolvedValue({ emit: vi.fn() });
  });

  it("retries one timeout, blocks duplicate closes, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<CloseRoomHarness />);

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
    getSocketClientMock.mockReset();
    getSocketClientMock.mockResolvedValue({ emit: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("retries one timeout, blocks duplicate lobby removals, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<KickPlayerHarness />);

    const kickButton = screen.getByRole("button", { name: /kick player two/i });
    fireEvent.click(kickButton);
    fireEvent.click(kickButton);

    expect(kickButton).toBeDisabled();
    expect(kickButton).toHaveTextContent("Kick");
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

    const retryButton = await screen.findByRole("button", { name: /try removing again/i });
    expect(retryButton).toBeEnabled();

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    fireEvent.click(retryButton);

    await waitFor(() => expect(emitActionMock).toHaveBeenCalledTimes(2));
  });
});

describe("useLobbyRoomActions update_player_settings", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
    getSocketClientMock.mockReset();
    getSocketClientMock.mockResolvedValue({ emit: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("retries one timeout, blocks duplicate player-setting updates, and exposes a final retry", async () => {
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    render(<KickPlayerHarness />);

    const startingCardsButton = screen.getByRole("button", {
      name: /starting cards: 2/i,
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
