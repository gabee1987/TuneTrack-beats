import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared";
import { AppRoutes } from "../../app/AppRoutes";
import { I18nProvider } from "../../features/i18n";
import { usePlayerProfileStore } from "../../features/profile/playerProfile";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../test/fakeSocket";
import { buildLobbyRoomState, TEST_HOST_ID } from "../../test/roomStateFixtures";
import { useLobbyPageController } from "../LobbyPage/hooks/useLobbyPageController";
import { PlayPage } from "./PlayPage";

vi.mock("../../app/preloadRoutes", () => ({
  preloadGameRuntime: vi.fn(),
  preloadLobbyRuntime: vi.fn(),
}));

vi.mock("../../features/rooms/useRoomDirectory", () => ({
  useRoomDirectory: () => ({ refreshRooms: vi.fn(), rooms: [] }),
}));

vi.mock("../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

function LobbyRouteProbe() {
  const location = useLocation();
  const routeState = (location.state ?? {}) as { intent?: string };
  return <p>{`${location.pathname}:${routeState.intent ?? "none"}:${location.search}`}</p>;
}

function ConnectedLobbyRouteProbe() {
  const controller = useLobbyPageController();
  return (
    <p>{`lobby:${controller.roomId ?? "pending"}:${controller.roomState?.roomId ?? "empty"}`}</p>
  );
}

describe("PlayPage", () => {
  beforeEach(() => {
    resetSharedFakeSocket();
    usePlayerProfileStore.setState({
      displayName: "Player One",
      hasCompletedSetup: true,
    });
  });

  it("starts server-generated room creation with one host action", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/play"]}>
          <Routes>
            <Route path="/play" element={<PlayPage />} />
            <Route path="/lobby" element={<LobbyRouteProbe />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(screen.queryByRole("textbox", { name: /new room code/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /host a game/i }));

    expect(await screen.findByText("/lobby:create:")).toBeInTheDocument();
  });

  it("stays in the generated lobby after the authoritative route handoff", async () => {
    const socket = getSharedFakeSocket();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/play"]}>
          <Routes>
            <Route path="/" element={<AppRoutes />}>
              <Route index element={<p>home route</p>} />
              <Route path="play" element={<PlayPage />} />
              <Route path="lobby/:roomId?" element={<ConnectedLobbyRouteProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </I18nProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: /host a game/i }));

    await waitFor(() => {
      expect(socket.emittedFor(ClientToServerEvent.CreateRoom)).toHaveLength(1);
    });

    act(() => {
      socket.serverEmit(ServerToClientEvent.PlayerIdentity, { playerId: TEST_HOST_ID });
      socket.serverEmit(ServerToClientEvent.StateUpdate, {
        roomState: buildLobbyRoomState({ roomId: "slot-year-58" }),
      });
    });

    await waitFor(() => {
      expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toHaveLength(1);
    });

    act(() => {
      socket.serverEmit(ServerToClientEvent.PlayerIdentity, { playerId: TEST_HOST_ID });
      socket.serverEmit(ServerToClientEvent.StateUpdate, {
        roomState: buildLobbyRoomState({ roomId: "slot-year-58" }),
      });
    });

    expect(await screen.findByText("lobby:slot-year-58:slot-year-58")).toBeInTheDocument();
    expect(screen.queryByText("home route")).not.toBeInTheDocument();
  });
});
