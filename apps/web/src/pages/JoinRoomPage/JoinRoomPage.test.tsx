import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared/client";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerProfileStore } from "../../features/profile/playerProfile";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../test/fakeSocket";
import { renderWithProviders } from "../../test/renderWithProviders";
import { JoinRoomPage } from "./JoinRoomPage";

vi.mock("../../app/preloadRoutes", () => ({
  preloadGameRuntime: vi.fn(),
  preloadLobbyRuntime: vi.fn(),
}));

vi.mock("../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

vi.mock("../../services/haptics/triggerPressHaptic", () => ({ triggerPressHaptic: vi.fn() }));

function LobbyProbe() {
  return <p>{`at ${useLocation().pathname}`}</p>;
}

async function renderInvite(typedCode: string) {
  renderWithProviders(
    <Routes>
      <Route element={<JoinRoomPage />} path="/join/:roomId" />
      <Route element={<LobbyProbe />} path="/lobby/:roomId" />
    </Routes>,
    { route: `/join/${typedCode}` },
  );
  const socket = getSharedFakeSocket();
  act(() => socket.simulateConnect());
  await waitFor(() =>
    expect(socket.emittedFor(ClientToServerEvent.GetRoomPreview)).not.toHaveLength(0),
  );
}

function answerPreview(requestedRoomId: string) {
  act(() => {
    getSharedFakeSocket().serverEmit(ServerToClientEvent.RoomPreview, {
      requestedRoomId,
      room: { hostName: "Player One", playerCount: 2, roomId: "TEST_ROOM_1", status: "lobby" },
    });
  });
}

beforeEach(() => {
  resetSharedFakeSocket();
  usePlayerProfileStore.setState({ displayName: "Player Two", hasCompletedSetup: true });
});

describe("JoinRoomPage", () => {
  it("shows fact-shaped placeholders while the invite loads, then the room", async () => {
    await renderInvite("TEST_ROOM_1");

    expect(screen.getByRole("status", { name: "Loading room..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join room" })).toBeDisabled();

    answerPreview("TEST_ROOM_1");

    expect(screen.getByText("Player One")).toBeInTheDocument();
    expect(screen.getByText("Playing as Player Two")).toBeInTheDocument();
  });

  it("joins under the room's stored code when the invite was typed in another case", async () => {
    await renderInvite("test_room_1");
    answerPreview("test_room_1");

    await userEvent.click(screen.getByRole("button", { name: "Join room" }));

    expect(screen.getByText("at /lobby/TEST_ROOM_1")).toBeInTheDocument();
  });

  it("asks a nameless device for a name before joining", async () => {
    usePlayerProfileStore.setState({ displayName: "", hasCompletedSetup: false });
    await renderInvite("TEST_ROOM_1");
    answerPreview("TEST_ROOM_1");

    await userEvent.click(screen.getByRole("button", { name: "Join room" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Your name" }), "Player Three{Enter}");

    expect(await screen.findByText("at /lobby/TEST_ROOM_1")).toBeInTheDocument();
  });
});
