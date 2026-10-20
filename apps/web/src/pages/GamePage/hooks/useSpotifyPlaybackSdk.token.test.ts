import { act, renderHook } from "@testing-library/react";
import { ClientToServerEvent, ServerToClientEvent } from "@tunetrack/shared/client";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getSharedFakeSocket, resetSharedFakeSocket } from "../../../test/fakeSocket";
import {
  createFakeSpotifyPlayer,
  installFakeSpotifySdk,
  uninstallFakeSpotifySdk,
  type FakeSpotifyPlayer,
} from "../../../test/fakeSpotifyPlayer";
import { TEST_ROOM_ID } from "../../../test/roomStateFixtures";
import { useSpotifyPlaybackSdk } from "./useSpotifyPlaybackSdk";

vi.mock("../../../services/socket/socketClient", async () => {
  const { socketClientMockForSharedSocket } = await import("../../../test/fakeSocket");
  return socketClientMockForSharedSocket();
});

type GetOAuthToken = (cb: (token: string) => void) => void;

/** Like the real SDK: `connect()` asks for a token and settles only once it gets one. */
function connectThroughTokenCallback(player: FakeSpotifyPlayer) {
  player.connect.mockImplementation(() => {
    const [[options]] = (window.Spotify.Player as unknown as Mock).mock.calls as [
      [{ getOAuthToken: GetOAuthToken }],
    ];
    return new Promise<boolean>((resolve) => options.getOAuthToken(() => resolve(true)));
  });
}

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function tokenRefreshCount(): number {
  return getSharedFakeSocket().emittedFor(ClientToServerEvent.RefreshSpotifyToken).length;
}

describe("useSpotifyPlaybackSdk token handling (B24)", () => {
  let player: FakeSpotifyPlayer;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSharedFakeSocket();
    player = createFakeSpotifyPlayer();
    installFakeSpotifySdk(player);
    connectThroughTokenCallback(player);
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallFakeSpotifySdk();
  });

  it("answers the SDK's token request with the token it just fetched", async () => {
    const { result } = renderHook(() =>
      useSpotifyPlaybackSdk({ roomId: TEST_ROOM_ID, enabled: true, playbackGeneration: 1 }),
    );
    await flush();
    await act(async () => {
      getSharedFakeSocket().serverEmit(ServerToClientEvent.SpotifyTokenRefreshed, {
        accessToken: "TEST_ACCESS_TOKEN",
      });
    });
    await flush();
    await act(async () => {
      player.emitReady();
    });

    expect(result.current.isReady).toBe(true);
    expect(tokenRefreshCount()).toBe(1);
  });

  it("retries promptly after a rate-limit refusal instead of waiting out the timeout", async () => {
    renderHook(() =>
      useSpotifyPlaybackSdk({ roomId: TEST_ROOM_ID, enabled: true, playbackGeneration: 1 }),
    );
    await flush();
    await act(async () => {
      getSharedFakeSocket().serverEmit(ServerToClientEvent.Error, {
        code: "RATE_LIMITED",
        message: "Too many requests. Wait a few seconds and try again.",
      });
    });

    await flush(1_000);

    expect(tokenRefreshCount()).toBe(2);
  });

  it("rebuilds the player when connect never settles", async () => {
    player.connect.mockImplementation(() => new Promise<boolean>(() => undefined));
    renderHook(() =>
      useSpotifyPlaybackSdk({ roomId: TEST_ROOM_ID, enabled: true, playbackGeneration: 1 }),
    );
    await flush();
    await act(async () => {
      getSharedFakeSocket().serverEmit(ServerToClientEvent.SpotifyTokenRefreshed, {
        accessToken: "TEST_ACCESS_TOKEN",
      });
    });

    await flush(15_000);

    expect(player.disconnect).toHaveBeenCalled();
    await flush(1_000);
    expect(tokenRefreshCount()).toBe(2);
  });
});
