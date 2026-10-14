import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../app/AppRoutes";
import { I18nProvider } from "../../features/i18n";
import { usePlayerProfileStore } from "../../features/profile/playerProfile";
import { AppToastProvider } from "../../features/toast";
import { trackSocketConnection } from "../../services/socket/connectionState";
import { rememberRoomEventToast } from "../../services/session/roomEventToast";
import {
  createFakeSocket,
  getSharedFakeSocket,
  resetSharedFakeSocket,
} from "../../test/fakeSocket";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildLobbyRoomState, TEST_HOST_ID } from "../../test/roomStateFixtures";
import { useLobbyPageController } from "../LobbyPage/hooks/useLobbyPageController";
import { HomePage } from "./HomePage";

const { preloadLobbyRuntimeMock } = vi.hoisted(() => ({ preloadLobbyRuntimeMock: vi.fn() }));

vi.mock("../../app/preloadRoutes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../app/preloadRoutes")>()),
  preloadLobbyRuntime: preloadLobbyRuntimeMock,
}));

vi.mock("../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

const KICKED_MESSAGE = "You were removed from TEST_ROOM_1.";

function RouteProbe() {
  const location = useLocation();
  const intent = (location.state as { intent?: string } | null)?.intent ?? "none";
  return <p>{`${location.pathname}:${intent}`}</p>;
}

function renderHome(layout: "mobile" | "desktop" = "mobile") {
  return renderWithProviders(
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<RouteProbe />} path="/lobby" />
      <Route element={<RouteProbe />} path="/join" />
    </Routes>,
    { layout },
  );
}

function setSavedName(displayName: string | null) {
  usePlayerProfileStore.setState(
    displayName
      ? { displayName, hasCompletedSetup: true }
      : { displayName: "", hasCompletedSetup: false },
  );
}

let untrackConnection: (() => void) | null = null;

beforeEach(() => {
  resetSharedFakeSocket();
  setSavedName("Player One");
});

afterEach(() => {
  untrackConnection?.();
  untrackConnection = null;
  vi.useRealTimers();
});

describe.each(["mobile", "desktop"] as const)("HomePage (%s)", (layout) => {
  it("offers Host and Join under the tagline and says who is playing", async () => {
    renderHome(layout);

    expect(await screen.findByText("Place the song. Beat your friends.")).toBeInTheDocument();
    expect(screen.getByText("Playing as Player One")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Host a game" })).toHaveAccessibleDescription(
      "You play too. Songs play on the host's phone.",
    );
    expect(screen.getByRole("button", { name: "Join a game" })).toBeEnabled();
  });

  it("hosts at once with a saved name, warming the lobby first", async () => {
    renderHome(layout);
    const host = await screen.findByRole("button", { name: "Host a game" });

    fireEvent.focus(host);
    await userEvent.click(host);

    expect(preloadLobbyRuntimeMock).toHaveBeenCalled();
    expect(screen.getByText("/lobby:create")).toBeInTheDocument();
  });
});

describe("HomePage on a new device", () => {
  beforeEach(() => setSavedName(null));

  it("shows no identity chip and asks for a name before hosting, then hosts", async () => {
    renderHome();
    await userEvent.click(await screen.findByRole("button", { name: "Host a game" }));

    const dialog = screen.getByRole("dialog", { name: "What should we call you?" });
    expect(screen.queryByText(/Playing as/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox", { name: "Your name" }), "  Player Two ");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(dialog).not.toBeInTheDocument();
    expect(await screen.findByText("/lobby:create")).toBeInTheDocument();
    expect(usePlayerProfileStore.getState().displayName).toBe("Player Two");
  });

  it("asks for a name before joining and stays on Home when cancelled", async () => {
    renderHome();
    await userEvent.click(await screen.findByRole("button", { name: "Join a game" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Join a game" })).toBeInTheDocument();
    expect(screen.queryByText("/join:none")).not.toBeInTheDocument();
  });
});

describe("HomePage with a saved name", () => {
  it("changes the name from the chip with the field focused and filled in", async () => {
    renderHome();
    await userEvent.click(await screen.findByRole("button", { name: "Change" }));

    const field = screen.getByRole("textbox", { name: "Your name" });
    expect(field).toHaveFocus();
    expect(field).toHaveValue("Player One");

    await userEvent.clear(field);
    await userEvent.type(field, "Player Three{Enter}");

    expect(await screen.findByText("Playing as Player Three")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Host a game" })).toBeInTheDocument();
  });

  it("goes to Join", async () => {
    renderHome();
    await userEvent.click(await screen.findByRole("button", { name: "Join a game" }));

    expect(screen.getByText("/join:none")).toBeInTheDocument();
  });

  it("disables Host with the reason while the device is offline", async () => {
    untrackConnection = trackSocketConnection(
      createFakeSocket({ connected: false }) as unknown as Socket,
    );
    renderHome();
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    const host = await screen.findByRole("button", { name: "Host a game" });
    expect(host).toBeDisabled();
    expect(host).toHaveAccessibleDescription(/You are offline/);
  });
});

describe("HomePage hosting end to end", () => {
  function ConnectedLobbyProbe() {
    const controller = useLobbyPageController();
    return (
      <p>{`lobby:${controller.roomId ?? "pending"}:${controller.roomState?.roomId ?? "empty"}`}</p>
    );
  }

  it("follows the server-generated code without falling back to Home", async () => {
    const socket = getSharedFakeSocket();
    render(
      <I18nProvider>
        <AppToastProvider>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route path="/" element={<AppRoutes />}>
                <Route index element={<HomePage />} />
                <Route path="lobby/:roomId?" element={<ConnectedLobbyProbe />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AppToastProvider>
      </I18nProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Host a game" }));
    await waitFor(() => expect(socket.emittedFor(ClientToServerEvent.CreateRoom)).toHaveLength(1));

    act(() => {
      socket.serverEmit(ServerToClientEvent.PlayerIdentity, { playerId: TEST_HOST_ID });
      socket.serverEmit(ServerToClientEvent.StateUpdate, {
        roomState: buildLobbyRoomState({ roomId: "slot-year-58" }),
      });
    });
    await waitFor(() => expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toHaveLength(1));
    act(() => {
      socket.serverEmit(ServerToClientEvent.PlayerIdentity, { playerId: TEST_HOST_ID });
      socket.serverEmit(ServerToClientEvent.StateUpdate, {
        roomState: buildLobbyRoomState({ roomId: "slot-year-58" }),
      });
    });

    expect(await screen.findByText("lobby:slot-year-58:slot-year-58")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Host a game" })).not.toBeInTheDocument();
  });
});

describe("HomePage after the player was removed from a room", () => {
  it("tells them once when they arrive", async () => {
    rememberRoomEventToast({ reason: "kicked", roomName: "TEST_ROOM_1" });

    renderHome();

    expect(await screen.findByText(KICKED_MESSAGE)).toBeInTheDocument();
  });

  it("tells them while Home is open, then clears the message", async () => {
    renderHome();
    await screen.findByRole("button", { name: "Host a game" });
    vi.useFakeTimers();

    act(() => {
      rememberRoomEventToast({ reason: "kicked", roomName: "TEST_ROOM_1" });
    });
    expect(screen.getByText(KICKED_MESSAGE)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4_500);
    });
    expect(screen.queryByText(KICKED_MESSAGE)).not.toBeInTheDocument();
  });
});
