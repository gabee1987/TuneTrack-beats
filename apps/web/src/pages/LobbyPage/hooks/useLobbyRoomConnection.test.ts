import { act, renderHook, waitFor } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
import { getLobbyRoomStateUpdateDecision, useLobbyRoomConnection } from "./useLobbyRoomConnection";

vi.mock("../../../features/i18n", () => {
  const t = (key: string) => key;
  return { useI18n: () => ({ t }) };
});

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

beforeEach(() => {
  resetSharedFakeSocket();
});

describe("getLobbyRoomStateUpdateDecision", () => {
  it("accepts state updates for the requested room", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room-1",
        nextStatus: "lobby",
        requestedRoomId: "party-room-1",
      }),
    ).toEqual({
      accept: true,
      shouldNavigateToRoom: false,
    });
  });

  it("navigates when an established lobby room is renamed by the host", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room-1",
        nextStatus: "lobby",
        requestedRoomId: "party-room",
      }),
    ).toEqual({
      accept: true,
      shouldNavigateToRoom: true,
    });
  });

  it("ignores stale updates from a previous room after the player requested a new room", () => {
    expect(
      getLobbyRoomStateUpdateDecision({
        joinedRoomId: "party-room",
        nextRoomId: "party-room",
        nextStatus: "lobby",
        requestedRoomId: "party-room-1",
      }),
    ).toEqual({
      accept: false,
      shouldNavigateToRoom: false,
    });
  });
});

describe("useLobbyRoomConnection", () => {
  it("creates once and joins when the same hook instance reconnects", async () => {
    const socket = getSharedFakeSocket();
    const navigate = vi.fn();

    renderHook(() =>
      useLobbyRoomConnection({
        displayName: "Player One",
        intent: "create",
        navigate,
        playerSessionId: "TEST_SESSION_1",
        roomId: "TEST_ROOM_1",
      }),
    );

    await waitFor(() => {
      expect(socket.emittedFor(ClientToServerEvent.CreateRoom)).toHaveLength(1);
    });

    act(() => {
      socket.simulateReconnect();
    });

    expect(socket.emittedFor(ClientToServerEvent.CreateRoom)).toHaveLength(1);
    expect(socket.emittedFor(ClientToServerEvent.JoinRoom)).toEqual([
      {
        displayName: "Player One",
        roomId: "TEST_ROOM_1",
        sessionId: "TEST_SESSION_1",
      },
    ]);
  });
});
