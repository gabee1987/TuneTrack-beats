import { act, renderHook } from "@testing-library/react";
import { ClientToServerEvent } from "@tunetrack/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmitActionResult } from "../../../services/socket/emitAction";
import { buildLobbyRoomState } from "../../../test/roomStateFixtures";
import { useLobbyIdentityActions } from "./useLobbyIdentityActions";

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

describe("useLobbyIdentityActions", () => {
  beforeEach(() => {
    emitActionMock.mockReset();
  });

  it("retries a profile update once, blocks every identity action, and exposes a final retry", async () => {
    const roomState = buildLobbyRoomState();
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    const view = renderHook(() =>
      useLobbyIdentityActions({
        currentPlayerId: roomState.hostId,
        isHost: true,
        roomState,
      }),
    );

    let firstResult!: Promise<boolean>;
    act(() => {
      firstResult = view.result.current.handlePlayerProfileChange("Updated Host");
      void view.result.current.handleRoomRename("renamed-room");
    });

    expect(emitActionMock).toHaveBeenCalledTimes(1);
    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.UpdatePlayerProfile,
      {
        displayName: "Updated Host",
        roomId: "TEST_ROOM_1",
      },
      expect.objectContaining({ retryOnTimeout: true }),
    );
    expect(view.result.current.actionState).toEqual({
      kind: "profile",
      status: "pending",
    });

    const options = emitActionMock.mock.calls[0]?.[2] as {
      onTimeoutRetry?: () => void;
    };
    act(() => options.onTimeoutRetry?.());

    expect(view.result.current.actionState).toEqual({
      kind: "profile",
      status: "retrying",
    });

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      expect(await firstResult).toBe(false);
    });

    expect(view.result.current.actionState).toEqual({
      kind: "profile",
      status: "failed",
    });

    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    await act(async () => {
      expect(await view.result.current.handlePlayerProfileChange("Updated Host")).toBe(true);
    });

    expect(emitActionMock).toHaveBeenCalledTimes(2);
    expect(view.result.current.actionState).toBeNull();
  });

  it("treats an authoritative profile update as success when its acknowledgement is lost", async () => {
    const roomState = buildLobbyRoomState();
    const deferred = createDeferredActionResult();
    emitActionMock.mockReturnValueOnce(deferred.promise);
    const view = renderHook(
      ({ currentRoomState }) =>
        useLobbyIdentityActions({
          currentPlayerId: roomState.hostId,
          isHost: true,
          roomState: currentRoomState,
        }),
      { initialProps: { currentRoomState: roomState } },
    );

    let actionResult!: Promise<boolean>;
    act(() => {
      actionResult = view.result.current.handlePlayerProfileChange("Updated Host");
    });

    view.rerender({
      currentRoomState: {
        ...roomState,
        players: roomState.players.map((player) =>
          player.id === roomState.hostId ? { ...player, displayName: "Updated Host" } : player,
        ),
      },
    });

    await act(async () => {
      deferred.resolve({ status: "timeout" });
      expect(await actionResult).toBe(true);
    });

    expect(view.result.current.actionState).toBeNull();
  });

  it("submits room renames through the acknowledged retry path", async () => {
    const roomState = buildLobbyRoomState();
    emitActionMock.mockResolvedValueOnce({ status: "ok" });
    const view = renderHook(() =>
      useLobbyIdentityActions({
        currentPlayerId: roomState.hostId,
        isHost: true,
        roomState,
      }),
    );

    await act(async () => {
      expect(await view.result.current.handleRoomRename("renamed-room")).toBe(true);
    });

    expect(emitActionMock).toHaveBeenCalledWith(
      ClientToServerEvent.RenameRoom,
      {
        nextRoomId: "renamed-room",
        roomId: "TEST_ROOM_1",
      },
      expect.objectContaining({ retryOnTimeout: true }),
    );
    expect(view.result.current.actionState).toBeNull();
  });
});
