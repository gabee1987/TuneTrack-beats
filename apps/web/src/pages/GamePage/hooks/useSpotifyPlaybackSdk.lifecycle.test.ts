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

const TRACK_URI = "spotify:track:TEST0000000000000001";
const PLAYBACK_GENERATION = 3;

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function answerTokenRequest() {
  await act(async () => {
    getSharedFakeSocket().serverEmit(ServerToClientEvent.SpotifyTokenRefreshed, {
      accessToken: "TEST_ACCESS_TOKEN",
    });
  });
  await flush();
}

function renderPlaybackSdk() {
  return renderHook(() =>
    useSpotifyPlaybackSdk({
      roomId: TEST_ROOM_ID,
      enabled: true,
      playbackGeneration: PLAYBACK_GENERATION,
    }),
  );
}

async function bootReadyPlayer(player: FakeSpotifyPlayer) {
  const view = renderPlaybackSdk();
  await flush();
  await answerTokenRequest();
  await act(async () => {
    player.emitReady();
  });
  await flush();
  return view;
}

function playerBuildCount(): number {
  return (window.Spotify.Player as unknown as Mock).mock.calls.length;
}

function latestPlayRequestId(): string {
  const requests = getSharedFakeSocket().emittedFor(ClientToServerEvent.PlaySpotifyTrack);
  return (requests[requests.length - 1] as { requestId: string }).requestId;
}

describe("useSpotifyPlaybackSdk player lifecycle", () => {
  let player: FakeSpotifyPlayer;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSharedFakeSocket();
    player = createFakeSpotifyPlayer();
    installFakeSpotifySdk(player);
  });

  afterEach(() => {
    vi.useRealTimers();
    uninstallFakeSpotifySdk();
  });

  it("registers the ready device with the room's playback generation", async () => {
    const { result } = await bootReadyPlayer(player);

    expect(result.current.isReady).toBe(true);
    expect(result.current.deviceId).toBe("TEST_DEVICE_1");
    expect(
      getSharedFakeSocket().emittedFor(ClientToServerEvent.RegisterSpotifyPlaybackDevice),
    ).toEqual([
      { roomId: TEST_ROOM_ID, deviceId: "TEST_DEVICE_1", playbackGeneration: PLAYBACK_GENERATION },
    ]);
  });

  it("unregisters a device that goes away", async () => {
    const { result } = await bootReadyPlayer(player);

    await act(async () => {
      player.emitNotReady();
    });
    await flush();

    expect(result.current.isReady).toBe(false);
    expect(result.current.deviceId).toBeNull();
    expect(
      getSharedFakeSocket().emittedFor(ClientToServerEvent.UnregisterSpotifyPlaybackDevice),
    ).toEqual([{ roomId: TEST_ROOM_ID }]);
  });

  it("reports what the device is playing", async () => {
    const { result } = await bootReadyPlayer(player);

    await act(async () => {
      player.emitPlaying(TRACK_URI, 42_000);
    });

    expect(result.current).toMatchObject({
      isPlaying: true,
      position: 42_000,
      duration: 180_000,
      currentTrackUri: TRACK_URI,
      hasActiveContext: true,
      hasEnded: false,
    });
  });

  it("reports an exhausted context as ended and no longer resumable", async () => {
    const { result } = await bootReadyPlayer(player);

    await act(async () => {
      player.emitEndedAtDuration(TRACK_URI);
    });

    expect(result.current).toMatchObject({
      isPlaying: false,
      hasActiveContext: false,
      hasEnded: true,
    });
  });

  it("raises the gesture flag on an autoplay block and lowers it once audio plays", async () => {
    const { result } = await bootReadyPlayer(player);

    await act(async () => {
      player.emitAutoplayFailed();
    });
    expect(result.current.needsUserGesture).toBe(true);

    await act(async () => {
      player.emitPlaying(TRACK_URI);
    });
    expect(result.current.needsUserGesture).toBe(false);
  });

  it("reconnects once with a fresh token after an authentication error", async () => {
    await bootReadyPlayer(player);

    await act(async () => {
      player.emitError("authentication_error");
      player.emitError("authentication_error");
    });
    await answerTokenRequest();

    expect(player.disconnect).toHaveBeenCalledTimes(1);
    expect(player.connect).toHaveBeenCalledTimes(2);
  });

  it("pauses, disconnects and unregisters the device when it unmounts", async () => {
    const { unmount } = await bootReadyPlayer(player);

    unmount();
    await flush();

    expect(player.pause).toHaveBeenCalled();
    expect(player.disconnect).toHaveBeenCalled();
    expect(
      getSharedFakeSocket().emittedFor(ClientToServerEvent.UnregisterSpotifyPlaybackDevice),
    ).toHaveLength(1);
  });

  it("rebuilds the player when a play is asked of a device that never arrived", async () => {
    const { result } = renderPlaybackSdk();
    await flush();
    await answerTokenRequest();

    let outcome: Awaited<ReturnType<typeof result.current.playTrack>> | undefined;
    await act(async () => {
      outcome = await result.current.playTrack(TRACK_URI);
    });
    await flush();

    expect(outcome).toEqual({ success: false, needsUserGesture: false });
    expect(player.disconnect).toHaveBeenCalled();
    expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.RefreshSpotifyToken)).toHaveLength(
      2,
    );
  });

  it("confirms a play only once the device reports the track as audible", async () => {
    const { result } = await bootReadyPlayer(player);

    let outcome: Awaited<ReturnType<typeof result.current.playTrack>> | undefined;
    let settled = false;
    await act(async () => {
      void result.current.playTrack(TRACK_URI).then((value) => {
        outcome = value;
        settled = true;
      });
    });
    await flush();
    await act(async () => {
      getSharedFakeSocket().serverEmit(ServerToClientEvent.SpotifyPlaybackResult, {
        success: true,
        requestId: latestPlayRequestId(),
      });
    });
    await flush();
    expect(settled).toBe(false);

    await act(async () => {
      player.emitPlaying(TRACK_URI);
    });
    await flush();

    expect(outcome).toEqual({ success: true, needsUserGesture: false });
    expect(getSharedFakeSocket().emittedFor(ClientToServerEvent.PlaySpotifyTrack)).toEqual([
      expect.objectContaining({
        roomId: TEST_ROOM_ID,
        deviceId: "TEST_DEVICE_1",
        spotifyTrackUri: TRACK_URI,
        playbackGeneration: PLAYBACK_GENERATION,
      }),
    ]);
  });

  it("rebuilds the player after the third device_not_found in a row", async () => {
    const { result } = await bootReadyPlayer(player);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await act(async () => {
        void result.current.playTrack(TRACK_URI);
      });
      await flush();
      expect(playerBuildCount()).toBe(1);
      await act(async () => {
        getSharedFakeSocket().serverEmit(ServerToClientEvent.SpotifyPlaybackResult, {
          success: false,
          requestId: latestPlayRequestId(),
          code: "device_not_found",
          message: "TEST_FAILURE",
        });
      });
      await flush();
    }
    await answerTokenRequest();

    expect(playerBuildCount()).toBe(2);
  });
});
