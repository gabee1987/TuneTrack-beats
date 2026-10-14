import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ClientToServerEvent,
  ServerToClientEvent,
  type PublicRoomSummary,
} from "@tunetrack/shared/client";
import { Route, Routes, useLocation } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerProfileStore } from "../../features/profile/playerProfile";
import { trackSocketConnection } from "../../services/socket/connectionState";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../test/fakeSocket";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JoinPage } from "./JoinPage";

vi.mock("../../app/preloadRoutes", () => ({
  preloadGameRuntime: vi.fn(),
  preloadLobbyRuntime: vi.fn(),
}));

vi.mock("../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

vi.mock("../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

const OPEN_ROOM: PublicRoomSummary = {
  hostName: "Player One",
  playerCount: 2,
  roomId: "TEST_ROOM_1",
  status: "lobby",
};

function LobbyProbe() {
  return <p>{`at ${useLocation().pathname}`}</p>;
}

function renderJoin() {
  return renderWithProviders(
    <Routes>
      <Route element={<JoinPage />} path="/join" />
      <Route element={<LobbyProbe />} path="/lobby/:roomId" />
    </Routes>,
    { route: "/join" },
  );
}

function sendRoomList(rooms: PublicRoomSummary[]) {
  act(() => {
    getSharedFakeSocket().serverEmit(ServerToClientEvent.RoomList, { rooms });
  });
}

function answerPreview(requestedRoomId: string, room: PublicRoomSummary | null) {
  act(() => {
    getSharedFakeSocket().serverEmit(ServerToClientEvent.RoomPreview, { requestedRoomId, room });
  });
}

let untrackConnection: (() => void) | null = null;

beforeEach(() => {
  resetSharedFakeSocket();
  usePlayerProfileStore.setState({ displayName: "Player Two", hasCompletedSetup: true });
  untrackConnection = trackSocketConnection(getSharedFakeSocket() as unknown as Socket);
  act(() => getSharedFakeSocket().simulateConnect());
});

afterEach(() => {
  untrackConnection?.();
  untrackConnection = null;
});

describe("JoinPage", () => {
  it("shows row-shaped placeholders until the open rooms arrive, then the rooms", async () => {
    renderJoin();

    expect(await screen.findByRole("status", { name: "Loading…" })).toBeInTheDocument();

    sendRoomList([OPEN_ROOM]);

    expect(screen.queryByRole("status", { name: "Loading…" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /TEST_ROOM_1.*Hosted by Player One · 2 players/ }),
    ).toBeInTheDocument();
  });

  it("says when there are no open rooms", async () => {
    renderJoin();
    await waitFor(() =>
      expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.ListRooms)).not.toHaveLength(0),
    );

    sendRoomList([]);

    expect(screen.getByText("No open rooms yet. Ask your host for the code.")).toBeInTheDocument();
  });

  it("joins an open room with one tap", async () => {
    renderJoin();
    await waitFor(() =>
      expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.ListRooms)).not.toHaveLength(0),
    );
    sendRoomList([OPEN_ROOM]);

    await userEvent.click(screen.getByRole("button", { name: /TEST_ROOM_1/ }));

    expect(screen.getByText("at /lobby/TEST_ROOM_1")).toBeInTheDocument();
  });

  it("keeps Join disabled with its reason until a code is typed", async () => {
    renderJoin();
    const join = screen.getByRole("button", { name: "Join" });

    expect(join).toBeDisabled();
    expect(join).toHaveAccessibleDescription("Enter the code from your host.");

    await userEvent.type(screen.getByRole("textbox", { name: "Room code" }), "test_room_1");

    expect(join).toBeEnabled();
  });

  it("joins by a code in any case under the room's stored code", async () => {
    renderJoin();
    await userEvent.type(screen.getByRole("textbox", { name: "Room code" }), "test_room_1{Enter}");

    await waitFor(() =>
      expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.GetRoomPreview)).toEqual([
        { roomId: "test_room_1" },
      ]),
    );
    expect(screen.getByRole("button", { name: /Joining…/ })).toBeDisabled();

    answerPreview("test_room_1", OPEN_ROOM);

    expect(screen.getByText("at /lobby/TEST_ROOM_1")).toBeInTheDocument();
  });

  it("answers a wrong code on the page and clears the error when the code changes", async () => {
    renderJoin();
    const field = screen.getByRole("textbox", { name: "Room code" });
    await userEvent.type(field, "TEST_ROOM_9{Enter}");
    await waitFor(() =>
      expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.GetRoomPreview)).toHaveLength(1),
    );

    answerPreview("TEST_ROOM_9", null);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No room with that code. Check it with your host.",
    );
    expect(field).toHaveAttribute("aria-invalid", "true");

    await userEvent.type(field, "8");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("answers a code that cannot exist without asking the server", async () => {
    renderJoin();

    await userEvent.type(screen.getByRole("textbox", { name: "Room code" }), "no room!{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("No room with that code.");
    expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.GetRoomPreview)).toEqual([]);
  });

  it("explains a lost connection instead of the list and holds Join with the reason", async () => {
    renderJoin();
    await userEvent.type(screen.getByRole("textbox", { name: "Room code" }), "TEST_ROOM_1");

    act(() => getSharedFakeSocket().simulateDisconnect());

    expect(screen.getByText("Can't reach the game server. Retrying…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join" })).toHaveAccessibleDescription(
      "Reconnecting…",
    );
  });

  it("asks a nameless device for a name before joining, then joins", async () => {
    usePlayerProfileStore.setState({ displayName: "", hasCompletedSetup: false });
    renderJoin();
    await waitFor(() =>
      expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.ListRooms)).not.toHaveLength(0),
    );
    sendRoomList([OPEN_ROOM]);
    expect(screen.queryByText(/Playing as/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /TEST_ROOM_1/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Your name" }), "Player Three");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("at /lobby/TEST_ROOM_1")).toBeInTheDocument();
  });
});
